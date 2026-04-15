import React, { useState, useEffect, useRef, useCallback } from "react";
import { useParams, useNavigate } from "react-router";
import {
  ArrowLeft, Share2, MoreHorizontal, Undo, Redo,
  Bold, Italic, Underline, Strikethrough, Highlighter,
  List, ListOrdered, Plus, X, Sparkles, FileText,
  ChevronDown, Bell, Clock, Tag, GraduationCap, Type,
  Eraser, PenTool, Star,
} from "lucide-react";
import { useNotes } from "./NotesContext";
import { useAuth } from "./AuthContext";
import { useToast } from "./toast";
import { supabase } from "./supabaseClient";
import { AppTag, DEFAULT_TAG_NAMES, FALLBACK_TAGS, getTagStyle, normalizeTagName } from "./tagSystem";

/* ═══════════════════════════════════════════════════
   TYPES
═══════════════════════════════════════════════════ */
type DrawTool = "pen" | "pencil" | "highlighter" | "eraser";
type ToolMode = "draw" | "text" | "lasso";
type StrokeSize = "thin" | "medium" | "thick";
type PersonalCourse = { id: string; code?: string; title: string; subtitle?: string };

/* ═══════════════════════════════════════════════════
   CONSTANTS
═══════════════════════════════════════════════════ */
const LINE_H = 28;

const PAGE_COLORS = [
  { id: "white", hex: "#FFFFFF" },
  { id: "yellow", hex: "#FFFBEB" },
  { id: "blue", hex: "#EFF6FF" },
  { id: "green", hex: "#ECFDF5" },
  { id: "pink", hex: "#FFF1F2" },
];

const STROKE_WIDTHS: Record<DrawTool, Record<StrokeSize, number>> = {
  pen: { thin: 1.5, medium: 3, thick: 6 },
  pencil: { thin: 2, medium: 5, thick: 9 },
  highlighter: { thin: 14, medium: 22, thick: 36 },
  eraser: { thin: 12, medium: 24, thick: 42 },
};

const DRAW_PALETTE = [
  "#000000", "#434343", "#666666", "#999999", "#B7B7B7", "#CCCCCC", "#D9D9D9", "#EFEFEF", "#F3F3F3", "#FFFFFF",
  "#980000", "#FF0000", "#FF9900", "#FFFF00", "#00FF00", "#00FFFF", "#4A86E8", "#0000FF", "#9900FF", "#FF00FF",
  "#E6B8AF", "#F4CCCC", "#FCE5CD", "#FFF2CC", "#D9EAD3", "#D0E0E3", "#C9DAF8", "#CFE2F3", "#D9D2E9", "#EAD1DC",
  "#DD7E6B", "#EA9999", "#F9CB9C", "#FFE599", "#B6D7A8", "#A2C4C9", "#A4C2F4", "#9FC5E8", "#B4A7D6", "#D5A6BD",
  "#CC4125", "#E06666", "#F6B26B", "#FFD966", "#93C47D", "#76A5AF", "#6D9EEB", "#6FA8DC", "#8E7CC3", "#C27BA0",
];

const BOTTOM_PALETTE = [
  "#000000", "#1F2937", "#4B5563", "#9CA3AF", "#FFFFFF",
  "#DC2626", "#F97316", "#EAB308", "#16A34A", "#2563EB", "#7C3AED", "#DB2777",
  "#FEF08A", "#BBF7D0", "#BAE6FD", "#E9D5FF", "#FECACA",
];

/* ═══════════════════════════════════════════════════
   HELPERS
═══════════════════════════════════════════════════ */
const hexRgba = (hex: string, a: number) => {
  const c = hex.replace("#", "");
  return `rgba(${parseInt(c.slice(0, 2), 16)},${parseInt(c.slice(2, 4), 16)},${parseInt(c.slice(4, 6), 16)},${a})`;
};

const DRAW_KEY = (id: string) => `luminote-draw-${id}`;
const EMBED_S = "<!--LUMINOTE_DRAW_START-->";
const EMBED_E = "<!--LUMINOTE_DRAW_END-->";

function extractDraw(raw: string): { text: string; draw: string | null } {
  if (!raw) return { text: "", draw: null };
  const s = raw.indexOf(EMBED_S), e = raw.indexOf(EMBED_E);
  if (s < 0 || e < 0 || e <= s) return { text: raw, draw: null };
  return {
    text: (raw.slice(0, s) + raw.slice(e + EMBED_E.length)).trim(),
    draw: raw.slice(s + EMBED_S.length, e).trim() || null,
  };
}

function mergeDraw(text: string, draw: string | null) {
  return draw ? `${text || ""}\n${EMBED_S}${draw}${EMBED_E}` : (text || "");
}

function getPattern(style?: string): React.CSSProperties {
  if (style === "lined") return {
    backgroundImage: `repeating-linear-gradient(transparent,transparent ${LINE_H - 1}px,#CBD5E180 ${LINE_H - 1}px,#CBD5E180 ${LINE_H}px)`,
    backgroundPosition: `0 ${LINE_H}px`,
  };
  if (style === "grid") return {
    backgroundImage: `linear-gradient(#CBD5E130 1px,transparent 1px),linear-gradient(90deg,#CBD5E130 1px,transparent 1px)`,
    backgroundSize: `${LINE_H}px ${LINE_H}px`,
  };
  if (style === "dotted") return {
    backgroundImage: `radial-gradient(circle,#CBD5E140 1px,transparent 1px)`,
    backgroundSize: `${LINE_H}px ${LINE_H}px`,
  };
  if (style === "graph") return {
    backgroundImage: `linear-gradient(#CBD5E118 1px,transparent 1px),linear-gradient(90deg,#CBD5E118 1px,transparent 1px),linear-gradient(#CBD5E140 1px,transparent 1px),linear-gradient(90deg,#CBD5E140 1px,transparent 1px)`,
    backgroundSize: `${LINE_H / 4}px ${LINE_H / 4}px,${LINE_H / 4}px ${LINE_H / 4}px,${LINE_H}px ${LINE_H}px,${LINE_H}px ${LINE_H}px`,
  };
  return {};
}

function applyFontSize(size: number) {
  const sel = window.getSelection();
  if (!sel || sel.rangeCount === 0) return;
  if (sel.isCollapsed) {
    const span = document.createElement("span");
    span.style.fontSize = `${size}px`;
    span.innerHTML = "\u200B";
    const r = sel.getRangeAt(0);
    r.insertNode(span);
    r.setStart(span.childNodes[0], 1);
    r.collapse(true);
    sel.removeAllRanges(); sel.addRange(r);
    return;
  }
  document.execCommand("styleWithCSS", false, "false");
  document.execCommand("fontSize", false, "7");
  document.querySelectorAll('[data-gn-editor] font[size="7"]').forEach(el => {
    if (!el.parentNode) return;
    const span = document.createElement("span");
    span.style.fontSize = `${size}px`;
    span.innerHTML = el.innerHTML;
    try { el.parentNode.replaceChild(span, el); } catch { }
  });
}

function getEditorDraftKey(noteId: string, userId?: string) {
  return userId ? `luminote-note-draft-${userId}-${noteId}` : `luminote-note-draft-${noteId}`;
}

/* ═══════════════════════════════════════════════════
   BOTTOM COLOR PICKER
═══════════════════════════════════════════════════ */
function BottomColorPicker({
  color, pos, onChange, onClose,
}: {
  color: string; pos: { bottom: number; left: number };
  onChange: (c: string) => void; onClose: () => void;
}) {
  return (
    <>
      <div style={{ position: "fixed", inset: 0, zIndex: 9990 }} onClick={onClose} />
      <div style={{
        position: "fixed", bottom: pos.bottom, left: pos.left, transform: "translateX(-50%)",
        zIndex: 9999, background: "var(--color-surface, #2C2C2E)",
        borderRadius: 16, boxShadow: "0 -8px 32px rgba(0,0,0,.4)",
        padding: 12, width: 220,
        border: "1px solid var(--gn-border, rgba(255,255,255,.12))",
        animation: "gnPop .14s ease both",
      }} onClick={e => e.stopPropagation()}>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(10,1fr)", gap: 4, marginBottom: 8 }}>
          {DRAW_PALETTE.slice(0, 20).map(c => (
            <button key={c} onClick={() => { onChange(c); onClose(); }} style={{
              width: 18, height: 18, borderRadius: "50%", background: c, cursor: "pointer",
              border: color.toLowerCase() === c.toLowerCase()
                ? "2.5px solid var(--color-primary,#6366F1)"
                : "1px solid rgba(0,0,0,.15)",
              transform: color.toLowerCase() === c.toLowerCase() ? "scale(1.25)" : "scale(1)",
              transition: "transform .1s",
            }} />
          ))}
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(10,1fr)", gap: 4 }}>
          {DRAW_PALETTE.slice(20).map(c => (
            <button key={c} onClick={() => { onChange(c); onClose(); }} style={{
              width: 18, height: 18, borderRadius: "50%", background: c, cursor: "pointer",
              border: color.toLowerCase() === c.toLowerCase()
                ? "2.5px solid var(--color-primary,#6366F1)"
                : "1px solid rgba(0,0,0,.15)",
              transform: color.toLowerCase() === c.toLowerCase() ? "scale(1.25)" : "scale(1)",
              transition: "transform .1s",
            }} />
          ))}
        </div>
      </div>
    </>
  );
}

