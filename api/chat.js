import { verifyRequestUser } from "./_lib/supabase.js";

const OPENROUTER_URL = "https://openrouter.ai/api/v1/chat/completions";
const DEFAULT_MODEL = process.env.OPENROUTER_MODEL || "openai/gpt-oss-120b:free";

function json(res, status, payload) {
  res.status(status).setHeader("Content-Type", "application/json").send(JSON.stringify(payload));
}

export default async function handler(req, res) {
  try {
    if (req.method !== "POST") {
      return json(res, 405, { error: "Method not allowed" });
    }

    const body = req.body && typeof req.body === "object" ? req.body : {};
    const message = typeof body.message === "string" ? body.message.trim() : "";
    const userId = typeof body.userId === "string" ? body.userId.trim() : "";
    const history = Array.isArray(body.history) ? body.history : [];

    if (!message || !userId) {
      return json(res, 400, { error: "message and userId are required" });
    }

    const auth = await verifyRequestUser(req, userId);
    if (!auth.ok) {
      return json(res, auth.status, { error: auth.error });
    }

    const apiKey = process.env.OPENROUTER_API_KEY;
    if (!apiKey) {
      return json(res, 200, {
        content:
          "General chat is configured, but OPENROUTER_API_KEY is missing on the server. Add it to your environment to enable live AI responses.",
      });
    }

    const safeHistory = history
      .filter((m) => m && (m.role === "user" || m.role === "assistant") && typeof m.content === "string")
      .slice(-8);

    const payload = {
      model: DEFAULT_MODEL,
      max_tokens: 500,
      temperature: 0.6,
      messages: [
        {
          role: "system",
          content:
            "You are Luminote Assistant in General Chat Mode. Be helpful and concise. " +
            "You do not have access to personal notes in this mode. If user asks about notes, tell them to switch to Note Search Mode.",
        },
        ...safeHistory,
        { role: "user", content: message },
      ],
    };

    const response = await fetch(OPENROUTER_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
        "HTTP-Referer": process.env.APP_BASE_URL || "https://luminote.app",
        "X-Title": "Luminote",
      },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      const details = await response.text();
      return json(res, response.status, {
        error: "AI provider request failed",
        details,
      });
    }

    const result = await response.json();
    const content = result?.choices?.[0]?.message?.content?.trim();

    if (!content) {
      return json(res, 502, { error: "AI returned an empty response" });
    }

    return json(res, 200, { content });
  } catch (error) {
    return json(res, 500, {
      error: "Unexpected chat endpoint error",
      details: error instanceof Error ? error.message : String(error),
    });
  }
}
