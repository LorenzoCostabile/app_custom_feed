#!/usr/bin/env python3
"""Asistente para exportar la cookie de YouTube y entregarla a Atención.

Se ejecuta en el PC (Windows), abre una página local y hace tres cosas:

1. Prepara yt-dlp dentro de una carpeta aislada (``.venv``).
2. Exporta las cookies del navegador y comprueba que la sesión es válida.
3. Envía la cookie a la app Atención (o te deja el archivo para pegarla).

No envía nada a internet más allá de la petición a YouTube que hace yt-dlp.
"""

from __future__ import annotations

import json
import os
import shutil
import socket
import subprocess
import sys
import threading
import urllib.error
import urllib.request
import webbrowser
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path

ROOT = Path(__file__).resolve().parent
STATIC = ROOT / "static"
VENV = ROOT / ".venv"
COOKIE_FILE = ROOT / "yt-cookies.txt"
DEFAULT_PORT = 8765
DEFAULT_APP = "http://localhost:3000"

BROWSERS = {
    "firefox": {
        "name": "Firefox",
        "recommended": True,
        "exe": [
            r"%ProgramFiles%\Mozilla Firefox\firefox.exe",
            r"%ProgramFiles(x86)%\Mozilla Firefox\firefox.exe",
        ],
        "profile": [r"%APPDATA%\Mozilla\Firefox\Profiles"],
    },
    "chrome": {
        "name": "Google Chrome",
        "recommended": False,
        "exe": [
            r"%ProgramFiles%\Google\Chrome\Application\chrome.exe",
            r"%ProgramFiles(x86)%\Google\Chrome\Application\chrome.exe",
            r"%LOCALAPPDATA%\Google\Chrome\Application\chrome.exe",
        ],
        "profile": [r"%LOCALAPPDATA%\Google\Chrome\User Data"],
    },
    "edge": {
        "name": "Microsoft Edge",
        "recommended": False,
        "exe": [
            r"%ProgramFiles(x86)%\Microsoft\Edge\Application\msedge.exe",
            r"%ProgramFiles%\Microsoft\Edge\Application\msedge.exe",
        ],
        "profile": [r"%LOCALAPPDATA%\Microsoft\Edge\User Data"],
    },
    "brave": {
        "name": "Brave",
        "recommended": False,
        "exe": [
            r"%ProgramFiles%\BraveSoftware\Brave-Browser\Application\brave.exe",
            r"%LOCALAPPDATA%\BraveSoftware\Brave-Browser\Application\brave.exe",
        ],
        "profile": [r"%LOCALAPPDATA%\BraveSoftware\Brave-Browser\User Data"],
    },
}

# Fragmentos de error de yt-dlp traducidos a algo accionable.
ERROR_HINTS = [
    (
        "could not copy",
        "El navegador tiene la base de datos de cookies bloqueada. "
        "Ciérralo del todo (también desde la bandeja del sistema) y vuelve a intentarlo.",
    ),
    (
        "failed to decrypt",
        "Windows no ha dejado descifrar las cookies de este navegador. "
        "Prueba con Firefox, que no usa el cifrado de Chrome.",
    ),
    (
        "could not find",
        "No encuentro el perfil de ese navegador. ¿Está instalado y has iniciado sesión alguna vez?",
    ),
    (
        "login details are needed",
        "La sesión no es válida: abre el navegador, entra en youtube.com con tu cuenta y repite.",
    ),
    (
        "no such file",
        "No encuentro la base de datos de cookies. Abre el navegador una vez y vuelve a probar.",
    ),
]


def expand(path: str) -> Path:
    return Path(os.path.expandvars(path))


def find_first(paths: list[str]) -> Path | None:
    for raw in paths:
        candidate = expand(raw)
        if candidate.exists():
            return candidate
    return None


def venv_python() -> Path | None:
    candidate = VENV / "Scripts" / "python.exe"
    return candidate if candidate.exists() else None


def ytdlp_base() -> list[str] | None:
    """Devuelve el prefijo de comando que ejecuta yt-dlp, si está disponible."""
    candidates: list[list[str]] = []
    local = venv_python()
    if local:
        candidates.append([str(local), "-m", "yt_dlp"])
    candidates.append([sys.executable, "-m", "yt_dlp"])
    for candidate in candidates:
        try:
            done = subprocess.run(
                [*candidate, "--version"],
                capture_output=True,
                text=True,
                timeout=30,
            )
        except (OSError, subprocess.SubprocessError):
            continue
        if done.returncode == 0:
            return candidate
    return None


