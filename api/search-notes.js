import { rankMatchingNotes } from "./_lib/noteSearch.js";
import { serviceClient, verifyRequestUser } from "./_lib/supabase.js";

function json(res, status, payload) {
  res.status(status).setHeader("Content-Type", "application/json").send(JSON.stringify(payload));
}

export default async function handler(req, res) {
  try {
    if (req.method !== "POST") {
      return json(res, 405, { error: "Method not allowed" });
    }

    const body = req.body && typeof req.body === "object" ? req.body : {};
    const query = typeof body.query === "string" ? body.query.trim() : "";
    const userId = typeof body.userId === "string" ? body.userId.trim() : "";

    if (!query || !userId) {
      return json(res, 400, { error: "query and userId are required" });
    }

    const auth = await verifyRequestUser(req, userId);
    if (!auth.ok) {
      return json(res, auth.status, { error: auth.error });
    }

    const { data, error } = await serviceClient
      .from("notes")
      .select("id,title,content,tags,created_at,updated_at")
      .eq("user_id", userId)
      .eq("is_deleted", false);

    if (error) {
      return json(res, 500, { error: "Failed to load notes", details: error.message });
    }

    const ranked = rankMatchingNotes(data || [], query);
    const notes = ranked.slice(0, 20).map(({ note, matchedText }) => ({
      id: note.id,
      title: note.title || "Untitled Note",
      content: note.content || "",
      tags: note.tags || [],
      created_at: note.created_at,
      updated_at: note.updated_at,
      matchedText,
    }));

    if (!notes.length) {
      return json(res, 200, {
        found: false,
        notes: [],
        message: `I couldn't find any notes about ${query}`,
      });
    }

    return json(res, 200, {
      found: true,
      query,
      total: notes.length,
      notes,
    });
  } catch (error) {
    return json(res, 500, {
      error: "Unexpected search endpoint error",
      details: error instanceof Error ? error.message : String(error),
    });
  }
}
