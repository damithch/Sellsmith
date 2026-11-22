import { loadEnvConfig } from "@next/env";
import { defineConfig } from "drizzle-kit";

// drizzle-kit runs as its own CLI, outside Next.js's dev server, so it
// never sees .env.local automatically. @next/env is the same loader
// Next itself uses, so this reads .env.local with the same precedence
// rules Next would — see docs/decisions.md.
loadEnvConfig(process.cwd());

export default defineConfig({
  schema: "./src/server/db/schema",
  out: "./drizzle",
  dialect: "postgresql",
  dbCredentials: {
    // Drizzle Kit (the CLI) reads straight from process.env — it does
    // not go through our own src/server/db/client.ts.
    url: process.env.DATABASE_URL!,
  },
});
