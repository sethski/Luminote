import { serviceClient, verifyRequestUser } from "./_lib/supabase.js";

function json(res, status, payload) {
  res.status(status).setHeader("Content-Type", "application/json").send(JSON.stringify(payload));
}

function normalizeString(value) {
  return typeof value === "string" ? value.trim() : "";
}

export default async function handler(req, res) {
  try {
    if (req.method !== "GET") {
      return json(res, 405, { error: "Method not allowed" });
    }

    const userId = normalizeString(req.query.userId);
    const search = normalizeString(req.query.search).toLowerCase();
    const tagIds = normalizeString(req.query.tags)
      .split(",")
      .map((v) => v.trim())
      .filter(Boolean);

    if (!userId) {
      return json(res, 400, { error: "userId is required" });
    }

    const auth = await verifyRequestUser(req, userId);
    if (!auth.ok) {
      return json(res, auth.status, { error: auth.error });
    }

    const { data: notes, error } = await serviceClient
      .from("notes")
      .select("id,title,content,tags,created_at,updated_at,note_tags(tag_id)")
      .eq("user_id", userId)
      .eq("is_deleted", false)
      .order("updated_at", { ascending: false });

    if (error) {
      return json(res, 500, { error: "Failed to fetch notes", details: error.message });
    }

    const filtered = (notes || []).filter((note) => {
      const title = String(note.title || "").toLowerCase();
      const content = String(note.content || "").toLowerCase();
      const names = (Array.isArray(note.tags) ? note.tags : []).map((t) => String(t).toLowerCase());
      const linkedTagIds = Array.isArray(note.note_tags)
        ? note.note_tags.map((row) => String(row.tag_id || "")).filter(Boolean)
        : [];

      const searchPass = !search
        ? true
        : title.includes(search) || content.includes(search) || names.some((name) => name.includes(search));

      const tagPass = !tagIds.length
        ? true
        : tagIds.some((id) => linkedTagIds.includes(id));

      return searchPass && tagPass;
    });

    return json(res, 200, {
      notes: filtered.map((note) => ({
        id: note.id,
        title: note.title || "Untitled Note",
        content: note.content || "",
        tags: Array.isArray(note.tags) ? note.tags : [],
        created_at: note.created_at,
        updated_at: note.updated_at,
      })),
      total: filtered.length,
      applied: {
        search,
        tags: tagIds,
      },
    });
  } catch (error) {
    return json(res, 500, {
      error: "Unexpected notes endpoint error",
      details: error instanceof Error ? error.message : String(error),
    });
  }
}
