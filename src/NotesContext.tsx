import React, {
  createContext, useContext, useState,
  useEffect, useCallback, useRef, ReactNode,
} from "react";
import { supabase, Note, Reminder } from "./supabaseClient";
import { useAuth } from "./AuthContext";

export type { Note, Reminder };

  type NotesContextType = {
    notes:          Note[];
    notesLoading:   boolean;
    searchQuery:    string;
    setSearchQuery: (q: string) => void;
    addNote:        () => Promise<string>;
    addNoteForCourse: (courseId: string) => Promise<string>;
    updateNote:     (id: string, updates: Partial<Note>) => Promise<void>;
    deleteNote:     (id: string) => Promise<void>;
    addTagToNote:   (noteId: string, tag: string) => Promise<void>;
    removeTagFromNote: (noteId: string, tag: string) => Promise<void>;
    assignNoteToCourse: (noteId: string, courseId: string | null) => Promise<void>;
    refreshNotes:   () => Promise<void>;
    reminders:      Reminder[];
    addReminder:    (r: Pick<Reminder, "title" | "scheduled_at">, noteId?: string) => Promise<void>;
    toggleReminder: (id: string) => Promise<void>;
    removeReminder: (id: string) => Promise<void>;
    extractRemindersFromNote: (noteId: string, noteTitle: string, noteContent: string) => Promise<Reminder[]>;
    /** @deprecated use notesLoading */
    loading: boolean;
  };

const NotesContext = createContext<NotesContextType | null>(null);

