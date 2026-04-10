/**
 * Home.tsx — Luminote Dashboard
 *
 * Bug fixes applied:
 * 1. Calendar < / > buttons: added stopPropagation + real month navigation
 * 2. Calendar now renders a full month grid (not just 7 days)
 * 3. "View all" reminder button now navigates to /all-notes (filtered)
 * 4. New Note modal: AI-powered with auto-tag suggestions,
 *    smart title suggestion, and loading/success states
 */
import React, { useMemo, useState, useCallback, useRef } from "react";
import { Link, useNavigate } from "react-router";
import { createPortal } from "react-dom";
import {
  Search, Plus, Image as ImageIcon, Mic, Calendar as CalendarIcon,
  Check, Clock, FileText, Type, X, Sparkles, Tag, ChevronLeft,
  ChevronRight, ArrowRight, Loader2, CheckCircle2,
  Hash, Zap, GraduationCap,
} from "lucide-react";
import {
  format, isSameDay, addMonths, subMonths,
  startOfMonth, endOfMonth, eachDayOfInterval,
  startOfWeek, endOfWeek, isToday as dateFnsIsToday,
} from "date-fns";
import { useNotes, Note } from "./NotesContext";
import { useAuth } from "./AuthContext";
import { getCleanPreview } from "./utils";
import { supabase } from "./supabaseClient";

type PersonalCourse = {
  id: string;
  code?: string;
  title: string;
  subtitle?: string;
};

/* ─── CSS injected once ───────────────────────── */
const HOME_CSS = `
@import url('https://fonts.googleapis.com/css2?family=DM+Serif+Display:ital@0;1&family=DM+Sans:opsz,wght@9..40,400;9..40,500;9..40,600;9..40,700&display=swap');

.hm-root { font-family: 'DM Sans', sans-serif; }
.hm-serif { font-family: 'DM Serif Display', serif; }

@keyframes hm-up  { from{opacity:0;transform:translateY(16px)} to{opacity:1;transform:none} }
@keyframes hm-fade{ from{opacity:0} to{opacity:1} }
@keyframes hm-spin{ to{transform:rotate(360deg)} }
@keyframes hm-bounce { 0%,100%{transform:translateY(0)} 50%{transform:translateY(-4px)} }
@keyframes hm-pop  { 0%{transform:scale(.92);opacity:0} 100%{transform:scale(1);opacity:1} }
@keyframes hm-check{ 0%{stroke-dashoffset:24} 100%{stroke-dashoffset:0} }

.hm-a1{animation:hm-up .5s ease both .05s}
.hm-a2{animation:hm-up .5s ease both .15s}
.hm-a3{animation:hm-up .5s ease both .25s}
.hm-modal-pop{animation:hm-pop .25s cubic-bezier(.34,1.56,.64,1) both}
.hm-spinner{animation:hm-spin .8s linear infinite}
.hm-success-bounce{animation:hm-bounce .4s ease 2}

/* Modal overlay */
.hm-overlay{
  position:fixed;inset:0;z-index:9999;
  background:rgba(14,17,23,.5);backdrop-filter:blur(4px);
  display:flex;align-items:center;justify-content:center;padding:16px;
  animation:hm-fade .2s ease both;
}

/* Scrollbar */
.hm-scroll::-webkit-scrollbar{width:4px}
.hm-scroll::-webkit-scrollbar-thumb{background:#E5E7EB;border-radius:4px}
.dark .hm-scroll::-webkit-scrollbar-thumb{background:#475569;border-radius:4px}

/* Tag chips */
.hm-tag-chip{
  display:inline-flex;align-items:center;gap:5px;
  padding:4px 10px;border-radius:100px;font-size:11px;font-weight:700;
  cursor:pointer;transition:all .15s;user-select:none;
  border:1.5px solid transparent;
}
.hm-tag-chip:hover{transform:translateY(-1px)}

/* Card hover */
.hm-note-card{transition:transform .2s ease,box-shadow .2s ease}
.hm-note-card:hover{transform:translateY(-2px);box-shadow:0 8px 28px rgba(0,0,0,.07)}
.dark .hm-note-card:hover{box-shadow:0 8px 28px rgba(0,0,0,.3)}

/* Quick action btn */
.hm-qbtn{
  transition:transform .2s ease,box-shadow .2s ease;
  position:relative;overflow:hidden;
}
.hm-qbtn::before{
  content:'';position:absolute;inset:0;
  background:rgba(255,255,255,.07);opacity:0;
  transition:opacity .2s;
}
.hm-qbtn:hover{transform:translateY(-2px);box-shadow:0 12px 32px rgba(0,0,0,.12)}
.dark .hm-qbtn:hover{box-shadow:0 12px 32px rgba(0,0,0,.3)}
.hm-qbtn:active{transform:scale(.98)}

/* AI chip */
.hm-ai-chip{
  display:inline-flex;align-items:center;gap:6px;
  background:linear-gradient(135deg,#EFF3FF,#F5F3FF);
  border:1px solid #C7D2FE;border-radius:100px;
  padding:5px 12px;font-size:12px;font-weight:600;color:#4F46E5;
  cursor:pointer;transition:all .15s;
}
.hm-ai-chip:hover{background:linear-gradient(135deg,#E0E7FF,#EDE9FE);transform:translateY(-1px)}
html[data-theme="obsidian"] .hm-ai-chip,
html[data-theme="ash"] .hm-ai-chip{background:linear-gradient(135deg,#1e293b,#0f172a);border-color:#4f46e5;color:#c7d2fe}
html[data-theme="obsidian"] .hm-ai-chip:hover,
html[data-theme="ash"] .hm-ai-chip:hover{background:linear-gradient(135deg,#334155,#1e293b)}

/* Modal footer actions */
.hm-footer-secondary {
  color: var(--text-secondary);
  border-radius: 10px;
  padding: 8px 12px;
  font-weight: 600;
  transition: color .2s, background-color .2s, transform .15s;
}
.hm-footer-secondary:hover {
  color: var(--text-primary);
  background: rgba(100, 116, 139, 0.14);
}
.hm-footer-secondary:active {
  transform: translateY(1px);
  background: rgba(100, 116, 139, 0.22);
}

.hm-footer-primary {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  background: var(--accent);
  color: #ffffff;
  border-radius: 12px;
  padding: 10px 20px;
  font-size: 14px;
  font-weight: 700;
  box-shadow: 0 8px 20px rgba(79, 126, 255, 0.28);
  transition: transform .15s, filter .2s, box-shadow .2s;
}
.hm-footer-primary:hover {
  filter: brightness(1.08);
  box-shadow: 0 12px 28px rgba(79, 126, 255, 0.35);
}
.hm-footer-primary:active {
  transform: translateY(1px) scale(0.99);
  filter: brightness(0.96);
  box-shadow: 0 6px 14px rgba(79, 126, 255, 0.25);
}

/* Responsive tuning for small touch devices and ultra-wide desktops. */
@media (max-width: 480px) {
  .hm-overlay { padding: 12px; }
  .hm-modal-pop { border-radius: 18px; }
  .hm-footer-secondary,
  .hm-footer-primary { min-height: 44px; }
}
`;

