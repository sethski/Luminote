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
    const userId = typeof body.userId === "string" ? body.userId.trim() : "";

    if (!userId) {
      return json(res, 400, { error: "userId is required" });
    }

    const auth = await verifyRequestUser(req, userId);
    if (!auth.ok) {
      return json(res, auth.status, { error: auth.error });
    }

    const { error } = await serviceClient.auth.admin.deleteUser(userId);
    if (error) {
      return json(res, 500, { error: "Failed to delete account", details: error.message });
    }

    return json(res, 200, { success: true });
  } catch (error) {
    return json(res, 500, {
      error: "Unexpected delete-account error",
      details: error instanceof Error ? error.message : String(error),
    });
  }
}
