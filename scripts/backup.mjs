// Dumps the database into a folder on this machine (D17): by default
// ~/way_of_life/backups, one pg_dump custom-format file per run, newest
// BACKUP_KEEP kept. pg_dump runs in Docker so no local PostgreSQL client is
// needed; its major version must be >= the server's (production Neon is 18).
import { spawn } from "node:child_process";
import { createWriteStream } from "node:fs";
import { chmod, mkdir, readdir, rename, rm, stat } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import process from "node:process";
import { config } from "dotenv";

config({ path: ".env.local", quiet: true });
config({ path: ".env", quiet: true });

const IMAGE = "postgres:18-alpine";
const PREFIX = "way-of-life-";
const SUFFIX = ".dump";

const source = process.env.BACKUP_DATABASE_URL;
if (!source) {
  throw new Error("Set BACKUP_DATABASE_URL (direct, non-pooled URL)");
}
let url;
try {
  url = new URL(source);
} catch {
  // URL parser errors include their input, which would expose credentials.
  throw new Error("BACKUP_DATABASE_URL must be a complete PostgreSQL URL");
}
if (url.hostname.includes("-pooler.")) {
  throw new Error("BACKUP_DATABASE_URL must use the direct Neon URL");
}
// Inside the container "localhost" is the container itself.
if (["localhost", "127.0.0.1", "::1"].includes(url.hostname)) {
  url.hostname = "host.docker.internal";
}

const directory = path.resolve(
  (process.env.BACKUP_DIR ?? "~/way_of_life/backups").replace(
    /^~(?=$|\/)/,
    os.homedir(),
  ),
);
const keep = Number(process.env.BACKUP_KEEP ?? 26);
if (!Number.isInteger(keep) || keep < 1) {
  throw new Error("BACKUP_KEEP must be a positive integer");
}

function run(args, { input, output, env } = {}) {
  return new Promise((resolve, reject) => {
    const child = spawn("docker", args, {
      env: { ...process.env, ...env },
      stdio: [input ? "pipe" : "ignore", output ? "pipe" : "ignore", "pipe"],
    });
    let stderr = "";
    child.stderr.on("data", (chunk) => {
      stderr += chunk;
    });
    if (output) child.stdout.pipe(output);
    if (input) input.pipe(child.stdin);
    child.on("error", reject);
    child.on("close", (code) =>
      code === 0
        ? resolve()
        : reject(
            new Error(`docker ${args[1]} failed (${code}): ${stderr.trim()}`),
          ),
    );
  });
}

await mkdir(directory, { recursive: true, mode: 0o700 });
await chmod(directory, 0o700);

const stamp = new Date().toISOString().slice(0, 16).replace(":", "");
const file = path.join(directory, `${PREFIX}${stamp}${SUFFIX}`);
const partial = `${file}.partial`;

try {
  const out = createWriteStream(partial, { mode: 0o600 });
  // The URL travels as an environment variable, never as a visible argument.
  await run(
    [
      "run",
      "--rm",
      "-e",
      "PGURL",
      IMAGE,
      "sh",
      "-c",
      'pg_dump --format=custom --no-owner "$PGURL"',
    ],
    { output: out, env: { PGURL: url.toString() } },
  );
  await new Promise((resolve) => out.end(resolve));

  // A dump that pg_restore cannot list is not a backup.
  const { createReadStream } = await import("node:fs");
  await run(["run", "--rm", "-i", IMAGE, "pg_restore", "--list"], {
    input: createReadStream(partial),
  });
  await rename(partial, file);
} catch (error) {
  await rm(partial, { force: true });
  throw error;
}

const { size } = await stat(file);
const backups = (await readdir(directory))
  .filter((name) => name.startsWith(PREFIX) && name.endsWith(SUFFIX))
  .sort()
  .reverse();
for (const old of backups.slice(keep)) {
  await rm(path.join(directory, old));
}

console.log(`Backup written: ${file} (${Math.round(size / 1024)} KiB)`);
console.log(
  `Kept ${Math.min(backups.length, keep)} of ${backups.length} in ${directory}`,
);
