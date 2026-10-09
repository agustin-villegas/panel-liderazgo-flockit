import json
from collections.abc import AsyncGenerator
from dataclasses import dataclass, field
from typing import Any
from uuid import UUID

import pytest
from fastapi.testclient import TestClient
from google.adk.models.base_llm import BaseLlm
from google.adk.models.llm_request import LlmRequest
from google.adk.models.llm_response import LlmResponse
from google.genai import types
from pydantic import Field
from sqlalchemy import select

from app.ai.agent import MAX_CALLS
from app.ai.factory import make_box
from app.ai.models import AiTrace, McpToken
from app.ai.tools import dumps
from app.auth.models import Role, User
from app.auth.tokens import digest
from tests.conftest import PWD
from tests.test_projects_api import TM, add_user, new_project, run

ACCEPT = {"Accept": "application/json, text/event-stream"}


@dataclass
class ToolCall:
    id: str
    name: str
    args: dict[str, Any]


@dataclass
class Reply:
    """Una respuesta guionada del modelo: texto y/o pedidos de tools."""

    content: str | None
    calls: list[ToolCall] = field(default_factory=list)
    input_tokens: int = 0
    output_tokens: int = 0


class FakeChat(BaseLlm):
    """Modelo ADK falso: devuelve respuestas guiadas. Sin red."""

    script: list[Reply] = Field(default_factory=list)
    seen: list[list[dict[str, Any]]] = Field(default_factory=list)
    tools_offered: list[bool] = Field(default_factory=list)

    def __init__(self, script: list[Reply]) -> None:
        super().__init__(model="fake-model", script=list(script))

    async def generate_content_async(
        self, llm_request: LlmRequest, stream: bool = False
    ) -> AsyncGenerator[LlmResponse, None]:
        self.seen.append(as_msgs(llm_request))
        self.tools_offered.append(bool(llm_request.config and llm_request.config.tools))
        r = self.script.pop(0)
        parts = [types.Part(text=r.content)] if r.content else []
        parts += [
            types.Part(function_call=types.FunctionCall(id=c.id, name=c.name, args=c.args))
            for c in r.calls
        ]
        use = types.GenerateContentResponseUsageMetadata(
            prompt_token_count=r.input_tokens, candidates_token_count=r.output_tokens
        )
        yield LlmResponse(content=types.Content(role="model", parts=parts), usage_metadata=use)


def as_msgs(req: LlmRequest) -> list[dict[str, Any]]:
    """El request de ADK como mensajes estilo chat (system/user/assistant/tool)."""
    out: list[dict[str, Any]] = [{"role": "system", "content": str(req.config.system_instruction)}]
    for c in req.contents:
        parts = c.parts or []
        resps = [p.function_response for p in parts if p.function_response]
        if resps:
            out += [{"role": "tool", "content": dumps(r.response or {})} for r in resps]
            continue
        text = "".join(p.text or "" for p in parts)
        if c.role == "model":
            calls = [p.function_call.name for p in parts if p.function_call]
            out.append({"role": "assistant", "content": text, "tool_calls": calls})
        else:
            out.append({"role": "user", "content": text})
    return out


def call(name: str, i: int = 1, **args: Any) -> ToolCall:
    return ToolCall(f"c{i}", name, args)


@pytest.fixture
def admin(client: TestClient, login) -> TestClient:
    login()
    return client


def tool_out(chat: FakeChat, turn: int, idx: int = -1) -> dict[str, Any]:
    msgs = [m for m in chat.seen[turn] if m["role"] == "tool"]
    return json.loads(msgs[idx]["content"])


def ask(c: TestClient, text: str = "hola") -> Any:
    return c.post("/api/asistente/mensaje", json={"messages": [{"role": "user", "content": text}]})


