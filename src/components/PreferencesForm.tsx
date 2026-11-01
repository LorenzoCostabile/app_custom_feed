"use client";

import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";

type Props = {
  allowedFormats: string[];
  minDurationSeconds: number | null;
  maxDurationSeconds: number | null;
  editionSize: number;
};

const FORMATS = [
  { value: "video", label: "Vídeos" },
  { value: "podcast", label: "Podcasts" },
  { value: "article", label: "Lecturas" },
];

export function PreferencesForm({
  allowedFormats,
  minDurationSeconds,
  maxDurationSeconds,
  editionSize,
}: Props) {
  const router = useRouter();
  const [formats, setFormats] = useState<string[]>(allowedFormats);
  const [min, setMin] = useState(minDurationSeconds?.toString() ?? "");
  const [max, setMax] = useState(maxDurationSeconds?.toString() ?? "");
  const [size, setSize] = useState(editionSize.toString());
  const [pending, setPending] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  function toggle(value: string) {
    setFormats((current) =>
      current.includes(value)
        ? current.filter((item) => item !== value)
        : [...current, value],
    );
  }

  async function submit(event: FormEvent) {
    event.preventDefault();
    setPending(true);
    setMessage(null);
    try {
      const response = await fetch("/api/preferences", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          allowedFormats: formats,
          minDurationSeconds: min === "" ? null : Number(min) * 60,
          maxDurationSeconds: max === "" ? null : Number(max) * 60,
          editionSize: size === "" ? undefined : Number(size),
        }),
      });
      if (!response.ok) throw new Error("No se pudieron guardar las preferencias.");
      setMessage("Preferencias guardadas.");
      router.refresh();
    } catch (cause) {
      setMessage(cause instanceof Error ? cause.message : "Error inesperado.");
    } finally {
      setPending(false);
    }
  }

  return (
    <form
      onSubmit={submit}
      className="flex flex-col gap-3 rounded border border-line bg-white/60 p-4"
    >
      <h2 className="text-sm font-semibold">Preferencias explícitas</h2>
      <div className="flex flex-wrap gap-4">
        {FORMATS.map((format) => (
          <label key={format.value} className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={formats.includes(format.value)}
              onChange={() => toggle(format.value)}
            />
            {format.label}
          </label>
        ))}
      </div>
      <div className="flex flex-wrap gap-3">
        <label className="flex items-center gap-2 text-sm">
          Duración mínima (min)
          <input
            type="number"
            min={0}
            value={min}
            onChange={(event) => setMin(event.target.value)}
            className="w-24 rounded border border-line bg-white px-2 py-1 text-sm"
          />
        </label>
        <label className="flex items-center gap-2 text-sm">
          Duración máxima (min)
          <input
            type="number"
            min={0}
            value={max}
            onChange={(event) => setMax(event.target.value)}
            className="w-24 rounded border border-line bg-white px-2 py-1 text-sm"
          />
        </label>
        <label className="flex items-center gap-2 text-sm">
          Recomendaciones por edición
          <input
            type="number"
            min={1}
            max={50}
            value={size}
            onChange={(event) => setSize(event.target.value)}
            className="w-24 rounded border border-line bg-white px-2 py-1 text-sm"
          />
        </label>
      </div>
      <div className="flex items-center gap-3">
        <button
          type="submit"
          disabled={pending}
          className="rounded bg-accent px-4 py-2 text-sm text-white hover:opacity-90 disabled:opacity-50"
        >
          Guardar
        </button>
        {message ? <span className="text-xs text-muted">{message}</span> : null}
      </div>
    </form>
  );
}