export function NotesProvider({ children }: { children: ReactNode }) {
  const { user, settings } = useAuth();

  const [notes,        setNotes]        = useState<Note[]>([]);
  const [notesLoading, setNotesLoading] = useState(true);
  const [searchQuery,  setSearchQuery]  = useState("");
  const [reminders,    setReminders]    = useState<Reminder[]>([]);

  // Cache timestamp to avoid redundant fetches
  const lastFetch = useRef<number>(0);
  const reminderSchemaRef = useRef<"unknown" | "modern" | "legacy">("unknown");

  const toIsoFromLegacy = (date: string, time?: string): string | null => {
    if (!date) return null;
    const withTime = `${date} ${time && time.trim() ? time.trim() : "9:00 AM"}`;
    const parsed = new Date(withTime);
    if (!Number.isNaN(parsed.getTime())) return parsed.toISOString();
    const dateOnly = new Date(date);
    return Number.isNaN(dateOnly.getTime()) ? null : dateOnly.toISOString();
  };

  const toLegacyDate = (iso: string): string => {
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return "";
    const y = d.getFullYear();
    const m = `${d.getMonth() + 1}`.padStart(2, "0");
    const day = `${d.getDate()}`.padStart(2, "0");
    return `${y}-${m}-${day}`;
  };

  const toLegacyTime = (iso: string): string => {
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return "9:00 AM";
    let h = d.getHours();
    const m = `${d.getMinutes()}`.padStart(2, "0");
    const ampm = h >= 12 ? "PM" : "AM";
    h = h % 12;
    if (h === 0) h = 12;
    return `${h}:${m} ${ampm}`;
  };

  const normalizeReminder = (raw: any): Reminder | null => {
    const scheduledAt = typeof raw?.scheduled_at === "string"
      ? raw.scheduled_at
      : (typeof raw?.date === "string" ? toIsoFromLegacy(raw.date, raw.time) : null);

    if (!scheduledAt) return null;

    const isCompleted = Boolean(raw?.is_completed ?? raw?.completed ?? false);

    return {
      ...raw,
      note_id: raw?.note_id ?? null,
      scheduled_at: scheduledAt,
      is_completed: isCompleted,
      date: typeof raw?.date === "string" ? raw.date : toLegacyDate(scheduledAt),
      time: typeof raw?.time === "string" ? raw.time : toLegacyTime(scheduledAt),
      completed: isCompleted,
    } as Reminder;
  };

  const detectReminderSchema = useCallback(async () => {
    if (reminderSchemaRef.current !== "unknown") return reminderSchemaRef.current;

    const modernProbe = await supabase.from("reminders").select("id, scheduled_at").limit(1);
    if (!modernProbe.error) {
      reminderSchemaRef.current = "modern";
      return "modern";
    }

    const legacyProbe = await supabase.from("reminders").select("id, date, time, completed").limit(1);
    if (!legacyProbe.error) {
      reminderSchemaRef.current = "legacy";
      return "legacy";
    }

    reminderSchemaRef.current = "unknown";
    return "unknown";
  }, []);

  const isAuthRaceError = (error: any) => {
    const text = `${error?.message ?? ""} ${error?.details ?? ""}`.toLowerCase();
    return (
      text.includes("jwt") ||
      text.includes("token") ||
      text.includes("auth session") ||
      text.includes("not authenticated") ||
      text.includes("401")
    );
  };

  /* ── Fetch notes (with 30s cache) ─────────────── */
  const fetchNotes = useCallback(async (force = false, silent = false) => {
    if (!user) { setNotes([]); setNotesLoading(false); return; }
    if (!force && Date.now() - lastFetch.current < 30_000) return;
    lastFetch.current = Date.now();
    const shouldShowLoading = !silent && notes.length === 0;
    if (shouldShowLoading) setNotesLoading(true);
    const query = () => supabase
      .from("notes")
      .select("*")
      .eq("user_id", user.id)
      .eq("is_deleted", false)
      .order("updated_at", { ascending: false });

    let { data, error } = await query();

    if (error && isAuthRaceError(error)) {
      console.warn("[NotesDebug] Notes fetch auth race detected, retrying once...");
      const { data: authData } = await supabase.auth.getSession();
      if (authData.session) {
        const retry = await query();
        data = retry.data;
        error = retry.error;
      }
    }

    if (!error && data) {
      // Normalize tags - ensure they're always arrays
      const normalizedNotes = (data as any[]).map(note => ({
        ...note,
        tags: Array.isArray(note.tags) ? note.tags : (typeof note.tags === 'string' ? [note.tags] : [])
      })) as Note[];
      setNotes(normalizedNotes);
    } else if (error) {
      console.error("[NotesDebug] Failed to fetch notes:", error);
      lastFetch.current = 0;
    }

    if (shouldShowLoading) setNotesLoading(false);
  }, [notes.length, user?.id]);

  /* ── Fetch reminders ──────────────────────────── */
  const fetchReminders = useCallback(async () => {
    if (!user) { setReminders([]); return; }
    const query = () => supabase
      .from("reminders")
      .select("*")
      .eq("user_id", user.id);

    let { data, error } = await query();

    if (error && isAuthRaceError(error)) {
      console.warn("[NotesDebug] Reminders fetch auth race detected, retrying once...");
      const { data: authData } = await supabase.auth.getSession();
      if (authData.session) {
        const retry = await query();
        data = retry.data;
        error = retry.error;
      }
    }

    if (!error && data) {
      const normalized = (data as any[])
        .map(normalizeReminder)
        .filter((r): r is Reminder => Boolean(r))
        .sort((a, b) => new Date(a.scheduled_at).getTime() - new Date(b.scheduled_at).getTime());
      setReminders(normalized);
    } else if (error) {
      console.error("[NotesDebug] Failed to fetch reminders:", error);
    }
  }, [user?.id]);

  /* ── Bootstrap ────────────────────────────────── */
  useEffect(() => {
    fetchNotes(true);
    fetchReminders();
  }, [fetchNotes, fetchReminders]);

  // Rehydrate user data when auth session becomes fully available after refresh.
  useEffect(() => {
    if (!user) return;
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, s) => {
      if (!s?.user || s.user.id !== user.id) return;
      if (event === "INITIAL_SESSION" || event === "SIGNED_IN" || event === "TOKEN_REFRESHED") {
        void fetchNotes(true, true);
        void fetchReminders();
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, [user?.id, fetchNotes, fetchReminders]);

  /* ── Real-time notes subscription ────────────── */
  useEffect(() => {
    if (!user) return;
    const channel = supabase
      .channel(`notes_${user.id}`)
      .on("postgres_changes", {
        event: "*", schema: "public", table: "notes",
        filter: `user_id=eq.${user.id}`,
      }, payload => {
        if (payload.eventType === "INSERT") {
          const incoming = payload.new as Note;
          // Normalize tags
          incoming.tags = Array.isArray(incoming.tags) ? incoming.tags : [];
          setNotes(prev => {
            // Deduplicate — optimistic insert already added it
            if (prev.find(n => n.id === incoming.id)) return prev;
            return [incoming, ...prev];
          });
        } else if (payload.eventType === "UPDATE") {
          const updated = payload.new as Note;
          // Normalize tags
          updated.tags = Array.isArray(updated.tags) ? updated.tags : [];
          setNotes(prev => prev.map(n => n.id === updated.id ? updated : n));
        } else if (payload.eventType === "DELETE") {
          setNotes(prev => prev.filter(n => n.id !== (payload.old as any).id));
        }
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [user?.id]);

  /* ── Notes CRUD ───────────────────────────────── */
  const addNote = async (): Promise<string> => {
    if (!user) throw new Error("Not authenticated");
    console.log("[NotesContext] addNote: Creating new note for user:", user.id);
    const { data, error } = await supabase
      .from("notes")
      .insert({
        user_id:     user.id,
        title:       "",
        content:     "",
        course_id:   null,
        tags:        [],
        paper_style: settings?.paper_default ?? "plain",
        color_style: "white",
      })
      .select()
      .single();
    if (error) {
      console.error("[NotesContext] addNote error:", error);
      throw error;
    }
    const inserted = data as Note;
    console.log("[NotesContext] addNote: Created note with ID:", inserted.id);
    setNotes(prev => [inserted, ...prev]);
    return inserted.id;
  };

  const addNoteForCourse = async (courseId: string): Promise<string> => {
    if (!user) throw new Error("Not authenticated");
    console.log("[NotesContext] addNoteForCourse: Creating new note for user:", user.id, "course:", courseId);
    
    // Validate that the course exists and belongs to the user
    console.log("[NotesContext] addNoteForCourse: Validating course exists...");
    const { data: courseData, error: courseError } = await supabase
      .from("user_courses")
      .select("id")
      .eq("id", courseId)
      .eq("user_id", user.id)
      .single();
    
    // If not found in Supabase, check localStorage (for locally-saved courses)
    if ((courseError || !courseData) && user?.id) {
      const coursesStorageKey = `luminote-personal-courses-${user.id}`;
      const localCourses = (() => {
        try {
          const raw = localStorage.getItem(coursesStorageKey);
          return raw ? JSON.parse(raw) : [];
        } catch {
          return [];
        }
      })();
      
      const localCourse = localCourses.find((c: any) => c.id === courseId);
      if (localCourse) {
        console.log("[NotesContext] addNoteForCourse: Course found in localStorage, syncing to Supabase...");
        // Try to sync the course to Supabase
        const { error: insertError } = await supabase
          .from("user_courses")
          .insert({
            id: localCourse.id,
            user_id: user.id,
            code: localCourse.code || "",
            title: localCourse.title || "",
            subtitle: localCourse.subtitle || null,
            schedule_days: localCourse.days || [],
            schedule_time: localCourse.time || null,
            notes: localCourse.notes || "",
          });
        
        if (insertError) {
          console.warn("[NotesContext] addNoteForCourse: Could not sync course to Supabase, proceeding without course link:", insertError);
          // Continue without course_id
          return addNoteForCourse_Internal(user.id, null);
        }
        console.log("[NotesContext] addNoteForCourse: Course synced to Supabase");
      } else {
        console.error("[NotesContext] addNoteForCourse: Course not found in Supabase or localStorage:", courseError);
        throw new Error(`Course not found or not authorized. Please refresh and select a valid course.`);
      }
    } else {
      console.log("[NotesContext] addNoteForCourse: Course validated in Supabase");
    }
    
    return addNoteForCourse_Internal(user.id, courseId);
  };

  const addNoteForCourse_Internal = async (userId: string, courseId: string | null): Promise<string> => {
    const { data, error } = await supabase
      .from("notes")
      .insert({
        user_id:     userId,
        title:       "",
        content:     "",
        course_id:   courseId,
        tags:        [],
        paper_style: settings?.paper_default ?? "plain",
        color_style: "white",
      })
      .select()
      .single();
    if (error) {
      console.error("[NotesContext] addNoteForCourse_Internal error:", error);
      throw error;
    }
    const inserted = data as Note;
    console.log("[NotesContext] addNoteForCourse_Internal: Created note with ID:", inserted.id);
    setNotes(prev => [inserted, ...prev]);
    return inserted.id;
  };

  const updateNote = async (id: string, updates: Partial<Note>) => {
    console.log("[NotesContext] updateNote: Updating note", id, "with:", updates);
    
    // Normalize tags to ensure they're always arrays
    const normalizedUpdates = {
      ...updates,
      ...(updates.tags !== undefined && {
        tags: Array.isArray(updates.tags) ? updates.tags : (typeof updates.tags === 'string' ? [updates.tags] : [])
      })
    };
    
    console.log("[NotesContext] updateNote: Normalized updates:", normalizedUpdates);

    setNotes(prev =>
      prev.map(n => n.id === id ? { 
        ...n, 
        ...normalizedUpdates, 
        updated_at: new Date().toISOString() 
      } : n)
    );
    
    try {
      console.log("[NotesContext] updateNote: Sending to Supabase...");
      const { error } = await supabase
        .from("notes")
        .update({ ...normalizedUpdates, updated_at: new Date().toISOString() })
        .eq("id", id)
        .eq("user_id", user?.id ?? "");
      
      if (error) {
        console.error("[NotesContext] updateNote error:", error);
        console.error("[NotesContext] updateNote error code:", error.code);
        console.error("[NotesContext] updateNote error message:", error.message);
        await fetchNotes(true);
        throw error;
      }
      console.log("[NotesContext] updateNote: Successfully updated note", id);
    } catch (err) {
      console.error("[NotesContext] updateNote failed:", err);
      throw err;
    }
  };

  const deleteNote = async (id: string) => {
    setNotes(prev => prev.filter(n => n.id !== id));
    const { error } = await supabase
      .from("notes")
      .update({ is_deleted: true })
      .eq("id", id)
      .eq("user_id", user?.id ?? "");
    if (error) {
      await fetchNotes(true);
      throw error;
    }
  };

  const addTagToNote = async (noteId: string, tag: string) => {
    const note = notes.find(n => n.id === noteId);
    if (!note) return;
    const tags = Array.isArray(note.tags) ? note.tags : [];
    if (tags.includes(tag)) return;
    await updateNote(noteId, { tags: [...tags, tag] });
  };

  const removeTagFromNote = async (noteId: string, tag: string) => {
    const note = notes.find(n => n.id === noteId);
    if (!note) return;
    const tags = Array.isArray(note.tags) ? note.tags : [];
    await updateNote(noteId, { tags: tags.filter(t => t !== tag) });
  };

  const assignNoteToCourse = async (noteId: string, courseId: string | null) => {
    setNotes(prev =>
      prev.map(n => n.id === noteId ? { ...n, course_id: courseId, updated_at: new Date().toISOString() } : n)
    );
    const { error } = await supabase
      .from("notes")
      .update({ course_id: courseId, updated_at: new Date().toISOString() })
      .eq("id", noteId)
      .eq("user_id", user?.id ?? "");
    if (error) {
      await fetchNotes(true);
      throw error;
    }
  };

  /* ── Reminders CRUD ───────────────────────────── */
  const addReminder = async (r: Pick<Reminder, "title" | "scheduled_at">, noteId?: string) => {
    if (!user) return;
    const schema = await detectReminderSchema();
    const payload = schema === "legacy"
      ? {
          user_id: user.id,
          note_id: noteId || null,
          title: r.title,
          date: toLegacyDate(r.scheduled_at),
          time: toLegacyTime(r.scheduled_at),
          completed: false,
        }
      : {
          user_id: user.id,
          note_id: noteId || null,
          title: r.title,
          scheduled_at: r.scheduled_at,
          is_completed: false,
        };

    const { data, error } = await supabase
      .from("reminders")
      .insert(payload)
      .select()
      .single();
    if (!error && data) {
      const normalized = normalizeReminder(data as any);
      if (normalized) setReminders(prev => [...prev, normalized]);
    } else if (error) {
      console.error("[NotesDebug] addReminder failed:", error);
    }
  };

  const toggleReminder = async (id: string) => {
    const reminder = reminders.find(r => r.id === id);
    if (!reminder) return;
    const newCompleted = !reminder.is_completed;
    setReminders(prev => prev.map(r => r.id === id ? { ...r, is_completed: newCompleted, completed: newCompleted } : r));
    const schema = await detectReminderSchema();
    const payload = schema === "legacy"
      ? { completed: newCompleted }
      : { is_completed: newCompleted };
    const { error } = await supabase
      .from("reminders").update(payload).eq("id", id);
    if (error) {
      setReminders(prev => prev.map(r => r.id === id ? { ...r, is_completed: !newCompleted, completed: !newCompleted } : r));
    }
  };

  const removeReminder = async (id: string) => {
    setReminders(prev => prev.filter(r => r.id !== id));
    await supabase.from("reminders").delete().eq("id", id);
  };

  /* ── Extract reminders from note with AI ─────── */
  const extractRemindersFromNote = async (
    noteId: string,
    noteTitle: string,
    noteContent: string
  ): Promise<Reminder[]> => {
    if (!user) return [];
    
    try {
      const { data: sessionData } = await supabase.auth.getSession();
      const accessToken = sessionData.session?.access_token;
      if (!accessToken) return [];

      const response = await fetch("/api/extract-reminders", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify({
          note_id: noteId,
          note_title: noteTitle,
          note_content: noteContent,
          user_id: user.id,
        }),
      });

      if (response.ok) {
        const { reminders: extracted } = await response.json();

        // Refetch reminders from database
        await fetchReminders();

        return extracted || [];
      }

      // Fallback path for local Vite dev (no /api runtime) or transient API failures.
      const { extractRemindersFromText } = await import("./qwen");
      const extracted = await extractRemindersFromText(noteTitle, noteContent);

      const schema = await detectReminderSchema();

      const deleteQuery = supabase
        .from("reminders")
        .delete()
        .eq("user_id", user.id)
        .eq("note_id", noteId);
      const { error: deleteError } = schema === "legacy"
        ? await deleteQuery.eq("completed", false)
        : await deleteQuery.eq("is_completed", false);
      if (deleteError) {
        console.error("[NotesDebug] reminder cleanup failed:", deleteError);
      }

      if (extracted.length > 0) {
        const rows = schema === "legacy"
          ? extracted.map((r) => ({
              user_id: user.id,
              note_id: noteId,
              title: r.title,
              date: toLegacyDate(r.scheduled_at),
              time: toLegacyTime(r.scheduled_at),
              completed: false,
            }))
          : extracted.map((r) => ({
              user_id: user.id,
              note_id: noteId,
              title: r.title,
              scheduled_at: r.scheduled_at,
              is_completed: false,
            }));

        const { error: insertError } = await supabase.from("reminders").insert(rows);
        if (insertError) {
          console.error("[NotesDebug] reminder insert failed:", insertError);
          return [];
        }
      }

      await fetchReminders();
      return extracted;
    } catch (error) {
      console.error("Error extracting reminders:", error);
      return [];
    }
  };

  return (
    <NotesContext.Provider value={{
      notes, notesLoading, loading: notesLoading,
      searchQuery, setSearchQuery,
      addNote, addNoteForCourse, updateNote, deleteNote, addTagToNote, removeTagFromNote, assignNoteToCourse, refreshNotes: () => fetchNotes(true),
      reminders, addReminder, toggleReminder, removeReminder, extractRemindersFromNote,
    }}>
      {children}
    </NotesContext.Provider>
  );
}

export function useNotes(): NotesContextType {
  const ctx = useContext(NotesContext);
  if (!ctx) throw new Error("useNotes must be used within NotesProvider");
  return ctx;
}
