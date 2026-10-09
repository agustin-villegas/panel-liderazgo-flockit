"""PreToolUse: bloquea escrituras en archivos .env (salvo .env.example)."""

import json
import sys
from pathlib import Path

data = json.load(sys.stdin)
path = Path(data.get("tool_input", {}).get("file_path", ""))

if path.name.startswith(".env") and path.name != ".env.example":
    print(
        f"Bloqueado: {path.name} tiene secretos y lo edita el usuario a mano. "
        "Si falta una variable, agregala a .env.example y avisale.",
        file=sys.stderr,
    )
    sys.exit(2)
