import { serviceClient, verifyRequestUser } from "./_lib/supabase.js";

const OPENROUTER_URL = "https://openrouter.ai/api/v1/chat/completions";
const DEFAULT_MODEL = process.env.OPENROUTER_MODEL || "openai/gpt-oss-120b:free";

function json(res, status, payload) {
  res.status(status).setHeader("Content-Type", "application/json").send(JSON.stringify(payload));
}

function sanitizeTitle(raw) {
  if (typeof raw !== "string") return "Reminder";
  const cleaned = raw
    .trim()
    .replace(/\s+/g, " ")
    .split(" ")
    .slice(0, 3)
    .map((w) => (w ? w[0].toUpperCase() + w.slice(1).toLowerCase() : ""))
    .join(" ");
  return cleaned || "Reminder";
}

function parseJsonArray(content) {
  try {
    const direct = JSON.parse(content);
    return Array.isArray(direct) ? direct : [];
  } catch {
    const match = content.match(/\[[\s\S]*\]/);
    if (!match) return [];
    try {
      const parsed = JSON.parse(match[0]);
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  }
}

function parseAsLocalWallClock(value) {
  const isoLike = typeof value === "string"
    ? value.match(/^(\d{4})-(\d{2})-(\d{2})[T\s](\d{2}):(\d{2})(?::(\d{2}))?/)
    : null;

  if (isoLike) {
    const year = Number(isoLike[1]);
    const month = Number(isoLike[2]);
    const day = Number(isoLike[3]);
    const hour = Number(isoLike[4]);
    const minute = Number(isoLike[5]);
    const second = isoLike[6] ? Number(isoLike[6]) : 0;
    return new Date(year, month - 1, day, hour, minute, second, 0).getTime();
  }

  return Date.parse(value);
}

function normalizeReminders(items) {
  const now = Date.now();
  return items
    .map((item) => {
      const title = sanitizeTitle(item?.title);
      const scheduledAt = typeof item?.scheduled_at === "string" ? item.scheduled_at : "";
      const ts = parseAsLocalWallClock(scheduledAt);
      if (!Number.isFinite(ts) || ts <= now) return null;
      return { title, scheduled_at: new Date(ts).toISOString() };
    })
    .filter(Boolean);
}

export default async function handler(req, res) {
  try {
    if (req.method !== "POST") {
      return json(res, 405, { error: "Method not allowed" });
    }

    const body = req.body && typeof req.body === "object" ? req.body : {};
    const note_id = typeof body.note_id === "string" ? body.note_id : null;
    const note_title = typeof body.note_title === "string" ? body.note_title : "";
    const note_content = typeof body.note_content === "string" ? body.note_content : "";
    const user_id = typeof body.user_id === "string" ? body.user_id : "";

    if (!user_id || !note_content.trim()) {
      return json(res, 400, { error: "user_id and note_content are required" });
    }

    const auth = await verifyRequestUser(req, user_id);
    if (!auth.ok) {
      return json(res, auth.status, { error: auth.error });
    }

    const extracted = await extractRemindersWithAI(note_title, note_content);
    const reminders = normalizeReminders(extracted);

    if (note_id) {
      // Replace AI-generated reminders for this note to avoid duplicates on autosave.
      const { error: deleteError } = await serviceClient
        .from("reminders")
        .delete()
        .eq("user_id", user_id)
        .eq("note_id", note_id)
        .eq("is_completed", false);

      if (deleteError) {
        return json(res, 500, {
          error: "Failed to refresh existing reminders for this note",
          details: deleteError.message,
        });
      }
    }

    if (reminders.length > 0) {
      const rows = reminders.map((r) => ({
        user_id,
        note_id,
        title: r.title,
        scheduled_at: r.scheduled_at,
        is_completed: false,
      }));

      const { error: insertError } = await serviceClient.from("reminders").insert(rows);
      if (insertError) {
        return json(res, 500, {
          error: "Failed to save reminders",
          details: insertError.message,
        });
      }
    }

    return json(res, 200, { reminders });
  } catch (error) {
    return json(res, 500, {
      error: "Unexpected reminder extraction error",
      details: error instanceof Error ? error.message : String(error),
    });
  }
}

async function extractRemindersWithAI(noteTitle, noteContent) {
  const apiKey = process.env.OPENROUTER_API_KEY;
  if (!apiKey) return [];

  const prompt =
    "Extract reminders from this note. Return ONLY a JSON array.\\n" +
    "Each item must be: {\"title\":\"1-3 keywords\",\"scheduled_at\":\"ISO datetime\"}.\\n" +
    "Rules: future events only, clear date+time only, title case, no extra text.\\n" +
    `Today: ${new Date().toISOString()}\\n` +
    `Title: ${noteTitle}\\n` +
    `Content: ${noteContent}`;

  const response = await fetch(OPENROUTER_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
      "HTTP-Referer": process.env.APP_BASE_URL || "https://luminote.app",
      "X-Title": "Luminote",
    },
    body: JSON.stringify({
      model: DEFAULT_MODEL,
      temperature: 0.1,
      max_tokens: 400,
      messages: [
        {
          role: "system",
          content:
            "You extract only valid reminder events. Return strict JSON array, no markdown, no explanation.",
        },
        { role: "user", content: prompt },
      ],
    }),
  });

  if (!response.ok) {
    return [];
  }

  const result = await response.json();
  const content = result?.choices?.[0]?.message?.content?.trim() || "[]";
  return parseJsonArray(content);
}
