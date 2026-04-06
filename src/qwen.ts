/**
 * qwen.ts — Qwen AI service via OpenRouter
 * Uses VITE_OPENROUTER_API_KEY directly (dev + prod via env).
 */
import { supabase } from "./supabaseClient";

type QwenMessage = { role: "system" | "user" | "assistant"; content: string };
type QwenOptions = { model?: string; max_tokens?: number; temperature?: number };

const OPENROUTER_URL = "https://openrouter.ai/api/v1/chat/completions";
// Use a stable, available free model
const DEFAULT_QWEN_MODEL = "qwen/qwen-2.5-7b-instruct:free";

/* ─── Core request helper ────────────────────────── */
async function callQwen(messages: QwenMessage[], opts: QwenOptions = {}): Promise<string> {
  const payload = {
    messages,
    model:       opts.model       ?? DEFAULT_QWEN_MODEL,
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