def ytdlp_version(base: list[str] | None) -> str | None:
    if not base:
        return None
    try:
        done = subprocess.run(
            [*base, "--version"], capture_output=True, text=True, timeout=30
        )
    except (OSError, subprocess.SubprocessError):
        return None
    return done.stdout.strip() or None


def install_ytdlp() -> dict:
    log: list[str] = []

    def step(cmd: list[str], label: str) -> None:
        done = subprocess.run(cmd, capture_output=True, text=True, timeout=600)
        log.append(f"$ {label}")
        if done.stdout.strip():
            log.append(done.stdout.strip()[-1500:])
        if done.stderr.strip():
            log.append(done.stderr.strip()[-1500:])
        if done.returncode != 0:
            raise RuntimeError(f"Falló: {label}")

    try:
        if not venv_python():
            step(
                [sys.executable, "-m", "venv", str(VENV)],
                "python -m venv .venv",
            )
        python = str(venv_python())
        step(
            [python, "-m", "pip", "install", "--quiet", "--upgrade", "yt-dlp"],
            "pip install --upgrade yt-dlp",
        )
    except Exception as error:  # noqa: BLE001 - se muestra en la interfaz
        return {"ok": False, "log": log, "error": str(error)}

    base = ytdlp_base()
    return {
        "ok": base is not None,
        "log": log,
        "version": ytdlp_version(base),
        "hint": None if base else "Se instaló pero no se pudo ejecutar.",
    }


def classify_error(text: str) -> str | None:
    lowered = text.lower()
    for needle, hint in ERROR_HINTS:
        if needle in lowered:
            return hint
    return None


def export_cookie(browser: str, profile: str = "") -> dict:
    base = ytdlp_base()
    if not base:
        return {
            "ok": False,
            "error": "yt-dlp no está instalado todavía.",
            "hint": "Pulsa «Preparar yt-dlp» en el paso 1.",
        }
    if browser not in BROWSERS:
        return {"ok": False, "error": f"Navegador desconocido: {browser}"}

    spec = browser + (f":{profile}" if profile else "")
    if COOKIE_FILE.exists():
        COOKIE_FILE.unlink()

    cmd = [
        *base,
        "--cookies-from-browser",
        spec,
        "--cookies",
        str(COOKIE_FILE),
        "--skip-download",
        "--flat-playlist",
        "--print",
        "%(id)s",
        "--socket-timeout",
        "20",
        "--no-warnings",
        ":ytsubs",
    ]

    try:
        done = subprocess.run(cmd, capture_output=True, text=True, timeout=180)
    except subprocess.TimeoutExpired:
        return {
            "ok": False,
            "error": "YouTube tardó demasiado en responder.",
            "hint": "Comprueba tu conexión y vuelve a intentarlo.",
        }

    stdout = done.stdout or ""
    stderr = done.stderr or ""
    ids = [line.strip() for line in stdout.splitlines() if line.strip()]

    if done.returncode != 0 or not COOKIE_FILE.exists():
        return {
            "ok": False,
            "error": stderr.strip().splitlines()[-1] if stderr.strip() else "yt-dlp falló.",
            "hint": classify_error(stderr) or "Revisa que has iniciado sesión en ese navegador.",
        }

    raw = COOKIE_FILE.read_text(encoding="utf-8", errors="replace")
    cookie_names = sorted(
        {
            line.split("\t")[5].strip()
            for line in raw.splitlines()
            if line.count("\t") >= 6 and not line.startswith("#")
        }
    )

    primary = {"SID", "__Secure-1PSID", "__Secure-3PSID"}
    secondary = {
        "HSID",
        "SSID",
        "APISID",
        "SAPISID",
        "__Secure-1PAPISID",
        "__Secure-3PAPISID",
    }
    missing = []
    if not primary.intersection(cookie_names):
        missing.append("SID o __Secure-1PSID")
    if not secondary.intersection(cookie_names):
        missing.append("HSID, SSID o SAPISID")

    warnings: list[str] = []
    if not ids:
        warnings.append(
            "No se encontraron suscripciones: puede que la cuenta no tenga "
            "ninguna. La sesión sí se ha leído correctamente."
        )
    if missing:
        warnings.append("Faltan cookies de sesión: " + ", ".join(missing) + ".")

    return {
        "ok": True,
        "cookieCount": len(cookie_names),
        "cookieNames": cookie_names,
        "subscriptions": len(ids),
        "file": str(COOKIE_FILE),
        "browser": BROWSERS[browser]["name"],
        "warning": " ".join(warnings) or None,
    }