/* ═══════════════════════════════════════════════════
   BOTTOM FLOATING DRAW BAR
═══════════════════════════════════════════════════ */
const IC_PEN = (a: boolean) => (
  <svg width={19} height={19} viewBox="0 0 24 24" fill="none"
    stroke={a ? "#fff" : "currentColor"} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z" />
  </svg>
);
const IC_PENCIL = (a: boolean) => (
  <svg width={19} height={19} viewBox="0 0 24 24" fill="none"
    stroke={a ? "#fff" : "currentColor"} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <path d="m16 3 5 5-11 11H5v-5Z" />
    <path d="m14.5 5.5 3 3" strokeOpacity=".4" strokeDasharray="1.5 1.5" />
  </svg>
);
const IC_HL = (a: boolean) => (
  <svg width={19} height={19} viewBox="0 0 24 24" fill="none"
    stroke={a ? "#fff" : "currentColor"} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <path d="M9 11l-6 6v3h3l6-6" /><path d="m22 12-4.6 4.6a2 2 0 0 1-2.8 0l-5.2-5.2a2 2 0 0 1 0-2.8L14 4" />
  </svg>
);
const IC_LASSO = (a: boolean) => (
  <svg width={19} height={19} viewBox="0 0 24 24" fill="none"
    stroke={a ? "#fff" : "currentColor"} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <path d="M4 20v-4a8 8 0 0 1 8-8 8 8 0 0 1 8 8v4" strokeDasharray="3 2" />
    <path d="m9 16 3 3 3-3" />
  </svg>
);

function DrawBar({
  mode, tool, sz, color,
  onMode, onTool, onSz, onColor,
}: {
  mode: ToolMode; tool: DrawTool; sz: StrokeSize; color: string;
  onMode: (m: ToolMode) => void; onTool: (t: DrawTool) => void;
  onSz: (s: StrokeSize) => void; onColor: (c: string) => void;
}) {
  const [pickerOpen, setPickerOpen] = useState(false);
  const [pickerPos, setPickerPos] = useState({ bottom: 0, left: 0 });

  const btn: React.CSSProperties = {
    width: 42, height: 42, borderRadius: "50%", display: "flex", alignItems: "center",
    justifyContent: "center", border: "none", cursor: "pointer", transition: "all .15s",
    flexShrink: 0,
  };
  const active = (id: DrawTool) => mode === "draw" && tool === id;

  const SZMAP: { id: StrokeSize; r: number }[] = [{ id: "thin", r: 3 }, { id: "medium", r: 6 }, { id: "thick", r: 10 }];

  return (
    <div className="gn-drawbar" style={{
      position: "fixed", bottom: 18, left: "50%", transform: "translateX(-50%)",
      zIndex: 200, display: "flex", alignItems: "center",
      background: "var(--gn-bar-bg)",
      backdropFilter: "blur(24px)", WebkitBackdropFilter: "blur(24px)",
      borderRadius: 40, padding: "5px 14px", gap: 1,
      border: "1px solid var(--gn-bar-border)",
      boxShadow: "0 6px 36px rgba(0,0,0,.35),0 2px 6px rgba(0,0,0,.25)",
    }}>
      {/* Draw tools */}
      {([
        { id: "pen" as DrawTool, ic: IC_PEN },
        { id: "pencil" as DrawTool, ic: IC_PENCIL },
        { id: "highlighter" as DrawTool, ic: IC_HL },
        { id: "eraser" as DrawTool, ic: (a: boolean) => <Eraser size={18} color={a ? "#fff" : "currentColor"} /> },
      ] as { id: DrawTool; ic: (a: boolean) => React.ReactNode }[]).map(b => {
        const a = active(b.id);
        return (
          <button key={b.id} onClick={() => { onMode("draw"); onTool(b.id); }}
            style={{
              ...btn, background: a ? "var(--color-primary,#6366F1)" : "transparent",
              color: "var(--color-text-secondary)"
            }}>
            {b.ic(a)}
          </button>
        );
      })}

      <div style={{ width: 1, height: 24, background: "var(--gn-bar-border)", margin: "0 6px" }} />

      {/* Stroke sizes */}
      {SZMAP.map(s => (
        <button key={s.id} onClick={() => onSz(s.id)} style={{
          width: 32, height: 32, borderRadius: "50%", display: "flex", alignItems: "center",
          justifyContent: "center",
          background: sz === s.id ? "var(--gn-size-active)" : "transparent",
          border: sz === s.id ? "1.5px solid var(--color-primary,#6366F1)" : "1px solid transparent",
          cursor: "pointer", transition: "all .15s",
        }}>
          <div style={{
            width: s.r, height: s.r, borderRadius: "50%",
            background: color === "#FFFFFF" ? "#9CA3AF" : color,
          }} />
        </button>
      ))}

      <ChevronDown size={12} style={{ color: "var(--color-text-secondary)", opacity: .4, marginLeft: 2 }} />

      <div style={{ width: 1, height: 24, background: "var(--gn-bar-border)", margin: "0 6px" }} />

      {/* Color swatch */}
      <button
        onClick={e => {
          const r = (e.currentTarget as HTMLElement).getBoundingClientRect();
          setPickerPos({ bottom: window.innerHeight - r.top + 10, left: r.left + r.width / 2 });
          setPickerOpen(v => !v);
        }}
        style={{
          width: 28, height: 28, borderRadius: "50%", background: color, flexShrink: 0,
          border: color === "#FFFFFF"
            ? "2px solid rgba(0,0,0,.15)"
            : "2px solid rgba(255,255,255,.25)",
          cursor: "pointer", boxShadow: "0 2px 8px rgba(0,0,0,.3)", transition: "transform .1s",
        }}
      />

      <div style={{ width: 1, height: 24, background: "var(--gn-bar-border)", margin: "0 6px" }} />

      {/* Lasso */}
      <button onClick={() => onMode(mode === "lasso" ? "draw" : "lasso")}
        style={{
          ...btn, background: mode === "lasso" ? "var(--color-primary,#6366F1)" : "transparent",
          color: "var(--color-text-secondary)"
        }}>
        {IC_LASSO(mode === "lasso")}
      </button>

      {/* Text */}
      <button onClick={() => onMode(mode === "text" ? "draw" : "text")}
        style={{
          ...btn, background: mode === "text" ? "var(--color-primary,#6366F1)" : "transparent",
          color: "var(--color-text-secondary)"
        }}>
        <Type size={17} color={mode === "text" ? "#fff" : "currentColor"} />
      </button>

      {pickerOpen && (
        <BottomColorPicker color={color} pos={pickerPos}
          onChange={onColor} onClose={() => setPickerOpen(false)} />
      )}
    </div>
  );
}

