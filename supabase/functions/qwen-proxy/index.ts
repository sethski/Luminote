/**
 * Supabase Edge Function: qwen-proxy
 *
 * Deploy:
 *   supabase functions deploy qwen-proxy
 *
 * Secrets:
 *   supabase secrets set OPENROUTER_API_KEY=your_key_here
 *
 * Requires a valid Supabase user JWT in Authorization header.
 */

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const OPENROUTER_URL = "https://openrouter.ai/api/v1/chat/completions";
const DEFAULT_QWEN_MODEL = "openai/gpt-oss-120b:free";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

async function verifyUser(req: Request) {
  const authHeader = req.headers.get("Authorization") ?? req.headers.get("authorization") ?? "";
  const token = authHeader.startsWith("Bearer ") ? authHeader.slice(7).trim() : "";
  if (!token) {
    return { ok: false as const, status: 401, error: "Missing bearer token" };
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY");
  if (!supabaseUrl || !supabaseAnonKey) {
    return { ok: false as const, status: 500, error: "Supabase env not configured" };
  }

  const authClient = createClient(supabaseUrl, supabaseAnonKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const { data, error } = await authClient.auth.getUser(token);
  if (error || !data?.user) {
    return { ok: false as const, status: 401, error: "Invalid or expired token" };
  }

  return { ok: true as const, user: data.user };
}

serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const auth = await verifyUser(req);
    if (!auth.ok) {
      return new Response(JSON.stringify({ error: auth.error }), {
        status: auth.status,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { messages, max_tokens = 512, temperature = 0.4 } = await req.json();

    if (!messages || !Array.isArray(messages)) {
      return new Response(JSON.stringify({ error: "messages array required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const safeMessages = messages
      .filter((m) => m && (m.role === "system" || m.role === "user" || m.role === "assistant"))
      .map((m) => ({
        role: m.role,
        content: typeof m.content === "string" ? m.content.slice(0, 12_000) : "",
      }))
      .filter((m) => m.content.length > 0)
      .slice(-20);

    if (!safeMessages.length) {
      return new Response(JSON.stringify({ error: "No valid messages" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const apiKey = Deno.env.get("OPENROUTER_API_KEY");
    if (!apiKey) {
      return new Response(JSON.stringify({ error: "OPENROUTER_API_KEY not configured" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const qwenRes = await fetch(OPENROUTER_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
        "HTTP-Referer": req.headers.get("origin") ?? "https://luminote.app",
        "X-Title": "Luminote",
      },
      body: JSON.stringify({
        model: DEFAULT_QWEN_MODEL,
        max_tokens: Math.min(Number(max_tokens) || 512, 2048),
        temperature: Math.min(Math.max(Number(temperature) || 0.4, 0), 1),
        messages: safeMessages,
      }),
    });

    if (!qwenRes.ok) {
      const errText = await qwenRes.text();
      return new Response(JSON.stringify({ error: errText }), {
        status: qwenRes.status,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const data = await qwenRes.json();
    const content = data.choices?.[0]?.message?.content?.trim() ?? "";

    return new Response(JSON.stringify({ content }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
