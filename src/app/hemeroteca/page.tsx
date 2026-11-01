import Link from "next/link";
import { redirect } from "next/navigation";

import { SaveButton } from "@/components/SaveButton";
import { getCurrentUser } from "@/lib/auth/current-user";
import { formatDuration, reproduceTarget } from "@/lib/freetube";
import {
  getHemeroteca,
  getSavedItemIdsForEdition,
  listSourceOptions,
  listTopics,
} from "@/lib/queries";

export const dynamic = "force-dynamic";

const FORMAT_LABELS: Record<string, string> = {
  video: "Vídeo",
  podcast: "Podcast",
  article: "Artículo",
};

type SearchParams = {
  q?: string;
  source?: string;
  topic?: string;
  page?: string;
};

export default async function HemerotecaPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const page = Number.parseInt(searchParams.page ?? "1", 10) || 1;

  let result: Awaited<ReturnType<typeof getHemeroteca>> = {
    items: [],
    total: 0,
    page,
    pageSize: 20,
  };
  let sourceOptions: Awaited<ReturnType<typeof listSourceOptions>> = [];
  let topicOptions: Awaited<ReturnType<typeof listTopics>> = [];
  let dbError = false;

  try {
    [result, sourceOptions, topicOptions] = await Promise.all([
      getHemeroteca(user.id, {
        query: searchParams.q,
        sourceId: searchParams.source,
        topicId: searchParams.topic,
        page,
        pageSize: 20,
      }),
      listSourceOptions(user.id),
      listTopics(user.id),
    ]);
  } catch {
    dbError = true;
  }

  const savedIds = await getSavedItemIdsForEdition(
    user.id,
    result.items.map((item) => item.id),
  );

  const totalPages = Math.max(1, Math.ceil(result.total / result.pageSize));

  function pageHref(target: number): string {
    const params = new URLSearchParams();
    if (searchParams.q) params.set("q", searchParams.q);
    if (searchParams.source) params.set("source", searchParams.source);
    if (searchParams.topic) params.set("topic", searchParams.topic);
    params.set("page", String(target));
    return `/hemeroteca?${params.toString()}`;
  }

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-xl font-semibold">Hemeroteca</h1>
        <p className="mt-1 text-xs text-muted">
          Todas las publicaciones de tus fuentes, por consulta intencional.
          Sin contadores de pendientes.
        </p>
      </div>

      <form className="flex flex-col gap-3" method="get">
        <input
          type="search"
          name="q"
          defaultValue={searchParams.q ?? ""}
          placeholder="Buscar por título o descripción"
          className="rounded border border-line bg-white px-3 py-2 text-sm outline-none focus:border-accent"
        />
        <div className="flex flex-wrap gap-3">
          <select
            name="source"
            defaultValue={searchParams.source ?? ""}
            className="rounded border border-line bg-white px-3 py-2 text-sm"
          >
            <option value="">Todas las fuentes</option>
            {sourceOptions.map((source) => (
              <option key={source.id} value={source.id}>
                {source.title}
              </option>
            ))}
          </select>
          <select
            name="topic"
            defaultValue={searchParams.topic ?? ""}
            className="rounded border border-line bg-white px-3 py-2 text-sm"
          >
            <option value="">Todos los temas</option>
            {topicOptions.map((topic) => (
              <option key={topic.id} value={topic.id}>
                {topic.name}
              </option>
            ))}
          </select>
          <button
            type="submit"
            className="rounded bg-accent px-4 py-2 text-sm text-white hover:opacity-90"
          >
            Buscar
          </button>
        </div>
      </form>

      {dbError ? (
        <p className="rounded border border-line p-4 text-sm text-muted">
          No se pudo conectar con la base de datos.
        </p>
      ) : null}

      {!dbError && result.items.length === 0 ? (
        <p className="rounded border border-line p-4 text-sm text-muted">
          No hay publicaciones que coincidan.
        </p>
      ) : null}

      <div className="flex flex-col gap-4">
        {result.items.map((item) => {
          const target = reproduceTarget(item.url);
          const duration = formatDuration(item.durationSeconds);
          const meta = [
            FORMAT_LABELS[item.format] ?? item.format,
            duration,
            item.sourceTitle,
          ]
            .filter(Boolean)
            .join(" · ");

          return (
            <article
              key={item.id}
              className="rounded border border-line bg-white/60 p-4"
            >
              <h2 className="text-base font-medium leading-snug">
                {item.title}
              </h2>
              <p className="mt-1 text-xs text-muted">{meta}</p>
              {item.summary ? (
                <p className="mt-2 line-clamp-3 text-sm text-ink/70">
                  {item.summary}
                </p>
              ) : null}
              <div className="mt-3">
                <SaveButton
                  itemId={item.id}
                  initiallySaved={savedIds.has(item.id)}
                />
              </div>
            </article>
          );
        })}
      </div>

      {totalPages > 1 ? (
        <nav className="flex items-center justify-between border-t border-line pt-4 text-sm text-muted">
          {page > 1 ? (
            <Link href={pageHref(page - 1)} className="text-accent hover:underline">
              Anterior
            </Link>
          ) : (
            <span />
          )}
          <span>
            Página {page} de {totalPages}
          </span>
          {page < totalPages ? (
            <Link href={pageHref(page + 1)} className="text-accent hover:underline">
              Siguiente
            </Link>
          ) : (
            <span />
          )}
        </nav>
      ) : null}
    </div>
  );
}
