"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

type Props = {
  sourceId: string;
  isActive: boolean;
  isHidden: boolean;
  maxItemsPerEdition: number;
  weight: number;
};

async function patchSource(sourceId: string, patch: Record<string, unknown>) {
  const response = await fetch(`/api/sources/${sourceId}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(patch),
  });
  if (!response.ok) throw new Error("No se pudo actualizar la fuente.");
}

export function SourceControls({
  sourceId,
  isActive,
  isHidden,
  maxItemsPerEdition,
  weight,
}: Props) {
  const router = useRouter();
  const [active, setActive] = useState(isActive);
  const [hidden, setHidden] = useState(isHidden);
  const [maxItems, setMaxItems] = useState(String(maxItemsPerEdition));
  const [sourceWeight, setSourceWeight] = useState(String(weight));
  const [status, setStatus] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function update(patch: Record<string, unknown>) {
    setStatus("Guardando…");
    setError(null);
    try {
      await patchSource(sourceId, patch);
      setStatus("Guardado");
      router.refresh();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Error inesperado.");
      setStatus(null);
    }
  }

  return (
    <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-2 border-t border-line pt-2 text-xs">
      <label className="flex items-center gap-2">
        <input
          type="checkbox"
          checked={!hidden}
          onChange={(event) => {
            const value = event.target.checked;
            setHidden(!value);
            void update({ isHidden: !value });
          }}
        />
        Mostrar en la edición
      </label>

      <label className="flex items-center gap-2">
        <input
          type="checkbox"
          checked={active}
          onChange={(event) => {
            const value = event.target.checked;
            setActive(value);
            void update({ isActive: value });
          }}
        />
        Actualizar fuente
      </label>

      <label className="flex items-center gap-1">
        Máx. en edición
        <input
          type="number"
          min={0}
          max={50}
          value={maxItems}
          onChange={(event) => setMaxItems(event.target.value)}
          onBlur={() => {
            const value = Math.max(0, Math.floor(Number(maxItems) || 0));
            setMaxItems(String(value));
            if (value !== maxItemsPerEdition) void update({ maxItemsPerEdition: value });
          }}
          className="w-16 rounded border border-line bg-white px-1 py-0.5"
        />
      </label>

      <label className="flex items-center gap-1">
        Peso
        <input
          type="number"
          min={0}
          max={5}
          step={0.5}
          value={sourceWeight}
          onChange={(event) => setSourceWeight(event.target.value)}
          onBlur={() => {
            const value = Math.max(0, Math.min(5, Number(sourceWeight) || 0));
            setSourceWeight(String(value));
            if (value !== weight) void update({ weight: value });
          }}
          className="w-16 rounded border border-line bg-white px-1 py-0.5"
        />
      </label>

      {hidden ? <span className="text-muted">Oculta</span> : null}
      {!active ? <span className="text-muted">Pausada</span> : null}
      {error ? <span className="text-red-700">{error}</span> : null}
      {status ? <span className="text-muted">{status}</span> : null}
    </div>
  );
}
