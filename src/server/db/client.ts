import postgres from "postgres";
import { drizzle } from "drizzle-orm/postgres-js";
import * as schema from "./schema/companies";

// Next.js's own dev server / build already loads .env.local for us here —
// unlike drizzle.config.ts, which runs as a separate CLI (see decisions.md).
const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  throw new Error("DATABASE_URL is not set. Copy .env.example to .env.local and fill it in.");
}

const client = postgres(connectionString);

export const db = drizzle(client, { schema });