def probe_app(base_url: str) -> dict:
    url = base_url.rstrip("/") + "/api/youtube/cookie/status"
    request = urllib.request.Request(
        url, headers={"Accept": "application/json"}, method="GET"
    )
    try:
        with urllib.request.urlopen(request, timeout=15) as response:
            payload = json.loads(response.read().decode("utf-8") or "{}")
        return {"ok": True, "status": payload, "endpoint": True}
    except urllib.error.HTTPError as error:
        if error.code == 401:
            return {
                "ok": True,
                "endpoint": True,
                "needsLogin": True,
                "status": None,
            }
        if error.code == 404:
            return {
                "ok": False,
                "endpoint": False,
                "error": "La app responde, pero aún no tiene el endpoint de importación.",
                "hint": "Actualiza Atención o pega la cookie a mano en Fuentes.",
            }
        return {"ok": False, "endpoint": True, "error": f"HTTP {error.code}"}
    except urllib.error.URLError as error:
        return {
            "ok": False,
            "endpoint": False,
            "error": f"No se pudo conectar con {base_url}",
            "hint": str(error.reason),
        }


def login_app(base_url: str, email: str, password: str) -> dict:
    """Abre una sesión en Atención con las credenciales del usuario."""
    body = json.dumps({"email": email, "password": password}).encode("utf-8")
    request = urllib.request.Request(
        base_url.rstrip("/") + "/api/auth/login",
        data=body,
        headers={"Content-Type": "application/json", "Accept": "application/json"},
        method="POST",
    )
    try:
        with urllib.request.urlopen(request, timeout=20) as response:
            headers = response.headers.get_all("Set-Cookie") or []
    except urllib.error.HTTPError as error:
        detail = error.read().decode("utf-8", errors="replace")
        try:
            detail = json.loads(detail).get("error", detail)
        except json.JSONDecodeError:
            pass
        return {"ok": False, "error": detail or f"HTTP {error.code}"}
    except urllib.error.URLError as error:
        return {"ok": False, "error": str(error.reason)}

    for header in headers:
        for part in header.split(";"):
            name, _, value = part.strip().partition("=")
            if name == "atencion_session" and value:
                return {"ok": True, "token": value}
    return {"ok": False, "error": "La app no devolvió una sesión."}


def push_cookie(
    base_url: str,
    session: str = "",
    email: str = "",
    password: str = "",
) -> dict:
    if not COOKIE_FILE.exists():
        return {"ok": False, "error": "Todavía no hay ninguna cookie exportada."}

    probe = probe_app(base_url)
    if not probe["ok"]:
        return probe

    if probe.get("needsLogin") and not session:
        if email and password:
            login = login_app(base_url, email, password)
            if not login["ok"]:
                return {
                    "ok": False,
                    "needsLogin": True,
                    "error": login.get("error") or "No se pudo iniciar sesión.",
                    "hint": "Revisa el correo y la contraseña de tu cuenta de Atención.",
                }
            session = login["token"]
        else:
            return {
                "ok": False,
                "needsLogin": True,
                "error": "La app pide iniciar sesión.",
                "hint": (
                    "Escribe el correo y la contraseña de tu cuenta de Atención "
                    "en el paso 3."
                ),
            }

    cookie_text = COOKIE_FILE.read_text(encoding="utf-8", errors="replace")
    body = json.dumps({"cookie": cookie_text}).encode("utf-8")
    headers = {"Content-Type": "application/json", "Accept": "application/json"}
    if session:
        headers["Cookie"] = f"atencion_session={session.strip()}"

    request = urllib.request.Request(
        base_url.rstrip("/") + "/api/youtube/cookie",
        data=body,
        headers=headers,
        method="POST",
    )
    try:
        with urllib.request.urlopen(request, timeout=90) as response:
            payload = json.loads(response.read().decode("utf-8") or "{}")
    except urllib.error.HTTPError as error:
        detail = error.read().decode("utf-8", errors="replace")
        try:
            detail = json.loads(detail).get("error", detail)
        except json.JSONDecodeError:
            pass
        return {"ok": False, "error": detail or f"HTTP {error.code}"}
    except urllib.error.URLError as error:
        return {"ok": False, "error": str(error.reason)}

    if not payload.get("ok"):
        return {
            "ok": False,
            "error": payload.get("error") or "La app no confirmó el guardado.",
        }

    return {"ok": True, "result": payload}


