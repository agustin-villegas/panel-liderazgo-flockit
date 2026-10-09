import time
from typing import Annotated
from uuid import UUID

from fastapi import APIRouter, Depends, Request
from google.adk.models.base_llm import BaseLlm

from app.ai.agent import Assistant, AssistantError, make_model
from app.ai.factory import make_box
from app.ai.models import AiTrace
from app.ai.schemas import ChatIn, ChatOut, TokenIn, TokenNew, TokenOut
from app.auth.deps import Cfg, Db, require_role
from app.auth.models import Role, User
from app.mcp.tokens import McpTokenService

router = APIRouter(tags=["asistente"])

# el cliente no usa el asistente ni el MCP (spec §2)
AiUser = Annotated[User, Depends(require_role(Role.ADMIN, Role.MANAGER))]


def get_chat(req: Request, cfg: Cfg) -> BaseLlm:
    # en tests se inyecta un modelo falso en app.state.chat
    fake = getattr(req.app.state, "chat", None)
    if fake:
        return fake
    if not cfg.openai_api_key:
        raise AssistantError("IA no configurada (falta OPENAI_API_KEY)")
    return make_model(cfg.openai_api_key, cfg.model)


@router.post("/asistente/mensaje")
async def message(
    body: ChatIn,
    req: Request,
    user: AiUser,
    db: Db,
    chat: Annotated[BaseLlm, Depends(get_chat)],
) -> ChatOut:
    """Un turno del chat: el modelo llama tools de solo lectura con tus permisos."""
    t0 = time.perf_counter()
    hist = [{"role": m.role, "content": m.content} for m in body.messages]
    ans = await Assistant(chat, make_box(req.app.state, user, db)).reply(hist)
    trace = AiTrace(
        user_id=user.id,
        kind="chat",
        model=ans.model,
        tools=ans.tools,
        input_tokens=ans.input_tokens,
        output_tokens=ans.output_tokens,
        latency_ms=round((time.perf_counter() - t0) * 1000),
    )
    db.add(trace)
    await db.commit()
    return ChatOut(answer=ans.text, tools=[t["name"] for t in ans.tools], trace_id=trace.id)


# ── tokens personales del MCP ──
def get_tokens(db: Db) -> McpTokenService:
    return McpTokenService(db)


Tokens = Annotated[McpTokenService, Depends(get_tokens)]


@router.get("/perfil/tokens-mcp")
async def list_tokens(user: AiUser, svc: Tokens) -> list[TokenOut]:
    return await svc.all(user)


@router.post("/perfil/tokens-mcp", status_code=201)
async def create_token(body: TokenIn, user: AiUser, svc: Tokens) -> TokenNew:
    """Crea un token. El valor crudo se devuelve una sola vez."""
    return await svc.create(user, body.name)


@router.delete("/perfil/tokens-mcp/{tid}", status_code=204)
async def revoke_token(tid: UUID, user: AiUser, svc: Tokens) -> None:
    await svc.revoke(tid, user)
