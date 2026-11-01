import { AddSourceForm } from "@/components/AddSourceForm";
import { AddTopicForm } from "@/components/AddTopicForm";
import { DataManager } from "@/components/DataManager";
import { IngestionStatus } from "@/components/IngestionStatus";
import { IngestButton } from "@/components/IngestButton";
import { PreferencesForm } from "@/components/PreferencesForm";
import { SourceControls } from "@/components/SourceControls";
import { YoutubePanel } from "@/components/YoutubePanel";
import { getCurrentUser } from "@/lib/auth/current-user";
import { loadPreferences } from "@/lib/recommendation/engine";
import {
  getYoutubeAccount,
  listIngestionRuns,
  listSources,
  listTopics,
} from "@/lib/queries";
import { isYoutubeConfigured } from "@/lib/youtube/config";
import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

const KIND_LABELS: Record<string, string> = {
  youtube: "YouTube",
  podcast: "Podcast",
  news: "Medio",
};

const YOUTUBE_NOTICES: Record<string, string> = {
  connected: "Cuenta de YouTube conectada y sincronizada.",
  error: "No se pudo conectar la cuenta de YouTube.",
  state: "La verificación de seguridad de OAuth falló. Inténtalo de nuevo.",
};

export default async function FuentesPage({
  searchParams,
}: {
  searchParams: { youtube?: string; msg?: string };
}) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  let sourceList: Awaited<ReturnType<typeof listSources>> = [];
  let topicList: Awaited<ReturnType<typeof listTopics>> = [];
  let youtubeAccount: Awaited<ReturnType<typeof getYoutubeAccount>> = null;
  let ingestionRuns: Awaited<ReturnType<typeof listIngestionRuns>> = [];
  let prefs = {
    allowedFormats: ["video", "podcast", "article"],
    minDurationSeconds: null as number | null,
    maxDurationSeconds: null as number | null,
    editionSize: 10,
  };
  let dbError = false;

  try {
    [sourceList, topicList, prefs, youtubeAccount, ingestionRuns] =
      await Promise.all([
        listSources(user.id),
        listTopics(user.id),
        loadPreferences(user.id),
        getYoutubeAccount(user.id),
        listIngestionRuns(user.id, 25),
      ]);
  } catch {
    dbError = true;
  }

  const status = searchParams.youtube;
  const notice =
    status === "error" && searchParams.msg
      ? searchParams.msg
      : status
        ? (YOUTUBE_NOTICES[status] ?? null)
        : null;

  return (
    <div className="flex flex-col gap-8">
      <div>
        <h1 className="text-xl font-semibold">Fuentes y preferencias</h1>
        <p className="mt-1 text-xs text-muted">
          Aquí defines qué quieres seguir. La personalización es exclusivamente
          explícita.
        </p>
      </div>

      {dbError ? (
        <p className="rounded border border-line p-4 text-sm text-muted">
          No se pudo conectar con la base de datos.
        </p>
      ) : null}

      <YoutubePanel
        configured={isYoutubeConfigured()}
        connected={Boolean(youtubeAccount)}
        channelTitle={youtubeAccount?.channelTitle ?? null}
        lastSyncedAt={youtubeAccount?.lastSyncedAt?.toISOString() ?? null}
        notice={notice}
        hasCookie={youtubeAccount?.hasCookie ?? false}
      />

      <section className="flex flex-col gap-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-sm font-semibold">Fuentes seguidas</h2>
          <IngestButton />
        </div>

        {!dbError && sourceList.length === 0 ? (
          <p className="rounded border border-line p-4 text-sm text-muted">
            Aún no sigues ninguna fuente. Añade una para empezar.
          </p>
        ) : null}

        <ul className="flex flex-col gap-3">
          {sourceList.map((source) => (
            <li
              key={source.id}
              className="flex flex-col gap-1 rounded border border-line bg-white/60 p-4"
            >
              <div className="flex flex-wrap items-center justify-between gap-2">
                <span className="text-sm font-medium">{source.title}</span>
                <span className="text-xs text-muted">
                  {KIND_LABELS[source.kind] ?? source.kind}
                  {source.isFollowed ? "" : " · descubrimiento"}
                </span>
              </div>
              <span className="truncate text-xs text-muted">
                {source.feedUrl}
              </span>
              <span className="text-xs">
                {source.lastStatus === "error" ? (
                  <span className="text-red-700">
                    Con error: {source.lastError}
                  </span>
                ) : source.lastStatus === "ok" ? (
                  <span className="text-muted">Última ingesta correcta</span>
                ) : (
                  <span className="text-muted">Sin actualizar todavía</span>
                )}
              </span>
              <SourceControls
                sourceId={source.id}
                isActive={source.isActive}
                isHidden={source.isHidden}
                maxItemsPerEdition={source.maxItemsPerEdition}
                weight={source.weight}
              />
            </li>
          ))}
        </ul>

        <AddSourceForm />
      </section>

      {!dbError ? <IngestionStatus runs={ingestionRuns} /> : null}

      <section className="flex flex-col gap-4">
        <h2 className="text-sm font-semibold">Temas</h2>
        {!dbError && topicList.length === 0 ? (
          <p className="rounded border border-line p-4 text-sm text-muted">
            Define tus intereses para que el recomendador pueda clasificar
            contenidos.
          </p>
        ) : null}
        <ul className="flex flex-col gap-3">
          {topicList.map((topic) => (
            <li
              key={topic.id}
              className="rounded border border-line bg-white/60 p-4"
            >
              <div className="text-sm font-medium">{topic.name}</div>
              <div className="mt-1 text-xs text-muted">
                {topic.keywords.join(", ")}
              </div>
            </li>
          ))}
        </ul>
        <AddTopicForm />
      </section>

      <section>
        <PreferencesForm
          allowedFormats={prefs.allowedFormats}
          minDurationSeconds={
            prefs.minDurationSeconds
              ? Math.round(prefs.minDurationSeconds / 60)
              : null
          }
          maxDurationSeconds={
            prefs.maxDurationSeconds
              ? Math.round(prefs.maxDurationSeconds / 60)
              : null
          }
          editionSize={prefs.editionSize}
        />
      </section>

      <section>
        <DataManager />
      </section>
    </div>
  );
}
