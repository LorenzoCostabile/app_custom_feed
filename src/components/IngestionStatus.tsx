import type { IngestionRunView } from "@/lib/queries";

function timeAgo(date: Date): string {
  const seconds = Math.round((Date.now() - date.getTime()) / 1000);
  if (seconds < 60) return "hace unos segundos";
  const minutes = Math.round(seconds / 60);
  if (minutes < 60) return `hace ${minutes} min`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `hace ${hours} h`;
  const days = Math.round(hours / 24);
  return `hace ${days} d`;
}

export function IngestionStatus({ runs }: { runs: IngestionRunView[] }) {
  return (
    <section className="flex flex-col gap-4">
      <h2 className="text-sm font-semibold">Estado de ingesta</h2>

      {runs.length === 0 ? (
        <p className="rounded border border-line p-4 text-sm text-muted">
          Todavía no se ha ejecutado ninguna ingesta.
        </p>
      ) : (
        <ul className="flex flex-col gap-2">
          {runs.map((run) => (
            <li
              key={run.id}
              className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1 rounded border border-line bg-white/60 px-4 py-3 text-xs"
            >
              <span className="text-sm font-medium">{run.sourceTitle}</span>
              <span
                className={
                  run.status === "error" ? "text-red-700" : "text-muted"
                }
              >
                {run.status === "error"
                  ? `Error: ${run.error ?? "desconocido"}`
                  : "Correcta"}
              </span>
              <span className="text-muted">
                {run.itemsFound} encontradas · {run.itemsNew} nuevas
              </span>
              <span className="text-muted">{timeAgo(run.startedAt)}</span>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
