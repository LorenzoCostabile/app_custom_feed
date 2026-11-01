import { getCurrentUser } from "@/lib/auth/current-user";
import { listCollections } from "@/lib/queries";
import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

function formatDuration(seconds: number | null): string {
  if (!seconds) return "";
  const minutes = Math.round(seconds / 60);
  return `${minutes} min`;
}

export default async function ColeccionesPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  let collections: Awaited<ReturnType<typeof listCollections>> = [];
  let dbError = false;

  try {
    collections = await listCollections(user.id);
  } catch {
    dbError = true;
  }

  const watchLater = collections.filter((c) => c.kind === "watch_later");
  const playlists = collections.filter((c) => c.kind === "playlist");

  return (
    <div className="flex flex-col gap-8">
      <div>
        <h1 className="text-xl font-semibold">Colecciones</h1>
        <p className="mt-1 text-xs text-muted">
          Playlists y «Ver más tarde» importadas de tu cuenta de YouTube.
        </p>
      </div>

      {dbError ? (
        <p className="rounded border border-line p-4 text-sm text-muted">
          No se pudo conectar con la base de datos.
        </p>
      ) : null}

      {!dbError && collections.length === 0 ? (
        <p className="rounded border border-line p-4 text-sm text-muted">
          Aún no hay colecciones. Conecta tu cuenta de YouTube en Fuentes para
          importarlas.
        </p>
      ) : null}

      {[...watchLater, ...playlists].map((collection) => (
        <section key={collection.id} className="flex flex-col gap-3">
          <div className="flex flex-wrap items-baseline justify-between gap-2">
            <h2 className="text-sm font-semibold">
              {collection.title}
              {collection.kind === "watch_later" ? (
                <span className="ml-2 text-xs font-normal text-muted">
                  Ver más tarde
                </span>
              ) : null}
            </h2>
            <span className="text-xs text-muted">
              {collection.itemCount}{" "}
              {collection.itemCount === 1 ? "elemento" : "elementos"}
            </span>
          </div>

          {collection.items.length === 0 ? (
            <p className="rounded border border-line p-4 text-sm text-muted">
              Esta colección está vacía.
            </p>
          ) : (
            <ul className="flex flex-col gap-2">
              {collection.items.map((item) => (
                <li
                  key={item.id}
                  className="flex flex-col gap-1 rounded border border-line bg-white/60 p-3"
                >
                  <a
                    href={item.url}
                    target="_blank"
                    rel="noreferrer"
                    className="text-sm font-medium hover:text-accent"
                  >
                    {item.title}
                  </a>
                  <span className="text-xs text-muted">
                    {item.channelTitle ?? "Canal desconocido"}
                    {item.durationSeconds
                      ? ` · ${formatDuration(item.durationSeconds)}`
                      : ""}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </section>
      ))}
    </div>
  );
}
