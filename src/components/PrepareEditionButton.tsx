"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

type Props = {
  hasSources: boolean;
};

export function PrepareEditionButton({ hasSources }: Props) {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [step, setStep] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [isError, setIsError] = useState(false);

  async function run() {
    setPending(true);
    setMessage(null);
    setIsError(false);
    setStep("Actualizando fuentes…");
    try {
      let newItems = 0;
      if (hasSources) {
        const ingest = await fetch("/api/ingest", { method: "POST" });
        if (!ingest.ok) throw new Error("La ingesta de fuentes falló.");
        const data = await ingest.json();
        newItems = (data.results ?? []).reduce(
          (acc: number, result: { itemsNew: number }) => acc + result.itemsNew,
          0,
        );
      }

      setStep("Generando edición…");
      const edition = await fetch("/api/edition", { method: "POST" });
      if (!edition.ok) throw new Error("No se pudo generar la edición.");
      const summary = await edition.json();

      setMessage(
        `${newItems} publicaciones nuevas · edición ${summary.editionDate} con ${summary.size} recomendaciones.`,
      );
      router.refresh();
    } catch (cause) {
      setIsError(true);
      setMessage(cause instanceof Error ? cause.message : "Error inesperado.");
    } finally {
      setStep(null);
      setPending(false);
    }
  }

  return (
    <div className="flex flex-wrap items-center gap-3">
      <button
        type="button"
        onClick={run}
        disabled={pending}
        className="rounded border border-line px-4 py-2 text-sm text-muted hover:border-accent hover:text-accent disabled:opacity-50"
      >
        {pending ? (step ?? "Trabajando…") : "Generar edición ahora"}
      </button>
      {message ? (
        <span className={`text-xs ${isError ? "text-red-700" : "text-muted"}`}>
          {message}
        </span>
      ) : null}
    </div>
  );
}
