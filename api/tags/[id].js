import { serviceClient, verifyRequestUser } from "../_lib/supabase.js";
import { normalizeColor, normalizeTagName, toTagResponse } from "../_lib/tags.js";

function json(res, status, payload) {
  res.status(status).setHeader("Content-Type", "application/json").send(JSON.stringify(payload));
}

export default async function handler(req, res) {
  try {
    const tagId = typeof req.query.id === "string" ? req.query.id.trim() : "";
    const userId = typeof req.query.userId === "string"
      ? req.query.userId.trim()
      : (typeof req.body?.userId === "string" ? req.body.userId.trim() : "");

    if (!tagId || !userId) {
      return json(res, 400, { error: "tag id and userId are required" });
    }

    const auth = await verifyRequestUser(req, userId);
    if (!auth.ok) {
      return json(res, auth.status, { error: auth.error });
    }

    const { data: existing, error: existingError } = await serviceClient
      .from("tags")
      .select("id,name,color,user_id,is_default")
      .eq("id", tagId)
      .single();

    if (existingError || !existing) {
      return json(res, 404, { error: "Tag not found" });
    }

    if (existing.is_default) {
      return json(res, 403, { error: "Default tags cannot be modified" });
    }

    if (existing.user_id !== userId) {
      return json(res, 403, { error: "You can only modify your own custom tags" });
    }

    if (req.method === "DELETE") {
      const { error: junctionDeleteError } = await serviceClient
        .from("note_tags")
        .delete()
        .eq("tag_id", tagId);

      if (junctionDeleteError) {
        return json(res, 500, { error: "Failed to remove tag associations", details: junctionDeleteError.message });
      }

      const { error: tagDeleteError } = await serviceClient
        .from("tags")
        .delete()
        .eq("id", tagId)
        .eq("user_id", userId);

      if (tagDeleteError) {
        return json(res, 500, { error: "Failed to delete tag", details: tagDeleteError.message });
      }

      return json(res, 200, { success: true });
    }

    if (req.method === "PUT") {
      const body = req.body && typeof req.body === "object" ? req.body : {};
      const name = body.name !== undefined ? normalizeTagName(body.name) : undefined;
      const color = body.color !== undefined ? normalizeColor(body.color, existing.color) : undefined;

      if (name !== undefined && !name) {
        return json(res, 400, { error: "Tag name cannot be empty" });
      }

      if (name && name.toLowerCase() !== String(existing.name).toLowerCase()) {
        const { data: duplicate, error: duplicateError } = await serviceClient
          .from("tags")
          .select("id")
          .or(`is_default.eq.true,user_id.eq.${userId}`)
          .ilike("name", name)
          .neq("id", tagId)
          .limit(1);

        if (duplicateError) {
          return json(res, 500, { error: "Failed to validate tag uniqueness", details: duplicateError.message });
        }

        if (Array.isArray(duplicate) && duplicate.length > 0) {
          return json(res, 409, { error: "Tag already exists" });
        }
      }

      const updates = {};
      if (name !== undefined) updates.name = name;
      if (color !== undefined) updates.color = color;

      if (Object.keys(updates).length === 0) {
        return json(res, 200, { tag: toTagResponse(existing) });
      }

      const { data: updated, error: updateError } = await serviceClient
        .from("tags")
        .update(updates)
        .eq("id", tagId)
        .eq("user_id", userId)
        .select("id,name,color,user_id,is_default")
        .single();

      if (updateError || !updated) {
        return json(res, 500, { error: "Failed to update tag", details: updateError?.message ?? "Unknown error" });
      }

      if (name !== undefined) {
        const { data: linkedRows, error: linkedError } = await serviceClient
          .from("note_tags")
          .select("note_id")
          .eq("tag_id", tagId);

        if (!linkedError && linkedRows && linkedRows.length > 0) {
          const noteIds = [...new Set(linkedRows.map((row) => row.note_id).filter(Boolean))];
          if (noteIds.length > 0) {
            const { data: noteTagRows } = await serviceClient
              .from("note_tags")
              .select("note_id,tags(name)")
              .in("note_id", noteIds);

            const noteNameMap = new Map();
            (noteTagRows || []).forEach((row) => {
              const noteId = row.note_id;
              const tagName = row.tags?.name;
              if (!noteId || !tagName) return;
              const arr = noteNameMap.get(noteId) || [];
              arr.push(tagName);
              noteNameMap.set(noteId, arr);
            });

            await Promise.all(
              noteIds.map((noteId) => serviceClient
                .from("notes")
                .update({ tags: noteNameMap.get(noteId) || [] })
                .eq("id", noteId)
                .eq("user_id", userId))
            );
          }
        }
      }

      return json(res, 200, { tag: toTagResponse(updated) });
    }

    return json(res, 405, { error: "Method not allowed" });
  } catch (error) {
    return json(res, 500, {
      error: "Unexpected tag endpoint error",
      details: error instanceof Error ? error.message : String(error),
    });
  }
}