/* ─── AI-suggested tags by keyword ────────────── */
const TAG_SUGGESTIONS: Record<string, string[]> = {
  research: ["RESEARCH", "PLANNING"],
  study:    ["RESEARCH", "PERSONAL"],
  meeting:  ["TEAM", "PLANNING"],
  design:   ["CREATIVE", "RESEARCH"],
  code:     ["TECH"],
  bug:      ["TECH"],
  grocery:  ["PERSONAL"],
  idea:     ["CREATIVE", "INSPIRATION"],
  project:  ["PLANNING", "TEAM"],
};

const ALL_TAGS = ["RESEARCH", "PLANNING", "TEAM", "TECH", "CREATIVE", "PERSONAL", "INSPIRATION"];

const TAG_COLORS: Record<string, { bg: string; text: string; activeBg: string }> = {
  RESEARCH:    { bg: "#EFF6FF", text: "#2563EB", activeBg: "#DBEAFE" },
  PLANNING:    { bg: "#FAF5FF", text: "#9333EA", activeBg: "#EDE9FE" },
  TEAM:        { bg: "#F0FDF4", text: "#16A34A", activeBg: "#DCFCE7" },
  TECH:        { bg: "#FFF7ED", text: "#EA580C", activeBg: "#FFEDD5" },
  CREATIVE:    { bg: "#FFF1F2", text: "#E11D48", activeBg: "#FFE4E6" },
  PERSONAL:    { bg: "#ECFDF5", text: "#059669", activeBg: "#D1FAE5" },
  INSPIRATION: { bg: "#FFFBEB", text: "#D97706", activeBg: "#FEF3C7" },
};

/* ─── New Note Modal ──────────────────────────── */
type ModalState = "idle" | "loading" | "success";

