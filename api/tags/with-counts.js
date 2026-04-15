import { serviceClient, verifyRequestUser } from "../_lib/supabase.js";
import { DEFAULT_TAGS, DEFAULT_TAG_NAME_SET, ensureDefaultTags, toTagResponse } from "../_lib/tags.js";

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
    if (!userId) {
      return json(res, 400, { error: "userId is required" });
    }

    const auth = await verifyRequestUser(req, userId);
    if (!auth.ok) {
      return json(res, auth.status, { error: auth.error });
    }

    await ensureDefaultTags(serviceClient);

    const { data: tags, error: tagsError } = await serviceClient
      .from("tags")
      .select("id,name,color,user_id,is_default")
      .or(`is_default.eq.true,user_id.eq.${userId}`);

    if (tagsError) {
      return json(res, 500, { error: "Failed to load tags", details: tagsError.message });
    }

    const canonicalDefaultOrder = new Map(DEFAULT_TAGS.map((tag, idx) => [tag.name.toLowerCase(), idx]));
    const tagRows = (tags || []).filter((row) => {
      if (!row.is_default) return true;
      return DEFAULT_TAG_NAME_SET.has(String(row.name).toLowerCase());
    });

    const { data: noteRows, error: noteError } = await serviceClient
      .from("notes")
      .select("id,tags")
      .eq("user_id", userId)
      .eq("is_deleted", false);

    if (noteError) {
      return json(res, 500, { error: "Failed to load notes for tag counts", details: noteError.message });
    }

    const noteIds = (noteRows || []).map((row) => row.id).filter(Boolean);

    const countByTagId = new Map();
    if (noteIds.length > 0) {
      const { data: junctionRows, error: junctionError } = await serviceClient
        .from("note_tags")
        .select("note_id,tag_id")
        .in("note_id", noteIds);

      if (!junctionError && Array.isArray(junctionRows)) {
        const seen = new Set();
        for (const row of junctionRows) {
          const noteId = String(row.note_id || "");
          const tagId = String(row.tag_id || "");
          if (!noteId || !tagId) continue;
          const key = `${noteId}:${tagId}`;
          if (seen.has(key)) continue;
          seen.add(key);
          countByTagId.set(tagId, (countByTagId.get(tagId) || 0) + 1);
        }
      }
    }

    // Fallback for older rows that only store names in notes.tags.
    if (countByTagId.size === 0) {
      const rowByName = new Map(
        tagRows.map((row) => [String(row.name).toLowerCase(), row])
      );
      for (const note of noteRows || []) {
        const tagNames = Array.isArray(note.tags) ? note.tags : [];
        const seenNames = new Set();
        for (const tagNameRaw of tagNames) {
          const tagName = String(tagNameRaw || "").toLowerCase();
          if (!tagName || seenNames.has(tagName)) continue;
          seenNames.add(tagName);
          const row = rowByName.get(tagName);
          if (!row) continue;
          countByTagId.set(row.id, (countByTagId.get(row.id) || 0) + 1);
        }
      }
    }

    const responseTags = tagRows
      .map((row) => {
        const base = toTagResponse(row);
        return {
          ...base,
          count: countByTagId.get(row.id) || 0,
          isPersonalized: !Boolean(row.is_default),
        };
      })
      .sort((a, b) => {
        if (a.isDefault && b.isDefault) {
          return (canonicalDefaultOrder.get(a.name.toLowerCase()) ?? 999) - (canonicalDefaultOrder.get(b.name.toLowerCase()) ?? 999);
        }
        if (a.isDefault !== b.isDefault) return a.isDefault ? -1 : 1;
        return a.name.localeCompare(b.name);
      });

    return json(res, 200, { tags: responseTags });
  } catch (error) {
    return json(res, 500, {
      error: "Unexpected tag counts endpoint error",
      details: error instanceof Error ? error.message : String(error),
    });
  }
}
