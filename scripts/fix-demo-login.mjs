/**
 * Fix demo login: ensure auth users have active profiles
 * Usage: npm run fix:login
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
const CLINIC_ID = "a0000001-0000-4000-8000-000000000001";

const DEMO_USERS = [
  { id: "b0000000-0000-4000-8000-000000000000", email: "admin@clinicos.demo", name: "Platform Admin", role: "super_admin" },
  { id: "b0000001-0000-4000-8000-000000000001", email: "owner@cityclinic.demo", name: "Anita Mehta", role: "clinic_owner" },
  { id: "b0000002-0000-4000-8000-000000000002", email: "doctor@cityclinic.demo", name: "Dr. Amit Verma", role: "doctor" },
  { id: "b0000003-0000-4000-8000-000000000003", email: "reception@cityclinic.demo", name: "Priya Singh", role: "receptionist" },
  { id: "b0000004-0000-4000-8000-000000000004", email: "patient@cityclinic.demo", name: "Raj Kumar", role: "patient" },
];

function headers() {
  return {
    Authorization: `Bearer ${SERVICE_KEY}`,
    apikey: SERVICE_KEY,
    "Content-Type": "application/json",
  };
}

async function getAuthUserByEmail(email) {
  const res = await fetch(
    `${SUPABASE_URL}/auth/v1/admin/users?email=${encodeURIComponent(email)}`,
    { headers: headers() }
  );
  const data = await res.json();
  return data.users?.[0] ?? null;
}

async function ensureDemoClinic() {
  const check = await fetch(`${SUPABASE_URL}/rest/v1/clinics?id=eq.${CLINIC_ID}&select=id`, {
    headers: headers(),
  });
  const rows = await check.json();
  if (Array.isArray(rows) && rows.length > 0) {
    console.log("  ✓ Demo clinic exists");
    return true;
  }

  const plansRes = await fetch(`${SUPABASE_URL}/rest/v1/plans?slug=eq.pro&select=id`, {
    headers: headers(),
  });
  const plans = await plansRes.json();
  const planId = plans?.[0]?.id;
  if (!planId) {
    console.error("  ✗ Pro plan not found — run schema.sql in Supabase first");
    return false;
  }

  const res = await fetch(`${SUPABASE_URL}/rest/v1/clinics`, {
    method: "POST",
    headers: { ...headers(), Prefer: "resolution=merge-duplicates,return=minimal" },
    body: JSON.stringify({
      id: CLINIC_ID,
      clinic_code: "CLN-DEMO01",
      name: "City Health Clinic",
      slug: "city-health-clinic",
      address: "42 MG Road, Andheri West",
      city: "Mumbai",
      state: "Maharashtra",
      pincode: "400058",
      phone: "+91 98765 43210",
      email: "hello@cityclinic.demo",
      status: "active",
      consultation_fee_default: 500,
    }),
  });

  if (!res.ok) {
    console.error("  ✗ Could not create clinic:", await res.text());
    return false;
  }

  await fetch(`${SUPABASE_URL}/rest/v1/subscriptions`, {
    method: "POST",
    headers: { ...headers(), Prefer: "resolution=merge-duplicates,return=minimal" },
    body: JSON.stringify({
      clinic_id: CLINIC_ID,
      plan_id: planId,
      status: "active",
      billing_cycle: "monthly",
    }),
  });

  console.log("  ✓ Created demo clinic: City Health Clinic");
  return true;
}

async function upsertProfile(userId, user) {
  const body = {
    id: userId,
    email: user.email,
    full_name: user.name,
    role: user.role,
    clinic_id: user.role === "super_admin" ? null : CLINIC_ID,
    is_active: true,
  };

  const res = await fetch(`${SUPABASE_URL}/rest/v1/profiles`, {
    method: "POST",
    headers: { ...headers(), Prefer: "resolution=merge-duplicates,return=representation" },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const err = await res.text();
    console.error(`  ✗ ${user.email}:`, err);
    return false;
  }

  // Force clinic_id + role (merge-duplicates can skip null FK updates)
  const patchRes = await fetch(`${SUPABASE_URL}/rest/v1/profiles?id=eq.${userId}`, {
    method: "PATCH",
    headers: { ...headers(), Prefer: "return=representation" },
    body: JSON.stringify({
      email: user.email,
      full_name: user.name,
      role: user.role,
      clinic_id: user.role === "super_admin" ? null : CLINIC_ID,
      is_active: true,
    }),
  });

  const profile = patchRes.ok ? (await patchRes.json())[0] : (await res.json())[0];
  console.log(
    `  ✓ ${user.email} → role=${profile?.role}, clinic_id=${profile?.clinic_id ?? "null"}, is_active=${profile?.is_active}`
  );
  return true;
}

async function main() {
  if (!SUPABASE_URL || !SERVICE_KEY) {
    console.error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env.local");
    process.exit(1);
  }

  console.log("Fixing demo login profiles...\n");

  const clinicOk = await ensureDemoClinic();
  if (!clinicOk) {
    console.log("\nAlternatively run supabase/seed_demo_clinic.sql in Supabase SQL Editor.");
    process.exit(1);
  }

  console.log("");

  for (const user of DEMO_USERS) {
    let authUser = await getAuthUserByEmail(user.email);

    if (!authUser) {
      console.log(`  Creating auth user: ${user.email}`);
      const createRes = await fetch(`${SUPABASE_URL}/auth/v1/admin/users`, {
        method: "POST",
        headers: headers(),
        body: JSON.stringify({
          id: user.id,
          email: user.email,
          password: "ClinicOS2026!",
          email_confirm: true,
          user_metadata: { full_name: user.name, role: user.role },
        }),
      });
      if (!createRes.ok) {
        const err = await createRes.json();
        console.error(`  ✗ Auth create ${user.email}:`, err.message ?? err);
        continue;
      }
      authUser = await createRes.json();
    }

    const userId = authUser.id ?? user.id;
    await upsertProfile(userId, { ...user, id: userId });
  }

  console.log("\nDone. Try logging in with owner@cityclinic.demo / ClinicOS2026!");
}

main().catch(console.error);
