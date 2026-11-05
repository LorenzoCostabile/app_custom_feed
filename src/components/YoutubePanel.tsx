"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

type Props = {
  configured: boolean;
  connected: boolean;
  channelTitle: string | null;
  lastSyncedAt: string | null;
  notice: string | null;
  hasCookie: boolean;
};

export function YoutubePanel({
  configured,
  connected,
  channelTitle,
  lastSyncedAt,
  notice,
  hasCookie,
}: Props) {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [errors, setErrors] = useState<string[]>([]);
  const [cookie, setCookie] = useState("");
  const [cookieState, setCookieState] = useState(hasCookie);
  const [checking, setChecking] = useState(false);
  const [cookieMessage, setCookieMessage] = useState<string | null>(null);
  const [cookieStatus, setCookieStatus] = useState<string | null>(null);
  const [notes, setNotes] = useState<string[]>([]);

  function connect() {
    window.location.href = "/api/youtube/connect";
  }

  async function sync() {
    setPending(true);
    setMessage(null);
    setErrors([]);
    try {
      const response = await fetch("/api/youtube/sync", { method: "POST" });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error ?? "La sincronización falló.");
      const summary = data.summary;
      setMessage(
        `${summary.subscriptions} suscripciones, ${summary.playlists} playlists, ${summary.collectionItems} elementos en colecciones, ${summary.recommendations ?? 0} recomendaciones.`,
      );
      if (Array.isArray(summary.errors) && summary.errors.length > 0) {
        setErrors(summary.errors);
      }
      router.refresh();
    } catch (cause) {
      setMessage(cause instanceof Error ? cause.message : "Error inesperado.");
    } finally {
      setPending(false);
    }
  }

  async function disconnect() {
    if (!window.confirm("¿Desconectar tu cuenta de Google? La cookie del feed se conserva."))
      return;
    setPending(true);
    setMessage(null);
    setErrors([]);
    try {
      const response = await fetch("/api/youtube/disconnect", { method: "POST" });
      if (!response.ok) throw new Error("No se pudo desconectar.");
      router.refresh();
    } catch (cause) {
      setMessage(cause instanceof Error ? cause.message : "Error inesperado.");
    } finally {
      setPending(false);
    }
  }

  async function saveCookie() {
    setPending(true);
    setCookieMessage(null);
    setCookieStatus(null);
    setNotes([]);
    try {
      const response = await fetch("/api/youtube/cookie", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ cookie }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error ?? "No se pudo guardar.");
      setCookie("");
      setCookieState(true);
      setCookieStatus(
        data.status === "valid"
          ? `Cookie válida · ${data.videoCount} recomendaciones disponibles.`
          : "Cookie guardada, pero el feed no devolvió recomendaciones.",
      );
      if (Array.isArray(data.warnings) && data.warnings.length > 0) {
        setNotes(data.warnings);
      }
      setCookieMessage(
        "Cookie guardada. Ya puedes actualizar las recomendaciones.",
      );
      router.refresh();
    } catch (cause) {
      setCookieMessage(
        cause instanceof Error ? cause.message : "Error inesperado.",
      );
    } finally {
      setPending(false);
    }
  }

  async function checkCookie() {
    setChecking(true);
    setCookieMessage(null);
    setCookieStatus(null);
    setNotes([]);
    try {
      const response = await fetch("/api/youtube/cookie/status");
      const data = await response.json();
      if (!response.ok) throw new Error(data.error ?? "No se pudo comprobar.");
      if (data.status === "valid") {
        setCookieStatus(
          `Cookie válida · ${data.videoCount} recomendaciones disponibles.`,
        );
      } else if (data.status === "no_feed") {
        setCookieStatus(`Sesión válida, pero el feed no responde: ${data.message}`);
      } else if (data.status === "invalid") {
        setCookieStatus(`Cookie caducada: ${data.message}`);
      } else {
        setCookieStatus(data.message ?? "No hay ninguna cookie guardada.");
      }
    } catch (cause) {
      setCookieMessage(
        cause instanceof Error ? cause.message : "Error inesperado.",
      );
    } finally {
      setChecking(false);
    }
  }

  async function loadCookieFile(file: File | undefined) {
    if (!file) return;
    try {
      setCookie(await file.text());
      setCookieMessage(`Archivo ${file.name} cargado. Pulsa «Guardar cookie».`);
    } catch {
      setCookieMessage("No se pudo leer el archivo.");
    }
  }

  async function clearCookie() {
    if (!window.confirm("¿Borrar la cookie de YouTube guardada?")) return;
    setPending(true);
    setCookieMessage(null);
    try {
      const response = await fetch("/api/youtube/cookie", { method: "DELETE" });
      if (!response.ok) throw new Error("No se pudo borrar la cookie.");
      setCookieState(false);
      setCookieMessage("Cookie borrada.");
      router.refresh();
    } catch (cause) {
      setCookieMessage(
        cause instanceof Error ? cause.message : "Error inesperado.",
      );
    } finally {
      setPending(false);
    }
  }

  async function refreshRecommendations() {
    setPending(true);
    setCookieMessage(null);
    try {
      const response = await fetch("/api/youtube/recommendations", {
        method: "POST",
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error ?? "No se pudo actualizar.");
      setCookieMessage(
        `Recomendaciones: ${data.summary.imported} nuevas de ${data.summary.found} encontradas.`,
      );
      router.refresh();
    } catch (cause) {
      setCookieMessage(
        cause instanceof Error ? cause.message : "Error inesperado.",
      );
    } finally {
      setPending(false);
    }
  }

  return (
    <section className="flex flex-col gap-4 rounded border border-line bg-white/60 p-4">
      <div className="flex flex-col gap-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-sm font-semibold">
              Cuenta de Google <span className="text-muted">· opcional</span>
            </h2>
            <p className="mt-1 text-xs text-muted">
              Importa tus suscripciones, playlists y «Ver más tarde» con la API
              oficial. El feed de recomendaciones no depende de esto.
            </p>
          </div>
          {connected ? (
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={sync}
                disabled={pending}
                className="rounded border border-line px-4 py-2 text-sm text-muted hover:border-accent hover:text-accent disabled:opacity-50"
              >
                {pending ? "Sincronizando…" : "Sincronizar ahora"}
              </button>
              <button
                type="button"
                onClick={disconnect}
                disabled={pending}
                className="rounded border border-line px-4 py-2 text-sm text-muted hover:border-red-700 hover:text-red-700 disabled:opacity-50"
              >
                Desconectar
              </button>
            </div>
          ) : (
            <button
              type="button"
              onClick={connect}
              disabled={!configured}
              className="rounded border border-line px-4 py-2 text-sm text-muted hover:border-accent hover:text-accent disabled:opacity-50"
            >
              Conectar Google
            </button>
          )}
        </div>

        {!configured ? (
          <p className="text-xs text-muted">
            Sin credenciales de Google (GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET,
            YOUTUBE_REDIRECT_URI) esta parte queda desactivada. El feed de
            recomendaciones sigue funcionando con la cookie.
          </p>
        ) : null}

        {connected ? (
          <div className="flex flex-col gap-1">
            <p className="text-xs text-muted">
              Conectado como {channelTitle ?? "tu canal"}.
              {lastSyncedAt
                ? ` Última sincronización: ${new Date(lastSyncedAt).toLocaleString("es-ES")}.`
                : " Aún sin sincronizar."}
            </p>
            {!channelTitle ? (
              <p className="text-xs text-red-700">
                Google no devolvió tu canal. Si es una cuenta de marca (Brand
                Account), pulsa «Desconectar» y vuelve a conectar eligiendo el
                canal en la pantalla de Google.
              </p>
            ) : null}
          </div>
        ) : null}

        {notice ? <p className="text-xs text-muted">{notice}</p> : null}
        {message ? <p className="text-xs text-muted">{message}</p> : null}
        {errors.length > 0 ? (
          <ul className="flex flex-col gap-1 text-xs text-red-700">
            {errors.map((error, index) => (
              <li key={index}>· {error}</li>
            ))}
          </ul>
        ) : null}
      </div>

      <div className="flex flex-col gap-2 border-t border-line pt-4">
        <h3 className="text-sm font-semibold">Feed de recomendaciones</h3>
        <p className="text-xs text-muted">
          Solo necesita la cookie de tu sesión de YouTube; no hace falta conectar
          Google. Abre{" "}
          <code className="rounded bg-paper px-1">
            tools/youtube-cookie-wizard/Iniciar.bat
          </code>{" "}
          y sigue los pasos: exporta la cookie de tu navegador, comprueba la
          sesión y la guarda aquí. También puedes pegar la cabecera «cookie» o el
          contenido de un{" "}
          <code className="rounded bg-paper px-1">cookies.txt</code> de Netscape.
          Se guarda cifrada.
        </p>
        <textarea
          value={cookie}
          onChange={(event) => setCookie(event.target.value)}
          rows={4}
          placeholder={
            "# Netscape HTTP Cookie File…\nO SID=...; HSID=...; __Secure-1PSID=..."
          }
          className="w-full rounded border border-line bg-white px-2 py-1 font-mono text-xs"
        />
        <div className="flex flex-wrap items-center gap-2">
          <label className="cursor-pointer rounded border border-line px-3 py-1.5 text-xs text-muted hover:border-accent hover:text-accent">
            Subir cookies.txt
            <input
              type="file"
              accept=".txt,text/plain"
              className="sr-only"
              onChange={(event) => loadCookieFile(event.target.files?.[0])}
            />
          </label>
          <button
            type="button"
            onClick={saveCookie}
            disabled={pending || checking || cookie.trim().length < 10}
            className="rounded border border-line px-3 py-1.5 text-xs text-muted hover:border-accent hover:text-accent disabled:opacity-50"
          >
            {pending ? "Guardando…" : "Guardar cookie"}
          </button>
          <button
            type="button"
            onClick={checkCookie}
            disabled={pending || checking || !cookieState}
            className="rounded border border-line px-3 py-1.5 text-xs text-muted hover:border-accent hover:text-accent disabled:opacity-50"
          >
            {checking ? "Comprobando…" : "Comprobar cookie"}
          </button>
          <button
            type="button"
            onClick={refreshRecommendations}
            disabled={pending || checking || !cookieState}
            className="rounded border border-line px-3 py-1.5 text-xs text-muted hover:border-accent hover:text-accent disabled:opacity-50"
          >
            Actualizar recomendaciones
          </button>
          {cookieState ? (
            <button
              type="button"
              onClick={clearCookie}
              disabled={pending || checking}
              className="rounded border border-line px-3 py-1.5 text-xs text-muted hover:border-red-700 hover:text-red-700 disabled:opacity-50"
            >
              Borrar cookie
            </button>
          ) : null}
        </div>
        {cookieState ? (
          <p className="text-xs text-muted">Hay una cookie guardada.</p>
        ) : null}
        {cookieMessage ? (
          <p className="text-xs text-muted">{cookieMessage}</p>
        ) : null}
        {cookieStatus ? (
          <p className="text-xs text-ink/80">{cookieStatus}</p>
        ) : null}
        {notes.length > 0 ? (
          <ul className="flex flex-col gap-1 text-xs text-muted">
            {notes.map((note, index) => (
              <li key={index}>· {note}</li>
            ))}
          </ul>
        ) : null}
      </div>
    </section>
  );
}