# ── tools ──
def test_tool_cumplimiento_igual_al_endpoint(admin):
    pid = new_project(admin)
    sprints = admin.get(f"/api/proyectos/{pid}/cumplimiento").json()["sprints"]
    last = [s for s in sprints if not s["provisional"]][-1]
    admin.app.state.chat = chat = FakeChat(
        [Reply(None, [call("cumplimiento_sprint", proyecto="portal CLIENTES")]), Reply("ok")]
    )
    assert ask(admin).status_code == 200
    out = tool_out(chat, 1)
    assert out["sprint"] == last["name"]
    assert out["estado"] == "cerrado"
    exp = f"{last['pct'] * 100:.1f} %".replace(".", ",")
    assert out["cumplimiento"] == exp
    assert out["planificados_sp"] == str(int(last["planned"]))
    assert out["quemados_sp"] == str(int(last["burned"]))


def test_tm_no_ve_proyectos_ajenos(admin, login):
    new_project(admin)  # sin managers: el TM no lo ve
    add_user(admin, TM)
    admin.post("/api/auth/logout")
    login(TM, PWD)
    admin.app.state.chat = chat = FakeChat(
        [
            Reply(None, [call("cumplimiento_sprint", proyecto="Portal Clientes")]),
            Reply(None, [call("listar_proyectos", 2), call("proyectos_en_riesgo", 3)]),
            Reply("no tenés acceso"),
        ]
    )
    res = ask(admin).json()
    assert tool_out(chat, 1, 0) == {"error": "No tenés acceso a ese proyecto"}
    assert tool_out(chat, 2, -2) == {"proyectos": []}
    assert tool_out(chat, 2, -1) == {"en_riesgo": []}
    assert res["tools"] == ["cumplimiento_sprint", "listar_proyectos", "proyectos_en_riesgo"]


def test_tm_ve_su_proyecto(admin, login):
    tm = add_user(admin, TM)
    new_project(admin, managers=[tm])
    admin.post("/api/auth/logout")
    login(TM, PWD)
    admin.app.state.chat = chat = FakeChat(
        [Reply(None, [call("tendencia", proyecto="portal", n=3)]), Reply("ok")]
    )
    ask(admin)
    assert len(tool_out(chat, 1)["sprints"]) == 3


def test_proyecto_inexistente(admin):
    new_project(admin)
    admin.app.state.chat = chat = FakeChat(
        [Reply(None, [call("tablero_sprint", proyecto="Fantasma")]), Reply("ok")]
    )
    ask(admin)
    assert "No encontré" in tool_out(chat, 1)["error"]


def test_inyeccion_en_titulo_se_marca(admin):
    """El demo trae una issue con prompt injection en algún board."""
    pid = new_project(admin)

    async def scan() -> dict[str, Any]:
        async with admin.app.state.db.maker() as db:
            user = await db.scalar(select(User).where(User.email == "admin@panel.test"))
            box = make_box(admin.app.state, user, db)
            # incluye el sprint activo: ahí está la issue con inyección
            _, snap = await box._snap(pid)
            for r in snap.results:
                out = await box.issues_no_terminadas(proyecto=pid, sprint=r.sprint.id)
                if "texto_sospechoso" in out:
                    return out
            return {}

    out = run(scan())
    assert out, "el demo debería traer al menos una issue con inyección"
    assert out["texto_sospechoso"]["issues"]
    flagged = out["texto_sospechoso"]["issues"]
    titles = [i["titulo"] for i in out["issues"] if i["issue"] in flagged]
    assert titles
    assert all(t.startswith("«dato_externo: ") for t in titles)


# ── agente ──
def test_loop_dos_tools_y_respuesta(admin):
    new_project(admin)
    admin.app.state.chat = chat = FakeChat(
        [
            Reply(
                None,
                [call("listar_proyectos", 1), call("proyectos_en_riesgo", 2)],
                input_tokens=100,
                output_tokens=10,
            ),
            Reply("Portal Clientes está en riesgo", input_tokens=200, output_tokens=20),
        ]
    )
    body = ask(admin, "¿Qué proyecto está en riesgo?").json()
    assert body["answer"] == "Portal Clientes está en riesgo"
    assert body["tools"] == ["listar_proyectos", "proyectos_en_riesgo"]
    roles = [m["role"] for m in chat.seen[1]]
    assert roles == ["system", "user", "assistant", "tool", "tool"]
    assert "Portal Clientes" in tool_out(chat, 1, 0)["proyectos"][0]["nombre"]


