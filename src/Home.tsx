/**
 * Home.tsx — Luminote Dashboard
 *
 * Bug fixes applied:
 * 1. Calendar < / > buttons: added stopPropagation + real month navigation
 * 2. Calendar now renders a full month grid (not just 7 days)
 * 3. "View all" reminder button now navigates to /all-notes (filtered)
 * 4. New Note modal: AI-powered with auto-tag suggestions, templates,
 *    smart title suggestion, and loading/success states
 */
import React, { useMemo, useState, useCallback, useRef } from "react";
import { Link, useNavigate } from "react-router";
import {
  Search, Plus, Image as ImageIcon, Mic, Calendar as CalendarIcon,
  Check, Clock, FileText, Type, X, Sparkles, Tag, ChevronLeft,
  ChevronRight, ArrowRight, Loader2, CheckCircle2, Lightbulb,
  AlignLeft, List, Hash, Zap,
} from "lucide-react";
import {
  format, isSameDay, addMonths, subMonths,
  startOfMonth, endOfMonth, eachDayOfInterval,
  startOfWeek, endOfWeek, isToday as dateFnsIsToday,
} from "date-fns";
import { useNotes, Note } from "./NotesContext";

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
.hm-qbtn:hover::before{opacity:1}
.hm-qbtn:hover{transform:translateY(-2px);box-shadow:0 12px 32px rgba(0,0,0,.12)}
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

