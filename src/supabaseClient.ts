import { createClient } from "@supabase/supabase-js";

type SupabaseClientInstance = ReturnType<typeof createClient>;

const globalForSupabase = globalThis as unknown as {
  supabase?: SupabaseClientInstance;
};

const supabaseUrl     = import.meta.env.VITE_SUPABASE_URL  as string;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error(
    "Missing Supabase env vars. Add VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY to your .env file."
  );
}

const supabaseProjectRef = (() => {
  try {
    return new URL(supabaseUrl).hostname.split(".")[0] ?? "";
  } catch {
    return "";
  }
})();

export const AUTH_STORAGE_KEY = supabaseProjectRef
  ? `luminote-${supabaseProjectRef}-auth-v3`
  : "luminote-auth-v3";

export const LEGACY_AUTH_STORAGE_KEYS = supabaseProjectRef
  ? [
      "luminote-auth-v2",
      `sb-${supabaseProjectRef}-auth-token`,
      `sb-${supabaseProjectRef}-auth-token-code-verifier`,
    ]
  : ["luminote-auth-v2"];

const supabaseInstance =
  globalForSupabase.supabase ??
  createClient(supabaseUrl, supabaseAnonKey, {
    auth: {
      persistSession:     true,
      autoRefreshToken:   true,
      detectSessionInUrl: true,
      storageKey:         AUTH_STORAGE_KEY,
      storage:            window.localStorage, // explicit — prevents session loss on reload
      // NOTE: multiTab: false intentionally removed — it breaks session persistence on refresh
    },
  });

// Persist singleton across HMR in dev
globalForSupabase.supabase = supabaseInstance;

export const supabase = supabaseInstance;

/* ─── Typed helper types matching the DB schema ── */
export type Profile = {
  id:           string;
  display_name: string | null;
  avatar_url:   string | null;
  email:        string | null;
  created_at:   string;
};

export type UserSettings = {
  user_id:               string;
  theme:                 "light" | "ash" | "obsidian";
  font_family:           string;
  font_size:             number;
  paper_default:         string;
  notifications_enabled: boolean;
  updated_at:            string;
};

export type Note = {
  id:          string;
  user_id:     string;
  title:       string;
  content:     string;
  tags:        string[];
  paper_style: string;
  color_style: string;
  is_deleted:  boolean;
  created_at:  string;
  updated_at:  string;
};

export type Flashcard = {
  id:          string;
  user_id:     string;
  deck_name:   string;
  front:       string;
  back:        string;
  ease_factor: number;
  interval:    number;
  repetitions: number;
  next_review: string;
  created_at:  string;
  updated_at:  string;
};

export type StudyPlan = {
  id:         string;
  user_id:    string;
  title:      string;
  subject:    string;
  due_date:   string | null;
  priority:   "low" | "medium" | "high";
  status:     "todo" | "in_progress" | "done";
  notes:      string;
  created_at: string;
  updated_at: string;
};

export type Friendship = {
  id:           string;
  requester_id: string;
  addressee_id: string;
  status:       "pending" | "accepted" | "blocked";
  created_at:   string;
  requester?:   Profile;
  addressee?:   Profile;
};

export type Reminder = {
  id:         string;
  user_id:    string;
  title:      string;
  date:       string;
  time:       string;
  completed:  boolean;
  note_id:    string | null;
  created_at: string;
  updated_at: string;
};
