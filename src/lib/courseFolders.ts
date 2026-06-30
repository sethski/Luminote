import { supabase } from "./supabaseClient";

export type CourseFolder = {
  id: string;
  course_id: string;
  name: string;
  noteIds: string[];
};

export async function fetchFoldersForCourse(
  userId: string,
  courseId: string,
): Promise<{ folders: CourseFolder[]; backendAvailable: boolean }> {
  const { data: rows, error } = await supabase
    .from("course_folders")
    .select("id, course_id, name")
    .eq("user_id", userId)
    .eq("course_id", courseId)
    .order("created_at", { ascending: true });

  if (error) {
    return { folders: [], backendAvailable: false };
  }

  const folderRows = rows ?? [];
  if (folderRows.length === 0) {
    return { folders: [], backendAvailable: true };
  }

  const folderIds = folderRows.map((r) => r.id);
  const { data: links } = await supabase
    .from("course_folder_notes")
    .select("folder_id, note_id")
    .in("folder_id", folderIds);

  const notesByFolder = new Map<string, string[]>();
  for (const link of links ?? []) {
    const list = notesByFolder.get(link.folder_id) ?? [];
    list.push(link.note_id);
    notesByFolder.set(link.folder_id, list);
  }

  return {
    backendAvailable: true,
    folders: folderRows.map((row) => ({
      id: row.id,
      course_id: row.course_id,
      name: row.name,
      noteIds: notesByFolder.get(row.id) ?? [],
    })),
  };
}

export async function createCourseFolder(
  userId: string,
  courseId: string,
  name: string,
): Promise<CourseFolder | null> {
  const { data, error } = await supabase
    .from("course_folders")
    .insert({ user_id: userId, course_id: courseId, name: name.trim() })
    .select("id, course_id, name")
    .single();

  if (error || !data) return null;
  return { ...data, noteIds: [] };
}

export async function renameCourseFolder(folderId: string, name: string): Promise<boolean> {
  const { error } = await supabase
    .from("course_folders")
    .update({ name: name.trim() })
    .eq("id", folderId);
  return !error;
}

export async function deleteCourseFolder(folderId: string): Promise<boolean> {
  const { error } = await supabase.from("course_folders").delete().eq("id", folderId);
  return !error;
}

export async function addNoteToCourseFolder(folderId: string, noteId: string): Promise<boolean> {
  const { error } = await supabase.from("course_folder_notes").upsert({
    folder_id: folderId,
    note_id: noteId,
  });
  return !error;
}

export async function removeNoteFromCourseFolder(folderId: string, noteId: string): Promise<boolean> {
  const { error } = await supabase
    .from("course_folder_notes")
    .delete()
    .eq("folder_id", folderId)
    .eq("note_id", noteId);
  return !error;
}

/** note_id sets grouped by course_id (for Personal hub counts). */
export async function fetchFolderNoteIdsByCourse(
  userId: string,
): Promise<{ byCourse: Record<string, Set<string>>; backendAvailable: boolean }> {
  const { data: folders, error } = await supabase
    .from("course_folders")
    .select("id, course_id")
    .eq("user_id", userId);

  if (error) {
    return { byCourse: {}, backendAvailable: false };
  }

  const folderRows = folders ?? [];
  if (folderRows.length === 0) {
    return { byCourse: {}, backendAvailable: true };
  }

  const folderToCourse = new Map(folderRows.map((f) => [f.id, f.course_id]));
  const { data: links } = await supabase
    .from("course_folder_notes")
    .select("folder_id, note_id")
    .in("folder_id", folderRows.map((f) => f.id));

  const byCourse: Record<string, Set<string>> = {};
  for (const link of links ?? []) {
    const courseId = folderToCourse.get(link.folder_id);
    if (!courseId) continue;
    if (!byCourse[courseId]) byCourse[courseId] = new Set();
    byCourse[courseId].add(link.note_id);
  }

  return { byCourse, backendAvailable: true };
}
