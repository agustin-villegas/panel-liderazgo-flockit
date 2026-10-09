from uuid import UUID

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.ai.fmt import fmt, pct
from app.ai.guard import wrap
from app.ai.narrative import Writer
from app.audit.service import AuditService
from app.auth.models import User
from app.compliance.service import ComplianceService, Snapshot
from app.connections.models import Connection
from app.core.errors import AppError, NotFoundError
from app.projects.models import Account, Project
from app.projects.service import ProjectService
from app.reports.models import Report
from app.reports.schemas import (
    Pending,
    PreviewOut,
    ReportData,
    ReportIn,
    ReportOut,
    ReportRow,
    SaveIn,
    StoryIn,
    TrendPoint,
)

TREND = 6
AUD_LABEL = {"equipo": "Equipo", "cliente": "Cliente", "gerencia": "Gerencia"}


class ReportError(AppError):
    status = 422
    code = "REPORT_INVALID"


class ReportService:
    """Informe de sprint: números del motor + narrativa de IA. Guardado = foto inmutable."""

    def __init__(
        self,
        db: AsyncSession,
        projects: ProjectService,
        comp: ComplianceService,
        writer: Writer,
        audit: AuditService,
    ) -> None:
        self.db = db
        self.projects = projects
        self.comp = comp
        self.writer = writer
        self.audit = audit

    async def preview(self, body: ReportIn, user: User) -> PreviewOut:
        """Datos + narrativa sugerida. No guarda nada."""
        data = await self._data(body, user)
        res = await self.writer.write(self._facts(data), body.audience)
        story = StoryIn(**res.story.model_dump()) if res.story else None
        return PreviewOut(data=data, story=story, model=res.model, ai_error=res.error)

    async def save(self, body: SaveIn, user: User, ip: str) -> ReportOut:
        """Guarda la foto. Los números se recalculan acá: el cliente no puede alterarlos."""
        data = await self._data(body, user)
        title = f"{data.sprint.name} · {data.project} · {AUD_LABEL[body.audience]}"
        rep = Report(
            audience=body.audience,
            project_id=body.project_id,
            sprint_id=body.sprint_id,
            title=title,
            data=data.model_dump(mode="json"),
            story=body.story.model_dump() if body.story else None,
            ai_model=getattr(self.writer, "model", None) if body.story else None,
            created_by=user.id,
        )
        self.db.add(rep)
        await self.db.flush()
        await self.audit.log(
            "informe.guardado", user.id, "informe", str(rep.id), {"title": title}, ip
        )
        return await self.get(rep.id, user)

    async def all(self, user: User) -> list[ReportRow]:
        visible = {p.id: p for p in await self.projects.visible(user)}
        rows = await self.db.execute(
            select(Report, User.name)
            .join(User, User.id == Report.created_by)
            .where(Report.project_id.in_(visible))
            .order_by(Report.created_at.desc())
        )
        return [
            ReportRow(
                id=r.id,
                title=r.title,
                audience=r.audience,
                project=visible[r.project_id].name,
                pct=r.data.get("sprint", {}).get("pct"),
                created_at=r.created_at,
                author=name,
            )
            for r, name in rows.all()
        ]

    async def get(self, rid: UUID, user: User) -> ReportOut:
        """Informe guardado, si el usuario puede ver su proyecto."""
        rep = await self.db.get(Report, rid)
        if rep is None:
            raise NotFoundError("Informe no encontrado")
        await self.projects.get(rep.project_id, user)  # 403 si no es suyo
        author = await self.db.get(User, rep.created_by)
        return ReportOut(
            id=rep.id,
            title=rep.title,
            audience=rep.audience,
            project_id=rep.project_id,
            created_at=rep.created_at,
            author=author.name if author else "",
            data=ReportData.model_validate(rep.data),
            story=StoryIn.model_validate(rep.story) if rep.story else None,
            model=rep.ai_model,
        )

    # ── internos ──
    async def _data(self, body: ReportIn, user: User) -> ReportData:
        proj = await self.projects.get(body.project_id, user)
        conn = await self.db.get(Connection, proj.conn_id) if proj.conn_id else None
        acc = await self.db.get(Account, proj.account_id)
        snap = await self.comp.snapshot(proj, conn)
        return self._build(proj, acc.name if acc else "", snap, body.sprint_id)

    def _build(self, proj: Project, account: str, snap: Snapshot, sid: str) -> ReportData:
        idx = next((i for i, r in enumerate(snap.results) if r.sprint.id == sid), None)
        if idx is None:
            raise ReportError("El sprint no pertenece al proyecto")
        res = snap.results[idx]
        month_key = res.sprint.until.strftime("%Y-%m")
        month = next((m for m in snap.months if m.month == month_key), None)
        return ReportData(
            project=proj.name,
            account=account,
            sprint=self.comp.sprint_out(res),
            trend=[
                TrendPoint(name=r.sprint.name, planned=r.planned, burned=r.burned, pct=r.pct)
                for r in snap.results[max(0, idx - TREND + 1) : idx + 1]
            ],
            pending=[
                Pending(
                    key=ln.issue.key,
                    title=ln.issue.title,
                    status=ln.issue.status,
                    assignee=ln.issue.assignee,
                    sp=ln.issue.sp,
                )
                for ln in res.lines
                if not ln.issue.done
            ],
            month=self.comp.month_out(month) if month else None,
        )

    @staticmethod
    def _facts(d: ReportData) -> dict:
        """Lo que ve la IA: valores ya calculados; títulos de Jira como dato externo."""
        s = d.sprint
        pending_sp = sum(p.sp or 0 for p in d.pending)  # lo calcula el sistema, no la IA
        return {
            "proyecto": d.project,
            "cuenta": d.account,
            "sprint": {
                "nombre": s.name,
                "estado": "en curso (provisorio)" if s.provisional else "cerrado",
                "planificados_sp": fmt(s.planned),
                "quemados_sp": fmt(s.burned),
                "cumplimiento": pct(s.pct),
                "issues_sin_estimar": s.unestimated,
            },
            "tendencia": [{"sprint": t.name, "cumplimiento": pct(t.pct)} for t in d.trend],
            "por_persona": [
                {"persona": p.name, "planificados_sp": fmt(p.planned), "quemados_sp": fmt(p.burned)}
                for p in s.people
            ],
            "pendientes": {
                "cantidad": len(d.pending),
                "total_sp": fmt(pending_sp),
                "detalle": [
                    {"issue": p.key, "titulo": wrap(p.title), "sp": p.sp, "responsable": p.assignee}
                    for p in d.pending[:12]
                ],
            },
            "mes": None
            if d.month is None
            else {"mes": d.month.month, "cumplimiento": pct(d.month.pct)},
        }