def test_traza_se_guarda(admin):
    new_project(admin)
    admin.app.state.chat = FakeChat(
        [
            Reply(None, [call("listar_proyectos")], input_tokens=100, output_tokens=10),
            Reply("ok", input_tokens=50, output_tokens=5),
        ]
    )
    tid = ask(admin).json()["trace_id"]

    async def get() -> AiTrace | None:
        async with admin.app.state.db.maker() as db:
            return await db.get(AiTrace, UUID(tid))

    t = run(get())
    assert t is not None
    assert (t.kind, t.model, t.input_tokens, t.output_tokens) == ("chat", "fake-model", 150, 15)
    assert t.tools == [{"name": "listar_proyectos", "args": {}}]
    assert t.latency_ms >= 0


def test_tope_de_5_tools_por_turno(admin):
    new_project(admin)
    calls = [call("listar_proyectos", i) for i in range(1, 8)]  # pide 7 de una
    admin.app.state.chat = chat = FakeChat([Reply(None, calls), Reply("listo")])
    body = ask(admin).json()
    assert len(body["tools"]) == MAX_CALLS
    extra = [m for m in chat.seen[1] if m["role"] == "tool"][MAX_CALLS:]
    assert len(extra) == 2
    assert all("Límite" in json.loads(m["content"])["error"] for m in extra)
    # tocado el tope, el modelo ya no recibe tools
    assert chat.tools_offered == [True, False]


def test_tope_en_varias_rondas_corta_el_loop(admin):
    new_project(admin)
    rounds = [Reply(None, [call("listar_proyectos", i)]) for i in range(1, 6)]
    chat = FakeChat([*rounds, Reply("fin")])
    admin.app.state.chat = chat
    body = ask(admin).json()
    assert body["answer"] == "fin"
    assert len(body["tools"]) == 5
    assert chat.tools_offered[-1] is False


def test_mensaje_valida_largo(admin):
    msgs = [{"role": "user", "content": "x"}] * 21
    admin.app.state.chat = FakeChat([])
    assert admin.post("/api/asistente/mensaje", json={"messages": msgs}).status_code == 422


def test_sin_sesion_401(client):
    assert ask(client).status_code == 401


def test_sin_openai_key_error_claro(admin):
    res = ask(admin)
    assert res.status_code == 502
    assert "OPENAI_API_KEY" in res.json()["message"]


# ── tokens MCP ──
def new_token(c: TestClient, name: str = "Claude Code") -> dict[str, Any]:
    res = c.post("/api/perfil/tokens-mcp", json={"name": name})
    assert res.status_code == 201, res.text
    return res.json()


def test_token_se_muestra_una_vez_y_se_guarda_hasheado(admin):
    tok = new_token(admin)
    raw = tok["token"]
    assert raw.startswith("pnl_")
    assert tok["last4"] == raw[-4:]
    listed = admin.get("/api/perfil/tokens-mcp").json()
    assert [t["id"] for t in listed] == [tok["id"]]
    assert "token" not in listed[0]

    async def rows() -> list[McpToken]:
        async with admin.app.state.db.maker() as db:
            return list(await db.scalars(select(McpToken)))

    (row,) = run(rows())
    assert row.token_hash == digest(raw)
    assert raw not in (row.token_hash, row.name)


def test_token_revocar_y_ajeno(admin, login):
    tok = new_token(admin)
    add_user(admin, TM)
    admin.post("/api/auth/logout")
    login(TM, PWD)
    assert admin.delete(f"/api/perfil/tokens-mcp/{tok['id']}").status_code == 404  # no es suyo
    assert admin.get("/api/perfil/tokens-mcp").json() == []
    admin.post("/api/auth/logout")
    login()
    assert admin.delete(f"/api/perfil/tokens-mcp/{tok['id']}").status_code == 204
    assert admin.get("/api/perfil/tokens-mcp").json() == []
    assert admin.delete(f"/api/perfil/tokens-mcp/{tok['id']}").status_code == 404


