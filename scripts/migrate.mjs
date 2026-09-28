import path from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";
import { config } from "dotenv";
import pg from "pg";
import { runMigrations } from "./lib/migrations.mjs";

config({ path: ".env.local" });
config({ path: ".env" });

const connectionString = process.env.DATABASE_ADMIN_URL;
if (!connectionString) {
  throw new Error("Set DATABASE_ADMIN_URL before migrating");
}

let url;
try {
  url = new URL(connectionString);
} catch {
  // URL parser errors include their input, which would expose credentials.
  throw new Error(
    "DATABASE_ADMIN_URL must be a complete PostgreSQL connection URL",
  );
}
if (!["postgres:", "postgresql:"].includes(url.protocol)) {
  throw new Error("DATABASE_ADMIN_URL must be a PostgreSQL connection URL");
}
if (url.hostname.includes("-pooler.")) {
  throw new Error(
    "DATABASE_ADMIN_URL must use the direct Neon URL with pooling OFF",
  );
}

const directory = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "../migrations",
);
const client = new pg.Client({
  connectionString,
  connectionTimeoutMillis: 10_000,
});
try {
  await client.connect();
  await runMigrations(client, directory);
} finally {
  await client.end();
}
