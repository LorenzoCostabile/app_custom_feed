import { redirect } from "next/navigation";

import { ReproduceActions } from "@/components/ReproduceActions";
import { SavedItemActions } from "@/components/SavedItemActions";
import { getCurrentUser } from "@/lib/auth/current-user";
import { formatDuration, reproduceTarget } from "@/lib/freetube";
import { getSavedItems } from "@/lib/queries";

export const dynamic = "force-dynamic";

const FORMAT_LABELS: Record<string, string> = {
  video: "Vídeo",
  podcast: "Podcast",
  article: "Artículo",
};

export default async function BibliotecaPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  let items: Awaited<ReturnType<typeof getSavedItems>> = [];
  let dbError = false;
  try {
    items = await getSavedItems(user.id);
  } catch {
    dbError = true;
  }

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-xl font-semibold">Biblioteca</h1>
        <p className="mt-1 text-xs text-muted">
          Lo que has decidido que merece tu tiempo.
        </p>
      </div>

      {dbError ? (
        <p className="rounded border border-line p-4 text-sm text-muted">
          No se pudo conectar con la base de datos.
        </p>
      ) : null}

      {!dbError && items.length === 0 ? (
        <p className="rounded border border-line p-4 text-sm text-muted">
          Todavía no has guardado nada. Los contenidos que guardes aparecerán
          aquí.
        </p>
      ) : null}

      {items.map((item) => {
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
            key={item.savedId}
            className="rounded border border-line bg-white/60 p-4"
          >
            <h2
              className={`text-base font-medium leading-snug ${
                item.status === "consumed" ? "text-muted" : ""
              }`}
            >
              {item.title}
            </h2>
            <p className="mt-1 text-xs text-muted">{meta}</p>
            <div className="mt-3 flex flex-col gap-3">
              <ReproduceActions url={target.externalUrl} freeTubeUrl={target.freeTubeUrl} />
              <SavedItemActions itemId={item.itemId} status={item.status} />
            </div>
          </article>
        );
      })}
    </div>
  );
}