/* ═══════════════════════════════════════════════════
   MAIN EDITOR
═══════════════════════════════════════════════════ */
export function Editor() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { notes, notesLoading, updateNote, addNote, addReminder, extractRemindersFromNote } = useNotes();
  const { settings: userSettings, user } = useAuth();
  const toast = useToast();

  /* ── Tabs ── */
  const [openTabs, setOpenTabs] = useState<string[]>([]);
  useEffect(() => {
    if (id) setOpenTabs(p => p.includes(id) ? p : [...p, id]);
  }, [id]);

  const closeTab = (e: React.MouseEvent, tid: string) => {
    e.stopPropagation();
    const next = openTabs.filter(t => t !== tid);
    setOpenTabs(next);
    if (!next.length) navigate("/home");
    else if (id === tid) navigate(`/home/editor/${next[next.length - 1]}`);
  };
  const newTab = async () => { const nid = await addNote(); navigate(`/home/editor/${nid}`); };

  /* ── Note ── */
  const note = notes.find(n => n.id === id);
  const [title, setTitle] = useState(note?.title || "");
  const [content, setContent] = useState("");
  const [snap, setSnap] = useState<string | null>(null);
  const dirty = useRef(false);

  /* ── Refs ── */
  const editorRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const paperRef = useRef<HTMLDivElement>(null);

  /* ── Draw state ── */
  const [mode, setMode] = useState<ToolMode>("draw");
  const [tool, setTool] = useState<DrawTool>("pen");
  const [sz, setSz] = useState<StrokeSize>("medium");
  const [color, setColor] = useState("#1F2937");
  const [drawing, setDrawing] = useState(false);
  const [ePos, setEPos] = useState<{ x: number; y: number } | null>(null);

  /* ── Lasso state ── */
  const [lRect, setLRect] = useState<{ x: number; y: number; w: number; h: number } | null>(null);
  const lStart = useRef<{ x: number; y: number } | null>(null);
  const [cap, setCap] = useState<{ imgData: ImageData; x: number; y: number } | null>(null);
  const lDrag = useRef(false);
  const lDragPt = useRef<{ mx: number; my: number; ox: number; oy: number } | null>(null);

  /* ── Text formatting state ── */
  const [fmtBold, setFmtBold] = useState(false);
  const [fmtItal, setFmtItal] = useState(false);
  const [fmtUnder, setFmtUnder] = useState(false);
  const [fmtStr, setFmtStr] = useState(false);
  const [txtColor, setTxtColor] = useState("#0F172A");
  const [hlColor, setHlColor] = useState<string | null>("#FEF08A");
  const [showTxtColorMenu, setShowTxtColorMenu] = useState(false);
  const [showHlColorMenu, setShowHlColorMenu] = useState(false);
  const [txtColorPos, setTxtColorPos] = useState({ top: 0, left: 0 });
  const [hlColorPos, setHlColorPos] = useState({ top: 0, left: 0 });

  /* ── Tags ── */
  const [availableTags, setAvailableTags] = useState<AppTag[]>(FALLBACK_TAGS);
  const [selectedTagNames, setSelectedTagNames] = useState<string[]>(
    Array.isArray(note?.tags) ? note.tags.map(t => normalizeTagName(String(t))).filter(Boolean) : []
  );
  const [customTagInput, setCustomTagInput] = useState("");
  const [isTagBusy, setIsTagBusy] = useState(false);
  const [showTagMenu, setShowTagMenu] = useState(false);
  const [tagMenuPos, setTagMenuPos] = useState({ top: 0, left: 0 });

  /* ── Courses ── */
  const [availableCourses, setAvailableCourses] = useState<PersonalCourse[]>([]);
  const [selectedCourseId, setSelectedCourseId] = useState<string | null>(null);
  const [showCourseMenu, setShowCourseMenu] = useState(false);
  const [courseMenuPos, setCourseMenuPos] = useState({ top: 0, left: 0 });
  const coursesKey = user ? `luminote-personal-courses-${user.id}` : "luminote-personal-courses-guest";
  const noteCourseKey = user ? `luminote-note-course-map-${user.id}` : "luminote-note-course-map-guest";

  /* ── Reminders ── */
  const [showReminderMenu, setShowReminderMenu] = useState(false);
  const [reminderMenuPos, setReminderMenuPos] = useState({ top: 0, left: 0 });
  const [remTitle, setRemTitle] = useState("");
  const [remDate, setRemDate] = useState("");
  const [remTime, setRemTime] = useState("09:00");

  /* ── AI ── */
  const [showAiChat, setShowAiChat] = useState(false);
  const [aiHistory, setAiHistory] = useState<{ role: "user" | "assistant"; content: string }[]>([]);
  const [aiInput, setAiInput] = useState("");
  const [isAiLoading, setIsAiLoading] = useState(false);
  const [aiSelText, setAiSelText] = useState("");
  const [aiFloatPos, setAiFloatPos] = useState<{ top: number; left: number } | null>(null);

  /* ── More menu ── */
  const [showMore, setShowMore] = useState(false);
  const [morePos, setMorePos] = useState({ top: 0, left: 0 });
  const [isFavorite, setIsFavorite] = useState(false);

  /* ── Auth helpers ── */
  const getAuthHeaders = useCallback(async () => {
    const { data } = await supabase.auth.getSession();
    const token = data.session?.access_token;
    if (!token) throw new Error("Not signed in.");
    return { "Content-Type": "application/json", Authorization: `Bearer ${token}` };
  }, []);

  /* ── Load tags ── */
  const loadTags = useCallback(async () => {
    if (!user?.id) { setAvailableTags(FALLBACK_TAGS); return; }
    try {
      const headers = await getAuthHeaders();
      const res = await fetch(`/api/tags?userId=${encodeURIComponent(user.id)}`, { method: "GET", headers });
      if (!res.ok) throw new Error();
      const { tags } = await res.json();
      if (!Array.isArray(tags)) throw new Error();
      const norm: AppTag[] = tags
        .map((r: any) => ({
          id: String(r.id), name: normalizeTagName(String(r.name || "")),
          color: typeof r.color === "string" ? r.color : "#64748B",
          userId: r.userId ? String(r.userId) : null, isDefault: Boolean(r.isDefault)
        }))
        .filter((t: AppTag) => t.id && t.name);
      const defSet = new Set(DEFAULT_TAG_NAMES.map(n => n.toLowerCase()));
      const customs = norm.filter(t => !t.isDefault);
      const byName = new Map<string, AppTag>();
      for (const t of FALLBACK_TAGS) byName.set(t.name.toLowerCase(), t);
      for (const t of norm.filter(t => t.isDefault && defSet.has(t.name.toLowerCase()))) byName.set(t.name.toLowerCase(), t);
      setAvailableTags([
        ...DEFAULT_TAG_NAMES.map(n => byName.get(n.toLowerCase())).filter((t): t is AppTag => !!t),
        ...customs,
      ]);
    } catch { setAvailableTags(FALLBACK_TAGS); }
  }, [getAuthHeaders, user?.id]);

  useEffect(() => { void loadTags(); }, [loadTags]);
  useEffect(() => {
    setSelectedTagNames(Array.isArray(note?.tags)
      ? note.tags.map(t => normalizeTagName(String(t))).filter(Boolean) : []);
  }, [note?.id, note?.tags]);

  const syncTags = useCallback(async (names: string[]) => {
    if (!note?.id || !user?.id) return;
    const dedup = [...new Set(names.map(n => normalizeTagName(n)).filter(Boolean))];
    const nameToId = new Map(availableTags.map(t => [normalizeTagName(t.name).toLowerCase(), t.id]));
    const ids = dedup.map(n => nameToId.get(n.toLowerCase())).filter((id): id is string => !!id);
    try {
      setIsTagBusy(true);
      const headers = await getAuthHeaders();
      const res = await fetch("/api/note-tags", { method: "PUT", headers, body: JSON.stringify({ userId: user.id, noteId: note.id, tagIds: ids }) });
      if (!res.ok) throw new Error();
      const { tagNames } = await res.json();
      const synced = Array.isArray(tagNames) ? tagNames.map((n: string) => normalizeTagName(n)).filter(Boolean) : dedup;
      setSelectedTagNames(synced);
      await updateNote(note.id, { tags: synced });
    } catch {
      try { await updateNote(note.id, { tags: dedup }); setSelectedTagNames(dedup); }
      catch { toast.error("Could not save tags."); }
    } finally { setIsTagBusy(false); }
  }, [availableTags, getAuthHeaders, note?.id, updateNote, user?.id, toast]);

  const toggleTag = useCallback(async (name: string) => {
    const norm = normalizeTagName(name); if (!norm) return;
    const next = selectedTagNames.some(n => n.toLowerCase() === norm.toLowerCase())
      ? selectedTagNames.filter(n => n.toLowerCase() !== norm.toLowerCase())
      : [...selectedTagNames, norm];
    setSelectedTagNames(next);
    await syncTags(next);
  }, [selectedTagNames, syncTags]);

  const createTag = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user?.id) { toast.error("Sign in to create tags."); return; }
    const norm = normalizeTagName(customTagInput); if (!norm) return;
    if (availableTags.some(t => normalizeTagName(t.name).toLowerCase() === norm.toLowerCase())) {
      setCustomTagInput(""); await toggleTag(norm); return;
    }
    try {
      setIsTagBusy(true);
      const headers = await getAuthHeaders();
      const res = await fetch("/api/tags", { method: "POST", headers, body: JSON.stringify({ userId: user.id, name: norm, color: "#64748B" }) });
      if (res.status === 409) { await loadTags(); await toggleTag(norm); setCustomTagInput(""); return; }
      if (!res.ok) throw new Error();
      const { tag } = await res.json();
      if (tag?.id && tag?.name) {
        const created: AppTag = {
          id: String(tag.id), name: normalizeTagName(String(tag.name)),
          color: typeof tag.color === "string" ? tag.color : "#64748B",
          userId: tag.userId ? String(tag.userId) : user.id, isDefault: Boolean(tag.isDefault)
        };
        setAvailableTags(p => p.some(t => t.id === created.id) ? p : [...p, created]);
        const next = [...selectedTagNames, created.name];
        setSelectedTagNames(next); await syncTags(next);
      }
      setCustomTagInput("");
    } catch { toast.error("Could not create tag."); }
    finally { setIsTagBusy(false); }
  }, [availableTags, customTagInput, getAuthHeaders, loadTags, selectedTagNames, syncTags, toggleTag, user?.id, toast]);

  /* ── Load courses ── */
  const loadCourses = useCallback(async () => {
    const norm = (arr: any[]) => arr.filter(c => c && typeof c.id === "string" && typeof c.title === "string")
      .map(c => ({ id: c.id, title: c.title, code: c.code, subtitle: c.subtitle }));
    const local: PersonalCourse[] = [];
    for (const key of [coursesKey, "luminote-personal-courses-guest"]) {
      try { const r = localStorage.getItem(key); if (r) local.push(...norm(JSON.parse(r))); } catch { }
    }
    let remote: PersonalCourse[] = [];
    if (user?.id) {
      const { data, error } = await supabase.from("user_courses").select("id,code,title,subtitle")
        .eq("user_id", user.id).order("created_at", { ascending: false });
      if (!error && Array.isArray(data)) remote = norm(data);
    }
    const map = new Map<string, PersonalCourse>();
    for (const c of [...local, ...remote]) map.set(c.id, c);
    setAvailableCourses(Array.from(map.values()));
  }, [coursesKey, user?.id]);

  useEffect(() => { void loadCourses(); }, [loadCourses]);
  useEffect(() => {
    if (!id || !note) { setSelectedCourseId(null); return; }
    if (note.course_id) { setSelectedCourseId(note.course_id); return; }
    try {
      const r = localStorage.getItem(noteCourseKey);
      const p = r ? JSON.parse(r) : {};
      setSelectedCourseId(typeof p[id] === "string" ? p[id] : null);
    } catch { setSelectedCourseId(null); }
  }, [id, note?.id, note?.course_id, noteCourseKey]);

  const selectCourse = async (cid: string | null) => {
    if (!id) return;
    setSelectedCourseId(cid);
    try {
      const r = localStorage.getItem(noteCourseKey);
      const p = r ? JSON.parse(r) : {};
      if (cid) p[id] = cid; else delete p[id];
      localStorage.setItem(noteCourseKey, JSON.stringify(p));
    } catch { }
    if (user?.id) { try { await updateNote(id, { course_id: cid }); } catch { } }
    const sel = availableCourses.find(c => c.id === cid);
    if (sel) toast.success(`Course: ${sel.title}`);
    setShowCourseMenu(false);
  };

  /* ── Canvas helpers ── */
  const initCanvas = useCallback(() => {
    const cv = canvasRef.current, p = paperRef.current;
    if (!cv || !p) return;
    cv.width = p.clientWidth;
    cv.height = Math.max(p.clientHeight, 1123);
  }, []);

  const restoreSnap = useCallback((s: string | null) => {
    const cv = canvasRef.current, ctx = cv?.getContext("2d");
    if (!ctx || !cv) return;
    ctx.clearRect(0, 0, cv.width, cv.height);
    if (!s) return;
    const img = new Image();
    img.onload = () => ctx.drawImage(img, 0, 0, cv.clientWidth, cv.clientHeight);
    img.src = s;
  }, []);

  const saveSnap = useCallback(() => {
    const cv = canvasRef.current;
    if (!cv || !note?.id) return;
    try {
      const url = cv.toDataURL("image/png");
      localStorage.setItem(DRAW_KEY(note.id), url);
      setSnap(url); dirty.current = true;
    } catch { }
  }, [note?.id]);

  /* ── Sync note → editor ── */
  useEffect(() => {
    if (!note) return;
    const { text, draw } = extractDraw(note.content || "");
    setTitle(note.title || "");
    setContent(text);
    const s = draw || localStorage.getItem(DRAW_KEY(note.id));
    setSnap(s); dirty.current = false;
  }, [id, note?.id]); // eslint-disable-line

  useEffect(() => {
    if (!editorRef.current || !note) return;
    const { text } = extractDraw(note.content || "");
    if (editorRef.current.innerHTML !== text) editorRef.current.innerHTML = text;
  }, [id, note?.id]); // eslint-disable-line

  useEffect(() => { initCanvas(); restoreSnap(snap); }, [id, note?.id]); // eslint-disable-line

  /* ── Debounced save ── */
  useEffect(() => {
    if (!note || !dirty.current) return;
    const t = setTimeout(async () => {
      try {
        const merged = mergeDraw(content, snap);
        await updateNote(note.id, { title, content: merged });
        dirty.current = false;
        if (title || merged) await extractRemindersFromNote(note.id, title, merged);
      } catch { }
    }, 1500);
    return () => clearTimeout(t);
  }, [content, snap, note?.id, title, updateNote, extractRemindersFromNote]);

  /* ── Format state ── */
  const updateFmt = useCallback(() => {
    setFmtBold(document.queryCommandState("bold"));
    setFmtItal(document.queryCommandState("italic"));
    setFmtUnder(document.queryCommandState("underline"));
    setFmtStr(document.queryCommandState("strikeThrough"));
    const sel = window.getSelection();
    if (sel && sel.rangeCount > 0 && !sel.isCollapsed && sel.toString().trim()) {
      const r = sel.getRangeAt(0).getBoundingClientRect();
      setAiFloatPos({ top: r.top - 46, left: r.left + r.width / 2 });
      setAiSelText(sel.toString());
    } else setAiFloatPos(null);
  }, []);

  const execFmt = (cmd: string, val?: string) => {
    editorRef.current?.focus();
    document.execCommand(cmd, false, val);
    updateFmt();
    setContent(editorRef.current?.innerHTML || "");
    dirty.current = true;
  };

  /* ── AI ── */
  const handleSummarize = async () => {
    const text = editorRef.current?.innerText ?? "";
    if (!text.trim()) { toast.error("Note is empty."); return; }
    const tid = toast.loading("Summarizing…");
    try {
      const { summarizeNote } = await import("./qwen");
      const summary = await summarizeNote(text, title || "Untitled");
      const nid = await addNote();
      await updateNote(nid, { title: `${title || "Untitled"} — Summary`, content: summary, color_style: "yellow", tags: ["Readings"] });
      toast.dismiss(tid); toast.success("Summary created!");
      navigate(`/home/editor/${nid}`);
    } catch (e: any) { toast.dismiss(tid); toast.error(e?.message ?? "Failed."); }
  };

  const sendAi = async () => {
    if (!aiInput.trim() || isAiLoading) return;
    const msg = aiInput; setAiInput("");
    let final = msg;
    if (aiHistory.length === 0 && aiSelText) final = `[Context: "${aiSelText}"]\n\n${msg}`;
    const hist = [...aiHistory, { role: "user" as const, content: final }];
    setAiHistory(hist); setIsAiLoading(true);
    try {
      const { lumiChat } = await import("./qwen");
      const resp = await lumiChat(final, aiHistory);
      setAiHistory([...hist, { role: "assistant" as const, content: resp }]);
    } catch (e: any) {
      setAiHistory([...hist, { role: "assistant" as const, content: "Error: " + (e?.message || "AI unavailable.") }]);
    } finally { setIsAiLoading(false); }
  };

  /* ── Reminder ── */
  const handleAddReminder = async () => {
    if (!remTitle.trim() || !remDate) { toast.error("Enter title and date."); return; }
    try {
      await addReminder({ title: remTitle, date: remDate, time: remTime });
      toast.success("Reminder set!");
      setShowReminderMenu(false);
      setRemTitle(""); setRemDate(""); setRemTime("09:00");
    } catch { toast.error("Failed to set reminder."); }
  };

  /* ── Pointer canvas ── */
  const cvXY = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const r = canvasRef.current!.getBoundingClientRect();
    return { x: e.clientX - r.left, y: e.clientY - r.top };
  };

  const commitCap = useCallback(() => {
    if (!cap) return;
    const ctx = canvasRef.current?.getContext("2d");
    if (ctx) {
      const tmp = document.createElement("canvas");
      tmp.width = cap.imgData.width; tmp.height = cap.imgData.height;
      tmp.getContext("2d")?.putImageData(cap.imgData, 0, 0);
      ctx.drawImage(tmp, cap.x, cap.y); saveSnap();
    }
    setCap(null); setLRect(null);
  }, [cap, saveSnap]);

  const onPtrDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const { x, y } = cvXY(e);
    if (mode === "lasso") {
      if (cap && lRect) {
        const { x: lx, y: ly, w, h } = lRect;
        if (x >= lx && x <= lx + w && y >= ly && y <= ly + h) {
          lDrag.current = true;
          lDragPt.current = { mx: x, my: y, ox: cap.x, oy: cap.y };
          e.currentTarget.setPointerCapture(e.pointerId); return;
        }
        commitCap(); return;
      }
      lStart.current = { x, y }; setLRect({ x, y, w: 0, h: 0 });
      e.currentTarget.setPointerCapture(e.pointerId); return;
    }
    if (mode !== "draw") return;
    const ctx = canvasRef.current?.getContext("2d"); if (!ctx) return;
    ctx.globalCompositeOperation = tool === "eraser" ? "destination-out" : tool === "highlighter" ? "multiply" : "source-over";
    ctx.strokeStyle = tool === "eraser" ? "rgba(0,0,0,1)" : tool === "highlighter" ? hexRgba(color, .38) : tool === "pencil" ? hexRgba(color, .65) : color;
    ctx.lineWidth = STROKE_WIDTHS[tool][sz];
    ctx.lineCap = tool === "highlighter" ? "square" : "round";
    ctx.lineJoin = "round";
    ctx.beginPath(); ctx.moveTo(x, y);
    setDrawing(true); e.currentTarget.setPointerCapture(e.pointerId);
  };

  const onPtrMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const { x, y } = cvXY(e);
    if (mode === "lasso") {
      if (lDrag.current && cap && lDragPt.current) {
        const dx = x - lDragPt.current.mx, dy = y - lDragPt.current.my;
        setCap(p => p ? { ...p, x: lDragPt.current!.ox + dx, y: lDragPt.current!.oy + dy } : null);
        setLRect(p => p ? { ...p, x: lDragPt.current!.ox + dx, y: lDragPt.current!.oy + dy } : null);
        return;
      }
      if (lStart.current && !cap)
        setLRect({ x: Math.min(lStart.current.x, x), y: Math.min(lStart.current.y, y), w: Math.abs(x - lStart.current.x), h: Math.abs(y - lStart.current.y) });
      return;
    }
    if (!drawing || mode !== "draw") { setEPos(tool === "eraser" ? { x, y } : null); return; }
    const ctx = canvasRef.current?.getContext("2d"); if (!ctx) return;
    if (tool === "pen") ctx.lineWidth = Math.max(.5, STROKE_WIDTHS.pen[sz] * (e.pressure > 0 ? e.pressure : 1));
    ctx.lineTo(x, y); ctx.stroke();
    if (tool === "eraser") setEPos({ x, y });
  };

  const onPtrUp = (e: React.PointerEvent<HTMLCanvasElement>) => {
    e.currentTarget.releasePointerCapture(e.pointerId);
    if (mode === "lasso") {
      if (lDrag.current) {
        lDrag.current = false; lDragPt.current = null;
        if (cap) {
          const ctx = canvasRef.current?.getContext("2d");
          if (ctx) {
            const tmp = document.createElement("canvas");
            tmp.width = cap.imgData.width; tmp.height = cap.imgData.height;
            tmp.getContext("2d")?.putImageData(cap.imgData, 0, 0);
            ctx.drawImage(tmp, cap.x, cap.y); saveSnap();
          }
        }
        return;
      }
      if (lRect && lRect.w > 10 && lRect.h > 10) {
        const ctx = canvasRef.current?.getContext("2d");
        if (ctx) {
          const { x, y, w, h } = lRect;
          const img = ctx.getImageData(x, y, w, h);
          ctx.clearRect(x, y, w, h);
          setCap({ imgData: img, x, y });
        }
      } else setLRect(null);
      lStart.current = null; return;
    }
    if (mode === "draw") {
      setDrawing(false); setEPos(null);
      const ctx = canvasRef.current?.getContext("2d");
      if (ctx) { ctx.globalAlpha = 1; ctx.globalCompositeOperation = "source-over"; }
      saveSnap();
    }
  };

  /* ── Derived ── */
  const paperColor = PAGE_COLORS.find(c => c.id === (note?.color_style || "white"))?.hex || "#FFFFFF";
  const pattern = getPattern(note?.paper_style);
  const cvCursor = mode === "lasso" ? "crosshair" : mode === "text" ? "default" : tool === "eraser" ? "none" : "crosshair";

  const fmtBtn = (active: boolean): React.CSSProperties => ({
    width: 28, height: 28, borderRadius: 6, display: "flex", alignItems: "center", justifyContent: "center",
    background: active ? "var(--color-primary,#6366F1)" : "transparent",
    color: active ? "#fff" : "var(--color-text-secondary)",
    border: "none", cursor: "pointer", transition: "all .15s",
  });

  /* ── Loading / not found ── */
  if (notesLoading) return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "100%", background: "var(--color-background)" }}>
      <div style={{ width: 28, height: 28, borderRadius: "50%", border: "2px solid var(--color-surface)", borderTopColor: "var(--color-primary,#6366F1)", animation: "gnSpin 1s linear infinite" }} />
    </div>
  );
  if (!note) return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", height: "100%", background: "var(--color-background)", gap: 12 }}>
      <p style={{ color: "var(--color-text-secondary)", fontSize: 14 }}>Note not found</p>
      <button onClick={() => navigate("/home")} style={{ padding: "8px 18px", background: "var(--color-surface)", color: "var(--color-text-primary)", borderRadius: 10, border: "1px solid var(--color-surface)", cursor: "pointer", fontSize: 12 }}>← Back</button>
    </div>
  );

  /* ════════════════════════════════════════════════
     RENDER
  ════════════════════════════════════════════════ */
  return (
    <div className="gn-shell" data-editor-shell style={{ height: "100%", display: "flex", flexDirection: "column", overflow: "hidden", background: "var(--color-background)" }}>
      <style>{`
        @keyframes gnSpin  { to { transform:rotate(360deg); } }
        @keyframes gnPop   { from{transform:translateX(-50%) scale(.92);opacity:0} to{transform:translateX(-50%) scale(1);opacity:1} }
        @keyframes dtPop   { from{transform:scale(.92);opacity:0} to{transform:scale(1);opacity:1} }

        /* ── Theme-aware bar variables ── */
        .gn-shell {
          --gn-bar-bg:     rgba(255,255,255,0.92);
          --gn-bar-border: rgba(0,0,0,.1);
          --gn-size-active:rgba(99,102,241,.12);
          --gn-outer:      #D1D5DB;
          --gn-border:     rgba(0,0,0,.08);
        }
        html[data-theme="dark"] .gn-shell, html[data-theme="obsidian"] .gn-shell {
          --gn-bar-bg:      rgba(28,28,30,0.97);
          --gn-bar-border:  rgba(255,255,255,.13);
          --gn-size-active: rgba(255,255,255,.12);
          --gn-outer:       #0C0C0E;
          --gn-border:      rgba(255,255,255,.12);
        }

        /* ── Tabs ── */
        .gn-tab-x { opacity:0!important; transition:opacity .15s; }
        .gn-tab:hover .gn-tab-x { opacity:1!important; }

        /* ── Toolbar ── */
        .gn-toolbar { border-bottom:1px solid var(--color-surface,#f1f5f9); }
        .gn-toolbar button:hover { opacity:.75; }
        .gn-feat-bar { border-bottom:1px solid var(--color-surface,#f1f5f9); }

        /* ── Editor ── */
        [data-gn-editor]:empty::before { content:attr(data-ph);color:rgba(100,116,139,.45);pointer-events:none; }
        [data-gn-editor] h1{font-size:1.75em;font-weight:700;margin:.3em 0;}
        [data-gn-editor] h2{font-size:1.35em;font-weight:700;margin:.3em 0;}
        [data-gn-editor] h3{font-size:1.15em;font-weight:700;margin:.3em 0;}
        [data-gn-editor] ul{list-style:disc;padding-left:24px;margin:4px 0;}
        [data-gn-editor] ol{list-style:decimal;padding-left:24px;margin:4px 0;}
        [data-gn-editor] a{color:var(--color-primary,#6366F1);text-decoration:underline;}
      `}</style>

      {/* ══ Compact Tabs ══ */}
      <div style={{
        display: "flex", alignItems: "center", padding: "2px 8px 0",
        background: "var(--color-surface)", borderBottom: "1px solid var(--gn-border)",
        overflowX: "auto", flexShrink: 0, minHeight: 30
      }}>
        {openTabs.map(tid => {
          const tn = notes.find(n => n.id === tid);
          const act = id === tid;
          return (
            <div key={tid} className="gn-tab" onClick={() => navigate(`/home/editor/${tid}`)} style={{
              display: "flex", alignItems: "center", gap: 4, maxWidth: 140, minWidth: 68,
              padding: "4px 8px 5px", cursor: "pointer", flexShrink: 0,
              borderBottom: act ? "2px solid var(--color-primary,#6366F1)" : "2px solid transparent",
              borderRadius: "4px 4px 0 0",
            }}>
              <FileText size={10} style={{ color: act ? "var(--color-primary,#6366F1)" : "var(--color-text-secondary)", flexShrink: 0 }} />
              <span style={{
                fontSize: 10, fontWeight: 600, flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
                color: act ? "var(--color-text-primary)" : "var(--color-text-secondary)"
              }}>
                {tn?.title || "Untitled"}
              </span>
              <button className="gn-tab-x" onClick={e => closeTab(e, tid)} style={{
                background: "none", border: "none", cursor: "pointer", padding: 2,
                color: "var(--color-text-secondary)", display: "flex", alignItems: "center"
              }}>
                <X size={9} />
              </button>
            </div>
          );
        })}
        <button onClick={newTab} style={{
          padding: "4px 6px", background: "none", border: "none", cursor: "pointer",
          color: "var(--color-text-secondary)", display: "flex", alignItems: "center", marginLeft: 2
        }}>
          <Plus size={12} />
        </button>
      </div>

      {/* ══ Top Toolbar ══ */}
      <div className="gn-toolbar" style={{
        display: "flex", alignItems: "center", padding: "5px 10px", gap: 4,
        background: "var(--color-surface)", flexShrink: 0
      }}>
        {/* Back */}
        <button onClick={() => navigate("/home")} style={{
          padding: "5px 7px", background: "none", border: "none",
          cursor: "pointer", color: "var(--color-text-secondary)", borderRadius: 8, display: "flex"
        }}>
          <ArrowLeft size={16} />
        </button>

        {/* Title */}
        <div style={{ display: "flex", alignItems: "center", gap: 2, flex: 1, minWidth: 0 }}>
          <input type="text" value={title}
            onChange={e => { setTitle(e.target.value); dirty.current = true; }}
            style={{
              background: "transparent", border: "none", outline: "none",
              color: "var(--color-text-primary)", fontWeight: 700, fontSize: 13, minWidth: 0, flex: 1
            }}
            placeholder="Untitled" />
          <ChevronDown size={10} style={{ color: "var(--color-text-secondary)", opacity: .4, flexShrink: 0 }} />
        </div>

        {/* Undo / Redo */}
        <button onClick={() => document.execCommand("undo")} style={{ padding: "5px 7px", background: "none", border: "none", cursor: "pointer", color: "var(--color-text-secondary)", borderRadius: 8, display: "flex" }}>
          <Undo size={14} />
        </button>
        <button onClick={() => document.execCommand("redo")} style={{ padding: "5px 7px", background: "none", border: "none", cursor: "pointer", color: "var(--color-text-secondary)", borderRadius: 8, display: "flex" }}>
          <Redo size={14} />
        </button>

        <div style={{ width: 1, height: 16, background: "var(--gn-border)", margin: "0 2px" }} />

        {/* Pattern */}
        <div style={{ display: "flex", gap: 1, background: "var(--color-background)", borderRadius: 7, padding: "2px 3px" }}>
          {["plain", "lined", "grid", "dotted"].map(p => (
            <button key={p} onClick={() => updateNote(note.id, { paper_style: p })} style={{
              padding: "3px 7px", borderRadius: 5, border: "none", cursor: "pointer",
              background: (note.paper_style || "plain") === p ? "var(--color-surface)" : "transparent",
              color: (note.paper_style || "plain") === p ? "var(--color-primary,#6366F1)" : "var(--color-text-secondary)",
              fontSize: 9, fontWeight: 700, textTransform: "uppercase", letterSpacing: ".04em",
            }}>{p.slice(0, 2)}</button>
          ))}
        </div>

        <div style={{ width: 1, height: 16, background: "var(--gn-border)", margin: "0 2px" }} />

        {/* Page colors */}
        <div style={{ display: "flex", gap: 3, alignItems: "center" }}>
          {PAGE_COLORS.map(c => (
            <button key={c.id} onClick={() => updateNote(note.id, { color_style: c.id })} style={{
              width: 13, height: 13, borderRadius: "50%", background: c.hex, padding: 0,
              border: (note.color_style || "white") === c.id
                ? "2px solid var(--color-primary,#6366F1)"
                : "1.5px solid rgba(0,0,0,.18)",
              cursor: "pointer", transition: "transform .1s",
            }} />
          ))}
        </div>

        <div style={{ width: 1, height: 16, background: "var(--gn-border)", margin: "0 2px" }} />

        {/* Favorite */}
        <button onClick={() => setIsFavorite(v => !v)} style={{
          padding: "5px 7px", background: "none", border: "none", cursor: "pointer",
          color: isFavorite ? "#F59E0B" : "var(--color-text-secondary)", borderRadius: 8, display: "flex"
        }}>
          <Star size={14} fill={isFavorite ? "currentColor" : "none"} />
        </button>

        {/* Share */}
        <button onClick={() => navigator.clipboard.writeText(window.location.href).then(() => toast.success("Copied!")).catch(() => { })}
          style={{ padding: "5px 7px", background: "none", border: "none", cursor: "pointer", color: "var(--color-text-secondary)", borderRadius: 8, display: "flex" }}>
          <Share2 size={14} />
        </button>

        {/* More ··· */}
        <div style={{ position: "relative" }}>
          <button onClick={e => {
            const r = (e.currentTarget as HTMLElement).getBoundingClientRect();
            setMorePos({ top: r.bottom + 4, left: Math.max(8, r.right - 192) });
            setShowMore(v => !v);
          }} style={{ padding: "5px 7px", background: "none", border: "none", cursor: "pointer", color: "var(--color-text-secondary)", borderRadius: 8, display: "flex" }}>
            <MoreHorizontal size={15} />
          </button>
          {showMore && (
            <>
              <div style={{ position: "fixed", inset: 0, zIndex: 9990 }} onClick={() => setShowMore(false)} />
              <div style={{
                position: "fixed", top: morePos.top, left: morePos.left, zIndex: 9999,
                background: "var(--color-surface)", borderRadius: 12, padding: "4px 0", width: 192,
                border: "1px solid var(--gn-border)",
                boxShadow: "0 12px 40px rgba(0,0,0,.18)", animation: "dtPop .15s ease both"
              }}>
                {[
                  {
                    label: "📄 Download .txt", fn: () => {
                      const b = new Blob([editorRef.current?.innerText || ""], { type: "text/plain" });
                      const a = document.createElement("a"); a.href = URL.createObjectURL(b); a.download = `${title || "note"}.txt`; a.click();
                      setShowMore(false);
                    }
                  },
                  { label: "🖨️ Print", fn: () => { window.print(); setShowMore(false); } },
                  { label: "✨ Summarize", fn: () => { setShowMore(false); handleSummarize(); } },
                ].map((item, i) => (
                  <button key={i} onClick={item.fn} style={{
                    width: "100%", textAlign: "left", padding: "9px 14px", fontSize: 12, fontWeight: 500,
                    background: "none", border: "none", cursor: "pointer",
                    color: "var(--color-text-primary)",
                  }}
                    onMouseEnter={e => (e.currentTarget.style.background = "var(--color-background)")}
                    onMouseLeave={e => (e.currentTarget.style.background = "none")}
                  >{item.label}</button>
                ))}
                <div style={{ height: 1, background: "var(--gn-border)", margin: "3px 12px" }} />
                <button onClick={() => {
                  const cv = canvasRef.current, ctx = cv?.getContext("2d");
                  if (cv && ctx) ctx.clearRect(0, 0, cv.width, cv.height);
                  if (note?.id) localStorage.removeItem(DRAW_KEY(note.id));
                  setSnap(null);
                  if (editorRef.current) editorRef.current.innerHTML = "";
                  setContent(""); setTitle("");
                  updateNote(note.id, { title: "", content: "" });
                  setShowMore(false);
                }} style={{
                  width: "100%", textAlign: "left", padding: "9px 14px", fontSize: 12, fontWeight: 500,
                  background: "none", border: "none", cursor: "pointer", color: "#EF4444"
                }}
                  onMouseEnter={e => (e.currentTarget.style.background = "rgba(239,68,68,.08)")}
                  onMouseLeave={e => (e.currentTarget.style.background = "none")}
                >🗑️ Clear note</button>
              </div>
            </>
          )}
        </div>
      </div>

      {/* ══ Feature Bar (Tags / Course / Reminder / AI + Text Fmt) ══ */}
      <div className="gn-feat-bar" style={{
        display: "flex", alignItems: "center", padding: "3px 10px", gap: 3,
        background: "var(--color-surface)", flexShrink: 0, overflowX: "auto", flexWrap: "wrap", minHeight: 36
      }}>

        {/* ── Tag ── */}
        <div style={{ position: "relative" }}>
          <button onClick={e => {
            const r = (e.currentTarget as HTMLElement).getBoundingClientRect();
            setTagMenuPos({ top: r.bottom + 4, left: Math.max(8, r.right - 318) });
            setShowTagMenu(v => !v); setShowCourseMenu(false); setShowReminderMenu(false);
          }} style={{
            display: "flex", alignItems: "center", gap: 4, padding: "4px 9px", borderRadius: 20, border: "none", cursor: "pointer",
            background: "var(--color-primary,#6366F1)18", color: "var(--color-primary,#6366F1)", fontSize: 11, fontWeight: 700
          }}>
            <Tag size={12} /> Tags
            {selectedTagNames.length > 0 && (
              <span style={{
                background: "var(--color-primary,#6366F1)", color: "#fff", borderRadius: 10,
                padding: "1px 5px", fontSize: 9, fontWeight: 700, marginLeft: 1
              }}>{selectedTagNames.length}</span>
            )}
          </button>
          {showTagMenu && (
            <>
              <div style={{ position: "fixed", inset: 0, zIndex: 9990 }} onClick={() => setShowTagMenu(false)} />
              <div style={{
                position: "fixed", top: tagMenuPos.top, left: tagMenuPos.left, zIndex: 9999,
                background: "var(--color-surface)", border: "1px solid var(--gn-border)",
                boxShadow: "0 18px 44px rgba(0,0,0,.15)", borderRadius: 14, padding: 14, width: 318,
                animation: "dtPop .15s ease both"
              }}>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 8 }}>
                  <span style={{ fontSize: 10, color: "var(--color-text-secondary)", textTransform: "uppercase", letterSpacing: ".07em", fontWeight: 700 }}>Tags</span>
                  {isTagBusy && <span style={{ fontSize: 10, color: "var(--color-text-secondary)", fontWeight: 600 }}>Saving…</span>}
                </div>
                <div style={{ display: "flex", flexWrap: "wrap", gap: 6, maxHeight: 160, overflowY: "auto" }}>
                  {availableTags.map(tag => {
                    const sel = selectedTagNames.some(n => n.toLowerCase() === normalizeTagName(tag.name).toLowerCase());
                    const s = getTagStyle(tag.name, sel);
                    return (
                      <button key={tag.id} onClick={() => void toggleTag(tag.name)} disabled={isTagBusy}
                        style={{
                          fontSize: 11, padding: "5px 12px", borderRadius: 20, border: `1px solid ${s.border}`,
                          background: s.bg, color: s.text, fontWeight: 700, cursor: "pointer",
                          transform: sel ? "translateY(-1px)" : "none", transition: "all .15s"
                        }}>
                        {tag.name}
                      </button>
                    );
                  })}
                </div>
                <div style={{ height: 1, background: "var(--gn-border)", margin: "10px 0" }} />
                <form onSubmit={createTag} style={{ display: "flex", gap: 6 }}>
                  <input type="text" value={customTagInput} onChange={e => setCustomTagInput(e.target.value)}
                    placeholder="Add tag…"
                    style={{
                      flex: 1, background: "var(--color-background)", border: "1px solid var(--gn-border)",
                      borderRadius: 8, padding: "6px 10px", fontSize: 12, outline: "none",
                      color: "var(--color-text-primary)"
                    }} />
                  <button type="submit" disabled={isTagBusy || !normalizeTagName(customTagInput)}
                    style={{
                      background: "var(--color-background)", border: "1px solid var(--gn-border)",
                      borderRadius: 8, padding: "6px 12px", fontSize: 12, fontWeight: 700, cursor: "pointer",
                      color: "var(--color-text-primary)", opacity: isTagBusy || !normalizeTagName(customTagInput) ? .0.5: 1
                    }}>
                    Add
                  </button>
                </form>
              </div>
            </>
          )}
        </div>

        {/* ── Course ── */}
        <div style={{ position: "relative" }}>
          <button onClick={e => {
            const r = (e.currentTarget as HTMLElement).getBoundingClientRect();
            setCourseMenuPos({ top: r.bottom + 4, left: Math.max(8, r.right - 250) });
            void loadCourses();
            setShowCourseMenu(v => !v); setShowTagMenu(false); setShowReminderMenu(false);
          }} style={{
            display: "flex", alignItems: "center", gap: 4, padding: "4px 9px", borderRadius: 20, border: "none", cursor: "pointer",
            background: "#2563EB18", color: "#2563EB", fontSize: 11, fontWeight: 700
          }}>
            <GraduationCap size={12} /> Course
          </button>
          {showCourseMenu && (
            <>
              <div style={{ position: "fixed", inset: 0, zIndex: 9990 }} onClick={() => setShowCourseMenu(false)} />
              <div style={{
                position: "fixed", top: courseMenuPos.top, left: courseMenuPos.left, zIndex: 9999,
                background: "var(--color-surface)", border: "1px solid var(--gn-border)",
                boxShadow: "0 12px 40px rgba(0,0,0,.18)", borderRadius: 12, padding: 12, width: 250,
                animation: "dtPop .15s ease both"
              }}>
                <span style={{ fontSize: 10, color: "var(--color-text-secondary)", textTransform: "uppercase", letterSpacing: ".07em", fontWeight: 700, display: "block", marginBottom: 8 }}>Courses</span>
                {availableCourses.length === 0
                  ? <p style={{ fontSize: 12, color: "var(--color-text-secondary)", lineHeight: 1.5 }}>No courses yet. Add one on your Personal page.</p>
                  : <div style={{ display: "flex", flexDirection: "column", gap: 4, maxHeight: 200, overflowY: "auto" }}>
                    <button onClick={() => selectCourse(null)} style={{
                      textAlign: "left", borderRadius: 8, padding: "7px 10px", fontSize: 12, border: `1px solid var(--gn-border)`,
                      background: selectedCourseId === null ? "#2563EB18" : "transparent",
                      color: selectedCourseId === null ? "#2563EB" : "var(--color-text-secondary)", fontWeight: 600, cursor: "pointer"
                    }}>
                      No course
                    </button>
                    {availableCourses.map(c => (
                      <button key={c.id} onClick={() => selectCourse(c.id)} style={{
                        textAlign: "left", borderRadius: 8, padding: "7px 10px", fontSize: 12, border: `1px solid var(--gn-border)`,
                        background: selectedCourseId === c.id ? "#2563EB18" : "transparent",
                        color: selectedCourseId === c.id ? "#2563EB" : "var(--color-text-primary)", cursor: "pointer"
                      }}>
                        <div style={{ fontWeight: 600 }}>{c.title}</div>
                        {(c.code || c.subtitle) && <div style={{ fontSize: 10, color: "var(--color-text-secondary)", marginTop: 1 }}>{c.code}{c.code && c.subtitle ? " • " : ""}{c.subtitle}</div>}
                      </button>
                    ))}
                  </div>
                }
              </div>
            </>
          )}
        </div>

        {/* ── Reminder ── */}
        <div style={{ position: "relative" }}>
          <button onClick={e => {
            const r = (e.currentTarget as HTMLElement).getBoundingClientRect();
            setReminderMenuPos({ top: r.bottom + 4, left: Math.max(8, r.right - 260) });
            setShowReminderMenu(v => !v); setShowTagMenu(false); setShowCourseMenu(false);
          }} style={{
            display: "flex", alignItems: "center", gap: 4, padding: "4px 9px", borderRadius: 20, border: "none", cursor: "pointer",
            background: "#F9731618", color: "#F97316", fontSize: 11, fontWeight: 700
          }}>
            <Bell size={12} /> Remind
          </button>
          {showReminderMenu && (
            <>
              <div style={{ position: "fixed", inset: 0, zIndex: 9990 }} onClick={() => setShowReminderMenu(false)} />
              <div style={{
                position: "fixed", top: reminderMenuPos.top, left: reminderMenuPos.left, zIndex: 9999,
                background: "var(--color-surface)", border: "1px solid var(--gn-border)",
                boxShadow: "0 12px 40px rgba(0,0,0,.18)", borderRadius: 12, padding: 16, width: 260,
                animation: "dtPop .15s ease both"
              }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10 }}>
                  <Clock size={14} style={{ color: "#F97316" }} />
                  <span style={{ fontSize: 13, fontWeight: 700, color: "var(--color-text-primary)" }}>Set Reminder</span>
                </div>
                <input type="text" value={remTitle} onChange={e => setRemTitle(e.target.value)} placeholder="Reminder title…"
                  style={{
                    width: "100%", border: "1px solid var(--gn-border)", borderRadius: 8, padding: "7px 10px", fontSize: 12,
                    marginBottom: 8, outline: "none", background: "var(--color-background)", color: "var(--color-text-primary)", boxSizing: "border-box"
                  }} />
                <input type="date" value={remDate} onChange={e => setRemDate(e.target.value)}
                  style={{
                    width: "100%", border: "1px solid var(--gn-border)", borderRadius: 8, padding: "7px 10px", fontSize: 12,
                    marginBottom: 8, outline: "none", background: "var(--color-background)", color: "var(--color-text-primary)", boxSizing: "border-box"
                  }} />
                <input type="time" value={remTime} onChange={e => setRemTime(e.target.value)}
                  style={{
                    width: "100%", border: "1px solid var(--gn-border)", borderRadius: 8, padding: "7px 10px", fontSize: 12,
                    marginBottom: 12, outline: "none", background: "var(--color-background)", color: "var(--color-text-primary)", boxSizing: "border-box"
                  }} />
                <div style={{ display: "flex", gap: 8 }}>
                  <button onClick={() => setShowReminderMenu(false)} style={{
                    flex: 1, padding: "7px 0", borderRadius: 8,
                    border: "1px solid var(--gn-border)", fontSize: 12, fontWeight: 600, cursor: "pointer",
                    background: "transparent", color: "var(--color-text-secondary)"
                  }}>Cancel</button>
                  <button onClick={handleAddReminder} style={{
                    flex: 1, padding: "7px 0", borderRadius: 8,
                    border: "none", fontSize: 12, fontWeight: 600, cursor: "pointer",
                    background: "#F97316", color: "#fff"
                  }}>Set</button>
                </div>
              </div>
            </>
          )}
        </div>

        {/* ── AI Summarize ── */}
        <button onClick={handleSummarize} style={{
          display: "flex", alignItems: "center", gap: 4, padding: "4px 9px", borderRadius: 20,
          border: "none", cursor: "pointer", background: "var(--color-primary,#6366F1)18",
          color: "var(--color-primary,#6366F1)", fontSize: 11, fontWeight: 700
        }}>
          <Sparkles size={12} /> Summarize
        </button>

        {/* ── Divider (when text mode) ── */}
        {mode === "text" && <div style={{ width: 1, height: 20, background: "var(--gn-border)", margin: "0 4px" }} />}

        {/* ── Text formatting (only in text mode) ── */}
        {mode === "text" && (<>
          <button onMouseDown={e => { e.preventDefault(); execFmt("bold"); }} style={fmtBtn(fmtBold)}><Bold size={13} /></button>
          <button onMouseDown={e => { e.preventDefault(); execFmt("italic"); }} style={fmtBtn(fmtItal)}><Italic size={13} /></button>
          <button onMouseDown={e => { e.preventDefault(); execFmt("underline"); }} style={fmtBtn(fmtUnder)}><Underline size={13} /></button>
          <button onMouseDown={e => { e.preventDefault(); execFmt("strikeThrough"); }} style={fmtBtn(fmtStr)}><Strikethrough size={13} /></button>

          {/* Text color */}
          <div style={{ position: "relative" }}>
            <button onMouseDown={e => {
              e.preventDefault();
              const r = (e.currentTarget as HTMLElement).getBoundingClientRect();
              setTxtColorPos({ top: r.bottom + 6, left: r.left + r.width / 2 - 110 });
              setShowHlColorMenu(false); setShowTxtColorMenu(v => !v);
            }} style={{ ...fmtBtn(false), flexDirection: "column", gap: 1 }}>
              <span style={{ fontSize: 11, fontWeight: 700, color: "var(--color-text-primary)", lineHeight: 1 }}>A</span>
              <div style={{ width: 12, height: 2, borderRadius: 2, background: txtColor }} />
            </button>
            {showTxtColorMenu && (
              <>
                <div style={{ position: "fixed", inset: 0, zIndex: 9990 }} onMouseDown={() => setShowTxtColorMenu(false)} />
                <div style={{
                  position: "fixed", top: txtColorPos.top, left: txtColorPos.left, zIndex: 9999,
                  background: "var(--color-surface)", borderRadius: 12, padding: 12, width: 220,
                  boxShadow: "0 16px 48px rgba(0,0,0,.2)", border: "1px solid var(--gn-border)",
                  animation: "dtPop .15s ease both"
                }}>
                  <div style={{ display: "grid", gridTemplateColumns: "repeat(10,1fr)", gap: 4 }}>
                    {DRAW_PALETTE.slice(0, 20).map(c => (
                      <button key={c} onMouseDown={e => {
                        e.preventDefault();
                        setTxtColor(c); setShowTxtColorMenu(false);
                        editorRef.current?.focus();
                        document.execCommand("styleWithCSS", false, "true");
                        document.execCommand("foreColor", false, c);
                        setContent(editorRef.current?.innerHTML || ""); dirty.current = true;
                      }} style={{
                        width: 18, height: 18, borderRadius: "50%", background: c, cursor: "pointer",
                        border: txtColor === c ? "2.5px solid var(--color-primary,#6366F1)" : "1px solid rgba(0,0,0,.12)"
                      }} />
                    ))}
                  </div>
                </div>
              </>
            )}
          </div>

          {/* Highlight */}
          <div style={{ position: "relative" }}>
            <button onMouseDown={e => {
              e.preventDefault();
              const r = (e.currentTarget as HTMLElement).getBoundingClientRect();
              setHlColorPos({ top: r.bottom + 6, left: r.left + r.width / 2 - 110 });
              setShowTxtColorMenu(false); setShowHlColorMenu(v => !v);
            }} style={{ ...fmtBtn(false), gap: 2 }}>
              <Highlighter size={12} />
              <div style={{ width: 6, height: 6, borderRadius: "50%", background: hlColor || "#D1D5DB" }} />
            </button>
            {showHlColorMenu && (
              <>
                <div style={{ position: "fixed", inset: 0, zIndex: 9990 }} onMouseDown={() => setShowHlColorMenu(false)} />
                <div style={{
                  position: "fixed", top: hlColorPos.top, left: hlColorPos.left, zIndex: 9999,
                  background: "var(--color-surface)", borderRadius: 12, padding: 12, width: 220,
                  boxShadow: "0 16px 48px rgba(0,0,0,.2)", border: "1px solid var(--gn-border)",
                  animation: "dtPop .15s ease both"
                }}>
                  <button onMouseDown={e => {
                    e.preventDefault(); setHlColor(null); setShowHlColorMenu(false);
                    editorRef.current?.focus();
                    document.execCommand("styleWithCSS", false, "true");
                    document.execCommand("hiliteColor", false, "transparent");
                    setContent(editorRef.current?.innerHTML || ""); dirty.current = true;
                  }} style={{
                    width: "100%", border: "none", background: "var(--color-background)",
                    color: "var(--color-text-primary)", borderRadius: 8, height: 30,
                    display: "flex", alignItems: "center", gap: 6, padding: "0 10px",
                    cursor: "pointer", fontSize: 11, fontWeight: 700, marginBottom: 8
                  }}>
                    <Eraser size={11} /> None
                  </button>
                  <div style={{ display: "grid", gridTemplateColumns: "repeat(10,1fr)", gap: 4 }}>
                    {DRAW_PALETTE.slice(0, 20).map(c => (
                      <button key={c} onMouseDown={e => {
                        e.preventDefault();
                        setHlColor(c); setShowHlColorMenu(false);
                        editorRef.current?.focus();
                        document.execCommand("styleWithCSS", false, "true");
                        document.execCommand("hiliteColor", false, c);
                        setContent(editorRef.current?.innerHTML || ""); dirty.current = true;
                      }} style={{
                        width: 18, height: 18, borderRadius: "50%", background: c, cursor: "pointer",
                        border: hlColor === c ? "2.5px solid var(--color-primary,#6366F1)" : "1px solid rgba(0,0,0,.12)"
                      }} />
                    ))}
                  </div>
                </div>
              </>
            )}
          </div>

          <div style={{ width: 1, height: 20, background: "var(--gn-border)", margin: "0 2px" }} />
          <button onMouseDown={e => { e.preventDefault(); execFmt("insertUnorderedList"); }} style={fmtBtn(false)}><List size={13} /></button>
          <button onMouseDown={e => { e.preventDefault(); execFmt("insertOrderedList"); }} style={fmtBtn(false)}><ListOrdered size={13} /></button>
        </>)}
      </div>

      {/* ══ Canvas / Paper Area ══ */}
      <div style={{
        flex: 1, overflowY: "auto", overflowX: "hidden",
        background: "var(--gn-outer)",
        display: "flex", flexDirection: "column", alignItems: "center",
        padding: "24px 20px 110px",
      }}>
        <div style={{
          width: "min(820px,100%)", height: 5,
          background: "linear-gradient(to bottom,rgba(0,0,0,.15),transparent)",
          borderRadius: "3px 3px 0 0", flexShrink: 0
        }} />

        {/* The Paper */}
        <div ref={paperRef} style={{
          position: "relative", width: "min(794px,100%)", minHeight: 1123,
          background: paperColor,
          boxShadow: "0 0 0 1px rgba(0,0,0,.12),0 4px 40px rgba(0,0,0,.35)",
          overflow: "hidden", ...pattern,
        }}>
          {/* Text layer */}
          <div ref={editorRef} data-gn-editor
            contentEditable={mode === "text"}
            suppressContentEditableWarning
            data-ph="Switch to text mode  T  to type…"
            onInput={() => {
              if (!editorRef.current) return;
              setContent(editorRef.current.innerHTML);
              dirty.current = true;
            }}
            onKeyUp={updateFmt} onMouseUp={updateFmt}
            style={{
              position: "absolute", inset: 0, minHeight: "100%",
              padding: "60px 68px", lineHeight: `${LINE_H}px`, fontSize: 15,
              fontFamily: userSettings?.font_family || "system-ui,-apple-system,sans-serif",
              color: "#1e293b", outline: "none", zIndex: 10,
              pointerEvents: mode === "text" ? "auto" : "none",
              whiteSpace: "pre-wrap", wordBreak: "break-word",
              cursor: mode === "text" ? "text" : "default",
            }}
          />

          {/* Draw canvas */}
          <canvas ref={canvasRef} style={{
            position: "absolute", inset: 0, width: "100%", height: "100%", zIndex: 20,
            pointerEvents: mode === "draw" || mode === "lasso" ? "auto" : "none",
            cursor: cvCursor, touchAction: "none",
          }}
            onPointerDown={onPtrDown}
            onPointerMove={onPtrMove}
            onPointerUp={onPtrUp}
            onPointerLeave={() => setEPos(null)}
            onPointerCancel={onPtrUp}
          />

          {/* Eraser cursor */}
          {mode === "draw" && tool === "eraser" && ePos && (
            <div style={{
              position: "absolute", left: ePos.x, top: ePos.y,
              width: STROKE_WIDTHS.eraser[sz], height: STROKE_WIDTHS.eraser[sz],
              borderRadius: "50%", border: "1.5px solid rgba(0,0,0,.45)",
              background: "rgba(255,255,255,.5)", transform: "translate(-50%,-50%)",
              pointerEvents: "none", zIndex: 30,
            }} />
          )}

          {/* Lasso rect */}
          {lRect && lRect.w > 2 && lRect.h > 2 && (
            <div style={{
              position: "absolute", left: lRect.x, top: lRect.y, width: lRect.w, height: lRect.h,
              border: "1.5px dashed var(--color-primary,#6366F1)",
              background: "var(--color-primary,#6366F1)0a",
              pointerEvents: "none", zIndex: 25, boxSizing: "border-box",
            }} />
          )}

          {/* Lasso capture */}
          {cap && (
            <canvas ref={el => {
              if (!el) return;
              el.width = cap.imgData.width; el.height = cap.imgData.height;
              el.getContext("2d")?.putImageData(cap.imgData, 0, 0);
              el.style.left = cap.x + "px"; el.style.top = cap.y + "px";
              el.style.width = cap.imgData.width + "px"; el.style.height = cap.imgData.height + "px";
            }} style={{ position: "absolute", zIndex: 26, border: "1.5px dashed var(--color-primary,#6366F1)", pointerEvents: "none", boxSizing: "border-box" }} />
          )}
        </div>

        <div style={{
          width: "min(820px,100%)", height: 6,
          background: "linear-gradient(to top,rgba(0,0,0,.12),transparent)",
          borderRadius: "0 0 3px 3px", flexShrink: 0
        }} />
        <p style={{ marginTop: 12, fontSize: 10, color: "rgba(128,128,128,.45)", fontWeight: 600, letterSpacing: ".06em" }}>PAGE 1</p>
      </div>

      {/* ══ AI Float Button ══ */}
      {aiFloatPos && !showAiChat && (
        <div style={{
          position: "fixed", top: Math.max(10, aiFloatPos.top), left: Math.max(10, aiFloatPos.left),
          transform: "translateX(-50%)", zIndex: 9999
        }}>
          <button onMouseDown={e => { e.preventDefault(); setShowAiChat(true); setAiFloatPos(null); }}
            style={{
              display: "flex", alignItems: "center", gap: 6, padding: "6px 14px",
              background: "#111827", color: "#fff", borderRadius: 20, fontSize: 12, fontWeight: 600,
              border: "none", cursor: "pointer", boxShadow: "0 4px 16px rgba(0,0,0,.3)"
            }}>
            <Sparkles size={12} style={{ color: "#FCD34D" }} /> Ask AI
          </button>
        </div>
      )}

      {/* ══ AI Chat Modal ══ */}
      {showAiChat && (
        <div style={{
          position: "fixed", bottom: 24, right: 24, width: 340, height: 460, zIndex: 9999,
          display: "flex", flexDirection: "column",
          background: "var(--color-surface)",
          borderRadius: 16, boxShadow: "0 12px 40px rgba(0,0,0,.25)",
          border: "1px solid var(--gn-border)", overflow: "hidden"
        }}>
          <div style={{
            background: "var(--color-primary,#6366F1)", color: "#fff", padding: "12px 16px",
            display: "flex", alignItems: "center", justifyContent: "space-between", flexShrink: 0
          }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <Sparkles size={14} /><span style={{ fontSize: 13, fontWeight: 700 }}>Luminote AI</span>
            </div>
            <button onClick={() => setShowAiChat(false)} style={{
              background: "none", border: "none",
              cursor: "pointer", color: "rgba(255,255,255,.75)", display: "flex"
            }}>
              <PenTool size={15} />
            </button>
          </div>
          <div style={{
            flex: 1, overflowY: "auto", padding: 14, display: "flex", flexDirection: "column", gap: 10,
            background: "var(--color-background)", fontSize: 13
          }}>
            {aiHistory.length === 0 && (
              <div style={{ textAlign: "center", color: "var(--color-text-secondary)", marginTop: 16 }}>
                {aiSelText ? "Ask about your selected text…" : "Ask me anything…"}
              </div>
            )}
            {aiHistory.map((m, i) => (
              <div key={i} style={{ display: "flex", justifyContent: m.role === "user" ? "flex-end" : "flex-start" }}>
                <div style={{
                  maxWidth: "85%", padding: "8px 12px", borderRadius: 12,
                  whiteSpace: "pre-wrap", fontSize: 12, lineHeight: 1.5,
                  background: m.role === "user" ? "var(--color-primary,#6366F1)" : "var(--color-surface)",
                  color: m.role === "user" ? "#fff" : "var(--color-text-primary)",
                  borderBottomRightRadius: m.role === "user" ? 2 : 12,
                  borderBottomLeftRadius: m.role === "user" ? 12 : 2,
                  boxShadow: "0 1px 4px rgba(0,0,0,.08)",
                }}>{m.content}</div>
              </div>
            ))}
            {isAiLoading && (
              <div style={{ display: "flex", gap: 4, paddingLeft: 4 }}>
                {[0, 150, 300].map(d => (
                  <div key={d} style={{
                    width: 6, height: 6, borderRadius: "50%",
                    background: "var(--color-text-secondary)",
                    animation: `gnSpin .8s ${d}ms ease-in-out infinite alternate`
                  }} />
                ))}
              </div>
            )}
          </div>
          <div style={{
            padding: "10px 12px", borderTop: "1px solid var(--gn-border)",
            display: "flex", gap: 8, flexShrink: 0, background: "var(--color-surface)"
          }}>
            <input type="text" value={aiInput} onChange={e => setAiInput(e.target.value)}
              onKeyDown={e => { if (e.key === "Enter") sendAi(); }}
              placeholder="Ask something…"
              style={{
                flex: 1, fontSize: 12, background: "var(--color-background)", borderRadius: 20,
                padding: "7px 14px", outline: "none", border: "1px solid var(--gn-border)",
                color: "var(--color-text-primary)"
              }} />
            <button onClick={sendAi} disabled={!aiInput.trim() || isAiLoading}
              style={{
                width: 34, height: 34, flexShrink: 0, borderRadius: "50%", border: "none", cursor: "pointer",
                background: "var(--color-primary,#6366F1)", color: "#fff", display: "flex",
                alignItems: "center", justifyContent: "center",
                opacity: !aiInput.trim() || isAiLoading ? .5 : 1
              }}>
              <ArrowLeft size={14} style={{ transform: "rotate(180deg)" }} />
            </button>
          </div>
        </div>
      )}

      {/* ══ Bottom Draw Bar ══ */}
      <DrawBar mode={mode} tool={tool} sz={sz} color={color}
        onMode={m => { if (m !== "lasso" && mode === "lasso") commitCap(); setMode(m); }}
        onTool={setTool} onSz={setSz} onColor={setColor} />
    </div>
  );
}