/**
 * Run Sprint 5 migration SQL against Supabase
 * Usage: node scripts/run-migration.mjs [migration-file]
 */

import { readFileSync } from "fs";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));

function loadEnv() {
  try {
    const content = readFileSync(resolve(__dirname, "../.env.local"), "utf-8");
    for (const line of content.split("\n")) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith("#")) continue;
      const [key, ...vals] = trimmed.split("=");
      if (key && vals.length) process.env[key.trim()] = vals.join("=").trim();
    }
  } catch { /* ignore */ }
}

loadEnv();

const file = process.argv[2] ?? "005_sprint_5.sql";
const sql = readFileSync(resolve(__dirname, `../supabase/migrations/${file}`), "utf-8");
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

async function main() {
  if (!SUPABASE_URL || !SERVICE_KEY) {
    console.error("Missing env vars");
    process.exit(1);
  }

  console.log(`Running migration: ${file}`);

  const res = await fetch(`${SUPABASE_URL}/rest/v1/rpc/exec_sql`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${SERVICE_KEY}`,
      apikey: SERVICE_KEY,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ query: sql }),
  });

  if (!res.ok) {
    const err = await res.text();
    if (err.includes("exec_sql") || err.includes("PGRST202")) {
      console.log("RPC not available — run migration manually in Supabase SQL Editor:");
      console.log(`  supabase/migrations/${file}`);
      console.log("\nOr split and run via pg...");
      process.exit(0);
    }
    console.error("Migration failed:", err);
    process.exit(1);
  }

  console.log("Migration completed successfully");
}

main().catch(console.error);