function NewNoteModal({ onClose }: { onClose: () => void }) {
  const navigate  = useNavigate();
  const { addNote, addNoteForCourse, updateNote } = useNotes();
  const { user } = useAuth();

  const [title,      setTitle]      = useState("");
  const [selectedTags, setTags]     = useState<string[]>([]);
  const [tagInput, setTagInput]     = useState("");
  const [showCourseMenu, setShowCourseMenu] = useState(false);
  const [availableCourses, setAvailableCourses] = useState<PersonalCourse[]>([]);
  const [selectedCourseId, setSelectedCourseId] = useState<string | null>(null);
  const [courseMenuPos, setCourseMenuPos] = useState({ top: 0, left: 0, width: 250 });
  const titleRef = useRef<HTMLInputElement>(null);
  const courseButtonRef = useRef<HTMLButtonElement>(null);

  const coursesStorageKey = user ? `luminote-personal-courses-${user.id}` : "luminote-personal-courses-guest";

  const loadAvailableCourses = useCallback(async () => {
    console.log("[DEBUG] loadAvailableCourses called, user:", user?.id);
    
    const normalizeCourses = (input: any[]): PersonalCourse[] => {
      return input
        .filter((course: any) => course && typeof course.id === "string" && typeof course.title === "string")
        .map((course: any) => ({
          id: course.id,
          title: course.title,
          code: course.code,
          subtitle: course.subtitle,
        }));
    };

    // Load from localStorage as fallback
    const localCourses = (() => {
      const keys = Array.from(new Set([coursesStorageKey, "luminote-personal-courses-guest"]));
      const merged: PersonalCourse[] = [];

      for (const key of keys) {
        try {
          const raw = localStorage.getItem(key);
          if (!raw) continue;
          const parsed = JSON.parse(raw);
          if (!Array.isArray(parsed)) continue;
          merged.push(...normalizeCourses(parsed));
        } catch {
          // Ignore malformed local cache
        }
      }

      console.log("[DEBUG] Local courses from storage:", merged);
      return merged;
    })();

    // Fetch from Supabase
    let remoteCourses: PersonalCourse[] = [];
    if (user?.id) {
      console.log("[DEBUG] Fetching from Supabase for user:", user.id);
      const { data, error } = await supabase
        .from("user_courses")
        .select("id, code, title, subtitle")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });

      console.log("[DEBUG] Supabase response:", { data, error });

      if (!error && Array.isArray(data)) {
        remoteCourses = normalizeCourses(data);
        console.log("[DEBUG] Remote courses normalized:", remoteCourses);
      } else if (error) {
        console.error("[DEBUG] Supabase error:", error);
      }
    }

    // Use Supabase courses, fall back to localStorage if empty
    const finalCourses = remoteCourses.length > 0 ? remoteCourses : localCourses;
    console.log("[DEBUG] Using courses:", finalCourses);
    setAvailableCourses(finalCourses);
  }, [coursesStorageKey, user?.id]);

  const handleSelectCourse = (courseId: string | null) => {
    setSelectedCourseId(courseId);
    setShowCourseMenu(false);
  };

  const handleTagKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" && tagInput.trim()) {
      e.preventDefault();
      const newTag = tagInput.trim().toUpperCase();
      if (!selectedTags.includes(newTag)) {
        setTags(prev => [...prev, newTag]);
      }
      setTagInput("");
    }
  };

  const removeTag = (tagToRemove: string) => {
    setTags(prev => prev.filter(t => t !== tagToRemove));
  };

  const handleCreate = async () => {
    try {
      console.log("[Home] Creating note with:", { title, selectedTags, selectedCourseId });
      
      const id = selectedCourseId 
        ? await addNoteForCourse(selectedCourseId)
        : await addNote();
      
      console.log("[Home] Note created with ID:", id);
      
      if (!id) {
        console.error("[Home] Failed to create note - no ID returned");
        alert("Failed to create note - no ID returned");
        return;
      }

      // Update note with title and tags (course_id is already set if selected)
      console.log("[Home] Updating note with title and tags");
      await updateNote(id, {
        title: title.trim() || "Untitled Note",
        tags: selectedTags,
      });
      
      console.log("[Home] Note updated successfully, closing modal and navigating");
      onClose();
      navigate(`/home/editor/${id}`);
    } catch (error: any) {
      console.error("[Home] Error in handleCreate:", error);
      const errorMessage = error?.message || "Failed to create note. Please try again.";
      alert(errorMessage);
    }
  };

  /* Close on backdrop click */
  const handleBackdrop = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) onClose();
  };

  /* Focus title on mount */
  React.useEffect(() => { titleRef.current?.focus(); }, []);

  /* Log availableCourses changes */
  React.useEffect(() => {
    console.log("[DEBUG] availableCourses state updated:", availableCourses);
  }, [availableCourses]);

  /* Log showCourseMenu changes */
  React.useEffect(() => {
    console.log("[DEBUG] showCourseMenu state updated:", showCourseMenu);
  }, [showCourseMenu]);

  /* Close on Escape */
  React.useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [onClose]);

  return (
    <div className="hm-overlay" onClick={handleBackdrop} role="dialog" aria-modal="true" aria-label="Create new note">
      <div
        className="hm-modal-pop rounded-[24px] shadow-[0_32px_80px_rgba(0,0,0,.18)] w-full max-w-[520px] overflow-hidden"
        style={{ backgroundColor: 'var(--bg-card)' }}
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 pt-6 pb-4 border-b" style={{ borderColor: 'var(--border)' }}>
          <span className="text-sm font-semibold" style={{ color: 'var(--text-secondary)' }}>Create Note</span>
          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-lg flex items-center justify-center transition-colors"
            style={{ color: 'var(--text-secondary)' }}
            aria-label="Close modal"
          >
            <X size={16} />
          </button>
        </div>

        <div className="px-6 py-5 space-y-5 hm-scroll overflow-y-auto max-h-[70vh]">

          {/* Title input */}
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider mb-2" style={{ color: 'var(--text-primary)' }}>
              Title
            </label>
            <input
              ref={titleRef}
              type="text"
              value={title}
              onChange={e => setTitle(e.target.value)}
              placeholder="What's on your mind?"
              className="w-full px-4 py-3 rounded-[14px] border border-[#E5E7EB] bg-[#FAFAFA] text-[#0E1117] placeholder:text-slate-500 outline-none focus:border-[#4059FF] focus:bg-white focus:ring-4 focus:ring-[#4059FF]/10 transition-all text-sm"
              style={{ fontFamily: "'DM Sans', sans-serif" }}
            />
          </div>

        </div>

        {/* Course Selection - Outside scrollable area */}
        <div className="px-6 py-4 border-t" style={{ borderColor: 'var(--border)', backgroundColor: 'var(--bg-card)' }}>
          <div className="relative w-full">
            <button
              ref={courseButtonRef}
              type="button"
              onClick={() => {
                void loadAvailableCourses();
                setShowCourseMenu(!showCourseMenu);
              }}
              className="w-full flex items-center justify-between gap-2 rounded-[14px] border border-[#E5E7EB] px-4 py-2.5 text-sm font-semibold transition-colors"
              style={{
                backgroundColor: selectedCourseId ? '#F0F7FF' : '#FAFAFA',
                color: selectedCourseId ? '#2563EB' : '#6B7280',
                borderColor: selectedCourseId ? '#BFDBFE' : '#E5E7EB',
              }}
            >
              <div className="flex items-center gap-2">
                <GraduationCap size={14} />
                <span className="truncate max-w-[200px] text-left">
                  {selectedCourseId 
                    ? availableCourses.find(c => c.id === selectedCourseId)?.title || 'Course Selected' 
                    : 'Assign to Course'}
                </span>
              </div>
              <ChevronRight size={14} className="shrink-0" style={{ transform: showCourseMenu ? 'rotate(90deg)' : '', transition: 'transform 0.2s' }} />
            </button>

            {/* Dropdown rendered inline (pushes content down) */}
            {showCourseMenu && (
              <div 
                className="mt-3 hm-scroll"
                style={{ 
                  background: "var(--bg-card, white)", 
                  border: "1px solid var(--border, #e2e8f0)", 
                  boxShadow: "0 12px 40px rgba(0,0,0,.08)", 
                  borderRadius: 12, 
                  padding: 12, 
                  width: "100%",
                  maxHeight: "220px",
                  overflowY: "auto",
                  animation: "fadeIn 0.2s ease-out forwards"
                }}
              >
                <style>
                  {`@keyframes fadeIn { from { opacity: 0; transform: translateY(-5px); } to { opacity: 1; transform: translateY(0); } }`}
                </style>
                <div className="flex flex-col gap-2">
                  <span className="text-[10px] text-gray-500 uppercase tracking-wider" style={{ fontWeight: 700 }}>Courses</span>
                  {availableCourses.length === 0 ? (
                    <p className="text-xs text-slate-500 leading-relaxed bg-slate-50 border border-slate-100 rounded-lg px-3 py-2">
                      No courses created yet. Add one on your Personal page.
                    </p>
                  ) : (
                    <div className="flex flex-col gap-1.5">
                      <button
                        type="button"
                        onClick={() => handleSelectCourse(null)}
                        className={`w-full text-left rounded-lg px-3 py-2.5 text-xs border transition-colors ${selectedCourseId === null ? "bg-blue-50 border-blue-200 text-blue-700" : "bg-transparent border-transparent text-slate-500 hover:bg-slate-50 hover:border-slate-200"}`}
                        style={{ fontWeight: 600 }}
                      >
                        No course selected
                      </button>
                      {availableCourses.map((course) => {
                        const isSelected = selectedCourseId === course.id;
                        return (
                          <button
                            key={course.id}
                            type="button"
                            onClick={() => handleSelectCourse(course.id)}
                            className={`w-full text-left flex items-center justify-between rounded-lg px-3 py-2.5 text-xs border transition-all duration-200 ${isSelected ? "bg-blue-50 border-blue-200 text-blue-800 shadow-sm" : "bg-transparent border-transparent text-slate-700 hover:bg-slate-50 hover:border-slate-200"}`}
                          >
                            <div className="min-w-0 pr-2">
                              <div className="font-semibold line-clamp-2">{course.code ? `${course.code}: ` : ''}{course.title}</div>
                            </div>
                            {isSelected && <Check size={14} className="text-blue-600 shrink-0" />}
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t flex items-center justify-between" style={{ borderColor: 'var(--border)', backgroundColor: 'var(--bg-main)' }}>
          <button
            type="button"
            onClick={onClose}
            className="hm-footer-secondary text-sm"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleCreate}
            className="hm-footer-primary"
            style={{ fontFamily: "'DM Sans', sans-serif" }}
          >
            Create Note
          </button>
        </div>
      </div>
    </div>
  );
}

/* ─── Home page ───────────────────────────────── */
export function Home() {
  const {
    notes, reminders,
    searchQuery, setSearchQuery,
    addNote, toggleReminder, removeReminder,
  } = useNotes();
  const navigate = useNavigate();

  // BUG FIX: showModal state drives the New Note modal
  const [showNewNoteModal, setShowNewNoteModal] = useState(false);

  // BUG FIX: Calendar uses its own month state (was hardcoded to 7 days)
  const [calMonth, setCalMonth] = useState(new Date());

  const filteredNotes = useMemo(() => {
    const q = searchQuery.toLowerCase();
    return notes.filter(n =>
      n.title.toLowerCase().includes(q) ||
      n.content.toLowerCase().includes(q) ||
      n.tags.some(t => t.toLowerCase().includes(q))
    );
  }, [notes, searchQuery]);

  /* ── Calendar grid: full month ───────────────── */
  const calDays = useMemo(() => {
    const start = startOfWeek(startOfMonth(calMonth), { weekStartsOn: 0 });
    const end   = endOfWeek(endOfMonth(calMonth),   { weekStartsOn: 0 });
    return eachDayOfInterval({ start, end });
  }, [calMonth]);

  const hasNoteOnDay = (d: Date) =>
    notes.some(n => isSameDay(getNoteDate(n), d));

  /* ── Note meta ────────────────────────────────── */
  const getNoteMeta = (note: Note) => {
    const plain   = getCleanPreview(note.content, 300);
    const words   = plain && plain !== "Empty note" && plain !== "Drawing" ? plain.split(/\s+/).length : 0;
    const preview = plain === "Empty note" || plain === "Drawing" ? "" : plain.split(/[.!?]+/).filter(Boolean).slice(0, 2).join(". ").trim();
    return { words, preview };
  };

  const getNoteDate = (note: Note) => {
    const raw = note.updated_at || note.created_at;
    const d = raw ? new Date(raw) : null;
    return d && !Number.isNaN(d.getTime()) ? d : new Date();
  };

  /* ── Note card ────────────────────────────────── */
  const NoteCard = ({ note }: { note: Note }) => {
    const { words, preview } = getNoteMeta(note);
    const tagColor = TAG_COLORS[note.tags[0]] ?? { bg: "#F3F4F6", text: "#6B7280" };

    return (
      <Link
        to={`/home/editor/${note.id}`}
        className="hm-note-card block rounded-[18px] p-5 border group transition-colors duration-300"
        style={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border)' }}
      >
        {note.tags.length > 0 && (
          <div className="flex flex-wrap gap-1 mb-3">
            {note.tags.slice(0, 2).map(tag => {
              const c = TAG_COLORS[tag] ?? { bg: "#F3F4F6", text: "#6B7280" };
              return (
                <span
                  key={tag}
                  className="text-[9px] px-2 py-0.5 rounded-full font-bold uppercase tracking-wider"
                  style={{ background: c.bg, color: c.text }}
                >
                  {tag}
                </span>
              );
            })}
          </div>
        )}
        <h3 className="font-semibold text-sm mb-2 line-clamp-1 leading-snug transition-colors duration-300" style={{ color: 'var(--text-primary)' }}>
          {note.title || "Untitled Note"}
        </h3>
        {preview ? (
          <p className="text-xs line-clamp-2 leading-relaxed mb-4 transition-colors duration-300" style={{ color: 'var(--text-secondary)' }}>
            {preview.length > 100 ? preview.slice(0, 100) + "…" : preview}
          </p>
        ) : (
          <p className="text-xs italic mb-4 transition-colors duration-300" style={{ color: 'var(--text-secondary)' }}>No content yet</p>
        )}
        <div className="flex items-center justify-between pt-3 transition-colors duration-300" style={{ borderTopColor: 'var(--border)', borderTopWidth: '1px' }}>
          <span className="text-[10px] font-medium transition-colors duration-300" style={{ color: 'var(--text-tertiary)' }}>
            {format(getNoteDate(note), "d MMM")}
          </span>
          {words > 0 && (
            <span className="flex items-center gap-1 text-[10px] transition-colors duration-300" style={{ color: 'var(--text-tertiary)' }}>
              <Type size={10} /> {words} words
            </span>
          )}
        </div>
      </Link>
    );
  };

  return (
    <div className="hm-root h-full flex flex-col overflow-auto transition-colors duration-300" style={{ backgroundColor: 'var(--bg-main)', color: 'var(--text-primary)' }}>
      <style>{HOME_CSS}</style>

      {/* New Note Modal */}
      {showNewNoteModal && (
        <NewNoteModal onClose={() => setShowNewNoteModal(false)} />
      )}

      <div className="mx-auto flex-1 w-full max-w-[1200px] space-y-8 p-4 sm:p-6 lg:p-8 min-[1440px]:max-w-[1520px] min-[1440px]:p-10">

        {/* ── Greeting + mobile search ─────────── */}
        <div className="hm-a1 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h1 className="hm-serif text-2xl md:text-3xl leading-tight transition-colors duration-300" style={{ color: 'var(--text-primary)' }}>
              Good {new Date().getHours() < 12 ? "morning" : new Date().getHours() < 18 ? "afternoon" : "evening"} 👋
            </h1>
            <p className="text-sm mt-1 transition-colors duration-300" style={{ color: 'var(--text-secondary)' }}>
              {notes.length} note{notes.length !== 1 ? "s" : ""} in your library
            </p>
          </div>
          {/* Mobile search — BUG FIX: now wired to setSearchQuery */}
          <div className="md:hidden relative">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 transition-colors duration-300" size={16} style={{ color: 'var(--text-secondary)' }} />
            <input
              type="text"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}   /* ← was missing */
              placeholder="Search notes…"
              className="w-full pl-10 pr-4 py-2.5 rounded-2xl border text-sm outline-none focus:ring-2 focus:ring-[#4059FF]/20 transition-all duration-300"
              style={{
                backgroundColor: 'var(--bg-card)',
                color: 'var(--text-primary)',
                borderColor: 'var(--border)',
                '--tw-ring-color': 'rgb(79 89 255 / 0.2)'
              }}
            />
          </div>
        </div>

        {/* ── Quick actions ────────────────────── */}
        <div className="hm-a2 grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
          {/* NEW NOTE — opens modal */}
          <button
            type="button"
            onClick={() => setShowNewNoteModal(true)}   /* ← was inline addNote without feedback */
            className="hm-qbtn p-5 rounded-[20px] flex items-center gap-4 text-left transition-colors duration-300"
            style={{ backgroundColor: 'var(--accent)', color: '#ffffff' }}
            aria-label="Create new note"
          >
            <div className="w-11 h-11 rounded-xl flex items-center justify-center shrink-0 transition-colors duration-300" style={{ backgroundColor: 'rgba(255,255,255,0.1)' }}>
              <Plus size={22} />
            </div>
            <div>
              <div className="font-bold text-base">New Note</div>
              <div className="text-white/85 text-sm transition-colors duration-300">with AI suggestions</div>
            </div>
            <Sparkles size={14} className="ml-auto text-white/80" />
          </button>

          <button
            type="button"
            onClick={() => navigate("/home/upload-image")}
            className="hm-qbtn border p-5 rounded-[20px] flex items-center gap-4 text-left transition-colors duration-300"
            style={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border)' }}
          >
            <div className="w-11 h-11 rounded-xl flex items-center justify-center shrink-0 transition-colors duration-300" style={{ backgroundColor: 'var(--bg-main)' }}>
              <ImageIcon size={20} color="#4059FF" className="dark:text-blue-400" />
            </div>
            <div>
              <div className="font-bold text-sm transition-colors duration-300" style={{ color: 'var(--text-primary)' }}>Upload Image</div>
              <div className="text-xs transition-colors duration-300" style={{ color: 'var(--text-secondary)' }}>OCR Text Extraction</div>
            </div>
          </button>

          <button
            type="button"
            onClick={() => navigate("/home/voice-memo")}
            className="hm-qbtn border p-5 rounded-[20px] flex items-center gap-4 text-left transition-colors duration-300"
            style={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border)' }}
          >
            <div className="w-11 h-11 rounded-xl flex items-center justify-center shrink-0 transition-colors duration-300" style={{ backgroundColor: 'var(--bg-main)' }}>
              <Mic size={20} color="#C026D3" className="dark:text-pink-400" />
            </div>
            <div>
              <div className="font-bold text-sm transition-colors duration-300" style={{ color: 'var(--text-primary)' }}>Voice Memo</div>
              <div className="text-xs transition-colors duration-300" style={{ color: 'var(--text-secondary)' }}>Speech to Text AI</div>
            </div>
          </button>
        </div>

        {/* ── Main grid ────────────────────────── */}
        <div className="hm-a3 grid grid-cols-1 lg:grid-cols-12 gap-6">

          {/* Left sidebar */}
          <div className="lg:col-span-4 space-y-6">

            {/* ── Calendar ─────────────────────── */}
            <div className="rounded-[20px] border p-5 transition-colors duration-300" style={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border)' }}>
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <CalendarIcon size={16} color="#4059FF" className="dark:text-blue-400" />
                  <span className="font-semibold text-sm transition-colors duration-300" style={{ color: 'var(--text-primary)' }}>
                    {format(calMonth, "MMMM yyyy")}
                  </span>
                </div>
                {/* BUG FIX: These buttons previously had no onClick and triggered
                    the parent div's navigate('/calendar').
                    Now they stop propagation and control calMonth state. */}
                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    onClick={e => { e.stopPropagation(); setCalMonth(subMonths(calMonth, 1)); }}
                    className="w-7 h-7 rounded-lg flex items-center justify-center hover:opacity-80 transition-colors duration-300"
                    style={{ color: 'var(--text-secondary)' }}
                    aria-label="Previous month"
                  >
                    <ChevronLeft size={14} />
                  </button>
                  <button
                    type="button"
                    onClick={e => { e.stopPropagation(); setCalMonth(addMonths(calMonth, 1)); }}
                    className="w-7 h-7 rounded-lg flex items-center justify-center hover:opacity-80 transition-colors duration-300"
                    style={{ color: 'var(--text-secondary)' }}
                    aria-label="Next month"
                  >
                    <ChevronRight size={14} />
                  </button>
                </div>
              </div>

              {/* Day headers */}
              <div className="grid grid-cols-7 mb-2">
                {["Su","Mo","Tu","We","Th","Fr","Sa"].map(d => (
                  <div key={d} className="text-center text-[9px] font-bold uppercase tracking-wider py-1 transition-colors duration-300" style={{ color: 'var(--text-secondary)' }}>
                    {d}
                  </div>
                ))}
              </div>

              {/* BUG FIX: Full month grid (was only 7 days) */}
              <div className="grid grid-cols-7 gap-y-1">
                {calDays.map((day, i) => {
                  const isCurrentMonth = day.getMonth() === calMonth.getMonth();
                  const isToday        = dateFnsIsToday(day);
                  const hasNote        = hasNoteOnDay(day);
                  return (
                    <button
                      key={i}
                      type="button"
                      onClick={() => navigate("/home/calendar")}
                      className={`
                        relative flex flex-col items-center py-1.5 rounded-lg text-xs font-medium transition-colors
                        ${!isCurrentMonth  ? "" : ""}
                        ${isToday          ? "text-white rounded-lg" : ""}
                      `}
                      style={{
                        backgroundColor: isToday ? 'var(--accent)' : 'transparent',
                        color: !isCurrentMonth ? 'var(--text-tertiary)' : isToday ? 'white' : 'var(--text-primary)'
                      }}
                    >
                      {format(day, "d")}
                      {hasNote && isCurrentMonth && !isToday && (
                        <span className="absolute bottom-0.5 w-1 h-1 rounded-full bg-[#4059FF]" />
                      )}
                    </button>
                  );
                })}
              </div>

              <button
                type="button"
                onClick={() => navigate("/home/calendar")}
                className="mt-3 w-full text-center text-xs hover:underline font-medium transition-colors duration-300"
                style={{ color: 'var(--accent)' }}
              >
                Open full calendar →
              </button>
            </div>

            {/* ── Reminders ────────────────────── */}
            <div>
              <div className="flex items-center justify-between mb-3">
                <h2 className="font-bold text-sm transition-colors duration-300" style={{ color: 'var(--text-primary)' }}>Upcoming Reminders</h2>
                {/* BUG FIX: was a dead button with no destination */}
                <button
                  type="button"
                  onClick={() => navigate("/home/calendar")}
                  className="text-xs hover:underline font-medium transition-colors duration-300"
                  style={{ color: 'var(--accent)' }}
                >
                  View all
                </button>
              </div>

              {reminders.length === 0 ? (
                <div className="rounded-[18px] border p-6 flex flex-col items-center justify-center text-center transition-colors duration-300" style={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border)' }}>
                  <div className="w-12 h-12 rounded-2xl flex items-center justify-center mb-3 transition-colors duration-300" style={{ backgroundColor: 'var(--bg-main)' }}>
                    <Clock size={20} color="#F97316" />
                  </div>
                  <p className="text-xs transition-colors duration-300" style={{ color: 'var(--text-secondary)' }}>No upcoming reminders</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {reminders.slice(0, 3).map(r => (
                    <div
                      key={r.id}
                      onClick={() => toggleReminder(r.id)}
                      className={`rounded-[16px] border p-4 flex items-center gap-3 cursor-pointer transition-all ${r.completed ? "opacity-50" : ""}`}
                      style={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border)' }}
                    >
                      <div className="w-8 h-8 rounded-xl flex items-center justify-center shrink-0" style={{ backgroundColor: 'var(--bg-main)' }}>
                        <Clock size={14} color={r.completed ? "var(--text-secondary)" : "#F97316"} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className={`text-xs font-semibold truncate transition-colors duration-300 ${r.completed ? "line-through" : ""}`} style={{ color: r.completed ? 'var(--text-secondary)' : 'var(--text-primary)' }}>
                          {r.title}
                        </p>
                        <p className="text-[10px] transition-colors duration-300" style={{ color: 'var(--text-secondary)' }}>
                          {format(new Date(r.date || r.scheduled_at), "MMM d")} · {(r.time || format(new Date(r.scheduled_at), "h:mm a"))}
                        </p>
                      </div>
                      <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center shrink-0 transition-colors ${r.completed ? "bg-emerald-500 border-emerald-500" : ""}`} style={{ borderColor: r.completed ? 'emerald-500' : 'var(--border)' }}>
                        {r.completed && <Check size={9} color="white" strokeWidth={3} />}
                      </div>
                      <button
                        type="button"
                        onClick={e => { e.stopPropagation(); removeReminder(r.id); }}
                        className="w-6 h-6 rounded-lg flex items-center justify-center hover:opacity-70 transition-colors"
                        style={{ color: 'var(--text-secondary)' }}
                        aria-label="Remove reminder"
                      >
                        <X size={12} />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Right — Recent Notes */}
          <div className="lg:col-span-8 flex flex-col min-h-0">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-bold transition-colors duration-300" style={{ color: 'var(--text-primary)' }}>Recent Notes</h2>
              <button
                type="button"
                onClick={() => navigate("/home/all-notes")}
                className="text-xs hover:underline font-semibold flex items-center gap-1 transition-colors duration-300"
                style={{ color: 'var(--accent)' }}
              >
                View all <ArrowRight size={12} />
              </button>
            </div>

            <div className="lg:max-h-[calc(100vh-360px)] lg:overflow-y-auto lg:pr-2 hm-scroll">
              {filteredNotes.length > 0 ? (
                <div className="grid grid-cols-1 gap-4 pb-4 sm:grid-cols-2 min-[1440px]:grid-cols-3">
                  {filteredNotes.map(note => (
                    <NoteCard key={note.id} note={note} />
                  ))}
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center py-20 text-center rounded-[20px] border border-dashed transition-colors duration-300" style={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border)' }}>
                  <div className="w-14 h-14 rounded-2xl flex items-center justify-center mb-4 transition-colors duration-300" style={{ backgroundColor: 'var(--bg-main)' }}>
                    <FileText size={22} style={{ color: 'var(--text-secondary)' }} />
                  </div>
                  <p className="font-semibold mb-1 transition-colors duration-300" style={{ color: 'var(--text-primary)' }}>
                    {searchQuery ? "No notes found" : "Your library is empty"}
                  </p>
                  <p className="text-xs max-w-[200px] mb-4 transition-colors duration-300" style={{ color: 'var(--text-secondary)' }}>
                    {searchQuery ? "Try different search terms." : "Create your first note to get started."}
                  </p>
                  {!searchQuery && (
                    <button
                      type="button"
                      onClick={() => setShowNewNoteModal(true)}
                      className="flex items-center gap-1.5 bg-[#0E1117] dark:bg-slate-700 text-white dark:text-slate-100 text-xs font-semibold px-4 py-2 rounded-xl hover:bg-[#1e2330] dark:hover:bg-slate-600 transition-colors duration-300"
                    >
                      <Plus size={13} /> New Note
                    </button>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
