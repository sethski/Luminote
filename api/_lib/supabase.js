import { createClient } from "@supabase/supabase-js";

function requiredEnv(name) {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
}

const supabaseUrl = requiredEnv("SUPABASE_URL");
const supabaseAnonKey = requiredEnv("SUPABASE_ANON_KEY");
const supabaseServiceRoleKey = requiredEnv("SUPABASE_SERVICE_ROLE_KEY");

export const authClient = createClient(supabaseUrl, supabaseAnonKey, {
  auth: { persistSession: false, autoRefreshToken: false },
});

export const serviceClient = createClient(supabaseUrl, supabaseServiceRoleKey, {
  auth: { persistSession: false, autoRefreshToken: false },
});

export async function verifyRequestUser(req, expectedUserId) {
  const authHeader = req.headers.authorization || req.headers.Authorization || "";
  const token = authHeader.startsWith("Bearer ") ? authHeader.slice(7) : "";

  if (!token) {
    return { ok: false, status: 401, error: "Missing bearer token" };
  }

  const { data, error } = await authClient.auth.getUser(token);
  if (error || !data?.user) {
    return { ok: false, status: 401, error: "Invalid or expired token" };
  }

  if (expectedUserId && data.user.id !== expectedUserId) {
    return { ok: false, status: 403, error: "User ID does not match auth token" };
  }

  return { ok: true, user: data.user };
}
