import { serviceClient, verifyRequestUser } from "./_lib/supabase.js";

function json(res, status, payload) {
  res.status(status).setHeader("Content-Type", "application/json").send(JSON.stringify(payload));
}

export default async function handler(req, res) {
  try {
    if (req.method === "GET") {
      // Get all tags for a user
      const userId = typeof req.query.userId === "string" ? req.query.userId.trim() : "";
      
      if (!userId) {
        return json(res, 400, { error: "userId is required" });
      }

      const auth = await verifyRequestUser(req, userId);
      if (!auth.ok) {
        return json(res, auth.status, { error: auth.error });
      }

      const { data, error } = await serviceClient
        .from("notes")
        .select("tags")
        .eq("user_id", userId)
        .eq("is_deleted", false);

      if (error) {
        return json(res, 500, { error: "Failed to fetch tags", details: error.message });
      }

      // Aggregate all unique tags
      const allTags = new Set();
      (data || []).forEach(note => {
        if (Array.isArray(note.tags)) {
          note.tags.forEach(tag => allTags.add(tag));
        }
      });

      return json(res, 200, { tags: Array.from(allTags).sort() });
    } else if (req.method === "POST") {
      // Update tags for a note
      const body = req.body && typeof req.body === "object" ? req.body : {};
      const userId = typeof body.userId === "string" ? body.userId.trim() : "";
      const noteId = typeof body.noteId === "string" ? body.noteId.trim() : "";
      const tags = Array.isArray(body.tags) ? body.tags.map((t) => String(t).trim().toUpperCase()).filter(Boolean) : [];

      if (!userId || !noteId) {
        return json(res, 400, { error: "userId and noteId are required" });
      }

      const auth = await verifyRequestUser(req, userId);
      if (!auth.ok) {
        return json(res, auth.status, { error: auth.error });
      }

      // Verify note belongs to user
      const { data: noteData, error: noteError } = await serviceClient
        .from("notes")
        .select("id")
        .eq("id", noteId)
        .eq("user_id", userId)
        .single();

      if (noteError || !noteData) {
        return json(res, 404, { error: "Note not found" });
      }

      // Update tags
      const { data: updated, error: updateError } = await serviceClient
        .from("notes")
        .update({ tags, updated_at: new Date().toISOString() })
        .eq("id", noteId)
        .eq("user_id", userId)
        .select();

      if (updateError) {
        return json(res, 500, { error: "Failed to update tags", details: updateError.message });
      }

      return json(res, 200, { 
        success: true, 
        tags: (updated && updated[0] && updated[0].tags) || [] 
      });
    } else {
      return json(res, 405, { error: "Method not allowed" });
    }
  } catch (error) {
    return json(res, 500, {
      error: "Unexpected tags endpoint error",
      details: error instanceof Error ? error.message : String(error),
    });
  }
}
