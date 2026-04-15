import { serviceClient, verifyRequestUser } from "./_lib/supabase.js";
import {
  DEFAULT_TAGS,
  DEFAULT_TAG_NAME_SET,
  ensureDefaultTags,
  normalizeColor,
  normalizeTagName,
  toTagResponse,
} from "./_lib/tags.js";

function json(res, status, payload) {
  res.status(status).setHeader("Content-Type", "application/json").send(JSON.stringify(payload));
}

export default async function handler(req, res) {
  try {
    if (req.method === "GET") {
      const userId = typeof req.query.userId === "string" ? req.query.userId.trim() : "";
      if (!userId) {
        return json(res, 400, { error: "userId is required" });
      }

      const auth = await verifyRequestUser(req, userId);
      if (!auth.ok) {
        return json(res, auth.status, { error: auth.error });
      }

      await ensureDefaultTags(serviceClient);

      const { data, error } = await serviceClient
        .from("tags")
        .select("id,name,color,user_id,is_default")
        .or(`is_default.eq.true,user_id.eq.${userId}`)
        .order("is_default", { ascending: false })
        .order("name", { ascending: true });

      if (error) {
        return json(res, 500, { error: "Failed to fetch tags", details: error.message });
      }

      const defaultOrder = new Map(DEFAULT_TAGS.map((tag, index) => [tag.name.toLowerCase(), index]));
      const filtered = (data || []).filter((row) => {
        if (!row.is_default) return true;
        return DEFAULT_TAG_NAME_SET.has(String(row.name).toLowerCase());
      });

      filtered.sort((a, b) => {
        if (a.is_default && b.is_default) {
          return (defaultOrder.get(String(a.name).toLowerCase()) ?? 999) - (defaultOrder.get(String(b.name).toLowerCase()) ?? 999);
        }
        if (a.is_default !== b.is_default) {
          return a.is_default ? -1 : 1;
        }
        return String(a.name).localeCompare(String(b.name));
      });

      return json(res, 200, { tags: filtered.map(toTagResponse) });
    } else if (req.method === "POST") {
      const body = req.body && typeof req.body === "object" ? req.body : {};
      const userId = typeof body.userId === "string" ? body.userId.trim() : "";
      const name = normalizeTagName(body.name);
      const color = normalizeColor(body.color, "#64748B");

      if (!userId || !name) {
        return json(res, 400, { error: "userId and name are required" });
      }

      const auth = await verifyRequestUser(req, userId);
      if (!auth.ok) {
        return json(res, auth.status, { error: auth.error });
      }

      await ensureDefaultTags(serviceClient);

      const { data: duplicate, error: duplicateError } = await serviceClient
        .from("tags")
        .select("id")
        .or(`is_default.eq.true,user_id.eq.${userId}`)
        .ilike("name", name)
        .limit(1);

      if (duplicateError) {
        return json(res, 500, { error: "Failed to validate tag uniqueness", details: duplicateError.message });
      }

      if (Array.isArray(duplicate) && duplicate.length > 0) {
        return json(res, 409, { error: "Tag already exists" });
      }

      const { data: inserted, error: insertError } = await serviceClient
        .from("tags")
        .insert({
          name,
          color,
          user_id: userId,
          is_default: false,
        })
        .select("id,name,color,user_id,is_default")
        .single();

      if (insertError || !inserted) {
        return json(res, 500, { error: "Failed to create tag", details: insertError?.message ?? "Unknown error" });
      }

      return json(res, 201, { tag: toTagResponse(inserted) });
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
