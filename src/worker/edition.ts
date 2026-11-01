import "dotenv/config";

import { eq } from "drizzle-orm";

import { db } from "@/db";
import { users } from "@/db/schema";
import { generateEdition } from "@/lib/recommendation/engine";

async function main(): Promise<void> {
  const activeUsers = await db
    .select({ id: users.id, name: users.name })
    .from(users)
    .where(eq(users.isActive, true));

  if (activeUsers.length === 0) {
    console.log("[edición] No hay usuarios activos.");
    return;
  }

  for (const user of activeUsers) {
    const result = await generateEdition(user.id);
    console.log(
      `[edición] ${user.name} · ${result.editionDate} · ${result.items.length} ítems · algoritmo ${result.algorithmVersion}`,
    );
    for (const item of result.items) {
      console.log(`  ${item.position}. [${item.origin}] ${item.title}`);
      console.log(`     motivo: ${item.reason}`);
    }
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
