"""Arma el Toolbox de un usuario a partir del estado de la app."""

from typing import Any

from sqlalchemy.ext.asyncio import AsyncSession

from app.ai.tools import Toolbox
from app.audit.service import AuditService
from app.auth.models import User
from app.board.service import BoardService
from app.compliance.service import ComplianceService
from app.projects.service import ProjectService


def make_box(state: Any, user: User, db: AsyncSession) -> Toolbox:
    """Toolbox con permisos de `user`. `state` es app.state."""
    return Toolbox(
        user,
        db,
        ProjectService(db, AuditService(db)),
        ComplianceService(state.factory, state.cache),
        BoardService(state.factory, state.boards),
    )
