/**
 * Compare live Supabase against database/luminote_schema.sql expectations.
 * Usage: node scripts/audit-supabase-schema.mjs
 * Requires SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY in .env
 */
import { createClient } from "@supabase/supabase-js";
import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";

const root = resolve(import.meta.dirname, "..");
const envPath = resolve(root, ".env");

function loadEnv() {
  const out = {};
  if (!existsSync(envPath)) return out;
  for (const line of readFileSync(envPath, "utf8").split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eq = trimmed.indexOf("=");
    if (eq <= 0) continue;
    out[trimmed.slice(0, eq).trim()] = trimmed.slice(eq + 1).trim();
  }
  return out;
}

const env = loadEnv();
const url = env.SUPABASE_URL || env.VITE_SUPABASE_URL;
const serviceKey = env.SUPABASE_SERVICE_ROLE_KEY;

if (!url || !serviceKey) {
  console.error("Missing SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in .env");
  process.exit(1);
}

const db = createClient(url, serviceKey, {
  auth: { persistSession: false, autoRefreshToken: false },
});

const EXPECTED_TABLES = [
  "profiles",
  "user_settings",
  "notes",
  "tags",
  "note_tags",
  "flashcards",
  "study_plans",
  "reminders",
  "user_courses",
  "course_folders",
  "course_folder_notes",
  "friendships",
  "hangout_posts",
  "server_messages",
  "spaces",
  "channels",
];

/** Columns the app reads/writes — missing column = runtime errors. */
const EXPECTED_COLUMNS = {
  notes: ["id", "user_id", "title", "content", "course_id", "is_deleted", "tags", "updated_at"],
  reminders: ["id", "user_id", "note_id", "scheduled_at", "is_completed"],
  user_courses: ["id", "user_id", "code", "title", "subtitle", "schedule_days", "schedule_time"],
  course_folders: ["id", "course_id", "user_id", "name"],
  course_folder_notes: ["folder_id", "note_id"],
  hangout_posts: ["id", "author_id", "title", "body"],
};

async function probeTable(table) {
  const { error } = await db.from(table).select("*", { count: "exact", head: true });
  if (!error) return { ok: true };

  const msg = `${error.message ?? ""} ${error.details ?? ""}`.toLowerCase();
  if (
    msg.includes("does not exist") ||
    msg.includes("could not find") ||
    error.code === "42P01" ||
    error.code === "PGRST205"
  ) {
    return { ok: false, missing: true, error: error.message };
  }
  return { ok: true, warning: error.message };
}

async function probeColumns(table, columns) {
  const { error } = await db.from(table).select(columns.join(","), { head: true, count: "exact" });
  if (!error) return { ok: true };

  const msg = error.message ?? "";
  if (msg.includes("column") && msg.includes("does not exist")) {
    return { ok: false, error: msg };
  }
  return { ok: true, warning: msg };
}

async function probeSearchIndexes() {
  const { data, error } = await db.rpc("luminote_audit_search_indexes");
  if (error) {
    return { skipped: true, reason: "RPC not installed (optional note_search_schema.sql)" };
  }
  return { ok: true, data };
}

async function main() {
  console.log("Luminote schema audit\n");
  console.log(`Project: ${new URL(url).hostname.split(".")[0]}\n`);

  const missingTables = [];
  const tableWarnings = [];

  console.log("Tables");
  for (const table of EXPECTED_TABLES) {
    const result = await probeTable(table);
    if (result.missing) {
      missingTables.push(table);
      console.log(`  [MISSING] public.${table}`);
    } else if (result.warning) {
      tableWarnings.push({ table, warning: result.warning });
      console.log(`  [OK?]     public.${table} — ${result.warning}`);
    } else {
      console.log(`  [OK]      public.${table}`);
    }
  }

  console.log("\nColumns");
  const missingColumns = [];
  for (const [table, columns] of Object.entries(EXPECTED_COLUMNS)) {
    if (missingTables.includes(table)) {
      console.log(`  [SKIP]    ${table} (table missing)`);
      continue;
    }
    const result = await probeColumns(table, columns);
    if (!result.ok) {
      missingColumns.push({ table, error: result.error });
      console.log(`  [MISSING] ${table}: ${result.error}`);
    } else if (result.warning) {
      console.log(`  [OK?]     ${table}: ${result.warning}`);
    } else {
      console.log(`  [OK]      ${table} (${columns.length} cols)`);
    }
  }

  console.log("\nOptional search (note_search_schema.sql)");
  const search = await probeSearchIndexes();
  if (search.skipped) {
    console.log(`  [SKIP]    ${search.reason}`);
  }

  const anonKey = env.VITE_SUPABASE_ANON_KEY || env.SUPABASE_ANON_KEY;
  if (anonKey) {
    console.log("\nRLS smoke (anon client, no session — expect 0 rows)");
    const anon = createClient(url, anonKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
    for (const table of ["hangout_posts", "notes", "course_folders"]) {
      const { data, error } = await anon.from(table).select("id").limit(1);
      const rows = data?.length ?? 0;
      const tag = rows === 0 && !error ? "OK" : rows > 0 ? "WARN" : "OK?";
      console.log(`  [${tag}]     ${table} — anon visible rows: ${rows}${error ? ` (${error.message})` : ""}`);
    }
  }

  console.log("\nPolicy checklist (verify in Supabase Dashboard → Authentication → Policies)");
  const policyGroups = [
    { table: "hangout_posts", expect: "Authenticated users can read hangout posts (not public read)" },
    { table: "server_messages", expect: "Authenticated users can read server messages" },
    { table: "spaces", expect: "Authenticated users can read spaces" },
    { table: "channels", expect: "Authenticated users can read channels" },
    { table: "course_folders", expect: "Users can CRUD own course folders" },
    { table: "notes", expect: "Users can CRUD own notes" },
  ];
  for (const item of policyGroups) {
    const status = missingTables.includes(item.table) ? "MISSING TABLE" : "manual verify";
    console.log(`  [${status}] ${item.table} — ${item.expect}`);
  }

  console.log("\nMigration hints for gaps");
  const hints = {
    hangout_posts: "database/migrations/000_hangout_tables.sql",
    server_messages: "database/migrations/000_hangout_tables.sql",
    spaces: "database/migrations/000_hangout_tables.sql",
    channels: "database/migrations/000_hangout_tables.sql",
    course_folders: "database/migrations/002_course_folders.sql",
    course_folder_notes: "database/migrations/002_course_folders.sql",
  };
  for (const table of missingTables) {
    console.log(`  - ${table} → run ${hints[table] ?? "database/luminote_schema.sql (full)"}`);
  }

  const issues = missingTables.length + missingColumns.length;
  console.log(`\n${issues === 0 ? "PASS" : "FAIL"}: ${missingTables.length} missing table(s), ${missingColumns.length} column gap(s).`);

  if (issues > 0) process.exit(1);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
