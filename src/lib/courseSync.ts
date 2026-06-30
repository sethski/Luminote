import { supabase } from "./supabaseClient";

export type SyncCourse = {
  id: string;
  code: string;
  title: string;
  subtitle?: string | null;
  days?: string[];
  time?: string | null;
  notes?: string;
};

export function coursesStorageKey(userId?: string | null): string {
  return userId ? `luminote-personal-courses-${userId}` : "luminote-personal-courses-guest";
}

function normalizeLocalCourse(raw: unknown): SyncCourse | null {
  if (!raw || typeof raw !== "object") return null;
  const c = raw as Record<string, unknown>;
  if (typeof c.id !== "string" || typeof c.title !== "string") return null;
  return {
    id: c.id,
    code: typeof c.code === "string" ? c.code : "",
    title: c.title,
    subtitle: typeof c.subtitle === "string" ? c.subtitle : null,
    days: Array.isArray(c.days) ? c.days.map(String) : [],
    time: typeof c.time === "string" ? c.time : null,
    notes: typeof c.notes === "string" ? c.notes : "",
  };
}

function rowToCourse(row: Record<string, unknown>): SyncCourse {
  return {
    id: String(row.id),
    code: String(row.code ?? ""),
    title: String(row.title),
    subtitle: typeof row.subtitle === "string" ? row.subtitle : null,
    days: Array.isArray(row.schedule_days) ? row.schedule_days.map(String) : [],
    time: typeof row.schedule_time === "string" ? row.schedule_time : null,
    notes: typeof row.notes === "string" ? row.notes : "",
  };
}

export function readLocalCourses(key: string): SyncCourse[] {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.map(normalizeLocalCourse).filter((c): c is SyncCourse => Boolean(c));
  } catch {
    return [];
  }
}

export function writeLocalCourses(key: string, courses: SyncCourse[]): void {
  localStorage.setItem(key, JSON.stringify(courses));
}

/** Supabase is source of truth; push orphaned local courses up on sync. */
export async function syncUserCourses(
  userId: string,
): Promise<{ courses: SyncCourse[]; backendAvailable: boolean }> {
  const key = coursesStorageKey(userId);
  const local = readLocalCourses(key);

  const { data, error } = await supabase
    .from("user_courses")
    .select("id, code, title, subtitle, schedule_days, schedule_time, notes, created_at")
    .eq("user_id", userId)
    .order("created_at", { ascending: false });

  if (error) {
    return { courses: local, backendAvailable: false };
  }

  const remote = (data ?? []).map((row) => rowToCourse(row as Record<string, unknown>));
  const remoteIds = new Set(remote.map((c) => c.id));

  for (const course of local) {
    if (remoteIds.has(course.id)) continue;
    const { error: insertError } = await supabase.from("user_courses").insert({
      id: course.id,
      user_id: userId,
      code: course.code || "COURSE",
      title: course.title,
      subtitle: course.subtitle || null,
      schedule_days: course.days ?? [],
      schedule_time: course.time || null,
      notes: course.notes ?? "",
    });
    if (!insertError) {
      remote.unshift(course);
      remoteIds.add(course.id);
    }
  }

  const merged = remote.length > 0 ? remote : local;
  writeLocalCourses(key, merged);
  return { courses: merged, backendAvailable: true };
}

/** Ensure a course id exists in Supabase (sync from local cache if needed). */
export async function ensureCourseExists(userId: string, courseId: string): Promise<boolean> {
  const { data } = await supabase
    .from("user_courses")
    .select("id")
    .eq("id", courseId)
    .eq("user_id", userId)
    .maybeSingle();

  if (data) return true;

  const local = readLocalCourses(coursesStorageKey(userId)).find((c) => c.id === courseId);
  if (!local) return false;

  const { error } = await supabase.from("user_courses").insert({
    id: local.id,
    user_id: userId,
    code: local.code || "COURSE",
    title: local.title,
    subtitle: local.subtitle || null,
    schedule_days: local.days ?? [],
    schedule_time: local.time || null,
    notes: local.notes ?? "",
  });

  return !error;
}

/** Lightweight course list for pickers (Home, Editor). */
export async function listCoursesForUser(userId?: string | null): Promise<SyncCourse[]> {
  if (!userId) {
    return readLocalCourses(coursesStorageKey(null));
  }

  const { courses, backendAvailable } = await syncUserCourses(userId);
  if (backendAvailable) return courses;

  const local = readLocalCourses(coursesStorageKey(userId));
  const guest = readLocalCourses(coursesStorageKey(null));
  const byId = new Map<string, SyncCourse>();
  for (const c of [...guest, ...local]) byId.set(c.id, c);
  return Array.from(byId.values());
}
