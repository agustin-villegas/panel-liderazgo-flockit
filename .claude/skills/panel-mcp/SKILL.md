---
name: panel-mcp
description: MCP server del panel (SDK mcp 2.x, MCPServer, streamable HTTP en /mcp). Usar al agregar o modificar tools MCP, su auth por token personal o el .mcp.json de ejemplo.
---

# MCP server

- SDK `mcp` 2.x: `from mcp.server.mcpserver import MCPServer` (FastMCP ya no existe).
- Montado en FastAPI en `/mcp`, transporte streamable HTTP.
- Las tools son **las mismas funciones** de `app/ai/tools.py`. No duplicar lógica.
- Todas con `ToolAnnotations(readOnlyHint=True)`. El panel nunca escribe en Jira.
- Auth: `Authorization: Bearer <token>` → hash contra `mcp_tokens`; respeta los permisos de ese usuario.
- Texto de Jira marcado como dato externo (igual que en el asistente).
- Al agregar una tool: actualizar el `.mcp.json` de ejemplo y el README si cambia el uso.
