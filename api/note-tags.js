import { serviceClient, verifyRequestUser } from "./_lib/supabase.js";

function json(res, status, payload) {
  res.status(status).setHeader("Content-Type", "application/json").send(JSON.stringify(payload));
}

async function readTagRowsForUser(userId) {
  const { data, error } = await serviceClient
    .from("tags")
    .select("id,name,color,user_id,is_default")
    .or(`is_default.eq.true,user_id.eq.${userId}`);

  if (error) {
    throw new Error(`Failed to fetch tag catalog: ${error.message}`);
  }

  return data || [];
}

async function syncNoteTagNames(noteId, userId) {
  const { data: rows, error } = await serviceClient
    .from("note_tags")
    .select("tags(name)")
    .eq("note_id", noteId);

  if (error) {
    throw new Error(`Failed to fetch note tags: ${error.message}`);
  }

  const names = (rows || [])
    .map((row) => row.tags?.name)
    .filter(Boolean);

  const { error: updateError } = await serviceClient
    .from("notes")
    .update({ tags: names, updated_at: new Date().toISOString() })
    .eq("id", noteId)
    .eq("user_id", userId);

  if (updateError) {
    throw new Error(`Failed to sync note tag names: ${updateError.message}`);
  }

  return names;
}

export default async function handler(req, res) {
  try {
    if (req.method === "GET") {
      const userId = typeof req.query.userId === "string" ? req.query.userId.trim() : "";
      const noteId = typeof req.query.noteId === "string" ? req.query.noteId.trim() : "";

      if (!userId || !noteId) {
        return json(res, 400, { error: "userId and noteId are required" });
      }

      const auth = await verifyRequestUser(req, userId);
      if (!auth.ok) {
        return json(res, auth.status, { error: auth.error });
      }

      const { data: note, error: noteError } = await serviceClient
        .from("notes")
        .select("id")
        .eq("id", noteId)
        .eq("user_id", userId)
        .single();

      if (noteError || !note) {
        return json(res, 404, { error: "Note not found" });
      }

      const allowedTags = await readTagRowsForUser(userId);
      const allowedMap = new Map(allowedTags.map((tag) => [tag.id, tag]));

      const { data: rows, error } = await serviceClient
        .from("note_tags")
        .select("tag_id")
        .eq("note_id", noteId);

      if (error) {
        return json(res, 500, { error: "Failed to fetch note tags", details: error.message });
      }

      const tags = (rows || [])
        .map((row) => allowedMap.get(row.tag_id))
        .filter(Boolean)
        .map((tag) => ({
          id: tag.id,
          name: tag.name,
          color: tag.color,
          userId: tag.user_id,
          isDefault: Boolean(tag.is_default),
        }));

      return json(res, 200, { tags });
    }

    if (req.method === "PUT") {
      const body = req.body && typeof req.body === "object" ? req.body : {};
      const userId = typeof body.userId === "string" ? body.userId.trim() : "";
      const noteId = typeof body.noteId === "string" ? body.noteId.trim() : "";
      const tagIds = Array.isArray(body.tagIds)
        ? body.tagIds.map((v) => String(v).trim()).filter(Boolean)
        : [];

      if (!userId || !noteId) {
        return json(res, 400, { error: "userId and noteId are required" });
      }

      const auth = await verifyRequestUser(req, userId);
      if (!auth.ok) {
        return json(res, auth.status, { error: auth.error });
      }

      const { data: note, error: noteError } = await serviceClient
        .from("notes")
        .select("id")
        .eq("id", noteId)
        .eq("user_id", userId)
        .single();

      if (noteError || !note) {
        return json(res, 404, { error: "Note not found" });
      }

      const allowedTags = await readTagRowsForUser(userId);
      const allowedIds = new Set(allowedTags.map((tag) => tag.id));
      const validTagIds = [...new Set(tagIds)].filter((id) => allowedIds.has(id));

      const { error: deleteError } = await serviceClient
        .from("note_tags")
        .delete()
        .eq("note_id", noteId);

      if (deleteError) {
        return json(res, 500, { error: "Failed to clear note tags", details: deleteError.message });
      }

      if (validTagIds.length > 0) {
        const rows = validTagIds.map((tagId) => ({ note_id: noteId, tag_id: tagId }));
        const { error: insertError } = await serviceClient
          .from("note_tags")
          .insert(rows);

        if (insertError) {
          return json(res, 500, { error: "Failed to save note tags", details: insertError.message });
        }
      }

      const syncedNames = await syncNoteTagNames(noteId, userId);
      return json(res, 200, { success: true, tagIds: validTagIds, tagNames: syncedNames });
    }

    return json(res, 405, { error: "Method not allowed" });
  } catch (error) {
    return json(res, 500, {
      error: "Unexpected note-tag endpoint error",
      details: error instanceof Error ? error.message : String(error),
    });
  }
}
