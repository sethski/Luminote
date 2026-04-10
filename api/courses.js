import { serviceClient, verifyRequestUser } from "./_lib/supabase.js";

function json(res, status, payload) {
  res.status(status).setHeader("Content-Type", "application/json").send(JSON.stringify(payload));
}

export default async function handler(req, res) {
  try {
    if (req.method === "GET") {
      // Get all notes for a specific course with full details
      const userId = typeof req.query.userId === "string" ? req.query.userId.trim() : "";
      const courseId = typeof req.query.courseId === "string" ? req.query.courseId.trim() : "";

      if (!userId || !courseId) {
        return json(res, 400, { error: "userId and courseId are required" });
      }

      const auth = await verifyRequestUser(req, userId);
      if (!auth.ok) {
        return json(res, auth.status, { error: auth.error });
      }

      // Verify course belongs to user
      const { data: courseData, error: courseError } = await serviceClient
        .from("user_courses")
        .select("id")
        .eq("id", courseId)
        .eq("user_id", userId)
        .single();

      if (courseError || !courseData) {
        return json(res, 404, { error: "Course not found" });
      }

      // Get all notes for this course
      const { data: notes, error: notesError } = await serviceClient
        .from("notes")
        .select("*")
        .eq("course_id", courseId)
        .eq("is_deleted", false)
        .order("updated_at", { ascending: false });

      if (notesError) {
        return json(res, 500, { error: "Failed to fetch notes", details: notesError.message });
      }

      return json(res, 200, { notes: notes || [] });
    } else if (req.method === "POST") {
      // Link a note to a course
      const body = req.body && typeof req.body === "object" ? req.body : {};
      const userId = typeof body.userId === "string" ? body.userId.trim() : "";
      const noteId = typeof body.noteId === "string" ? body.noteId.trim() : "";
      const courseId = typeof body.courseId === "string" ? body.courseId.trim() : "";

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

      // If courseId is provided, verify it belongs to user
      if (courseId) {
        const { data: courseCheckData, error: courseCheckError } = await serviceClient
          .from("user_courses")
          .select("id")
          .eq("id", courseId)
          .eq("user_id", userId)
          .single();

        if (courseCheckError || !courseCheckData) {
          return json(res, 404, { error: "Course not found or does not belong to user" });
        }
      }

      // Update note with course_id
      const { data: updated, error: updateError } = await serviceClient
        .from("notes")
        .update({ 
          course_id: courseId || null,
          updated_at: new Date().toISOString() 
        })
        .eq("id", noteId)
        .eq("user_id", userId)
        .select();

      if (updateError) {
        return json(res, 500, { error: "Failed to link note to course", details: updateError.message });
      }

      return json(res, 200, { 
        success: true, 
        note: (updated && updated[0]) || {} 
      });
    } else if (req.method === "DELETE") {
      // Unlink all notes from a course (when course is deleted)
      const userId = typeof req.query.userId === "string" ? req.query.userId.trim() : "";
      const courseId = typeof req.query.courseId === "string" ? req.query.courseId.trim() : "";

      if (!userId || !courseId) {
        return json(res, 400, { error: "userId and courseId are required" });
      }

      const auth = await verifyRequestUser(req, userId);
      if (!auth.ok) {
        return json(res, auth.status, { error: auth.error });
      }

      // Verify course belongs to user
      const { data: courseData, error: courseError } = await serviceClient
        .from("user_courses")
        .select("id")
        .eq("id", courseId)
        .eq("user_id", userId)
        .single();

      if (courseError || !courseData) {
        return json(res, 404, { error: "Course not found" });
      }

      // Unlink all notes from this course
      const { error: updateError } = await serviceClient
        .from("notes")
        .update({ course_id: null })
        .eq("course_id", courseId);

      if (updateError) {
        return json(res, 500, { error: "Failed to unlink notes", details: updateError.message });
      }

      return json(res, 200, { success: true });
    } else {
      return json(res, 405, { error: "Method not allowed" });
    }
  } catch (error) {
    return json(res, 500, {
      error: "Unexpected courses endpoint error",
      details: error instanceof Error ? error.message : String(error),
    });
  }
}
