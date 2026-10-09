"""PostToolUse: formatea y lintea el archivo recién editado."""

import json
import os
import shutil
import subprocess
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]


def user_path() -> str:
    # PATH actualizado del registro (Windows): ve herramientas instaladas en esta sesión
    try:
        import winreg

        with winreg.OpenKey(winreg.HKEY_CURRENT_USER, "Environment") as key:
            return os.path.expandvars(winreg.QueryValueEx(key, "Path")[0])
    except OSError, ImportError:
        return ""


def tool(name: str) -> str | None:
    return shutil.which(name) or shutil.which(name, path=user_path())


def run(cmd: list[str], cwd: Path) -> str:
    res = subprocess.run(cmd, cwd=cwd, capture_output=True, text=True, check=False)  # noqa: S603
    return (res.stdout + res.stderr).strip() if res.returncode else ""


data = json.load(sys.stdin)
path = Path(data.get("tool_input", {}).get("file_path", "")).resolve()
if not path.is_file():
    sys.exit(0)

back, front = ROOT / "backend", ROOT / "frontend"
errors: list[str] = []

if path.suffix == ".py" and back in path.parents and (uv := tool("uv")):
    run([uv, "run", "ruff", "check", "--fix", str(path)], back)
    run([uv, "run", "ruff", "format", str(path)], back)
    errors.append(run([uv, "run", "ruff", "check", str(path)], back))

elif path.suffix in {".ts", ".tsx", ".css", ".json"} and front in path.parents and (pnpm := tool("pnpm")):
    run([pnpm, "exec", "prettier", "--write", str(path)], front)
    if path.suffix in {".ts", ".tsx"}:
        errors.append(run([pnpm, "exec", "eslint", "--fix", str(path)], front))

msg = "\n".join(e for e in errors if e)
if msg:
    print(f"Lint con problemas en {path.name}:\n{msg}", file=sys.stderr)
    sys.exit(2)  # devuelve el error a Claude para que lo corrija