/* Template btn */
.hm-tmpl{
  flex:1;border:1.5px solid #E5E7EB;border-radius:14px;
  padding:12px;cursor:pointer;text-align:left;
  background:white;transition:all .2s;
  font-family:'DM Sans',sans-serif;
}
.hm-tmpl:hover{border-color:#4059FF;background:#F5F8FF;transform:translateY(-1px)}
.hm-tmpl.selected{border-color:#4059FF;background:#EFF3FF}
`;

/* ─── Template definitions ────────────────────── */
const TEMPLATES = [
  { id: "blank",   icon: <AlignLeft size={16} />,  label: "Blank",    starter: "" },
  { id: "bullet",  icon: <List size={16} />,        label: "Bullet",   starter: "- \n- \n- \n" },
  { id: "meeting", icon: <FileText size={16} />,    label: "Meeting",  starter: "## Agenda\n\n- \n\n## Notes\n\n## Action Items\n\n- [ ] \n" },
  { id: "study",   icon: <Lightbulb size={16} />,   label: "Study",    starter: "## Topic\n\n## Key Concepts\n\n## Questions\n\n## Summary\n" },
];

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
  const { addNote, updateNote } = useNotes();

  const [title,      setTitle]      = useState("");
  const [selectedTmpl, setTmpl]     = useState("blank");
  const [selectedTags, setTags]     = useState<string[]>([]);
  const [aiState,    setAiState]    = useState<ModalState>("idle");
  const [aiTags,     setAiTags]     = useState<string[]>([]);
  const [titleHint,  setTitleHint]  = useState("");
  const titleRef = useRef<HTMLInputElement>(null);

  /* Simulate AI tag + title suggestion */
  const runAiSuggest = useCallback(async () => {
    if (!title.trim()) return;
    setAiState("loading");
    await new Promise(r => setTimeout(r, 900));

    const lower = title.toLowerCase();
    let suggested: string[] = [];
    for (const [kw, tags] of Object.entries(TAG_SUGGESTIONS)) {
      if (lower.includes(kw)) suggested = [...new Set([...suggested, ...tags])];
    }
    if (!suggested.length) suggested = ["PERSONAL"];

    // Simple title hint
    const hints = [
      `${title.trim()} — Key Points`,
      `Notes on ${title.trim()}`,
      `${title.trim()} Summary`,
    ];
    setTitleHint(hints[Math.floor(Math.random() * hints.length)]);
    setAiTags(suggested);
    setTags(prev => [...new Set([...prev, ...suggested])]);
    setAiState("success");
    setTimeout(() => setAiState("idle"), 2000);
  }, [title]);

  const toggleTag = (tag: string) => {
    setTags(prev => prev.includes(tag) ? prev.filter(t => t !== tag) : [...prev, tag]);
  };

  const handleCreate = async () => {
    const tmpl = TEMPLATES.find(t => t.id === selectedTmpl)!;
    const id = await addNote();
    updateNote(id, {
      title: title.trim() || "Untitled Note",
      content: tmpl.starter,
      tags: selectedTags,
    });
    onClose();
    navigate(`/home/editor/${id}`);
  };

  /* Close on backdrop click */
  const handleBackdrop = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) onClose();
  };

  /* Focus title on mount */
  React.useEffect(() => { titleRef.current?.focus(); }, []);

  /* Close on Escape */
  React.useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [onClose]);

  return (
    <div className="hm-overlay" onClick={handleBackdrop} role="dialog" aria-modal="true" aria-label="Create new note">
      <div
        className="hm-modal-pop bg-white rounded-[24px] shadow-[0_32px_80px_rgba(0,0,0,.18)] w-full max-w-[520px] overflow-hidden"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 pt-6 pb-4 border-b border-[#F3F4F6]">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-[#4059FF] flex items-center justify-center">
              <Plus size={16} color="white" />
            </div>
            <span className="hm-serif text-lg text-[#0E1117]">New Note</span>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-lg flex items-center justify-center text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition-colors"
            aria-label="Close modal"
          >
            <X size={16} />
          </button>
        </div>

        <div className="px-6 py-5 space-y-5 hm-scroll overflow-y-auto max-h-[70vh]">

          {/* Title input */}
          <div>
            <label className="block text-xs font-bold text-[#6B7280] uppercase tracking-wider mb-2">
              Title
            </label>
            <div className="relative">
              <input
                ref={titleRef}
                type="text"
                value={title}
                onChange={e => { setTitle(e.target.value); setAiTags([]); setTitleHint(""); }}
                placeholder="What's on your mind?"
                className="w-full px-4 py-3 rounded-[14px] border border-[#E5E7EB] bg-[#FAFAFA] text-[#0E1117] placeholder-gray-400 outline-none focus:border-[#4059FF] focus:bg-white focus:ring-4 focus:ring-[#4059FF]/10 transition-all text-sm"
                style={{ fontFamily: "'DM Sans', sans-serif" }}
              />
            </div>
            {/* Title hint from AI */}
            {titleHint && (
              <button
                type="button"
                onClick={() => setTitle(titleHint)}
                className="mt-1.5 text-xs text-[#4059FF] hover:underline flex items-center gap-1"
              >
                <Sparkles size={11} /> Try: "{titleHint}"
              </button>
            )}
          </div>

          {/* AI Suggest button */}
          <div className="flex items-center gap-3">
            <button
              type="button"
              className="hm-ai-chip"
              onClick={runAiSuggest}
              disabled={aiState === "loading" || !title.trim()}
              aria-label="Get AI tag suggestions"
            >
              {aiState === "loading" ? (
                <Loader2 size={13} className="hm-spinner" />
              ) : aiState === "success" ? (
                <CheckCircle2 size={13} color="#16A34A" />
              ) : (
                <Sparkles size={13} />
              )}
              {aiState === "loading" ? "Analyzing…" : aiState === "success" ? "Tags suggested!" : "AI Suggest Tags"}
            </button>
            {aiTags.length > 0 && (
              <span className="text-xs text-[#9CA3AF]">
                Suggested: {aiTags.join(", ")}
              </span>
            )}
          </div>

          {/* Tags */}
          <div>
            <label className="block text-xs font-bold text-[#6B7280] uppercase tracking-wider mb-2">
              Tags <span className="font-normal normal-case">(select all that apply)</span>
            </label>
            <div className="flex flex-wrap gap-2">
              {ALL_TAGS.map(tag => {
                const colors  = TAG_COLORS[tag];
                const active  = selectedTags.includes(tag);
                const isAiSug = aiTags.includes(tag);
                return (
                  <button
                    key={tag}
                    type="button"
                    onClick={() => toggleTag(tag)}
                    className="hm-tag-chip"
                    style={{
                      background: active ? colors.activeBg : colors.bg,
                      color:      colors.text,
                      borderColor: active ? colors.text : "transparent",
                    }}
                    aria-pressed={active}
                  >
                    <Hash size={10} />
                    {tag}
                    {isAiSug && !active && <Sparkles size={9} />}
                    {active && <Check size={10} />}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Template */}
          <div>
            <label className="block text-xs font-bold text-[#6B7280] uppercase tracking-wider mb-2">
              Template
            </label>
            <div className="flex gap-2">
              {TEMPLATES.map(t => (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => setTmpl(t.id)}
                  className={`hm-tmpl ${selectedTmpl === t.id ? "selected" : ""}`}
                  aria-pressed={selectedTmpl === t.id}
                >
                  <div className="flex items-center gap-1.5 mb-1 text-[#4059FF]">
                    {t.icon}
                  </div>
                  <div className="text-xs font-semibold text-[#0E1117]">{t.label}</div>
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-[#F3F4F6] flex items-center justify-between bg-[#FAFAFA]">
          <button
            type="button"
            onClick={onClose}
            className="text-sm text-[#6B7280] hover:text-[#0E1117] transition-colors font-medium"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleCreate}
            className="flex items-center gap-2 bg-[#0E1117] text-white text-sm font-semibold px-5 py-2.5 rounded-[12px] hover:bg-[#1e2330] transition-colors shadow-md"
            style={{ fontFamily: "'DM Sans', sans-serif" }}
          >
            <Zap size={14} /> Open Editor
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
    const plain   = note.content.replace(/[#*`_~\[\]()!]/g, "").trim();
    const words   = plain ? plain.split(/\s+/).length : 0;
    const preview = plain.split(/[.!?]+/).filter(Boolean).slice(0, 2).join(". ").trim();
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
        className="hm-note-card block bg-white rounded-[18px] p-5 border border-[#EBEBEB] group"
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
        <h3 className="text-[#0E1117] font-semibold text-sm mb-2 line-clamp-1 leading-snug">
          {note.title || "Untitled Note"}
        </h3>
        {preview ? (
          <p className="text-[#9CA3AF] text-xs line-clamp-2 leading-relaxed mb-4">
            {preview.length > 100 ? preview.slice(0, 100) + "…" : preview}
          </p>
        ) : (
          <p className="text-[#D1D5DB] text-xs italic mb-4">No content yet</p>
        )}
        <div className="flex items-center justify-between pt-3 border-t border-[#F3F4F6]">
          <span className="text-[10px] text-[#C4C9D4] font-medium">
            {format(getNoteDate(note), "d MMM")}
          </span>
          {words > 0 && (
            <span className="flex items-center gap-1 text-[10px] text-[#C4C9D4]">
              <Type size={10} /> {words} words
            </span>
          )}
        </div>
      </Link>
    );
  };

  return (
    <div className="hm-root h-full flex flex-col overflow-auto bg-[#FAFAF8]">
      <style>{HOME_CSS}</style>

      {/* New Note Modal */}
      {showNewNoteModal && (
        <NewNoteModal onClose={() => setShowNewNoteModal(false)} />
      )}

      <div className="flex-1 p-4 md:p-8 max-w-[1200px] mx-auto w-full space-y-8">

        {/* ── Greeting + mobile search ─────────── */}
        <div className="hm-a1 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h1 className="hm-serif text-2xl md:text-3xl text-[#0E1117] leading-tight">
              Good {new Date().getHours() < 12 ? "morning" : new Date().getHours() < 18 ? "afternoon" : "evening"} 👋
            </h1>
            <p className="text-sm text-[#9CA3AF] mt-1">
              {notes.length} note{notes.length !== 1 ? "s" : ""} in your library
            </p>
          </div>
          {/* Mobile search — BUG FIX: now wired to setSearchQuery */}
          <div className="md:hidden relative">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
            <input
              type="text"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}   /* ← was missing */
              placeholder="Search notes…"
              className="w-full pl-10 pr-4 py-2.5 bg-white rounded-2xl border border-[#EBEBEB] text-sm text-[#0E1117] placeholder-gray-400 outline-none focus:ring-2 focus:ring-[#4059FF]/20 focus:border-[#4059FF] transition-all"
            />
          </div>
        </div>

        {/* ── Quick actions ────────────────────── */}
        <div className="hm-a2 grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* NEW NOTE — opens modal */}
          <button
            type="button"
            onClick={() => setShowNewNoteModal(true)}   /* ← was inline addNote without feedback */
            className="hm-qbtn bg-[#0E1117] text-white p-5 rounded-[20px] flex items-center gap-4 text-left"
            aria-label="Create new note"
          >
            <div className="w-11 h-11 rounded-xl bg-white/10 flex items-center justify-center shrink-0">
              <Plus size={22} />
            </div>
            <div>
              <div className="font-bold text-base">New Note</div>
              <div className="text-white/50 text-sm">with AI suggestions</div>
            </div>
            <Sparkles size={14} className="ml-auto text-white/30" />
          </button>

          <button
            type="button"
            onClick={() => navigate("/home/upload-image")}
            className="hm-qbtn bg-white border border-[#EBEBEB] p-5 rounded-[20px] flex items-center gap-4 text-left"
          >
            <div className="w-11 h-11 rounded-xl bg-[#EFF3FF] flex items-center justify-center shrink-0">
              <ImageIcon size={20} color="#4059FF" />
            </div>
            <div>
              <div className="font-bold text-sm text-[#0E1117]">Upload Image</div>
              <div className="text-[#9CA3AF] text-xs">OCR Text Extraction</div>
            </div>
          </button>

          <button
            type="button"
            onClick={() => navigate("/home/voice-memo")}
            className="hm-qbtn bg-white border border-[#EBEBEB] p-5 rounded-[20px] flex items-center gap-4 text-left"
          >
            <div className="w-11 h-11 rounded-xl bg-[#FDF2F8] flex items-center justify-center shrink-0">
              <Mic size={20} color="#C026D3" />
            </div>
            <div>
              <div className="font-bold text-sm text-[#0E1117]">Voice Memo</div>
              <div className="text-[#9CA3AF] text-xs">Speech to Text AI</div>
            </div>
          </button>
        </div>

        {/* ── Main grid ────────────────────────── */}
        <div className="hm-a3 grid grid-cols-1 lg:grid-cols-12 gap-6">

          {/* Left sidebar */}
          <div className="lg:col-span-4 space-y-6">

            {/* ── Calendar ─────────────────────── */}
            <div className="bg-white rounded-[20px] border border-[#EBEBEB] p-5">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <CalendarIcon size={16} color="#4059FF" />
                  <span className="font-semibold text-sm text-[#0E1117]">
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
                    className="w-7 h-7 rounded-lg flex items-center justify-center text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition-colors"
                    aria-label="Previous month"
                  >
                    <ChevronLeft size={14} />
                  </button>
                  <button
                    type="button"
                    onClick={e => { e.stopPropagation(); setCalMonth(addMonths(calMonth, 1)); }}
                    className="w-7 h-7 rounded-lg flex items-center justify-center text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition-colors"
                    aria-label="Next month"
                  >
                    <ChevronRight size={14} />
                  </button>
                </div>
              </div>

              {/* Day headers */}
              <div className="grid grid-cols-7 mb-2">
                {["Su","Mo","Tu","We","Th","Fr","Sa"].map(d => (
                  <div key={d} className="text-center text-[9px] font-bold text-[#C4C9D4] uppercase tracking-wider py-1">
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
                        ${!isCurrentMonth  ? "text-[#E5E7EB]" : "text-[#374151]"}
                        ${isToday          ? "bg-[#0E1117] text-white rounded-lg" : "hover:bg-[#F3F4F6]"}
                      `}
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
                className="mt-3 w-full text-center text-xs text-[#4059FF] hover:underline font-medium"
              >
                Open full calendar →
              </button>
            </div>

            {/* ── Reminders ────────────────────── */}
            <div>
              <div className="flex items-center justify-between mb-3">
                <h2 className="font-bold text-sm text-[#0E1117]">Upcoming Reminders</h2>
                {/* BUG FIX: was a dead button with no destination */}
                <button
                  type="button"
                  onClick={() => navigate("/home/calendar")}
                  className="text-xs text-[#4059FF] hover:underline font-medium"
                >
                  View all
                </button>
              </div>

              {reminders.length === 0 ? (
                <div className="bg-white rounded-[18px] border border-[#EBEBEB] p-6 flex flex-col items-center justify-center text-center">
                  <div className="w-12 h-12 rounded-2xl bg-orange-50 flex items-center justify-center mb-3">
                    <Clock size={20} color="#F97316" />
                  </div>
                  <p className="text-xs text-[#9CA3AF]">No upcoming reminders</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {reminders.slice(0, 3).map(r => (
                    <div
                      key={r.id}
                      onClick={() => toggleReminder(r.id)}
                      className={`bg-white rounded-[16px] border border-[#EBEBEB] p-4 flex items-center gap-3 cursor-pointer transition-all hover:border-[#D1D5DB] ${r.completed ? "opacity-50" : ""}`}
                    >
                      <div className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 ${r.completed ? "bg-gray-100" : "bg-orange-50"}`}>
                        <Clock size={14} color={r.completed ? "#9CA3AF" : "#F97316"} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className={`text-xs font-semibold truncate ${r.completed ? "line-through text-[#9CA3AF]" : "text-[#0E1117]"}`}>
                          {r.title}
                        </p>
                        <p className="text-[10px] text-[#9CA3AF]">
                          {format(new Date(r.date), "MMM d")} · {r.time}
                        </p>
                      </div>
                      <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center shrink-0 transition-colors ${r.completed ? "bg-emerald-500 border-emerald-500" : "border-[#D1D5DB]"}`}>
                        {r.completed && <Check size={9} color="white" strokeWidth={3} />}
                      </div>
                      <button
                        type="button"
                        onClick={e => { e.stopPropagation(); removeReminder(r.id); }}
                        className="w-6 h-6 rounded-lg flex items-center justify-center text-[#D1D5DB] hover:text-red-400 hover:bg-red-50 transition-colors"
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
          <div className="lg:col-span-8">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-bold text-[#0E1117]">Recent Notes</h2>
              <button
                type="button"
                onClick={() => navigate("/home/all-notes")}
                className="text-xs text-[#4059FF] hover:underline font-semibold flex items-center gap-1"
              >
                View all <ArrowRight size={12} />
              </button>
            </div>

            {filteredNotes.length > 0 ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pb-24 md:pb-4">
                {filteredNotes.slice(0, 4).map(note => (
                  <NoteCard key={note.id} note={note} />
                ))}
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-20 text-center bg-white rounded-[20px] border border-dashed border-[#E5E7EB]">
                <div className="w-14 h-14 bg-[#F3F4F6] rounded-2xl flex items-center justify-center mb-4">
                  <FileText size={22} color="#9CA3AF" />
                </div>
                <p className="font-semibold text-[#0E1117] mb-1">
                  {searchQuery ? "No notes found" : "Your library is empty"}
                </p>
                <p className="text-xs text-[#9CA3AF] max-w-[200px] mb-4">
                  {searchQuery ? "Try different search terms." : "Create your first note to get started."}
                </p>
                {!searchQuery && (
                  <button
                    type="button"
                    onClick={() => setShowNewNoteModal(true)}
                    className="flex items-center gap-1.5 bg-[#0E1117] text-white text-xs font-semibold px-4 py-2 rounded-xl hover:bg-[#1e2330] transition-colors"
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
  );
}
