/**
 * qwen.ts — Qwen AI service via OpenRouter
 * Uses VITE_OPENROUTER_API_KEY directly (dev + prod via env).
 */
import { supabase } from "./supabaseClient";

type QwenMessage = { role: "system" | "user" | "assistant"; content: string };
type QwenOptions = { max_tokens?: number; temperature?: number };

const OPENROUTER_URL = "https://openrouter.ai/api/v1/chat/completions";
// Use a stable, available free model
const DEFAULT_QWEN_MODEL = "openai/gpt-oss-120b:free";

/* ─── Core request helper ────────────────────────── */
async function callQwen(messages: QwenMessage[], opts: QwenOptions = {}): Promise<string> {
  const payload = {
    messages,
    model:       DEFAULT_QWEN_MODEL,
    max_tokens:  opts.max_tokens  ?? 512,
    temperature: opts.temperature ?? 0.4,
  };

  /* Try Supabase Edge Function first */
  try {
    const { data, error } = await supabase.functions.invoke("qwen-proxy", { body: payload });
    if (!error && data?.content) return data.content as string;
  } catch (_) { /* fall through */ }

  /* Direct OpenRouter fallback */
  const viteEnv = (import.meta as any).env as Record<string, string | undefined>;
  const apiKey = viteEnv.VITE_OPENROUTER_API_KEY;
  if (!apiKey) throw new Error("Missing VITE_OPENROUTER_API_KEY in .env");

  const res = await fetch(OPENROUTER_URL, {
    method: "POST",
    headers: {
      "Content-Type":  "application/json",
      "Authorization": `Bearer ${apiKey}`,
      "HTTP-Referer":  window.location.origin,
      "X-Title":       "Luminote",
    },
    body: JSON.stringify(payload),
  });

  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`OpenRouter ${res.status}: ${errText}`);
  }

  const json = await res.json();
  const content = json.choices?.[0]?.message?.content?.trim();
  if (!content) throw new Error("Empty response from AI");
  return content;
}

/* ─── 1. Summarize note ──────────────────────────── */
export async function summarizeNote(content: string, title: string): Promise<string> {
  return callQwen([
    {
      role: "system",
      content:
        "You are a study assistant. Summarize notes clearly.\n" +
        "Format:\n**Key Points:** (3-5 bullets)\n**Main Idea:** (1-2 sentences)\n**Action Items:** (if any)",
    },
    { role: "user", content: `Summarize: "${title}"\n\n${content}` },
  ], { max_tokens: 600 });
}

/* ─── 2. Auto-tag note ───────────────────────────── */
export async function autoTagNote(
  content: string,
  title: string,
  availableTags = ["RESEARCH", "PLANNING", "TEAM", "TECH", "CREATIVE", "PERSONAL", "INSPIRATION"]
): Promise<string[]> {
  const result = await callQwen([
    {
      role: "system",
      content: "Tag classifier. Return ONLY a JSON array of 1-3 tags from the list. No explanation.",
    },
    {
      role: "user",
      content: `Tags: ${availableTags.join(", ")}\nTitle: "${title}"\nContent: "${content.slice(0, 400)}"`,
    },
  ], { max_tokens: 80, temperature: 0.1 });

  try {
    const parsed = JSON.parse(result.replace(/```json?|```/g, "").trim());
    if (Array.isArray(parsed)) return parsed.filter((t) => availableTags.includes(t)).slice(0, 3);
  } catch { /* ignore */ }
  return [];
}

/* ─── 3. Study suggestions ───────────────────────── */
export async function getStudySuggestions(notesContent: string, subject?: string): Promise<string> {
  return callQwen([
    {
      role: "system",
      content:
        "Expert study coach for university students. Provide 3-5 actionable study strategies " +
        "and identify knowledge gaps. Use markdown formatting. Be encouraging but specific.",
    },
    {
      role: "user",
      content: `Based on my ${subject ? subject + " " : ""}notes, give me personalized study strategies:\n\n${notesContent.slice(0, 1500)}`,
    },
  ], { max_tokens: 700, temperature: 0.5 });
}

/* ─── 4. Generate flashcards ─────────────────────── */
export async function generateFlashcards(
  content: string,
  title: string,
  count = 5
): Promise<Array<{ front: string; back: string }>> {
  const result = await callQwen([
    {
      role: "system",
      content:
        "Flashcard generator. Create Q&A pairs for spaced repetition.\n" +
        "Rules: test understanding not just recall; answers ≤3 sentences.\n" +
        'Return ONLY a valid JSON array: [{"front":"...","back":"..."}]',
    },
    {
      role: "user",
      content: `Generate ${count} flashcards from "${title}":\n\n${content.slice(0, 2000)}`,
    },
  ], { max_tokens: 1000, temperature: 0.3 });

  try {
    const parsed = JSON.parse(result.replace(/```json?|```/g, "").trim());
    if (Array.isArray(parsed)) {
      return parsed.slice(0, count).map((c) => ({ front: String(c.front ?? ""), back: String(c.back ?? "") }));
    }
  } catch { /* ignore */ }
  return [];
}

/* ─── 5. Generate study plan ─────────────────────── */
export async function generateStudyPlan(
  subject: string,
  daysUntilExam: number,
  topics: string
): Promise<string> {
  return callQwen([
    {
      role: "system",
      content:
        "Study planner. Create practical day-by-day schedules for students. " +
        "Be realistic about time. Use markdown: ## headings, - bullet lists.",
    },
    {
      role: "user",
      content: `Subject: ${subject}\nDays until exam: ${daysUntilExam}\nTopics: ${topics}\n\nCreate a detailed study schedule.`,
    },
  ], { max_tokens: 800, temperature: 0.4 });
}

