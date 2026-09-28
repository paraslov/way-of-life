import { randomBytes, scrypt as scryptCallback } from "node:crypto";
import process from "node:process";
import { createInterface } from "node:readline/promises";
import { promisify } from "node:util";
import { config } from "dotenv";
import pg from "pg";

config({ path: ".env.local" });
config({ path: ".env" });

const scrypt = promisify(scryptCallback);
const connectionString = process.env.DATABASE_ADMIN_URL;

if (!connectionString) {
  throw new Error("Set DATABASE_ADMIN_URL first");
}

async function hashPassword(password) {
  const salt = randomBytes(16);
  const key = await scrypt(password, salt, 64, { N: 16_384, r: 8, p: 1 });
  return `scrypt$16384$8$1$${salt.toString("base64url")}$${key.toString("base64url")}`;
}

async function promptForPassword(label) {
  if (!process.stdin.isTTY || typeof process.stdin.setRawMode !== "function") {
    const readline = createInterface({
      input: process.stdin,
      output: process.stdout,
    });
    const password = await readline.question(label);
    readline.close();
    return password;
  }

  process.stdout.write(label);
  process.stdin.setRawMode(true);
  process.stdin.resume();
  process.stdin.setEncoding("utf8");

  return new Promise((resolve, reject) => {
    let password = "";

    function finish() {
      process.stdin.setRawMode(false);
      process.stdin.pause();
      process.stdin.off("data", onData);
      process.stdout.write("\n");
      resolve(password);
    }

    function onData(chunk) {
      for (const character of chunk) {
        if (character === "\u0003") {
          process.stdin.setRawMode(false);
          process.stdout.write("\n");
          reject(new Error("Cancelled"));
          return;
        }
        if (character === "\r" || character === "\n") {
          finish();
          return;
        }
        if (character === "\u007f") {
          password = password.slice(0, -1);
          continue;
        }
        password += character;
      }
    }

    process.stdin.on("data", onData);
  });
}

const emailArgument = process.argv[2];
let email = emailArgument?.trim().toLowerCase();

if (!email) {
  const readline = createInterface({
    input: process.stdin,
    output: process.stdout,
  });
  email = (await readline.question("Email: ")).trim().toLowerCase();
  readline.close();
}

if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || email.length > 254) {
  throw new Error("Enter a valid email address");
}

const password =
  process.env.WAY_OF_LIFE_NEW_USER_PASSWORD ??
  (await promptForPassword("Password: "));

// Health data lives behind this password: no MFA yet, so require length.
if (password.length < 12) {
  throw new Error("Password must contain at least 12 characters");
}

const passwordHash = await hashPassword(password);
const pool = new pg.Pool({ connectionString, max: 1 });

const client = await pool.connect();

try {
  await client.query("BEGIN");
  const result = await client.query(
    `INSERT INTO users (email, password_hash)
     VALUES ($1, $2)
     ON CONFLICT (email) DO UPDATE
       SET password_hash = EXCLUDED.password_hash,
           is_active = true,
           updated_at = now()
     RETURNING id`,
    [email, passwordHash],
  );
  const userId = result.rows[0]?.id;

  if (!userId) {
    throw new Error("Failed to create or update account");
  }

  await client.query("DELETE FROM sessions WHERE user_id = $1", [userId]);
  await client.query("COMMIT");
  console.log(`Account ready: ${email}`);
  console.log("All existing sessions for this account were revoked.");
} catch (error) {
  await client.query("ROLLBACK");
  throw error;
} finally {
  client.release();
  await pool.end();
}
