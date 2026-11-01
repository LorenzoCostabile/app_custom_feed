import { drizzle, type PostgresJsDatabase } from "drizzle-orm/postgres-js";
import postgres from "postgres";

import * as schema from "./schema";

type Database = PostgresJsDatabase<typeof schema>;

function createDatabase(): Database {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    throw new Error("DATABASE_URL no está definida.");
  }
  const client = postgres(connectionString, { max: 5 });
  return drizzle(client, { schema });
}

let instance: Database | null = null;

export function getDb(): Database {
  if (!instance) {
    instance = createDatabase();
  }
  return instance;
}

export const db = new Proxy({} as Database, {
  get(_target, property) {
    const real = getDb() as unknown as Record<string | symbol, unknown>;
    const value = real[property];
    return typeof value === "function" ? value.bind(real) : value;
  },
});

export { schema };