/* ─── 6. Lumi AI chatbot ─────────────────────────── */
export async function lumiChat(userMessage: string, history: QwenMessage[] = []): Promise<string> {
  return callQwen([
    {
      role: "system",
      content:
        "You are Lumi, an AI study assistant inside Luminote. Help students with:\n" +
        "- Understanding topics from their notes\n" +
        "- Creating study schedules\n" +
        "- Learning strategies\n" +
        "- Quiz questions\n" +
        "Be friendly, encouraging, and concise (≤200 words unless asked for detail).",
    },
    ...history.slice(-6),
    { role: "user", content: userMessage },
  ], { max_tokens: 400, temperature: 0.6 });
}

/* ─── 7. Extract reminders ───────────────────────── */
export async function extractRemindersFromText(
  noteTitle: string,
  noteContent: string,
): Promise<Array<{ title: string; scheduled_at: string }>> {
  const parseAsLocalWallClock = (value: string): number => {
    const isoLike = value.match(/^(\d{4})-(\d{2})-(\d{2})[T\s](\d{2}):(\d{2})(?::(\d{2}))?/);
    if (isoLike) {
      const year = Number(isoLike[1]);
      const month = Number(isoLike[2]);
      const day = Number(isoLike[3]);
      const hour = Number(isoLike[4]);
      const minute = Number(isoLike[5]);
      const second = isoLike[6] ? Number(isoLike[6]) : 0;
      const d = new Date(year, month - 1, day, hour, minute, second, 0);
      return d.getTime();
    }
    return Date.parse(value);
  };

  const fromLocalPattern = (): Array<{ title: string; scheduled_at: string }> => {
    const text = `${noteTitle || ""} ${noteContent || ""}`;
    const regex = /(interview|meeting|appointment|dentist|class|exam|deadline|event)?[^\n\r]{0,80}?\b(jan|january|feb|february|mar|march|apr|april|may|jun|june|jul|july|aug|august|sep|sept|september|oct|october|nov|november|dec|december)\s+(\d{1,2})(?:,\s*(\d{4}))?[^\n\r]{0,40}?\b(\d{1,2})(?::(\d{2}))?\s*(am|pm)\b/i;
    const m = text.match(regex);
    if (!m) return [];

    const monthToken = m[2];
    const day = Number(m[3]);
    const year = m[4] ? Number(m[4]) : new Date().getFullYear();
    const hour12 = Number(m[5]);
    const minute = m[6] ? Number(m[6]) : 0;
    const ampm = (m[7] || "").toLowerCase();
    const titleToken = (m[1] || "Reminder").trim();

    const monthMap: Record<string, number> = {
      jan: 0, january: 0,
      feb: 1, february: 1,
      mar: 2, march: 2,
      apr: 3, april: 3,
      may: 4,
      jun: 5, june: 5,
      jul: 6, july: 6,
      aug: 7, august: 7,
      sep: 8, sept: 8, september: 8,
      oct: 9, october: 9,
      nov: 10, november: 10,
      dec: 11, december: 11,
    };

    const month = monthMap[monthToken.toLowerCase()];
    if (month === undefined || Number.isNaN(day) || Number.isNaN(hour12)) return [];

    let hour24 = hour12 % 12;
    if (ampm === "pm") hour24 += 12;

    const d = new Date(year, month, day, hour24, minute, 0, 0);
    if (Number.isNaN(d.getTime()) || d.getTime() <= Date.now()) return [];

    const title = titleToken
      .split(" ")
      .slice(0, 3)
      .map((w: string) => (w ? w[0].toUpperCase() + w.slice(1).toLowerCase() : ""))
      .join(" ") || "Reminder";

    return [{ title, scheduled_at: d.toISOString() }];
  };

  const prompt =
    "Extract reminders from this note. Return ONLY a JSON array.\n" +
    "Each item must be: {\"title\":\"1-3 keywords\",\"scheduled_at\":\"ISO datetime\"}.\n" +
    "Rules: future events only, clear date+time only, title case, no extra text.\n" +
    `Today: ${new Date().toISOString()}\n` +
    `Title: ${noteTitle}\n` +
    `Content: ${noteContent}`;

  const raw = await callQwen(
    [
      {
        role: "system",
        content:
          "You extract only valid reminder events. Return strict JSON array, no markdown, no explanation.",
      },
      { role: "user", content: prompt },
    ],
    { max_tokens: 400, temperature: 0.1 },
  );

  let parsed: any[] = [];
  try {
    const direct = JSON.parse(raw);
    parsed = Array.isArray(direct) ? direct : [];
  } catch {
    const match = raw.match(/\[[\s\S]*\]/);
    if (match) {
      try {
        const extracted = JSON.parse(match[0]);
        parsed = Array.isArray(extracted) ? extracted : [];
      } catch {
        parsed = [];
      }
    }
  }

  const now = Date.now();
  const normalized = parsed
    .map((item) => {
      const rawTitle = typeof item?.title === "string" ? item.title.trim() : "";
      const title = (rawTitle || "Reminder")
        .replace(/\s+/g, " ")
        .split(" ")
        .slice(0, 3)
        .map((w: string) => (w ? w[0].toUpperCase() + w.slice(1).toLowerCase() : ""))
        .join(" ");
      const scheduledAt = typeof item?.scheduled_at === "string" ? item.scheduled_at : "";
      const ts = parseAsLocalWallClock(scheduledAt);
      if (!Number.isFinite(ts) || ts <= now) return null;
      return { title, scheduled_at: new Date(ts).toISOString() };
    })
    .filter((v): v is { title: string; scheduled_at: string } => Boolean(v));

  if (normalized.length > 0) return normalized;
  return fromLocalPattern();
}
