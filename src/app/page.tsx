import Link from "next/link";
import { redirect } from "next/navigation";

import { PrepareEditionButton } from "@/components/PrepareEditionButton";
import { SaveButton } from "@/components/SaveButton";
import { getCurrentUser } from "@/lib/auth/current-user";
import { formatDuration, reproduceTarget } from "@/lib/freetube";
import {
  getLatestEdition,
  getSavedItemIdsForEdition,
  listSources,
  type EditionItemView,
  type EditionView,
} from "@/lib/queries";

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
    const key = item.origin;
    const list = groups.get(key) ?? [];
    list.push(item);
    groups.set(key, list);
  }
  return [...groups.entries()];
}

export default async function EditionPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  let edition: EditionView | null = null;
  let hasSources = false;
  let dbError = false;
  try {
    edition = await getLatestEdition(user.id);
    const sourceList = await listSources(user.id);
    hasSources = sourceList.length > 0;
  } catch {
    dbError = true;
  }

  const savedIds = edition
    ? await getSavedItemIdsForEdition(
        user.id,
        edition.items.map((item) => item.itemId),
      )
    : new Set<string>();

  return (
    <div className="flex flex-col gap-8">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold">Tu edición de hoy</h1>
          {edition ? (
            <p className="mt-1 text-xs text-muted">
              {edition.editionDate} · algoritmo {edition.algorithmVersion}
            </p>
          ) : null}
        </div>
        <div className="flex items-center gap-4">
          <Link href="/historial" className="text-xs text-accent hover:underline">
            Historial de ediciones
          </Link>
          <PrepareEditionButton hasSources={hasSources} />
        </div>
      </div>

      {dbError ? (
        <p className="rounded border border-line p-4 text-sm text-muted">
          No se pudo conectar con la base de datos. Configura DATABASE_URL y
          ejecuta las migraciones.
        </p>
      ) : null}

      {!dbError && (!edition || edition.items.length === 0) ? (
        <div className="rounded border border-line p-4 text-sm text-muted">
          <p>Hoy no hay recomendaciones.</p>
          <p className="mt-1">
            Puedes añadir fuentes en{" "}
            <Link href="/fuentes" className="text-accent hover:underline">
              Fuentes
            </Link>{" "}
            o explorar la{" "}
            <Link href="/hemeroteca" className="text-accent hover:underline">
              hemeroteca
            </Link>
            .
          </p>
          <div className="mt-3">
            <PrepareEditionButton hasSources={hasSources} />
          </div>
        </div>
      ) : null}

      {edition
        ? groupByOrigin(edition.items).map(([origin, items]) => (
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
                    <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
                      <SaveButton
                        itemId={item.itemId}
                        initiallySaved={savedIds.has(item.itemId)}
                      />
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
          ))
        : null}

      {edition && edition.items.length > 0 ? (
        <div className="border-t border-line pt-4 text-sm text-muted">
          <p className="font-medium text-ink">Fin de la edición.</p>
          <p>No hay más recomendaciones hoy.</p>
        </div>
      ) : null}
    </div>
  );
}
