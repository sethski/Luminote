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
  updateNote:     (id: string, updates: Partial<Note>) => Promise<void>;
  deleteNote:     (id: string) => Promise<void>;
  refreshNotes:   () => Promise<void>;
  reminders:      Reminder[];
  addReminder:    (r: Pick<Reminder, "title" | "date" | "time">) => Promise<void>;
  toggleReminder: (id: string) => Promise<void>;
  removeReminder: (id: string) => Promise<void>;
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

  /* ── Fetch notes (with 30s cache) ─────────────── */
  const fetchNotes = useCallback(async (force = false) => {
    if (!user) { setNotes([]); setNotesLoading(false); return; }
    if (!force && Date.now() - lastFetch.current < 30_000) return;
    lastFetch.current = Date.now();
    setNotesLoading(true);
    const { data, error } = await supabase
      .from("notes")
      .select("*")
      .eq("user_id", user.id)
      .eq("is_deleted", false)
      .order("updated_at", { ascending: false });
    if (!error && data) setNotes(data as Note[]);
    setNotesLoading(false);
  }, [user?.id]);

  /* ── Fetch reminders ──────────────────────────── */
  const fetchReminders = useCallback(async () => {
    if (!user) { setReminders([]); return; }
    const { data, error } = await supabase
      .from("reminders")
      .select("*")
      .eq("user_id", user.id)
      .order("date", { ascending: true });
    if (!error && data) setReminders(data as Reminder[]);
  }, [user?.id]);

  /* ── Bootstrap ────────────────────────────────── */
  useEffect(() => {
    fetchNotes(true);
    fetchReminders();
  }, [fetchNotes, fetchReminders]);

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
          setNotes(prev => {
            // Deduplicate — optimistic insert already added it
            if (prev.find(n => n.id === incoming.id)) return prev;
            return [incoming, ...prev];
          });
        } else if (payload.eventType === "UPDATE") {
          const updated = payload.new as Note;
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
    const { data, error } = await supabase
      .from("notes")
      .insert({
        user_id:     user.id,
        title:       "",
        content:     "",
        tags:        [],
        paper_style: settings?.paper_default ?? "plain",
        color_style: "white",
      })
      .select()
      .single();
    if (error) throw error;
    const inserted = data as Note;
    setNotes(prev => [inserted, ...prev]);
    return inserted.id;
  };

  const updateNote = async (id: string, updates: Partial<Note>) => {
    setNotes(prev =>
      prev.map(n => n.id === id ? { ...n, ...updates, updated_at: new Date().toISOString() } : n)
    );
    const { error } = await supabase
      .from("notes")
      .update({ ...updates, updated_at: new Date().toISOString() })
      .eq("id", id)
      .eq("user_id", user?.id ?? "");
    if (error) {
      await fetchNotes(true);
      throw error;
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

  /* ── Reminders CRUD ───────────────────────────── */
  const addReminder = async (r: Pick<Reminder, "title" | "date" | "time">) => {
    if (!user) return;
    const { data, error } = await supabase
      .from("reminders")
      .insert({ user_id: user.id, ...r })
      .select()
      .single();
    if (!error && data) setReminders(prev => [...prev, data as Reminder]);
  };

  const toggleReminder = async (id: string) => {
    const reminder = reminders.find(r => r.id === id);
    if (!reminder) return;
    const newCompleted = !reminder.completed;
    setReminders(prev => prev.map(r => r.id === id ? { ...r, completed: newCompleted } : r));
    const { error } = await supabase
      .from("reminders").update({ completed: newCompleted }).eq("id", id);
    if (error) {
      setReminders(prev => prev.map(r => r.id === id ? { ...r, completed: !newCompleted } : r));
    }
  };

  const removeReminder = async (id: string) => {
    setReminders(prev => prev.filter(r => r.id !== id));
    await supabase.from("reminders").delete().eq("id", id);
  };

  return (
    <NotesContext.Provider value={{
      notes, notesLoading, loading: notesLoading,
      searchQuery, setSearchQuery,
      addNote, updateNote, deleteNote, refreshNotes: () => fetchNotes(true),
      reminders, addReminder, toggleReminder, removeReminder,
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
