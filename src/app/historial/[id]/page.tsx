import Link from "next/link";
import { notFound, redirect } from "next/navigation";

import { getCurrentUser } from "@/lib/auth/current-user";
import { formatDuration, reproduceTarget } from "@/lib/freetube";
import { getEditionById, type EditionItemView } from "@/lib/queries";

export const dynamic = "force-dynamic";

const ORIGIN_LABELS: Record<string, string> = {
  followed: "De tus fuentes",
  discovery: "Descubrimiento",
  contextual: "Actualidad",
};

const FORMAT_LABELS: Record<string, string> = {
  video: "Vídeo",
  podcast: "Podcast",
  article: "Artículo",
};

function metaLine(item: EditionItemView): string {
  const parts = [FORMAT_LABELS[item.format] ?? item.format];
  const duration = formatDuration(item.durationSeconds);
  if (duration) parts.push(duration);
  parts.push(item.sourceTitle);
  return parts.join(" · ");
}

function groupByOrigin(items: EditionItemView[]): [string, EditionItemView[]][] {
  const groups = new Map<string, EditionItemView[]>();
  for (const item of items) {
    const list = groups.get(item.origin) ?? [];
    list.push(item);
    groups.set(item.origin, list);
  }
  return [...groups.entries()];
}

export default async function EditionDetailPage({
  params,
}: {
  params: { id: string };
}) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const edition = await getEditionById(user.id, params.id);
  if (!edition) notFound();

  return (
    <div className="flex flex-col gap-8">
      <div>
        <Link href="/historial" className="text-xs text-accent hover:underline">
          ← Historial de ediciones
        </Link>
        <h1 className="mt-2 text-xl font-semibold">
          Edición del {edition.editionDate}
        </h1>
        <p className="mt-1 text-xs text-muted">
          {edition.items.length} recomendaciones · algoritmo{" "}
          {edition.algorithmVersion}
        </p>
      </div>

      {edition.items.length === 0 ? (
        <p className="rounded border border-line p-4 text-sm text-muted">
          Esta edición se generó sin recomendaciones.
        </p>
      ) : null}

      {groupByOrigin(edition.items).map(([origin, items]) => (
        <section key={origin} className="flex flex-col gap-4">
          <h2 className="text-xs font-semibold uppercase tracking-wider text-muted">
            {ORIGIN_LABELS[origin] ?? origin}
          </h2>
          {items.map((item) => {
            const target = reproduceTarget(item.url);
            return (
              <article
                key={item.itemId}
                className="rounded border border-line bg-white/60 p-4"
              >
                <h3 className="text-base font-medium leading-snug">
                  {item.title}
                </h3>
                <p className="mt-1 text-xs text-muted">{metaLine(item)}</p>
                <p className="mt-2 text-sm text-ink/80">{item.reason}</p>
                <div className="mt-3">
                  {target.freeTubeUrl ? (
                    <a
                      href={target.freeTubeUrl}
                      className="text-xs text-accent hover:underline"
                    >
                      Abrir en FreeTube
                    </a>
                  ) : (
                    <a
                      href={target.externalUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="text-xs text-accent hover:underline"
                    >
                      Abrir fuente
                    </a>
                  )}
                </div>
              </article>
            );
          })}
        </section>
      ))}
    </div>
  );
}
