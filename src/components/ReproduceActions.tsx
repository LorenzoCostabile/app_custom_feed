"use client";

import { useState } from "react";

export function ReproduceActions({
  url,
  freeTubeUrl,
}: {
  url: string;
  freeTubeUrl: string | null;
}) {
  const [copied, setCopied] = useState(false);

  async function copy() {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      setCopied(false);
    }
  }

  return (
    <div className="flex flex-wrap items-center gap-3 text-xs">
      {freeTubeUrl ? (
        <a href={freeTubeUrl} className="text-accent hover:underline">
          Abrir en FreeTube
        </a>
      ) : null}
      <a
        href={url}
        target="_blank"
        rel="noreferrer"
        className="text-accent hover:underline"
      >
        Abrir enlace
      </a>
      <button
        type="button"
        onClick={copy}
        className="text-muted hover:text-ink"
      >
        {copied ? "Enlace copiado" : "Copiar enlace"}
      </button>
    </div>
  );
}
