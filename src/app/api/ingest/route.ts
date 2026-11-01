import { NextResponse } from "next/server";

import { getApiUser, unauthorized } from "@/lib/auth/api";
import { ingestAllSources } from "@/lib/ingestion/ingest";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

export async function POST() {
  const user = await getApiUser();
  if (!user) return unauthorized();

  const results = await ingestAllSources({ userId: user.id });
  return NextResponse.json({ results });
}
