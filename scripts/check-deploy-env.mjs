/**
 * Validates local .env and prints production deploy checklist.
 * Usage: node scripts/check-deploy-env.mjs
 */
import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";

const root = resolve(import.meta.dirname, "..");
const envPath = resolve(root, ".env");

function parseEnvFile(filePath) {
  if (!existsSync(filePath)) return {};
  const out = {};
  for (const line of readFileSync(filePath, "utf8").split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eq = trimmed.indexOf("=");
    if (eq <= 0) continue;
    const key = trimmed.slice(0, eq).trim();
    let value = trimmed.slice(eq + 1).trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    out[key] = value;
  }
  return out;
}

const env = { ...parseEnvFile(resolve(root, ".env.example")), ...parseEnvFile(envPath) };

const groups = [
  {
    label: "Local app (Vite)",
    keys: ["VITE_SUPABASE_URL", "VITE_SUPABASE_ANON_KEY"],
    required: true,
  },
  {
    label: "Local dev AI fallback",
    keys: ["VITE_OPENROUTER_API_KEY"],
    required: false,
  },
  {
    label: "Vercel api/*",
    keys: [
      "SUPABASE_URL",
      "SUPABASE_ANON_KEY",
      "SUPABASE_SERVICE_ROLE_KEY",
      "OPENROUTER_API_KEY",
    ],
    required: true,
  },
  {
    label: "Vercel optional",
    keys: ["OPENROUTER_MODEL", "APP_BASE_URL"],
    required: false,
  },
];

let missingRequired = 0;

console.log("Luminote deploy env check\n");

if (!existsSync(envPath)) {
  console.log("WARN: .env not found — copy .env.example to .env\n");
} else {
  console.log(`Using: ${envPath}\n`);
}

for (const group of groups) {
  console.log(group.label);
  for (const key of group.keys) {
    const value = env[key];
    const ok = Boolean(value && value.trim());
    const tag = ok ? "OK" : group.required ? "MISSING" : "optional";
    if (!ok && group.required) missingRequired += 1;
    console.log(`  [${tag}] ${key}`);
  }
  console.log("");
}

console.log("Supabase SQL (run in order if not applied):");
console.log("  1. database/luminote_schema.sql (fresh DB) OR migrations individually");
console.log("  2. database/migrations/000_hangout_tables.sql");
console.log("  3. database/migrations/002_course_folders.sql");
console.log("  4. database/migrations/001_hangout_require_auth.sql (upgrade only)\n");

console.log("Supabase Edge Function:");
console.log("  supabase secrets set OPENROUTER_API_KEY=...");
console.log("  supabase functions deploy qwen-proxy");
console.log("  (do NOT use --no-verify-jwt)\n");

console.log("Vercel production env: mirror SUPABASE_* and OPENROUTER_* from above.");
console.log("Set APP_BASE_URL to your production URL.\n");

if (missingRequired > 0) {
  console.log(`FAIL: ${missingRequired} required variable(s) missing.`);
  process.exit(1);
}

console.log("PASS: required variables present.");
