"use client";

import { useState } from "react";

export function SavedItemActions({
  itemId,
  status,
}: {
  itemId: string;
  status: string;
}) {
  const [current, setCurrent] = useState(status);
  const [pending, setPending] = useState(false);
  const [removed, setRemoved] = useState(false);

  async function update(next: "saved" | "consumed" | "removed") {
    setPending(true);
    try {
      if (next === "removed") {
        await fetch("/api/saved", {
          method: "DELETE",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ itemId }),
        });
        setRemoved(true);
        return;
      }
      await fetch("/api/saved", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ itemId, status: next }),
      });
      setCurrent(next);
    } finally {
      setPending(false);
    }
  }

  if (removed) {
    return <span className="text-xs text-muted">Quitado de la biblioteca.</span>;
  }

  return (
    <div className="flex flex-wrap items-center gap-3 text-xs">
      <button
        type="button"
        disabled={pending || current === "consumed"}
        onClick={() => update("consumed")}
        className="text-accent hover:underline disabled:text-muted disabled:no-underline"
      >
        {current === "consumed" ? "Consumido" : "Marcar como consumido"}
      </button>
      {current === "consumed" ? (
        <button
          type="button"
          disabled={pending}
          onClick={() => update("saved")}
          className="text-muted hover:text-ink"
        >
          Volver a pendiente
        </button>
      ) : null}
      <button
        type="button"
        disabled={pending}
        onClick={() => update("removed")}
        className="text-muted hover:text-ink"
      >
        Quitar
      </button>
    </div>
  );
}
