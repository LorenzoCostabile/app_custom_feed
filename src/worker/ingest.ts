import "dotenv/config";

import { ingestAllSources } from "@/lib/ingestion/ingest";

async function main(): Promise<void> {
  const results = await ingestAllSources();
  for (const result of results) {
    const detail =
      result.status === "ok"
        ? `${result.itemsNew} nuevos de ${result.itemsFound}`
        : `error: ${result.error}`;
    console.log(`[ingesta] ${result.sourceTitle}: ${detail}`);
  }
  if (results.length === 0) {
    console.log("[ingesta] No hay fuentes activas.");
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