# ── MCP ──
def rpc(method: str, params: dict[str, Any] | None = None) -> dict[str, Any]:
    return {"jsonrpc": "2.0", "id": 1, "method": method, "params": params or {}}


def mcp_call(c: TestClient, token: str | None, body: dict[str, Any]):
    headers = dict(ACCEPT)
    if token is not None:
        headers["Authorization"] = f"Bearer {token}"
    return c.post("/mcp", json=body, headers=headers)


def test_mcp_rechaza_sin_token_o_invalido(client):
    assert mcp_call(client, None, rpc("tools/list")).status_code == 401
    assert mcp_call(client, "pnl_inventado", rpc("tools/list")).status_code == 401
    res = client.post(
        "/mcp", json=rpc("tools/list"), headers={**ACCEPT, "Authorization": "Basic x"}
    )
    assert res.status_code == 401


def test_mcp_lista_tools_de_solo_lectura(admin):
    raw = new_token(admin)["token"]
    admin.cookies.clear()  # el MCP no usa la cookie
    res = mcp_call(admin, raw, rpc("tools/list"))
    assert res.status_code == 200, res.text
    tools = res.json()["result"]["tools"]
    assert {t["name"] for t in tools} >= {"listar_proyectos", "proyectos_en_riesgo", "tendencia"}
    assert all(t["annotations"]["readOnlyHint"] for t in tools)


def mcp_tool(c: TestClient, token: str, name: str, **args: Any) -> dict[str, Any]:
    res = mcp_call(c, token, rpc("tools/call", {"name": name, "arguments": args}))
    assert res.status_code == 200, res.text
    result = res.json()["result"]
    return result.get("structuredContent") or json.loads(result["content"][0]["text"])


def test_mcp_mismos_permisos_y_numeros(admin, login):
    pid = new_project(admin)  # solo admin
    last = [
        s for s in admin.get(f"/api/proyectos/{pid}/cumplimiento").json()["sprints"]
        if not s["provisional"]
    ][-1]  # fmt: skip
    adm = new_token(admin)["token"]
    add_user(admin, TM)
    admin.post("/api/auth/logout")
    login(TM, PWD)
    tm = new_token(admin)["token"]
    admin.cookies.clear()

    out = mcp_tool(admin, adm, "cumplimiento_sprint", proyecto="Portal Clientes")
    assert out["sprint"] == last["name"]
    assert out["planificados_sp"] == str(int(last["planned"]))
    assert mcp_tool(admin, adm, "proyectos_en_riesgo")["en_riesgo"]

    denied = mcp_tool(admin, tm, "cumplimiento_sprint", proyecto="Portal Clientes")
    assert denied == {"error": "No tenés acceso a ese proyecto"}
    assert mcp_tool(admin, tm, "listar_proyectos") == {"proyectos": []}


def test_mcp_token_revocado_deja_de_andar(admin):
    tok = new_token(admin)
    assert mcp_call(admin, tok["token"], rpc("tools/list")).status_code == 200
    assert admin.delete(f"/api/perfil/tokens-mcp/{tok['id']}").status_code == 204
    assert mcp_call(admin, tok["token"], rpc("tools/list")).status_code == 401


def test_mcp_no_rompe_el_lifespan_ni_las_rutas_api(client):
    assert client.get("/api/health").status_code == 200


def test_cliente_sin_asistente_ni_tokens(admin, login):
    add_user(admin, "cli@panel.test", Role.CLIENT)
    login("cli@panel.test", PWD)
    admin.app.state.chat = FakeChat([Reply("no debería llegar")])
    assert ask(admin).status_code == 403
    assert admin.post("/api/perfil/tokens-mcp", json={"name": "x"}).status_code == 403
