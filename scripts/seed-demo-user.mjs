/**
 * Seed a demo super admin user for ClinicOS
 * Usage: node scripts/seed-demo-user.mjs
 * Requires SUPABASE_SERVICE_ROLE_KEY and NEXT_PUBLIC_SUPABASE_URL in .env.local
 */

import { readFileSync } from "fs";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));

function loadEnv() {
  try {
    const envPath = resolve(__dirname, "../.env.local");
    const content = readFileSync(envPath, "utf-8");
    for (const line of content.split("\n")) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith("#")) continue;
      const [key, ...vals] = trimmed.split("=");
      if (key && vals.length) process.env[key.trim()] = vals.join("=").trim();
    }
  } catch {
    console.warn("Could not load .env.local");
  }
}

loadEnv();

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

const DEMO_EMAIL = "admin@clinicos.demo";
const DEMO_PASSWORD = "ClinicOS2026!";
const DEMO_NAME = "Super Admin";

async function main() {
  if (!SUPABASE_URL || !SERVICE_KEY) {
    console.error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY");
    process.exit(1);
  }

  console.log("Creating demo super admin user...");

  const res = await fetch(`${SUPABASE_URL}/auth/v1/admin/users`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${SERVICE_KEY}`,
      apikey: SERVICE_KEY,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      email: DEMO_EMAIL,
      password: DEMO_PASSWORD,
      email_confirm: true,
      user_metadata: { full_name: DEMO_NAME, role: "super_admin" },
    }),
  });

  const data = await res.json();

  if (!res.ok) {
    if (data.msg?.includes("already been registered") || data.message?.includes("already")) {
      console.log("User already exists. Updating profile role...");
      const listRes = await fetch(`${SUPABASE_URL}/auth/v1/admin/users?email=${encodeURIComponent(DEMO_EMAIL)}`, {
        headers: { Authorization: `Bearer ${SERVICE_KEY}`, apikey: SERVICE_KEY },
      });
      const listData = await listRes.json();
      const userId = listData.users?.[0]?.id;
      if (userId) {
        await fetch(`${SUPABASE_URL}/rest/v1/profiles?id=eq.${userId}`, {
          method: "PATCH",
          headers: {
            Authorization: `Bearer ${SERVICE_KEY}`,
            apikey: SERVICE_KEY,
            "Content-Type": "application/json",
            Prefer: "return=minimal",
          },
          body: JSON.stringify({ role: "super_admin", full_name: DEMO_NAME, is_active: true }),
        });
        console.log("Profile updated to super_admin");
      }
    } else {
      console.error("Failed:", data);
      process.exit(1);
    }
  } else {
    const userId = data.id;
    await fetch(`${SUPABASE_URL}/rest/v1/profiles?id=eq.${userId}`, {
      method: "PATCH",
      headers: {
        Authorization: `Bearer ${SERVICE_KEY}`,
        apikey: SERVICE_KEY,
        "Content-Type": "application/json",
        Prefer: "return=minimal",
      },
      body: JSON.stringify({ role: "super_admin", full_name: DEMO_NAME, is_active: true }),
    });
    console.log("User created:", userId);
  }

  console.log("\n✓ Demo user ready:");
  console.log(`  Email:    ${DEMO_EMAIL}`);
  console.log(`  Password: ${DEMO_PASSWORD}`);
  console.log(`  Role:     super_admin`);
  console.log(`  Login:    http://localhost:3000/login`);
}

main().catch(console.error);
