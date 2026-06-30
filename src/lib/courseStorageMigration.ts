import { supabase } from "./supabaseClient";

export function noteCourseMapKey(userId: string): string {
  return `luminote-note-course-map-${userId}`;
}

/** One-time: push legacy note→course map into notes.course_id. */
export async function migrateNoteCourseMap(userId: string): Promise<void> {
  const doneKey = `luminote-migrated-note-course-map-${userId}`;
  if (localStorage.getItem(doneKey)) return;

  let mapping: Record<string, unknown> = {};
  try {
    const raw = localStorage.getItem(noteCourseMapKey(userId));
    mapping = raw ? JSON.parse(raw) : {};
  } catch {
    mapping = {};
  }

  if (mapping && typeof mapping === "object") {
    for (const [noteId, courseId] of Object.entries(mapping)) {
      if (typeof courseId !== "string") continue;
      await supabase
        .from("notes")
        .update({ course_id: courseId })
        .eq("id", noteId)
        .eq("user_id", userId);
    }
  }

  localStorage.removeItem(noteCourseMapKey(userId));
  localStorage.setItem(doneKey, "1");
}

type LegacyFolder = { id?: string; name?: string; notes?: string[] };

/** One-time per course: import localStorage folders + note lists into Supabase. */
export async function migrateLegacyCourseStorage(userId: string, courseId: string): Promise<void> {
  const doneKey = `luminote-migrated-course-${userId}-${courseId}`;
  if (localStorage.getItem(doneKey)) return;

  await migrateNoteCourseMap(userId);

  try {
    const rawNotes = localStorage.getItem(`notes-${courseId}`);
    const storedNotes = rawNotes ? JSON.parse(rawNotes) : [];
    if (Array.isArray(storedNotes)) {
      for (const entry of storedNotes) {
        if (!entry || typeof entry.id !== "string") continue;
        await supabase
          .from("notes")
          .update({ course_id: courseId })
          .eq("id", entry.id)
          .eq("user_id", userId);
      }
    }
  } catch {
    // Ignore malformed legacy cache.
  }

  const { data: existing } = await supabase
    .from("course_folders")
    .select("id")
    .eq("course_id", courseId)
    .eq("user_id", userId)
    .limit(1);

  if (!existing?.length) {
    let legacy: LegacyFolder[] = [];
    try {
      const raw = localStorage.getItem(`folders-${courseId}`);
      legacy = raw ? JSON.parse(raw) : [];
    } catch {
      legacy = [];
    }

    if (Array.isArray(legacy)) {
      for (const folder of legacy) {
        if (!folder?.name?.trim()) continue;

        const { data: row, error } = await supabase
          .from("course_folders")
          .insert({
            course_id: courseId,
            user_id: userId,
            name: folder.name.trim(),
          })
          .select("id")
          .single();

        if (error || !row) continue;

        const noteIds = Array.isArray(folder.notes) ? folder.notes : [];
        for (const noteId of noteIds) {
          if (typeof noteId !== "string") continue;
          await supabase.from("course_folder_notes").upsert({
            folder_id: row.id,
            note_id: noteId,
          });
          await supabase
            .from("notes")
            .update({ course_id: courseId })
            .eq("id", noteId)
            .eq("user_id", userId);
        }
      }
    }
  }

  localStorage.removeItem(`folders-${courseId}`);
  localStorage.removeItem(`notes-${courseId}`);
  localStorage.removeItem(`course-${courseId}`);
  localStorage.setItem(doneKey, "1");
}
