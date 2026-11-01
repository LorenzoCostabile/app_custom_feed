"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export function IngestButton() {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  async function run() {
    setPending(true);
    setMessage(null);
    try {
      const response = await fetch("/api/ingest", { method: "POST" });
      if (!response.ok) throw new Error("La ingesta falló.");
      const data = await response.json();
      const total = data.results.reduce(
        (acc: number, result: { itemsNew: number }) => acc + result.itemsNew,
        0,
      );
      setMessage(`${total} publicaciones nuevas.`);
      router.refresh();
    } catch (cause) {
      setMessage(cause instanceof Error ? cause.message : "Error inesperado.");
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="flex items-center gap-3">
      <button
        type="button"
        onClick={run}
        disabled={pending}
        className="rounded border border-line px-4 py-2 text-sm text-muted hover:border-accent hover:text-accent disabled:opacity-50"
      >
        {pending ? "Actualizando fuentes…" : "Actualizar fuentes ahora"}
      </button>
      {message ? <span className="text-xs text-muted">{message}</span> : null}
    </div>
  );
}
