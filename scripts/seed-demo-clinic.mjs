/**
 * Seed full demo clinic (auth users + instructs SQL seed)
 *
 * Usage:
 *   node scripts/seed-demo-clinic.mjs
 *
 * Requires .env.local with NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY
 * Then run supabase/seed_demo_clinic.sql in Supabase SQL Editor (or this script tries REST inserts)
 */

import { readFileSync } from "fs";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));

function loadEnv() {
  const content = readFileSync(resolve(__dirname, "../.env.local"), "utf-8");
  for (const line of content.split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const [key, ...vals] = trimmed.split("=");
    if (key && vals.length) process.env[key.trim()] = vals.join("=").trim();
  }
}

loadEnv();

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const PASSWORD = "ClinicOS2026!";

const USERS = [
  { id: "b0000000-0000-4000-8000-000000000000", email: "admin@clinicos.demo", name: "Platform Admin", role: "super_admin" },
  { id: "b0000001-0000-4000-8000-000000000001", email: "owner@cityclinic.demo", name: "Anita Mehta", role: "clinic_owner" },
  { id: "b0000002-0000-4000-8000-000000000002", email: "doctor@cityclinic.demo", name: "Dr. Amit Verma", role: "doctor" },
  { id: "b0000003-0000-4000-8000-000000000003", email: "reception@cityclinic.demo", name: "Priya Singh", role: "receptionist" },
  { id: "b0000004-0000-4000-8000-000000000004", email: "patient@cityclinic.demo", name: "Raj Kumar", role: "patient" },
];

const CLINIC_ID = "a0000001-0000-4000-8000-000000000001";

async function headers() {
  return {
    Authorization: `Bearer ${SERVICE_KEY}`,
    apikey: SERVICE_KEY,
    "Content-Type": "application/json",
  };
}

async function upsertAuthUser(user) {
  const clinicId = user.role === "super_admin" ? undefined : CLINIC_ID;

  const createRes = await fetch(`${SUPABASE_URL}/auth/v1/admin/users`, {
    method: "POST",
    headers: await headers(),
    body: JSON.stringify({
      id: user.id,
      email: user.email,
      password: PASSWORD,
      email_confirm: true,
      user_metadata: { full_name: user.name, role: user.role },
    }),
  });

  if (!createRes.ok) {
    const err = await createRes.json();
    if (!String(err.message ?? err.msg ?? "").toLowerCase().includes("already")) {
      console.warn(`  Auth ${user.email}:`, err.message ?? err.msg ?? err);
    }
  } else {
    console.log(`  ✓ Auth user: ${user.email}`);
  }

  const profileRes = await fetch(`${SUPABASE_URL}/rest/v1/profiles`, {
    method: "POST",
    headers: {
      ...(await headers()),
      Prefer: "resolution=merge-duplicates,return=minimal",
    },
    body: JSON.stringify({
      id: user.id,
      email: user.email,
      full_name: user.name,
      role: user.role,
      clinic_id: clinicId ?? null,
      is_active: true,
    }),
  });

  if (!profileRes.ok) {
    console.warn(`  Profile ${user.email}:`, await profileRes.text());
  } else {
    console.log(`  ✓ Profile: ${user.email}`);
  }
}

async function main() {
  if (!SUPABASE_URL || !SERVICE_KEY) {
    console.error("Missing env vars in .env.local");
    process.exit(1);
  }

  console.log("Creating demo auth users...\n");
  for (const user of USERS) {
    await upsertAuthUser(user);
  }

  console.log("\n══════════════════════════════════════════════════════════");
  console.log("  NEXT STEP: Run this SQL in Supabase SQL Editor:");
  console.log("  clinicos/supabase/seed_demo_clinic.sql");
  console.log("══════════════════════════════════════════════════════════\n");
  console.log("  DEMO LOGINS (password: ClinicOS2026!)\n");
  console.log("  Super Admin   admin@clinicos.demo");
  console.log("  Clinic Owner  owner@cityclinic.demo      → /owner");
  console.log("  Doctor        doctor@cityclinic.demo     → /doctor");
  console.log("  Receptionist  reception@cityclinic.demo  → /receptionist");
  console.log("  Patient       patient@cityclinic.demo    → /patient");
  console.log("\n  Clinic: City Health Clinic (city-health-clinic)");
  console.log("  Login:  http://localhost:3000/login\n");
}

main().catch(console.error);
