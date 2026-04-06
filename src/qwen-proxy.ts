/**
 * Supabase Edge Function: qwen-proxy
 *
 * Deploy with:
 *   supabase functions deploy qwen-proxy --no-verify-jwt
 *
 * Set secret:
 *   supabase secrets set OPENROUTER_API_KEY=your_key_here
 *
 * This keeps the Qwen API key server-side and out of the browser bundle.
 * Call from client: supabase.functions.invoke('qwen-proxy', { body: { messages, model, max_tokens } })
 */

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const OPENROUTER_URL = "https://openrouter.ai/api/v1/chat/completions";
const DEFAULT_QWEN_MODEL = "qwen/qwen3.6-plus-preview:free";

const corsHeaders = {
  "Access-Control-Allow-Origin":  "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req: Request) => {
  /* Handle CORS preflight */
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const { messages, model = DEFAULT_QWEN_MODEL, max_tokens = 512, temperature = 0.4 } = await req.json();

    if (!messages || !Array.isArray(messages)) {
      return new Response(JSON.stringify({ error: "messages array required" }), {
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
        "Content-Type":  "application/json",
        "Authorization": `Bearer ${apiKey}`,
        "HTTP-Referer": req.headers.get("origin") ?? "https://luminote.local",
        "X-Title": "Luminote",
      },
      body: JSON.stringify({ model, max_tokens, temperature, messages }),
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
  } catch (err: any) {
    return new Response(JSON.stringify({ error: err?.message ?? "Unknown error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
