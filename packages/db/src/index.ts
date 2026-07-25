import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import * as authSchema from "./auth-schema";
import * as appSchema from "./schema";

const databaseUrl = process.env.DATABASE_URL;

if (!databaseUrl) {
  throw new Error("DATABASE_URL is required");
}

const globalForDatabase = globalThis as typeof globalThis & {
  vibenotiPool?: Pool;
};

const pool =
  globalForDatabase.vibenotiPool ??
  new Pool({
    connectionString: databaseUrl,
    max: 5,
    idleTimeoutMillis: 30_000,
    connectionTimeoutMillis: 10_000,
    allowExitOnIdle: true,
  });

if (process.env.NODE_ENV !== "production") {
  globalForDatabase.vibenotiPool = pool;
}

export const db = drizzle(pool, {
  schema: { ...authSchema, ...appSchema },
});
export { appSchema, authSchema };
export * from "./schema";
