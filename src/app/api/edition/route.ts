import { NextResponse } from "next/server";

import { getApiUser, unauthorized } from "@/lib/auth/api";
import { generateEdition } from "@/lib/recommendation/engine";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

export async function POST() {
  const user = await getApiUser();
  if (!user) return unauthorized();

  const result = await generateEdition(user.id);
  return NextResponse.json({
    editionId: result.editionId,
    editionDate: result.editionDate,
    algorithmVersion: result.algorithmVersion,
    size: result.items.length,
  });
}