def environment() -> dict:
    base = ytdlp_base()
    browsers = {}
    for key, info in BROWSERS.items():
        exe = find_first(info["exe"])
        profile = find_first(info["profile"])
        browsers[key] = {
            "name": info["name"],
            "recommended": info["recommended"],
            "installed": exe is not None,
            "profileFound": profile is not None,
        }
    return {
        "python": sys.version.split()[0],
        "platform": sys.platform,
        "ytdlp": {"installed": base is not None, "version": ytdlp_version(base)},
        "browsers": browsers,
        "cookie": {
            "exported": COOKIE_FILE.exists(),
            "file": str(COOKIE_FILE),
            "updatedAt": (
                int(COOKIE_FILE.stat().st_mtime) if COOKIE_FILE.exists() else None
            ),
        },
        "defaultApp": DEFAULT_APP,
    }


class Handler(BaseHTTPRequestHandler):
    server_version = "AtencionCookieWizard/1.0"

    def log_message(self, fmt: str, *args) -> None:  # noqa: D401
        sys.stderr.write("[asistente] " + fmt % args + "\n")

    def _json(self, payload: dict, status: int = 200) -> None:
        data = json.dumps(payload).encode("utf-8")
        self.send_response(status)
        self.send_header("Content-Type", "application/json; charset=utf-8")
        self.send_header("Content-Length", str(len(data)))
        self.send_header("Cache-Control", "no-store")
        self.end_headers()
        self.wfile.write(data)

    def _static(self, name: str, content_type: str) -> None:
        path = STATIC / name
        if not path.exists():
            self.send_error(404)
            return
        data = path.read_bytes()
        self.send_response(200)
        self.send_header("Content-Type", content_type)
        self.send_header("Content-Length", str(len(data)))
        self.send_header("Cache-Control", "no-store")
        self.end_headers()
        self.wfile.write(data)

    def _body(self) -> dict:
        length = int(self.headers.get("Content-Length") or 0)
        if length == 0:
            return {}
        raw = self.rfile.read(length)
        try:
            return json.loads(raw.decode("utf-8"))
        except (UnicodeDecodeError, json.JSONDecodeError):
            return {}

    def do_GET(self) -> None:  # noqa: N802
        if self.path in ("/", "/index.html"):
            self._static("index.html", "text/html; charset=utf-8")
        elif self.path == "/app.css":
            self._static("app.css", "text/css; charset=utf-8")
        elif self.path == "/app.js":
            self._static("app.js", "application/javascript; charset=utf-8")
        elif self.path == "/api/env":
            self._json(environment())
        else:
            self.send_error(404)

    def do_POST(self) -> None:  # noqa: N802
        if self.path == "/api/install":
            self._json(install_ytdlp())
        elif self.path == "/api/export":
            body = self._body()
            self._json(export_cookie(body.get("browser", "firefox"), body.get("profile", "")))
        elif self.path == "/api/probe":
            body = self._body()
            self._json(probe_app(body.get("url") or DEFAULT_APP))
        elif self.path == "/api/push":
            body = self._body()
            self._json(
                push_cookie(
                    body.get("url") or DEFAULT_APP,
                    body.get("session", ""),
                    body.get("email", ""),
                    body.get("password", ""),
                )
            )
        elif self.path == "/api/forget":
            if COOKIE_FILE.exists():
                COOKIE_FILE.unlink()
            self._json({"ok": True})
        elif self.path == "/api/shutdown":
            self._json({"ok": True})
            threading.Timer(0.4, self.server.shutdown).start()
        else:
            self.send_error(404)


def free_port(start: int) -> int:
    for port in range(start, start + 40):
        with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as probe:
            probe.setsockopt(socket.SOL_SOCKET, socket.SO_REUSEADDR, 1)
            try:
                probe.bind(("127.0.0.1", port))
            except OSError:
                continue
            return port
    raise RuntimeError("No hay ningún puerto libre entre 8765 y 8805.")


def main() -> int:
    port = free_port(DEFAULT_PORT)
    server = ThreadingHTTPServer(("127.0.0.1", port), Handler)
    url = f"http://127.0.0.1:{port}/"
    print(f"[asistente] Abre {url} si el navegador no lo hace solo.")
    print("[asistente] Ctrl+C para cerrar.")
    threading.Timer(0.6, lambda: webbrowser.open(url)).start()
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        print("\n[asistente] Cerrado.")
    finally:
        server.server_close()
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
