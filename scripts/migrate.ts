import "dotenv/config";

import { migrate } from "drizzle-orm/postgres-js/migrator";

import { db } from "@/db";

async function main(): Promise<void> {
  await migrate(db, { migrationsFolder: "drizzle" });
  console.log("[migrate] Migraciones aplicadas.");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
