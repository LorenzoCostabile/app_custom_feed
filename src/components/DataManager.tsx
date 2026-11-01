"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export function DataManager() {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  async function erase() {
    const confirmed = window.confirm(
      "Esto borrará fuentes, temas, preferencias, biblioteca, valoraciones y ediciones. ¿Continuar?",
    );
    if (!confirmed) return;

    setPending(true);
    setMessage(null);
    try {
      const response = await fetch("/api/data", { method: "DELETE" });
      if (!response.ok) throw new Error("No se pudieron borrar los datos.");
      setMessage("Todos tus datos han sido borrados.");
      router.refresh();
    } catch (cause) {
      setMessage(cause instanceof Error ? cause.message : "Error inesperado.");
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="flex flex-col gap-3 rounded border border-line bg-white/60 p-4">
      <h2 className="text-sm font-semibold">Tus datos</h2>
      <p className="text-xs text-muted">
        Atención no registra tiempo de reproducción, hora de acceso ni
        frecuencia de apertura. Puedes exportar y borrar todo.
      </p>
      <div className="flex flex-wrap items-center gap-3">
        <a
          href="/api/export"
          className="rounded border border-line px-4 py-2 text-sm text-muted hover:border-accent hover:text-accent"
        >
          Exportar datos
        </a>
        <button
          type="button"
          onClick={erase}
          disabled={pending}
          className="rounded border border-line px-4 py-2 text-sm text-red-700 hover:border-red-700 disabled:opacity-50"
        >
          Borrar todos mis datos
        </button>
        {message ? <span className="text-xs text-muted">{message}</span> : null}
      </div>
    </div>
  );
}
