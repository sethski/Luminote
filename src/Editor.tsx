import React, { useState, useEffect, useRef, useCallback } from "react";
import { useParams, useNavigate } from "react-router";
import {
  ArrowLeft, Share2, MoreHorizontal,
  Undo, Redo, Bold, Italic, Underline, Strikethrough,
  Highlighter, List, ListOrdered, AlignLeft,
  AlignCenter, AlignRight,
  Tag, PenTool, Eraser, Plus, X, Sparkles,
  FileText, ChevronDown, Bell, Clock, Image as ImageIcon,
  Star, RotateCw, GraduationCap,
} from "lucide-react";
import { useNotes } from "./NotesContext";
import { useAuth } from "./AuthContext";
import { useToast } from "./toast";
import { supabase } from "./supabaseClient";

/* ═══════════════════════════════════════════════════
   CONSTANTS
   ═══════════════════════════════════════════════════ */
const COLORS = [
  { id: "white",  class: "bg-white",      border: "border-slate-200" },
  { id: "yellow", class: "bg-amber-50",   border: "border-amber-200" },
  { id: "blue",   class: "bg-blue-50",    border: "border-blue-200" },
  { id: "green",  class: "bg-emerald-50", border: "border-emerald-200" },
  { id: "pink",   class: "bg-rose-50",    border: "border-rose-200" },
];

const PATTERNS = [
  { id: "plain",     label: "Plain" },
  { id: "lined",     label: "Lined" },
  { id: "grid",      label: "Grid" },
  { id: "dotted",    label: "Dotted" },
  { id: "graph",     label: "Graph" },
  { id: "isometric", label: "Iso" },
];

const FONT_FAMILIES = [
  { value: "system-ui",      label: "System UI",        css: "system-ui, -apple-system, BlinkMacSystemFont, sans-serif" },
  { value: "inter",          label: "Inter",            css: "'Inter', sans-serif" },
  { value: "sf-pro",         label: "SF Pro",           css: "'SF Pro Display', 'SF Pro Text', system-ui, sans-serif" },
  { value: "helvetica-neue", label: "Helvetica Neue",   css: "'Helvetica Neue', Helvetica, Arial, sans-serif" },
  { value: "arial",          label: "Arial",            css: "Arial, Helvetica, sans-serif" },
  { value: "georgia",        label: "Georgia",          css: "Georgia, 'Times New Roman', serif" },
  { value: "times",          label: "Times New Roman",  css: "'Times New Roman', Times, serif" },
  { value: "courier-new",    label: "Courier New",      css: "'Courier New', Courier, monospace" },
  { value: "avenir",         label: "Avenir",           css: "'Avenir', 'Avenir Next', 'Nunito', sans-serif" },
  { value: "gill-sans",      label: "Gill Sans",        css: "'Gill Sans', 'Gill Sans MT', Calibri, sans-serif" },
  { value: "trebuchet",      label: "Trebuchet MS",     css: "'Trebuchet MS', 'Lucida Grande', sans-serif" },
  { value: "verdana",        label: "Verdana",          css: "Verdana, Geneva, sans-serif" },
  { value: "palatino",       label: "Palatino",         css: "'Palatino Linotype', Palatino, 'Book Antiqua', serif" },
  { value: "garamond",       label: "Garamond",         css: "Garamond, 'EB Garamond', serif" },
  { value: "outfit",         label: "Outfit",           css: "'Outfit', sans-serif" },
  { value: "dm-serif",       label: "DM Serif",         css: "'DM Serif Display', serif" },
  { value: "lora",           label: "Lora",             css: "'Lora', serif" },
  { value: "jetbrains-mono", label: "JetBrains Mono",   css: "'JetBrains Mono', monospace" },
  { value: "nunito",         label: "Nunito",           css: "'Nunito', sans-serif" },
  { value: "playfair",       label: "Playfair",         css: "'Playfair Display', serif" },
  { value: "roboto",         label: "Roboto",           css: "'Roboto', sans-serif" },
  { value: "open-sans",      label: "Open Sans",        css: "'Open Sans', sans-serif" },
  { value: "merriweather",   label: "Merriweather",     css: "'Merriweather', serif" },
  { value: "poppins",        label: "Poppins",          css: "'Poppins', sans-serif" },
  { value: "montserrat",     label: "Montserrat",       css: "'Montserrat', sans-serif" },
];

const HEADING_OPTIONS = [
  { value: "p",  label: "Normal Text",  tag: "¶",  size: 14 },
  { value: "h1", label: "Heading 1",    tag: "H₁", size: 20 },
  { value: "h2", label: "Heading 2",    tag: "H₂", size: 17 },
  { value: "h3", label: "Heading 3",    tag: "H₃", size: 15 },
  { value: "h4", label: "Heading 4",    tag: "H₄", size: 14 },
];

const FONT_SIZES = [10, 12, 13, 14, 15, 16, 18, 20, 24, 28, 32, 36, 48];

type PersonalCourse = {
  id: string;
  code?: string;
  title: string;
  subtitle?: string;
};

/* ─── Drawing palette colors (5x6 grid approx) ── */
const DRAW_PALETTE = [
  "#000000","#434343","#666666","#999999","#B7B7B7","#CCCCCC","#D9D9D9","#EFEFEF","#F3F3F3","#FFFFFF",
  "#980000","#FF0000","#FF9900","#FFFF00","#00FF00","#00FFFF","#4A86E8","#0000FF","#9900FF","#FF00FF",
  "#E6B8AF","#F4CCCC","#FCE5CD","#FFF2CC","#D9EAD3","#D0E0E3","#C9DAF8","#CFE2F3","#D9D2E9","#EAD1DC",
  "#DD7E6B","#EA9999","#F9CB9C","#FFE599","#B6D7A8","#A2C4C9","#A4C2F4","#9FC5E8","#B4A7D6","#D5A6BD",
  "#CC4125","#E06666","#F6B26B","#FFD966","#93C47D","#76A5AF","#6D9EEB","#6FA8DC","#8E7CC3","#C27BA0",
  "#A61C00","#CC0000","#E69138","#F1C232","#6AA84F","#45818E","#3C78D8","#3D85C6","#674EA7","#A64D79",
];

/* ─── Highlighter colors (pastels) ─────────────── */
const HIGHLIGHT_PALETTE = [
  "#FEF08A","#FECACA","#FED7AA","#BBF7D0","#BAE6FD","#E9D5FF","#FBCFE8","#FECDD3",
  "#FDE68A","#D9F99D","#A5F3FC","#C4B5FD","#F5D0FE","#FCA5A5",
];

const STROKE_SIZES = [
  { value: 1, px: 2 },
  { value: 2, px: 4 },
  { value: 4, px: 6 },
  { value: 6, px: 10 },
  { value: 10, px: 16 },
];

/* ═══════════════════════════════════════════════════
   HELPERS
   ═══════════════════════════════════════════════════ */
function applyFontSizeToSelection(size: number) {
  const sel = window.getSelection();
  if (!sel || sel.rangeCount === 0) return;
  
  if (sel.isCollapsed) {
    const span = document.createElement("span");
    span.style.fontSize = `${size}px`;
    span.innerHTML = "\u200B";
    const range = sel.getRangeAt(0);
    range.insertNode(span);
    range.setStart(span.childNodes[0], 1);
    range.collapse(true);
    sel.removeAllRanges();
    sel.addRange(range);
    return;
  }

  document.execCommand("styleWithCSS", false, "false");
  document.execCommand("fontSize", false, "7");
  const editor = document.querySelector("[data-luminote-editor]");
  if (!editor) return;
  editor.querySelectorAll('font[size="7"]').forEach(el => {
    // Verify element still exists in DOM before replacement
    if (!el.parentNode) return;
    const span = document.createElement("span");
    span.style.fontSize = `${size}px`;
    span.innerHTML = el.innerHTML;
    try {
      el.parentNode.replaceChild(span, el);
    } catch (e) {
      // Element may have been removed, silently continue
      console.debug("Font replacement skipped: element no longer in DOM");
    }
  });
}

function applyFontFamilyToSelection(css: string) {
  const sel = window.getSelection();
  if (!sel || sel.rangeCount === 0) return;
  
  if (sel.isCollapsed) {
    const span = document.createElement("span");
    span.style.fontFamily = css;
    span.innerHTML = "\u200B";
    const range = sel.getRangeAt(0);
    range.insertNode(span);
    range.setStart(span.childNodes[0], 1);
    range.collapse(true);
    sel.removeAllRanges();
    sel.addRange(range);
    return;
  }

  document.execCommand("styleWithCSS", false, "true");
  document.execCommand("fontName", false, css);
}

function isLightColor(hex: string): boolean {
  const c = hex.replace("#", "");
  const r = parseInt(c.substring(0, 2), 16);
  const g = parseInt(c.substring(2, 4), 16);
  const b = parseInt(c.substring(4, 6), 16);
  return (r * 299 + g * 587 + b * 114) / 1000 > 180;
}

function hexToRgba(hex: string, alpha: number): string {
  const c = hex.replace("#", "");
  const r = parseInt(c.substring(0, 2), 16);
  const g = parseInt(c.substring(2, 4), 16);
  const b = parseInt(c.substring(4, 6), 16);
  return `rgba(${r},${g},${b},${alpha})`;
}

function getDrawStorageKey(noteId: string): string {
  return `luminote-draw-${noteId}`;
}

type EditorDraft = {
  title: string;
  content: string;
  savedAt: string;
};

function getEditorDraftStorageKey(noteId: string, userId?: string): string {
  return userId ? `luminote-note-draft-${userId}-${noteId}` : `luminote-note-draft-${noteId}`;
}

function readEditorDraft(storageKey: string): EditorDraft | null {
  try {
    const raw = localStorage.getItem(storageKey);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed.title !== "string" || typeof parsed.content !== "string" || typeof parsed.savedAt !== "string") {
      return null;
    }
    return parsed as EditorDraft;
  } catch {
    return null;
  }
}

function writeEditorDraft(storageKey: string, draft: EditorDraft): void {
  try {
    localStorage.setItem(storageKey, JSON.stringify(draft));
  } catch {
    // Ignore storage quota / privacy mode failures.
  }
}

function clearEditorDraft(storageKey: string): void {
  try {
    localStorage.removeItem(storageKey);
  } catch {
    // Ignore storage cleanup failures.
  }
}

const DRAW_EMBED_START = "<!--LUMINOTE_DRAW_START-->";
const DRAW_EMBED_END = "<!--LUMINOTE_DRAW_END-->";

function extractDrawDataFromContent(rawContent: string): { editorContent: string; drawData: string | null } {
  if (!rawContent) return { editorContent: "", drawData: null };
  const start = rawContent.indexOf(DRAW_EMBED_START);
  const end = rawContent.indexOf(DRAW_EMBED_END);

  if (start < 0 || end < 0 || end <= start) {
    return { editorContent: rawContent, drawData: null };
  }

  const drawData = rawContent
    .slice(start + DRAW_EMBED_START.length, end)
    .trim();
  const editorContent = `${rawContent.slice(0, start)}${rawContent.slice(end + DRAW_EMBED_END.length)}`.trim();

  return { editorContent, drawData: drawData || null };
}

function mergeContentWithDrawData(editorContent: string, drawData: string | null): string {
  if (!drawData) return editorContent || "";
  return `${editorContent || ""}\n${DRAW_EMBED_START}${drawData}${DRAW_EMBED_END}`;
}

function fileToDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === "string") resolve(reader.result);
      else reject(new Error("Failed to read image file."));
    };
    reader.onerror = () => reject(reader.error ?? new Error("Failed to read image file."));
    reader.readAsDataURL(file);
  });
}

/* ═══════════════════════════════════════════════════
   DRAW TOOL DROPDOWN COMPONENT
   ═══════════════════════════════════════════════════ */
type DrawToolType = "pen" | "marker" | "highlighter" | "eraser";

function DrawToolPalette({
  tool,
  color,
  size,
  pos,
  onColorChange,
  onSizeChange,
  onClose,
}: {
  tool: DrawToolType;
  color: string;
  size: number;
  pos: { top: number; left: number };
  onColorChange: (c: string) => void;
  onSizeChange: (s: number) => void;
  onClose: () => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const isEraser = tool === "eraser";
  const isHighlighter = tool === "highlighter";
  const palette = isHighlighter ? HIGHLIGHT_PALETTE : DRAW_PALETTE;
  const visibleColors = expanded ? palette : palette.slice(0, 10);

  return (
    <>
      {/* Full-screen backdrop to close */}
      <div
        style={{ position: "fixed", inset: 0, zIndex: 99990 }}
        onClick={onClose}
      />
      {/* The palette panel – rendered fixed so it's NEVER clipped */}
      <div
        style={{
          position: "fixed",
          top: pos.top,
          left: pos.left,
          zIndex: 99999,
          background: "white",
          borderRadius: 12,
          boxShadow: "0 16px 48px rgba(0,0,0,.18)",
          padding: 12,
          width: isEraser ? 160 : 220,
          animation: "dtPop .15s ease both",
        }}
        onClick={e => e.stopPropagation()}
      >
        {!isEraser && (
          <>
            <div style={{
              display: "grid",
              gridTemplateColumns: "repeat(10, 1fr)",
              gap: 3,
              marginBottom: 8,
            }}>
              {visibleColors.map(c => (
                <button
                  key={c}
                  onClick={() => onColorChange(c)}
                  style={{
                    width: 18, height: 18, borderRadius: "50%",
                    background: c,
                    border: color === c ? "2.5px solid #6366F1" : "1px solid rgba(0,0,0,.1)",
                    cursor: "pointer",
                    transition: "transform .1s",
                    transform: color === c ? "scale(1.2)" : "scale(1)",
                  }}
                  onMouseEnter={e => { if (color !== c) (e.target as HTMLElement).style.transform = "scale(1.1)"; }}
                  onMouseLeave={e => { if (color !== c) (e.target as HTMLElement).style.transform = "scale(1)"; }}
                />
              ))}
            </div>
            {!isHighlighter && (
              <button
                onClick={() => setExpanded(v => !v)}
                style={{
                  width: "100%", padding: "3px 0", background: "none", border: "none",
                  cursor: "pointer", color: "#9CA3AF", fontSize: 10, fontWeight: 600,
                  display: "flex", alignItems: "center", justifyContent: "center", gap: 4,
                  marginBottom: 8,
                }}
              >
                <ChevronDown size={10} style={{ transform: expanded ? "rotate(180deg)" : "none", transition: "transform .2s" }} />
                {expanded ? "Less colors" : "More colors"}
              </button>
            )}
          </>
        )}
        <div>
          <div style={{ fontSize: 10, fontWeight: 700, color: "#9CA3AF", textTransform: "uppercase", letterSpacing: ".06em", marginBottom: 6 }}>
            Stroke Size
          </div>
          <div style={{ display: "flex", gap: 6, justifyContent: "center" }}>
            {STROKE_SIZES.map(s => (
              <button
                key={s.value}
                onClick={() => onSizeChange(s.value)}
                style={{
                  width: 28, height: 28, borderRadius: "50%",
                  border: size === s.value ? "2px solid #374151" : "1.5px solid #E5E7EB",
                  background: "white",
                  display: "flex", alignItems: "center", justifyContent: "center",
                  cursor: "pointer",
                  transition: "transform .1s",
                }}
                onMouseEnter={e => (e.currentTarget.style.transform = "scale(1.1)")}
                onMouseLeave={e => (e.currentTarget.style.transform = "scale(1)")}
              >
                <div style={{
                  width: s.px, height: s.px, borderRadius: "50%",
                  background: isEraser ? "#9CA3AF" : color,
                }} />
              </button>
            ))}
          </div>
        </div>
      </div>
    </>
  );
}

function TextColorPalette({
  color,
  pos,
  onColorChange,
  onClose,
}: {
  color: string;
  pos: { top: number; left: number };
  onColorChange: (c: string) => void;
  onClose: () => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const visibleColors = expanded ? DRAW_PALETTE : DRAW_PALETTE.slice(0, 10);

  return (
    <>
      <div style={{ position: "fixed", inset: 0, zIndex: 99990 }} onMouseDown={onClose} />
      <div
        style={{
          position: "fixed",
          top: pos.top,
          left: pos.left,
          zIndex: 99999,
          background: "white",
          borderRadius: 12,
          boxShadow: "0 16px 48px rgba(0,0,0,.18)",
          padding: 12,
          width: 220,
          animation: "dtPop .15s ease both",
        }}
        onMouseDown={e => e.stopPropagation()}
      >
        <div style={{ display: "grid", gridTemplateColumns: "repeat(10, 1fr)", gap: 3, marginBottom: 8 }}>
          {visibleColors.map(c => (
            <button
              key={c}
              onMouseDown={e => {
                e.preventDefault();
                onColorChange(c);
              }}
              style={{
                width: 18,
                height: 18,
                borderRadius: "50%",
                background: c,
                border: color === c ? "2.5px solid #6366F1" : "1px solid rgba(0,0,0,.1)",
                cursor: "pointer",
                transition: "transform .1s",
                transform: color === c ? "scale(1.2)" : "scale(1)",
              }}
              onMouseEnter={e => { if (color !== c) (e.currentTarget.style.transform = "scale(1.1)"); }}
              onMouseLeave={e => { if (color !== c) (e.currentTarget.style.transform = "scale(1)"); }}
            />
          ))}
        </div>

        <button
          onMouseDown={e => {
            e.preventDefault();
            setExpanded(v => !v);
          }}
          style={{
            width: "100%",
            padding: "3px 0",
            background: "none",
            border: "none",
            cursor: "pointer",
            color: "#9CA3AF",
            fontSize: 10,
            fontWeight: 600,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: 4,
          }}
        >
          <ChevronDown size={10} style={{ transform: expanded ? "rotate(180deg)" : "none", transition: "transform .2s" }} />
          {expanded ? "Less colors" : "More colors"}
        </button>
      </div>
    </>
  );
}

function HighlightColorPalette({
  color,
  pos,
  onColorChange,
  onClear,
  onClose,
}: {
  color: string | null;
  pos: { top: number; left: number };
  onColorChange: (c: string) => void;
  onClear: () => void;
  onClose: () => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const visibleColors = expanded ? DRAW_PALETTE : DRAW_PALETTE.slice(0, 10);

  return (
    <>
      <div style={{ position: "fixed", inset: 0, zIndex: 99990 }} onMouseDown={onClose} />
      <div
        style={{
          position: "fixed",
          top: pos.top,
          left: pos.left,
          zIndex: 99999,
          background: "white",
          borderRadius: 12,
          boxShadow: "0 16px 48px rgba(0,0,0,.18)",
          padding: 12,
          width: 220,
          animation: "dtPop .15s ease both",
        }}
        onMouseDown={e => e.stopPropagation()}
      >
        <button
          onMouseDown={e => {
            e.preventDefault();
            onClear();
          }}
          style={{
            width: "100%",
            border: "none",
            background: "#F3F4F6",
            color: "#374151",
            borderRadius: 8,
            height: 32,
            display: "flex",
            alignItems: "center",
            justifyContent: "flex-start",
            gap: 8,
            padding: "0 10px",
            cursor: "pointer",
            fontSize: 12,
            fontWeight: 600,
            marginBottom: 10,
          }}
        >
          <Eraser size={13} />
          None
        </button>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(10, 1fr)", gap: 3, marginBottom: 8 }}>
          {visibleColors.map(c => (
            <button
              key={c}
              onMouseDown={e => {
                e.preventDefault();
                onColorChange(c);
              }}
              style={{
                width: 18,
                height: 18,
                borderRadius: "50%",
                background: c,
                border: color?.toLowerCase() === c.toLowerCase() ? "2.5px solid #6366F1" : "1px solid rgba(0,0,0,.1)",
                cursor: "pointer",
                transition: "transform .1s",
                transform: color?.toLowerCase() === c.toLowerCase() ? "scale(1.2)" : "scale(1)",
              }}
              onMouseEnter={e => { if (color?.toLowerCase() !== c.toLowerCase()) (e.currentTarget.style.transform = "scale(1.1)"); }}
              onMouseLeave={e => { if (color?.toLowerCase() !== c.toLowerCase()) (e.currentTarget.style.transform = "scale(1)"); }}
            />
          ))}
        </div>

        <button
          onMouseDown={e => {
            e.preventDefault();
            setExpanded(v => !v);
          }}
          style={{
            width: "100%",
            padding: "3px 0",
            background: "none",
            border: "none",
            cursor: "pointer",
            color: "#9CA3AF",
            fontSize: 10,
            fontWeight: 600,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: 4,
          }}
        >
          <ChevronDown size={10} style={{ transform: expanded ? "rotate(180deg)" : "none", transition: "transform .2s" }} />
          {expanded ? "Less colors" : "More colors"}
        </button>
      </div>
    </>
  );
}

/* ═══════════════════════════════════════════════════
   MARKER SVG ICON
   ═══════════════════════════════════════════════════ */
function MarkerIcon({ size = 16, color = "currentColor" }: { size?: number; color?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M15.5 4.5l4 4L8 20H4v-4z" />
      <path d="m17.5 6.5-2-2" />
      <path d="M4 20h4" />
    </svg>
  );
}

/* ═══════════════════════════════════════════════════
   MAIN EDITOR COMPONENT
   ═══════════════════════════════════════════════════ */
export function Editor() {
  const { id }     = useParams();
  const navigate   = useNavigate();
  const { notes, notesLoading, updateNote, addNote, addReminder, extractRemindersFromNote } = useNotes();
  const { settings: userSettings, user } = useAuth();
  const toast = useToast();

  /* ── Tabs ── */
  const [openTabs, setOpenTabs] = useState<string[]>([]);
  useEffect(() => {
    if (id) setOpenTabs(prev => prev.includes(id) ? prev : [...prev, id]);
  }, [id]);

  const handleCloseTab = (e: React.MouseEvent, tabId: string) => {
    e.stopPropagation();
    const newTabs = openTabs.filter(t => t !== tabId);
    setOpenTabs(newTabs);
    if (newTabs.length > 0) {
      if (id === tabId) navigate(`/home/editor/${newTabs[newTabs.length - 1]}`);
    } else navigate("/home");
  };

  const handleNewTab = async () => {
    const newId = await addNote();
    navigate(`/home/editor/${newId}`);
  };

  /* ── Note data ── */
  const note = notes.find(n => n.id === id);
  const parsedInitialContent = extractDrawDataFromContent(note?.content || "");
  const noteDraftStorageKey = note ? getEditorDraftStorageKey(note.id, user?.id) : null;
  const [title,   setTitle]   = useState(note?.title   || "");
  const [content, setContent] = useState(parsedInitialContent.editorContent || "");
  const [drawSnapshot, setDrawSnapshot] = useState<string | null>(parsedInitialContent.drawData);
  const isDirty   = useRef(false);
  const editorStateRef = useRef({
    title: note?.title || "",
    content: parsedInitialContent.editorContent || "",
    drawSnapshot: parsedInitialContent.drawData as string | null,
  });
  const editorRef = useRef<HTMLDivElement>(null);
  const editorCanvasShellRef = useRef<HTMLDivElement>(null);

  const activeImageRef = useRef<HTMLImageElement | null>(null);
  const [activeImageBox, setActiveImageBox] = useState<{ visible: boolean; centerX: number; centerY: number; width: number; height: number; rotation: number }>({
    visible: false,
    centerX: 0,
    centerY: 0,
    width: 0,
    height: 0,
    rotation: 0,
  });

  /* ── Toolbar state ── */
  const [activeTab,        setActiveTab]        = useState<"Home"|"Draw"|"View">("Home");
  const [showTagMenu,      setShowTagMenu]      = useState(false);
  const [showCourseMenu,   setShowCourseMenu]   = useState(false);
  const [showReminderMenu, setShowReminderMenu] = useState(false);
  const [reminderTitle,    setReminderTitle]    = useState("");
  const [reminderDate,     setReminderDate]     = useState("");
  const [reminderTime,     setReminderTime]     = useState("09:00");
  const [showFontDropdown, setShowFontDropdown] = useState(false);
  const [showSizeDropdown, setShowSizeDropdown] = useState(false);
  const [showTextColorMenu, setShowTextColorMenu] = useState(false);
  const [showHighlightColorMenu, setShowHighlightColorMenu] = useState(false);
  const [showHeadingDropdown, setShowHeadingDropdown] = useState(false);
  const [headingDropdownPos, setHeadingDropdownPos] = useState({ top: 0, left: 0 });
  const [textColorMenuPos, setTextColorMenuPos] = useState({ top: 0, left: 0 });
  const [highlightColorMenuPos, setHighlightColorMenuPos] = useState({ top: 0, left: 0 });
  const [currentHeading,   setCurrentHeading]   = useState("p");
  const [currentTextColor, setCurrentTextColor] = useState("#0F172A");
  const [currentHighlightColor, setCurrentHighlightColor] = useState<string | null>("#FEF08A");
  const [isFavorite,       setIsFavorite]       = useState(false);
  const [showMoreMenu,     setShowMoreMenu]     = useState(false);
  const [tagMenuPos,       setTagMenuPos]       = useState({ top: 0, left: 0 });
  const [courseMenuPos,    setCourseMenuPos]    = useState({ top: 0, left: 0 });
  const [reminderMenuPos,  setReminderMenuPos]  = useState({ top: 0, left: 0 });
  const [moreMenuPos,      setMoreMenuPos]      = useState({ top: 0, left: 0 });
  const [availableCourses, setAvailableCourses] = useState<PersonalCourse[]>([]);
  const [selectedCourseId, setSelectedCourseId] = useState<string | null>(null);

  const coursesStorageKey = user ? `luminote-personal-courses-${user.id}` : "luminote-personal-courses-guest";
  const noteCourseStorageKey = user ? `luminote-note-course-map-${user.id}` : "luminote-note-course-map-guest";

  /* ── Format state tracking ── */
  const [fmtBold,      setFmtBold]      = useState(false);
  const [fmtItalic,    setFmtItalic]    = useState(false);
  const [fmtUnderline, setFmtUnderline] = useState(false);
  const [fmtStrike,    setFmtStrike]    = useState(false);

  /* ── Font ── */
  const initFont = FONT_FAMILIES.find(f => f.value === userSettings?.font_family) ?? FONT_FAMILIES.find(f => f.value === "inter") ?? FONT_FAMILIES[0];
  const [defaultFont] = useState(initFont);
  const [defaultSize] = useState(userSettings?.font_size ?? 15);
  const [currentFont, setCurrentFont] = useState(initFont);
  const [currentSize, setCurrentSize] = useState(userSettings?.font_size ?? 15);

  /* ── Drawing ── */
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isDrawing,     setIsDrawing]     = useState(false);
  const [drawTool,      setDrawTool]      = useState<DrawToolType>("pen");
  const [drawColor,     setDrawColor]     = useState("#1F2937");
  const [drawThickness, setDrawThickness] = useState(1);
  const [markerColor,   setMarkerColor]   = useState("#3B82F6");
  const [markerSize,    setMarkerSize]    = useState(4);
  const [hlColor,       setHlColor]       = useState("#FEF08A");
  const [hlSize,        setHlSize]        = useState(10);
  const [eraserSize,    setEraserSize]    = useState(6);
  const [openDrawPalette, setOpenDrawPalette] = useState<DrawToolType | null>(null);
  const [drawPalettePos, setDrawPalettePos] = useState({ top: 0, left: 0 });
  const [eraserCircle,  setEraserCircle]  = useState<{ x: number; y: number } | null>(null);
  // Font/size dropdown positions
  const [fontDropdownPos, setFontDropdownPos] = useState({ top: 0, left: 0 });
  const [sizeDropdownPos, setSizeDropdownPos] = useState({ top: 0, left: 0 });

  /* ── AI Chat States ── */
  const [aiPopupPos, setAiPopupPos] = useState<{top: number, left: number} | null>(null);
  const [selectedText, setSelectedText] = useState("");
  const [showAiChat, setShowAiChat] = useState(false);
  const [aiChatHistory, setAiChatHistory] = useState<{role: "user"|"assistant"|"system", content: string}[]>([]);
  const [aiInput, setAiInput] = useState("");
  const [isAiLoading, setIsAiLoading] = useState(false);

  const getImageRotation = (img: HTMLImageElement) => {
    const match = (img.style.transform || "").match(/rotate\((-?\d+(?:\.\d+)?)deg\)/);
    return match ? Number(match[1]) : 0;
  };

  const refreshActiveImageBox = useCallback(() => {
    const img = activeImageRef.current;
    if (!img) return;
    const rect = img.getBoundingClientRect();
    const width = parseFloat(img.style.width) || img.clientWidth || rect.width || 220;
    const height = img.style.height && img.style.height !== "auto"
      ? parseFloat(img.style.height)
      : img.clientHeight || rect.height || 140;
    const rotation = getImageRotation(img);
    setActiveImageBox({
      visible: true,
      centerX: rect.left + rect.width / 2,
      centerY: rect.top + rect.height / 2,
      width,
      height,
      rotation,
    });
  }, []);

  const clearActiveImage = useCallback(() => {
    activeImageRef.current = null;
    setActiveImageBox((prev) => ({ ...prev, visible: false }));
  }, []);

  const persistEditorDraft = useCallback((nextTitle: string, nextContent: string, nextDrawSnapshot: string | null) => {
    if (!noteDraftStorageKey) return;
    writeEditorDraft(noteDraftStorageKey, {
      title: nextTitle,
      content: mergeContentWithDrawData(nextContent, nextDrawSnapshot),
      savedAt: new Date().toISOString(),
    });
  }, [noteDraftStorageKey]);

  const flushCurrentEditorDraft = useCallback(() => {
    const current = editorStateRef.current;
    persistEditorDraft(current.title, current.content, current.drawSnapshot);
  }, [persistEditorDraft]);

  useEffect(() => {
    editorStateRef.current = { title, content, drawSnapshot };
  }, [title, content, drawSnapshot]);

  useEffect(() => {
    return () => {
      flushCurrentEditorDraft();
    };
  }, [note?.id, flushCurrentEditorDraft]);

  useEffect(() => {
    const handlePageHide = () => flushCurrentEditorDraft();
    const handleBeforeUnload = () => flushCurrentEditorDraft();

    window.addEventListener("pagehide", handlePageHide);
    window.addEventListener("beforeunload", handleBeforeUnload);

    return () => {
      flushCurrentEditorDraft();
      window.removeEventListener("pagehide", handlePageHide);
      window.removeEventListener("beforeunload", handleBeforeUnload);
    };
  }, [flushCurrentEditorDraft]);

  const loadAvailableCourses = useCallback(async () => {
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
          // Ignore malformed local cache.
        }
      }

      return merged;
    })();

    let remoteCourses: PersonalCourse[] = [];
    if (user?.id) {
      const { data, error } = await supabase
        .from("user_courses")
        .select("id, code, title, subtitle")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });

      if (!error && Array.isArray(data)) {
        remoteCourses = normalizeCourses(data);
      }
    }

    const byId = new Map<string, PersonalCourse>();
    for (const course of localCourses) byId.set(course.id, course);
    for (const course of remoteCourses) byId.set(course.id, course);

    setAvailableCourses(Array.from(byId.values()));
  }, [coursesStorageKey, user?.id]);

  useEffect(() => {
    void loadAvailableCourses();
  }, [loadAvailableCourses]);

  useEffect(() => {
    if (!id || !note) {
      setSelectedCourseId(null);
      return;
    }

    if (note.course_id) {
      setSelectedCourseId(note.course_id);
      return;
    }

    try {
      const raw = localStorage.getItem(noteCourseStorageKey);
      const parsed = raw ? JSON.parse(raw) : {};
      const localMapped = parsed && typeof parsed[id] === "string" ? parsed[id] : null;
      setSelectedCourseId(localMapped);
    } catch {
      setSelectedCourseId(null);
    }
  }, [id, note?.id, note?.course_id, noteCourseStorageKey]);

  const handleSelectCourse = async (courseId: string | null) => {
    if (!id) return;

    setSelectedCourseId(courseId);

    if (courseId) {
      const selected = availableCourses.find((course) => course.id === courseId);
      toast.success(selected ? `Course selected: ${selected.title}` : "Course selected.");
    }

    try {
      const raw = localStorage.getItem(noteCourseStorageKey);
      const parsed = raw ? JSON.parse(raw) : {};
      if (courseId) parsed[id] = courseId;
      else delete parsed[id];
      localStorage.setItem(noteCourseStorageKey, JSON.stringify(parsed));
    } catch {
      // Ignore local cache write failures.
    }

    if (!user?.id) {
      setShowCourseMenu(false);
      return;
    }

    // Use updateNote from NotesContext to properly sync the course_id
    try {
      await updateNote(id, { course_id: courseId });
    } catch (error) {
      console.warn("[Editor] Course link database sync failed:", error);
    }

    setShowCourseMenu(false);
  };

  const selectImage = useCallback((img: HTMLImageElement | null) => {
    if (!img) {
      clearActiveImage();
      return;
    }

    img.dataset.luminoteImage = "1";
    img.draggable = false;
    img.style.maxWidth = img.style.position === "absolute" ? "none" : "100%";
    if (!img.style.width) img.style.width = `${Math.min(320, Math.max(120, img.clientWidth || 220))}px`;
    if (!img.style.height || img.style.height === "auto") img.style.height = "auto";
    if (!img.style.transformOrigin) img.style.transformOrigin = "center center";
    if (!img.style.display) img.style.display = "inline-block";
    img.style.cursor = "move";

    activeImageRef.current = img;
    refreshActiveImageBox();
  }, [clearActiveImage, refreshActiveImageBox]);

  const commitEditorDomToState = useCallback(() => {
    if (!editorRef.current) return;
    setContent(editorRef.current.innerHTML);
    isDirty.current = true;
  }, []);

  const insertImageFromFile = useCallback(async (file: File) => {
    if (!file.type.startsWith("image/")) return;
    try {
      const dataUrl = await fileToDataUrl(file);
      focusEditor();
      document.execCommand("insertHTML", false,
        `<img data-luminote-image="1" src="${dataUrl}" alt="${file.name}" style="width:220px;height:auto;border-radius:8px;margin:6px 4px;display:inline-block;cursor:move;transform-origin:center center;" />`
      );
      commitEditorDomToState();
    } catch {
      toast.error("Could not insert this image.");
    }
  }, [commitEditorDomToState, toast]);

  const placeImageForFreeMove = useCallback((img: HTMLImageElement) => {
    const editor = editorRef.current;
    const shell = editorCanvasShellRef.current;
    if (!editor || !shell) return;

    const rect = img.getBoundingClientRect();
    const editorRect = editor.getBoundingClientRect();
    const currentLeft = parseFloat(img.style.left);
    const currentTop = parseFloat(img.style.top);

    if (!Number.isFinite(currentLeft) || !Number.isFinite(currentTop) || img.style.position !== "absolute") {
      const nextLeft = Math.max(0, rect.left - editorRect.left + shell.scrollLeft);
      const nextTop = Math.max(0, rect.top - editorRect.top + shell.scrollTop);
      img.style.position = "absolute";
      img.style.left = `${nextLeft}px`;
      img.style.top = `${nextTop}px`;
      img.style.margin = "0";
      img.style.maxWidth = "none";
      img.style.zIndex = "20";
    }
  }, []);

  const startImageMove = useCallback((event: React.MouseEvent) => {
    const img = activeImageRef.current;
    const editor = editorRef.current;
    if (!img || !editor) return;

    event.preventDefault();
    event.stopPropagation();

    placeImageForFreeMove(img);

    const startX = event.clientX;
    const startY = event.clientY;
    const startLeft = parseFloat(img.style.left) || 0;
    const startTop = parseFloat(img.style.top) || 0;

    const onMove = (e: MouseEvent) => {
      const dx = e.clientX - startX;
      const dy = e.clientY - startY;

      // Keep movement unconstrained on the far edge so images can be positioned
      // anywhere in the note canvas, while still preventing negative coordinates.
      const nextLeft = Math.max(0, startLeft + dx);
      const nextTop = Math.max(0, startTop + dy);

      img.style.left = `${nextLeft}px`;
      img.style.top = `${nextTop}px`;
      img.style.cursor = "grabbing";
      isDirty.current = true;
      refreshActiveImageBox();
    };

    const onUp = () => {
      img.style.cursor = "move";
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseup", onUp);
      commitEditorDomToState();
    };

    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);
  }, [commitEditorDomToState, placeImageForFreeMove, refreshActiveImageBox]);

  const startImageResize = useCallback((dir: string, event: React.MouseEvent) => {
    const img = activeImageRef.current;
    if (!img) return;
    event.preventDefault();
    event.stopPropagation();

    placeImageForFreeMove(img);

    const startX = event.clientX;
    const startY = event.clientY;
    const startW = parseFloat(img.style.width) || img.clientWidth || 220;
    const startH = img.style.height && img.style.height !== "auto"
      ? parseFloat(img.style.height)
      : img.clientHeight || 140;
    const startLeft = parseFloat(img.style.left) || 0;
    const startTop = parseFloat(img.style.top) || 0;
    const startCenterX = startLeft + startW / 2;
    const startCenterY = startTop + startH / 2;
    const rotation = (getImageRotation(img) * Math.PI) / 180;
    const cos = Math.cos(rotation);
    const sin = Math.sin(rotation);

    const toLocal = (dx: number, dy: number) => ({
      x: cos * dx + sin * dy,
      y: -sin * dx + cos * dy,
    });

    const axisX = dir.includes("e") ? 1 : dir.includes("w") ? -1 : 0;
    const axisY = dir.includes("s") ? 1 : dir.includes("n") ? -1 : 0;

    const onMove = (e: MouseEvent) => {
      const dx = e.clientX - startX;
      const dy = e.clientY - startY;
      const local = toLocal(dx, dy);
      const deltaW = axisX !== 0 ? axisX * local.x : 0;
      const deltaH = axisY !== 0 ? axisY * local.y : 0;

      const nextW = Math.max(64, startW + deltaW);
      const nextH = Math.max(48, startH + deltaH);
      const actualDW = nextW - startW;
      const actualDH = nextH - startH;

      const centerShiftLocalX = axisX !== 0 ? (axisX * actualDW) / 2 : 0;
      const centerShiftLocalY = axisY !== 0 ? (axisY * actualDH) / 2 : 0;
      const centerShiftX = cos * centerShiftLocalX - sin * centerShiftLocalY;
      const centerShiftY = sin * centerShiftLocalX + cos * centerShiftLocalY;
      const nextCenterX = Math.max(nextW / 2, startCenterX + centerShiftX);
      const nextCenterY = Math.max(nextH / 2, startCenterY + centerShiftY);

      img.style.position = "absolute";
      img.style.left = `${nextCenterX - nextW / 2}px`;
      img.style.top = `${nextCenterY - nextH / 2}px`;
      img.style.width = `${nextW}px`;
      img.style.height = `${nextH}px`;
      img.style.maxWidth = "none";
      isDirty.current = true;
      refreshActiveImageBox();
    };

    const onUp = () => {
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseup", onUp);
      commitEditorDomToState();
    };

    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);
  }, [commitEditorDomToState, placeImageForFreeMove, refreshActiveImageBox]);

  const startImageRotate = useCallback((event: React.MouseEvent) => {
    const img = activeImageRef.current;
    if (!img) return;
    event.preventDefault();
    event.stopPropagation();

    const rect = img.getBoundingClientRect();
    const cx = rect.left + rect.width / 2;
    const cy = rect.top + rect.height / 2;
    const startPointerAngle = Math.atan2(event.clientY - cy, event.clientX - cx);
    const startRotation = getImageRotation(img);

    const onMove = (e: MouseEvent) => {
      const currentPointerAngle = Math.atan2(e.clientY - cy, e.clientX - cx);
      const deltaDegrees = (currentPointerAngle - startPointerAngle) * (180 / Math.PI);
      const nextRotation = startRotation + deltaDegrees;
      img.style.transform = `rotate(${nextRotation}deg)`;
      img.style.transformOrigin = "center center";
      isDirty.current = true;
      refreshActiveImageBox();
    };

    const onUp = () => {
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseup", onUp);
      commitEditorDomToState();
    };

    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);
  }, [commitEditorDomToState, refreshActiveImageBox]);

  const saveCanvasSnapshot = useCallback((syncState = true) => {
    if (!note?.id || !canvasRef.current) return;
    try {
      const dataUrl = canvasRef.current.toDataURL("image/png");
      localStorage.setItem(getDrawStorageKey(note.id), dataUrl);
      if (syncState) {
        setDrawSnapshot(dataUrl);
        isDirty.current = true;
        persistEditorDraft(title, content, dataUrl);
      }
    } catch {
      // Ignore storage/save issues; drawing remains usable for current session.
    }
  }, [content, note?.id, persistEditorDraft, title]);

  const restoreCanvasSnapshot = useCallback(() => {
    if (!note?.id || !canvasRef.current) return;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    const saved = drawSnapshot || localStorage.getItem(getDrawStorageKey(note.id));
    if (!saved) return;

    const img = new Image();
    img.onload = () => {
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
    };
    img.src = saved;
  }, [note?.id, drawSnapshot]);

  const clearCanvasSnapshot = useCallback(() => {
    if (!canvasRef.current || !note?.id) return;
    const canvas = canvasRef.current;
    canvas.getContext("2d")?.clearRect(0, 0, canvas.width, canvas.height);
    localStorage.removeItem(getDrawStorageKey(note.id));
    setDrawSnapshot(null);
    isDirty.current = true;
  }, [note?.id]);

  /* ── Sync note → editor ── */
  useEffect(() => {
    if (note) {
      const parsed = extractDrawDataFromContent(note.content || "");
      const draft = noteDraftStorageKey ? readEditorDraft(noteDraftStorageKey) : null;
      const noteSnapshot = mergeContentWithDrawData(parsed.editorContent, parsed.drawData);
      const shouldRestoreDraft = !!draft && draft.content !== noteSnapshot;

      if (shouldRestoreDraft && draft) {
        const restored = extractDrawDataFromContent(draft.content || "");
        setTitle(draft.title || note.title);
        setContent(restored.editorContent);
        setDrawSnapshot(restored.drawData);
        isDirty.current = true;
        return;
      }

      const storedDrawData = parsed.drawData || localStorage.getItem(getDrawStorageKey(note.id));
      setTitle(note.title);
      setContent(parsed.editorContent);
      setDrawSnapshot(storedDrawData);
      isDirty.current = false;
    }
  }, [id, note?.id, noteDraftStorageKey]);

  useEffect(() => {
    if (editorRef.current && note) {
      const parsed = extractDrawDataFromContent(note.content || "");
      if (editorRef.current.innerHTML !== parsed.editorContent) {
        editorRef.current.innerHTML = parsed.editorContent || "";
      }
    }
  }, [id, note?.id]);

  /* ── Debounced save ── */
  useEffect(() => {
    if (!note || !isDirty.current) return;
    const timeout = setTimeout(() => {
      void (async () => {
        try {
          const mergedContent = mergeContentWithDrawData(content, drawSnapshot);
          await updateNote(note.id, { title, content: mergedContent });
          isDirty.current = false;
          if (noteDraftStorageKey) clearEditorDraft(noteDraftStorageKey);
          
          // Extract reminders from note content for future events
          if (title || mergedContent) {
            await extractRemindersFromNote(note.id, title, mergedContent);
          }
        } catch {
          // Keep the local draft so the note can be recovered after a refresh.
        }
      })();
    }, 1500);
    return () => clearTimeout(timeout);
  }, [content, drawSnapshot, note?.id, noteDraftStorageKey, title, updateNote, extractRemindersFromNote]);

  /* ── Canvas resize ── */
  useEffect(() => {
    if (canvasRef.current) {
      const canvas = canvasRef.current;
      const parent = canvas.parentElement;
      if (parent) {
        canvas.width = parent.scrollWidth;
        canvas.height = parent.scrollHeight;
      }
      restoreCanvasSnapshot();
    }
  }, [activeTab, content, note?.id, drawSnapshot, restoreCanvasSnapshot]);

  useEffect(() => {
    return () => {
      saveCanvasSnapshot(false);
    };
  }, [saveCanvasSnapshot]);

  useEffect(() => {
    const onViewportChange = () => refreshActiveImageBox();
    window.addEventListener("resize", onViewportChange);
    window.addEventListener("scroll", onViewportChange, true);
    return () => {
      window.removeEventListener("resize", onViewportChange);
      window.removeEventListener("scroll", onViewportChange, true);
    };
  }, [refreshActiveImageBox]);

  useEffect(() => {
    if (activeTab === "Draw") {
      clearActiveImage();
    }
  }, [activeTab, clearActiveImage]);

  /* ── Format state polling ── */
  const updateFormatState = useCallback(() => {
    setFmtBold(document.queryCommandState("bold"));
    setFmtItalic(document.queryCommandState("italic"));
    setFmtUnderline(document.queryCommandState("underline"));
    setFmtStrike(document.queryCommandState("strikeThrough"));

    const sel = window.getSelection();
    if (sel && sel.rangeCount > 0) {
      if (!sel.isCollapsed && sel.toString().trim() !== "") {
        const rect = sel.getRangeAt(0).getBoundingClientRect();
        setAiPopupPos({ top: rect.top - 46, left: rect.left + rect.width / 2 });
        setSelectedText(sel.toString());
      } else {
        setAiPopupPos(null);
      }
      
      let node: Node | null = sel.getRangeAt(0).commonAncestorContainer;
      if (node.nodeType === Node.TEXT_NODE && node.parentNode) {
        node = node.parentNode;
      }
      
      let foundFont = false;
      let foundSize = false;
      let foundHeading = false;
      let curr = node as HTMLElement;
      
      while (curr && curr !== editorRef.current && curr.tagName) {
        if (!foundFont && curr.style && curr.style.fontFamily) {
          const rawFont = curr.style.fontFamily.replace(/['"]/g, '').toLowerCase();
          const matched = FONT_FAMILIES.find(f => rawFont.includes(f.value.toLowerCase()) || f.css.toLowerCase().includes(rawFont) || rawFont.includes(f.label.toLowerCase()));
          if (matched) { setCurrentFont(matched); foundFont = true; }
        }
        if (!foundFont && curr.tagName === 'FONT' && curr.getAttribute('face')) {
          const rawFont = curr.getAttribute('face')!.replace(/['"]/g, '').toLowerCase();
          const matched = FONT_FAMILIES.find(f => rawFont.includes(f.value.toLowerCase()) || f.css.toLowerCase().includes(rawFont) || rawFont.includes(f.label.toLowerCase()));
          if (matched) { setCurrentFont(matched); foundFont = true; }
        }
        if (!foundSize && curr.style && curr.style.fontSize) {
          const sizePx = parseInt(curr.style.fontSize);
          if (!isNaN(sizePx)) { setCurrentSize(sizePx); foundSize = true; }
        }
        if (!foundHeading && ['H1', 'H2', 'H3', 'H4', 'P'].includes(curr.tagName)) {
          setCurrentHeading(curr.tagName.toLowerCase());
          foundHeading = true;
        }
        curr = curr.parentNode as HTMLElement;
      }
      
      if (!foundFont) {
        const fontName = document.queryCommandValue("fontName");
        if (fontName) {
           const rawFont = fontName.replace(/['"]/g, '').toLowerCase();
           const matched = FONT_FAMILIES.find(f => rawFont.includes(f.value.toLowerCase()) || f.css.toLowerCase().includes(rawFont) || rawFont.includes(f.label.toLowerCase()));
           if (matched) { setCurrentFont(matched); foundFont = true; }
        }
      }
      
      if (!foundFont) setCurrentFont(defaultFont);
      if (!foundSize) setCurrentSize(defaultSize);
      if (!foundHeading) setCurrentHeading("p");
    }
  }, [defaultFont, defaultSize]);

  /* ── Editor input ── */
  const handleEditorInput = useCallback(() => {
    if (!editorRef.current) return;
    const nextContent = editorRef.current.innerHTML;
    setContent(nextContent);
    isDirty.current = true;
    persistEditorDraft(title, nextContent, drawSnapshot);
    updateFormatState();
  }, [drawSnapshot, persistEditorDraft, title, updateFormatState]);

  const focusEditor = () => editorRef.current?.focus();

  const execFormat = (command: string, value?: string) => {
    focusEditor();
    document.execCommand(command, false, value);
    handleEditorInput();
    updateFormatState();
  };

  /* ── Font family ── */
  const handleFontFamily = (font: typeof FONT_FAMILIES[0]) => {
    setCurrentFont(font);
    setShowFontDropdown(false);
    focusEditor();
    applyFontFamilyToSelection(font.css);
    handleEditorInput();
  };

  /* ── Font size ── */
  const handleFontSize = (size: number) => {
    setCurrentSize(size);
    setShowSizeDropdown(false);
    focusEditor();
    applyFontSizeToSelection(size);
    handleEditorInput();
  };

  const handleTextColor = (hex: string) => {
    setCurrentTextColor(hex);
    setShowTextColorMenu(false);
    focusEditor();
    document.execCommand("styleWithCSS", false, "true");
    document.execCommand("foreColor", false, hex);
    handleEditorInput();
  };

  const getEditorSelection = () => {
    const sel = window.getSelection();
    if (!sel || sel.rangeCount === 0 || sel.isCollapsed || !sel.toString().trim()) return null;
    const range = sel.getRangeAt(0);
    if (!editorRef.current || !editorRef.current.contains(range.commonAncestorContainer)) return null;
    return sel;
  };

  const handleHighlightColor = (hex: string) => {
    const sel = getEditorSelection();
    if (!sel) return;

    setCurrentHighlightColor(hex);
    setShowHighlightColorMenu(false);
    focusEditor();
    document.execCommand("styleWithCSS", false, "true");
    document.execCommand("hiliteColor", false, hex);
    handleEditorInput();
  };

  const clearHighlightColor = () => {
    const sel = getEditorSelection();
    if (!sel) return;

    setCurrentHighlightColor(null);
    setShowHighlightColorMenu(false);
    focusEditor();
    document.execCommand("styleWithCSS", false, "true");
    document.execCommand("hiliteColor", false, "transparent");
    document.execCommand("backColor", false, "transparent");
    handleEditorInput();
  };

  /* ── Image insert ── */
  const handleInsertImage = () => {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = "image/*";
    input.onchange = () => {
      const file = input.files?.[0];
      if (!file) return;
      insertImageFromFile(file);
    };
    input.click();
  };

  /* ── AI Summarize ── */
  const handleSummarize = async () => {
    const plainText = editorRef.current?.innerText ?? "";
    if (!plainText.trim()) { toast.error("Note is empty."); return; }
    const toastId = toast.loading("Summarizing with AI…");
    try {
      const { summarizeNote } = await import("./qwen");
      const summary = await summarizeNote(plainText, title || "Untitled");
      const newId = await addNote();
      await updateNote(newId, { title: `${title || "Untitled"} — Summary`, content: summary, color_style: "yellow", tags: ["RESEARCH"] });
      toast.dismiss(toastId); toast.success("Summary created!");
      navigate(`/home/editor/${newId}`);
    } catch (e: any) { toast.dismiss(toastId); toast.error(e?.message ?? "AI summarize failed."); }
  };

  /* ── Reminder ── */
  const handleAddReminder = async () => {
    if (!reminderTitle.trim() || !reminderDate) { toast.error("Enter a title and date."); return; }
    try {
      await addReminder({ title: reminderTitle, date: reminderDate, time: reminderTime });
      toast.success("Reminder set!");
      setShowReminderMenu(false);
      setReminderTitle(""); setReminderDate(""); setReminderTime("09:00");
    } catch { toast.error("Failed to set reminder."); }
  };

  /* ── Favorite toggle ── */
  const toggleFavorite = () => {
    setIsFavorite(v => !v);
    toast.success(isFavorite ? "Removed from favorites" : "Added to favorites ⭐");
  };

  /* ── Heading apply ── */
  const applyHeading = (value: string) => {
    focusEditor();
    if (value === "p") document.execCommand("formatBlock", false, "p");
    else document.execCommand("formatBlock", false, value);
    setCurrentHeading(value);
    setShowHeadingDropdown(false);
    handleEditorInput();
  };

  /* ── Share ── */
  const handleShare = async () => {
    try {
      const url = window.location.href;
      await navigator.clipboard.writeText(url);
      toast.success("Link copied to clipboard!");
    } catch {
      toast.error("Failed to copy link.");
    }
  };

  /* ── Export as text ── */
  const handleExportText = () => {
    const text = editorRef.current?.innerText ?? "";
    const blob = new Blob([text], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${title || "Untitled"}.txt`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success("Downloaded as text!");
    setShowMoreMenu(false);
  };

  /* ── AI Chat Actions ── */
  const handleSendAi = async () => {
    if (!aiInput.trim() || isAiLoading) return;
    const userMessage = aiInput;
    setAiInput("");
    
    let finalMsg = userMessage;
    if (aiChatHistory.length === 0 && selectedText) {
        finalMsg = `[Context: "${selectedText}"]\n\n${userMessage}`;
    }
    
    const newHistory = [...aiChatHistory, { role: "user" as const, content: finalMsg }];
    setAiChatHistory(newHistory);
    setIsAiLoading(true);
    try {
      const { lumiChat } = await import("./qwen");
      const resp = await lumiChat(finalMsg, aiChatHistory);
      setAiChatHistory([...newHistory, { role: "assistant" as const, content: resp }]);
    } catch (e: any) {
      setAiChatHistory([...newHistory, { role: "assistant" as const, content: "Error: " + (e?.message || "Could not connect to AI.") }]);
    } finally {
      setIsAiLoading(false);
    }
  };

  /* ── Print ── */
  const handlePrint = () => {
    window.print();
    setShowMoreMenu(false);
  };

  /* ── Drawing functions ── */
  const getStrokeColor = () => {
    if (drawTool === "highlighter") return hexToRgba(hlColor, 0.25);
    if (drawTool === "marker")      return hexToRgba(markerColor, 0.55);
    if (drawTool === "eraser")      return "rgba(0,0,0,1)";
    return drawColor; // pen – full opacity solid
  };

  const getStrokeWidth = () => {
    if (drawTool === "pen")         return Math.max(1, drawThickness);
    if (drawTool === "marker")      return markerSize * 3;
    if (drawTool === "highlighter") return hlSize * 4;
    return eraserSize * 6;
  };

  const startDrawing = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (activeTab !== "Draw") return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    if (drawTool === "eraser") {
      ctx.globalCompositeOperation = "destination-out";
      ctx.globalAlpha = 1;
    } else if (drawTool === "highlighter") {
      // Highlighter: use multiply so text always shows through
      ctx.globalCompositeOperation = "multiply";
      ctx.globalAlpha = 1;
    } else {
      ctx.globalCompositeOperation = "source-over";
      ctx.globalAlpha = 1; // rgba color handles transparency
    }

    ctx.strokeStyle = getStrokeColor();
    ctx.lineWidth   = getStrokeWidth();
    ctx.lineCap     = drawTool === "highlighter" ? "square" : "round";
    ctx.lineJoin    = "round";
    ctx.beginPath();
    ctx.moveTo(e.clientX - rect.left, e.clientY - rect.top);
    setIsDrawing(true);
    e.currentTarget.setPointerCapture(e.pointerId);
  };

  const draw = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const rect = canvasRef.current?.getBoundingClientRect();
    if (rect && activeTab === "Draw") {
      setEraserCircle(drawTool === "eraser" ? { x: e.clientX - rect.left, y: e.clientY - rect.top } : null);
    }
    if (!isDrawing || activeTab !== "Draw") return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const pressure = e.pressure > 0 ? e.pressure : 1;
    // Pen gets pressure sensitivity for thin-to-thick feel
    if (drawTool === "pen") ctx.lineWidth = Math.max(0.5, drawThickness * pressure);
    ctx.lineTo(e.clientX - rect!.left, e.clientY - rect!.top);
    ctx.stroke();
  };

  const stopDrawing = (e: React.PointerEvent<HTMLCanvasElement>) => {
    setIsDrawing(false);
    setEraserCircle(null);
    e.currentTarget.releasePointerCapture(e.pointerId);
    const ctx = canvasRef.current?.getContext("2d");
    if (ctx) { ctx.globalAlpha = 1; ctx.globalCompositeOperation = "source-over"; }
    saveCanvasSnapshot();
  };

  const handleCanvasMouseMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (activeTab !== "Draw" || drawTool !== "eraser") { setEraserCircle(null); return; }
    const rect = canvasRef.current?.getBoundingClientRect();
    if (rect) setEraserCircle({ x: e.clientX - rect.left, y: e.clientY - rect.top });
  };

  const handleCanvasLeave = () => setEraserCircle(null);

  /* ── Loading / not-found ── */
  if (notesLoading) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-sm text-slate-500" style={{ background: "#FAFAF8" }}>
        <div className="w-12 h-12 rounded-2xl bg-white border border-slate-200 flex items-center justify-center shadow-sm mb-3">
          <div className="w-4 h-4 rounded-full border-2 border-slate-300 border-t-slate-500 animate-spin" />
        </div>Loading note…
      </div>
    );
  }

  if (!note) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-sm text-slate-500 space-y-3" style={{ background: "#FAFAF8" }}>
        <p className="text-base text-slate-700 font-semibold">Note not found</p>
        <button onClick={() => navigate("/home")} className="px-4 py-2 rounded-xl bg-black text-white text-xs font-semibold shadow-sm hover:bg-slate-800">Back to Home</button>
      </div>
    );
  }

  const currentColorObj = COLORS.find(c => c.id === (note.color_style || "white")) || COLORS[0];
  const currentPattern  = note.paper_style || "plain";
  const LINE_HEIGHT     = 28;

  const getPatternStyle = (): React.CSSProperties => {
    if (currentPattern === "lined") return {
      backgroundImage: `repeating-linear-gradient(transparent, transparent ${LINE_HEIGHT - 1}px, #CBD5E180 ${LINE_HEIGHT - 1}px, #CBD5E180 ${LINE_HEIGHT}px)`,
      backgroundPosition: `0 ${LINE_HEIGHT}px`,
    };
    if (currentPattern === "grid") return {
      backgroundImage: `linear-gradient(#CBD5E130 1px, transparent 1px), linear-gradient(90deg, #CBD5E130 1px, transparent 1px)`,
      backgroundSize: `${LINE_HEIGHT}px ${LINE_HEIGHT}px`,
    };
    if (currentPattern === "dotted") return {
      backgroundImage: `radial-gradient(circle, #CBD5E140 1px, transparent 1px)`,
      backgroundSize: `${LINE_HEIGHT}px ${LINE_HEIGHT}px`,
    };
    return {};
  };

  /* ── Active format button class ── */
  const fmtBtn = (active: boolean) =>
    `p-1.5 rounded transition-all ${active
      ? "bg-[var(--color-primary)]/20 text-[var(--color-primary)] ring-1 ring-[var(--color-primary)]/30"
      : "hover:bg-[var(--color-surface)] text-[var(--color-text-primary)]"}`;

  /* ═══════════════════════════════════════════════
     TOOLBAR RENDERER
     ═══════════════════════════════════════════════ */
  const renderToolbar = () => {

    /* ─── DRAW TAB ─── */
    if (activeTab === "Draw") {
      const tools: { id: DrawToolType; label: string; iconColor: string }[] = [
        { id: "pen",         label: "Pen",         iconColor: drawColor },
        { id: "marker",      label: "Marker",      iconColor: markerColor },
        { id: "highlighter", label: "Highlighter", iconColor: hlColor },
        { id: "eraser",      label: "Eraser",      iconColor: "#9CA3AF" },
      ];

      return (
        <div className="ln-editor-toolbar flex items-center h-auto min-h-[44px] px-3 py-1.5 gap-1.5 flex-wrap bg-[var(--color-background)] border-b border-slate-200/50">
          {tools.map(t => {
            const isActive = drawTool === t.id;
            const iconStroke = (t.id !== "eraser" && isLightColor(t.iconColor)) ? "#374151" : t.iconColor;

            return (
              <div key={t.id} className="relative">
                <button
                  onClick={e => {
                    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
                    setDrawPalettePos({ top: rect.bottom + 6, left: rect.left });
                    setDrawTool(t.id);
                    setOpenDrawPalette(openDrawPalette === t.id ? null : t.id);
                  }}
                  className={`ln-editor-tool-btn flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs border transition-all ${
                    isActive
                      ? "bg-[var(--color-primary)]/15 border-[var(--color-primary)]/40 text-[var(--color-primary)]"
                      : "border-slate-200/50 hover:bg-[var(--color-surface)] text-[var(--color-text-secondary)]"
                  }`}
                  style={{ fontWeight: 600 }}
                >
                  {t.id === "pen" && <PenTool size={14} color={isActive ? iconStroke : undefined} />}
                  {t.id === "marker" && <MarkerIcon size={14} color={isActive ? iconStroke : undefined} />}
                  {t.id === "highlighter" && <Highlighter size={14} color={isActive ? iconStroke : undefined} />}
                  {t.id === "eraser" && <Eraser size={14} />}
                  {t.label}
                  <ChevronDown size={10} />
                </button>

                {/* Palette dropdown */}
                {openDrawPalette === t.id && (
                  <DrawToolPalette
                    tool={t.id}
                    color={t.id === "pen" ? drawColor : t.id === "marker" ? markerColor : t.id === "highlighter" ? hlColor : "#9CA3AF"}
                    size={t.id === "pen" ? drawThickness : t.id === "marker" ? markerSize : t.id === "highlighter" ? hlSize : eraserSize}
                    pos={drawPalettePos}
                    onColorChange={c => {
                      if (t.id === "pen") setDrawColor(c);
                      else if (t.id === "marker") setMarkerColor(c);
                      else if (t.id === "highlighter") setHlColor(c);
                    }}
                    onSizeChange={s => {
                      if (t.id === "pen") setDrawThickness(s);
                      else if (t.id === "marker") setMarkerSize(s);
                      else if (t.id === "highlighter") setHlSize(s);
                      else setEraserSize(s);
                    }}
                    onClose={() => setOpenDrawPalette(null)}
                  />
                )}
              </div>
            );
          })}

          {/* Clear canvas */}
          <div className="ml-auto">
            <button
              onClick={clearCanvasSnapshot}
              className="px-2.5 py-1 rounded-lg text-[10px] border border-slate-200/50 hover:bg-red-50 hover:border-red-200 hover:text-red-500 transition-all" style={{ fontWeight: 600 }}>
              Clear
            </button>
          </div>
        </div>
      );
    }

    /* ─── HOME TAB ─── */
    if (activeTab === "Home") {
      const headingObj = HEADING_OPTIONS.find(h => h.value === currentHeading) || HEADING_OPTIONS[0];
      return (
        <div className="flex items-center h-auto min-h-[40px] px-3 py-1 gap-0.5 overflow-x-auto scrollbar-hide text-[var(--color-text-secondary)] bg-[var(--color-background)] border-b border-slate-200/50 flex-wrap relative">
          {/* Undo / Redo */}
          <button onMouseDown={e => { e.preventDefault(); execFormat("undo"); }} className="p-1.5 hover:bg-[var(--color-surface)] rounded" title="Undo"><Undo size={15} /></button>
          <button onMouseDown={e => { e.preventDefault(); execFormat("redo"); }} className="p-1.5 hover:bg-[var(--color-surface)] rounded" title="Redo"><Redo size={15} /></button>
          <div className="w-px h-5 bg-slate-200/50 mx-1 shrink-0" />

          {/* Heading dropdown */}
          <div className="relative shrink-0">
            <button
              onMouseDown={e => {
                e.preventDefault();
                const r = (e.currentTarget as HTMLElement).getBoundingClientRect();
                setHeadingDropdownPos({ top: r.bottom + 4, left: r.left });
                setShowHeadingDropdown(v => !v);
                setShowFontDropdown(false); setShowSizeDropdown(false);
              }}
              className="ln-editor-dropdown-trigger flex items-center gap-1 bg-[var(--color-surface)] border border-slate-200/50 rounded px-2 py-1 hover:border-[var(--color-primary)] transition-colors"
            >
              <span className="ln-editor-dropdown-label text-xs w-[72px] truncate text-[var(--color-text-primary)]" style={{ fontWeight: 600 }}>{headingObj.label}</span>
              <ChevronDown size={10} />
            </button>
            {showHeadingDropdown && (
              <>
                <div style={{ position: "fixed", inset: 0, zIndex: 99990 }} onMouseDown={() => setShowHeadingDropdown(false)} />
                <div className="ln-editor-dropdown-panel" style={{
                  position: "fixed", top: headingDropdownPos.top, left: headingDropdownPos.left,
                  zIndex: 99999, background: "white", border: "1px solid #e2e8f0",
                  boxShadow: "0 12px 40px rgba(0,0,0,.18)", borderRadius: 12, padding: "6px 0", width: 200,
                }}>
                  {HEADING_OPTIONS.map(h => (
                    <button key={h.value}
                      onMouseDown={e => { e.preventDefault(); applyHeading(h.value); }}
                      className={`ln-editor-dropdown-item w-full text-left px-4 py-2.5 flex items-center gap-3 hover:bg-indigo-50 transition-colors ${currentHeading === h.value ? "bg-indigo-50" : ""}`}
                    >
                      <span className="text-[11px] text-gray-400 w-5" style={{ fontWeight: 700 }}>{h.tag}</span>
                      <span style={{ fontSize: h.size, fontWeight: h.value === "p" ? 400 : 700, color: currentHeading === h.value ? "#6366F1" : "#1e293b" }}>
                        {h.label}
                      </span>
                      {currentHeading === h.value && <span className="ml-auto text-[var(--color-primary)]">✓</span>}
                    </button>
                  ))}
                </div>
              </>
            )}
          </div>

          {/* Font Family – fixed-positioned dropdown so it's never clipped */}
          <div className="relative shrink-0">
            <button
              onMouseDown={e => {
                e.preventDefault();
                const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
                setFontDropdownPos({ top: rect.bottom + 4, left: rect.left });
                setShowFontDropdown(v => !v);
                setShowSizeDropdown(false);
              }}
              className="ln-editor-dropdown-trigger flex items-center gap-1 bg-[var(--color-surface)] border border-slate-200/50 rounded px-2 py-1 hover:border-[var(--color-primary)] transition-colors"
              style={{ fontFamily: currentFont.css }}
            >
              <span className="ln-editor-dropdown-label text-xs w-20 truncate text-[var(--color-text-primary)]">{currentFont.label}</span>
              <ChevronDown size={10} />
            </button>
            {showFontDropdown && (
              <>
                <div style={{ position: "fixed", inset: 0, zIndex: 99990 }} onMouseDown={() => setShowFontDropdown(false)} />
                <div className="ln-editor-dropdown-panel" style={{ position: "fixed", top: fontDropdownPos.top, left: fontDropdownPos.left, zIndex: 99999, background: "white", border: "1px solid #e2e8f0", boxShadow: "0 8px 32px rgba(0,0,0,.15)", borderRadius: 12, padding: "4px 0", width: 192, maxHeight: 240, overflowY: "auto" }}>
                  {FONT_FAMILIES.map(f => (
                    <button key={f.value}
                      onMouseDown={e => { e.preventDefault(); handleFontFamily(f); }}
                      className={`ln-editor-dropdown-item w-full text-left px-3 py-2 text-xs hover:bg-indigo-50 transition-colors ${currentFont.value === f.value ? "text-[var(--color-primary)] font-bold bg-indigo-50" : "text-gray-800"}`}
                      style={{ fontFamily: f.css }}>
                      {f.label}
                    </button>
                  ))}
                </div>
              </>
            )}
          </div>

          {/* Font Size – fixed-positioned dropdown */}
          <div className="relative shrink-0">
            <button
              onMouseDown={e => {
                e.preventDefault();
                const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
                setSizeDropdownPos({ top: rect.bottom + 4, left: rect.left });
                setShowSizeDropdown(v => !v);
                setShowFontDropdown(false);
              }}
              className="ln-editor-dropdown-trigger flex items-center gap-1 bg-[var(--color-surface)] border border-slate-200/50 rounded px-2 py-1 hover:border-[var(--color-primary)] transition-colors"
            >
              <span className="ln-editor-dropdown-label text-xs text-[var(--color-text-primary)] w-5 text-center">{currentSize}</span>
              <ChevronDown size={10} />
            </button>
            {showSizeDropdown && (
              <>
                <div style={{ position: "fixed", inset: 0, zIndex: 99990 }} onMouseDown={() => setShowSizeDropdown(false)} />
                <div className="ln-editor-dropdown-panel" style={{ position: "fixed", top: sizeDropdownPos.top, left: sizeDropdownPos.left, zIndex: 99999, background: "white", border: "1px solid #e2e8f0", boxShadow: "0 8px 32px rgba(0,0,0,.15)", borderRadius: 12, padding: "4px 0", width: 80, maxHeight: 200, overflowY: "auto" }}>
                  {FONT_SIZES.map(s => (
                    <button key={s}
                      onMouseDown={e => { e.preventDefault(); handleFontSize(s); }}
                      className={`ln-editor-dropdown-item w-full text-center px-3 py-1.5 text-xs hover:bg-indigo-50 transition-colors ${currentSize === s ? "text-[var(--color-primary)] font-bold bg-indigo-50" : "text-gray-800"}`}>
                      {s}
                    </button>
                  ))}
                </div>
              </>
            )}
          </div>

          <div className="w-px h-5 bg-slate-200/50 mx-1 shrink-0" />

          {/* Bold / Italic / Underline / Strikethrough */}
          <button onMouseDown={e => { e.preventDefault(); execFormat("bold"); }} title="Bold" className={fmtBtn(fmtBold)}><Bold size={15} /></button>
          <button onMouseDown={e => { e.preventDefault(); execFormat("italic"); }} title="Italic" className={fmtBtn(fmtItalic)}><Italic size={15} /></button>
          <button onMouseDown={e => { e.preventDefault(); execFormat("underline"); }} title="Underline" className={fmtBtn(fmtUnderline)}><Underline size={15} /></button>
          <button onMouseDown={e => { e.preventDefault(); execFormat("strikeThrough"); }} title="Strikethrough" className={fmtBtn(fmtStrike)}><Strikethrough size={15} /></button>
          <div className="relative">
            <button
              onMouseDown={e => {
                e.preventDefault();
                const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
                const panelWidth = 220;
                const centeredLeft = rect.left + rect.width / 2 - panelWidth / 2;
                const clampedLeft = Math.max(8, Math.min(centeredLeft, window.innerWidth - panelWidth - 8));
                setTextColorMenuPos({ top: rect.bottom + 6, left: clampedLeft });
                setShowHighlightColorMenu(false);
                setShowTextColorMenu(v => !v);
              }}
              title="Text color"
              className="p-1.5 hover:bg-[var(--color-surface)] rounded"
            >
              <div className="flex h-[18px] w-[18px] items-center justify-center">
                <span className="text-[12px] font-bold leading-none" style={{ color: "var(--color-text-primary)" }}>A</span>
              </div>
              <div className="mx-auto mt-0.5 h-[2px] w-3 rounded-full" style={{ backgroundColor: currentTextColor }} />
            </button>
            {showTextColorMenu && (
              <TextColorPalette
                color={currentTextColor}
                pos={textColorMenuPos}
                onColorChange={handleTextColor}
                onClose={() => setShowTextColorMenu(false)}
              />
            )}
          </div>

          {/* Highlight */}
          <div className="relative">
            <button
              onMouseDown={e => {
                e.preventDefault();
                const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
                const panelWidth = 220;
                const centeredLeft = rect.left + rect.width / 2 - panelWidth / 2;
                const clampedLeft = Math.max(8, Math.min(centeredLeft, window.innerWidth - panelWidth - 8));
                setHighlightColorMenuPos({ top: rect.bottom + 6, left: clampedLeft });
                setShowTextColorMenu(false);
                setShowHighlightColorMenu(v => !v);
              }}
              title="Highlight color"
              className="p-1.5 hover:bg-[var(--color-surface)] rounded flex items-center gap-0.5"
            >
              <Highlighter size={15} />
              <div className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: currentHighlightColor ?? "#D1D5DB" }} />
            </button>
            {showHighlightColorMenu && (
              <HighlightColorPalette
                color={currentHighlightColor}
                pos={highlightColorMenuPos}
                onColorChange={handleHighlightColor}
                onClear={clearHighlightColor}
                onClose={() => setShowHighlightColorMenu(false)}
              />
            )}
          </div>

          <div className="w-px h-5 bg-slate-200/50 mx-1 shrink-0" />

          {/* Lists */}
          <button onMouseDown={e => { e.preventDefault(); execFormat("insertUnorderedList"); }} title="Bullet list" className="p-1.5 hover:bg-[var(--color-surface)] rounded"><List size={15} /></button>
          <button onMouseDown={e => { e.preventDefault(); execFormat("insertOrderedList"); }} title="Ordered list" className="p-1.5 hover:bg-[var(--color-surface)] rounded"><ListOrdered size={15} /></button>

          {/* Alignment */}
          <button onMouseDown={e => { e.preventDefault(); execFormat("justifyLeft"); }} title="Align left" className="p-1.5 hover:bg-[var(--color-surface)] rounded"><AlignLeft size={15} /></button>
          <button onMouseDown={e => { e.preventDefault(); execFormat("justifyCenter"); }} title="Align center" className="p-1.5 hover:bg-[var(--color-surface)] rounded"><AlignCenter size={15} /></button>
          <button onMouseDown={e => { e.preventDefault(); execFormat("justifyRight"); }} title="Align right" className="p-1.5 hover:bg-[var(--color-surface)] rounded"><AlignRight size={15} /></button>

          <div className="w-px h-5 bg-slate-200/50 mx-1 shrink-0" />

          {/* Insert Image */}
          <button onMouseDown={e => { e.preventDefault(); handleInsertImage(); }} title="Insert Image"
            className="p-1.5 hover:bg-[var(--color-surface)] rounded flex items-center gap-1 text-[11px]" style={{ fontWeight: 600 }}>
            <ImageIcon size={14} color="#6366F1" />
          </button>

          {/* Favorite */}
          <button onMouseDown={e => { e.preventDefault(); toggleFavorite(); }} title="Favorite"
            className={`p-1.5 rounded transition-all ${isFavorite ? "bg-amber-50 text-amber-500" : "hover:bg-[var(--color-surface)] text-[var(--color-text-secondary)]"}`}>
            <Star size={15} fill={isFavorite ? "currentColor" : "none"} />
          </button>

          <div className="w-px h-5 bg-slate-200/50 mx-1 shrink-0" />

          {/* Tag menu – fixed positioning */}
          <div className="relative">
            <button onClick={e => {
              const r = (e.currentTarget as HTMLElement).getBoundingClientRect();
              setTagMenuPos({ top: r.bottom + 4, left: Math.max(8, r.right - 210) });
              setShowTagMenu(!showTagMenu);
              setShowCourseMenu(false);
              setShowReminderMenu(false);
            }}
              className="p-1.5 hover:bg-[var(--color-primary)]/20 rounded flex items-center gap-1 bg-[var(--color-primary)]/10 text-[var(--color-primary)] text-[11px] px-2"
              style={{ fontWeight: 600 }}><Tag size={13} /> Tag</button>
            {showTagMenu && (
              <>
                <div style={{ position: "fixed", inset: 0, zIndex: 99990 }} onClick={() => setShowTagMenu(false)} />
                <div style={{ position: "fixed", top: tagMenuPos.top, left: tagMenuPos.left, zIndex: 99999, background: "white", border: "1px solid #e2e8f0", boxShadow: "0 12px 40px rgba(0,0,0,.18)", borderRadius: 12, padding: 12, width: 210 }}>
                  <div className="flex flex-col gap-2">
                    <span className="text-[10px] text-gray-500 uppercase tracking-wider" style={{ fontWeight: 700 }}>Tags</span>
                    <div className="flex flex-wrap gap-1.5">
                      {["RESEARCH","PLANNING","TECH","CREATIVE","INSPIRATION","PERSONAL"].map(tag => {
                        const tags = Array.isArray(note.tags) ? note.tags : [];
                        const sel = tags.includes(tag);
                        return (
                          <button key={tag} onClick={() => updateNote(note.id, { tags: sel ? tags.filter(t => t !== tag) : [...tags, tag] })}
                            className={`text-[10px] px-2 py-1 rounded tracking-wider transition-colors ${sel ? "bg-[var(--color-primary)] text-white" : "bg-gray-100 text-gray-500 hover:bg-indigo-50"}`}
                            style={{ fontWeight: 700 }}>{tag}</button>
                        );
                      })}
                    </div>
                  </div>
                  <div className="h-px bg-gray-200 my-2" />
                  <form onSubmit={e => { e.preventDefault(); const input = (e.currentTarget.elements.namedItem("customTag") as HTMLInputElement); const newTag = input.value.trim().toUpperCase(); const tags = Array.isArray(note.tags) ? note.tags : []; if (newTag && !tags.includes(newTag)) { updateNote(note.id, { tags: [...tags, newTag] }); input.value = ""; } }} className="flex gap-2">
                    <input name="customTag" type="text" placeholder="Add tag..." className="flex-1 bg-gray-50 border border-gray-200 rounded p-1.5 text-xs focus:outline-none focus:ring-1 focus:ring-indigo-400" />
                    <button type="submit" className="bg-gray-50 hover:bg-gray-100 rounded px-2 text-xs border border-gray-200" style={{ fontWeight: 600 }}>Add</button>
                  </form>
                </div>
              </>
            )}
          </div>

          {/* Course – fixed positioning */}
          <div className="relative">
            <button onClick={e => {
              const r = (e.currentTarget as HTMLElement).getBoundingClientRect();
              setCourseMenuPos({ top: r.bottom + 4, left: Math.max(8, r.right - 250) });
              void loadAvailableCourses();
              setShowCourseMenu(!showCourseMenu);
              setShowTagMenu(false);
              setShowReminderMenu(false);
            }}
              className="p-1.5 hover:bg-blue-100 rounded flex items-center gap-1 bg-blue-50 text-blue-600 text-[11px] px-2"
              style={{ fontWeight: 600 }}>
              <GraduationCap size={13} /> Course
            </button>
            {showCourseMenu && (
              <>
                <div style={{ position: "fixed", inset: 0, zIndex: 99990 }} onClick={() => setShowCourseMenu(false)} />
                <div style={{ position: "fixed", top: courseMenuPos.top, left: courseMenuPos.left, zIndex: 99999, background: "white", border: "1px solid #e2e8f0", boxShadow: "0 12px 40px rgba(0,0,0,.18)", borderRadius: 12, padding: 12, width: 250 }}>
                  <div className="flex flex-col gap-2">
                    <span className="text-[10px] text-gray-500 uppercase tracking-wider" style={{ fontWeight: 700 }}>Courses</span>

                    {availableCourses.length === 0 ? (
                      <p className="text-xs text-slate-500 leading-relaxed bg-slate-50 border border-slate-100 rounded-lg px-3 py-2">
                        You have not created any courses yet. Add one on your Personal page to organize your study notes.
                      </p>
                    ) : (
                      <div className="flex flex-col gap-1.5 max-h-56 overflow-y-auto pr-1">
                        <button
                          onClick={() => handleSelectCourse(null)}
                          className={`w-full text-left rounded-lg px-3 py-2 text-xs border transition-colors ${selectedCourseId === null ? "bg-blue-50 border-blue-200 text-blue-700" : "bg-white border-slate-200 text-slate-500 hover:bg-slate-50"}`}
                          style={{ fontWeight: 600 }}
                        >
                          No course selected
                        </button>
                        {availableCourses.map((course) => {
                          const isSelected = selectedCourseId === course.id;
                          return (
                            <button
                              key={course.id}
                              onClick={() => handleSelectCourse(course.id)}
                              className={`w-full text-left rounded-lg px-3 py-2 text-xs border transition-colors ${isSelected ? "bg-blue-50 border-blue-200 text-blue-700" : "bg-white border-slate-200 text-slate-700 hover:bg-slate-50"}`}
                            >
                              <div className="font-semibold">{course.title}</div>
                              {(course.code || course.subtitle) && (
                                <div className="text-[10px] text-slate-500 mt-0.5">{course.code || ""}{course.code && course.subtitle ? " • " : ""}{course.subtitle || ""}</div>
                              )}
                            </button>
                          );
                        })}
                      </div>
                    )}
                  </div>
                </div>
              </>
            )}
          </div>

          {/* Reminder – fixed positioning */}
          <div className="relative">
            <button onClick={e => {
              const r = (e.currentTarget as HTMLElement).getBoundingClientRect();
              setReminderMenuPos({ top: r.bottom + 4, left: Math.max(8, r.right - 260) });
              setShowReminderMenu(!showReminderMenu);
              setShowTagMenu(false);
              setShowCourseMenu(false);
            }}
              className="p-1.5 hover:bg-orange-100 rounded flex items-center gap-1 bg-orange-50 text-orange-500 text-[11px] px-2" style={{ fontWeight: 600 }}>
              <Bell size={13} /> Reminder
            </button>
            {showReminderMenu && (
              <>
                <div style={{ position: "fixed", inset: 0, zIndex: 99990 }} onClick={() => setShowReminderMenu(false)} />
                <div style={{ position: "fixed", top: reminderMenuPos.top, left: reminderMenuPos.left, zIndex: 99999, background: "white", border: "1px solid #e2e8f0", boxShadow: "0 12px 40px rgba(0,0,0,.18)", borderRadius: 12, padding: 16, width: 260 }}>
                  <div className="flex items-center gap-2 mb-2">
                    <Clock size={14} className="text-orange-500" />
                    <span className="text-sm font-bold text-slate-800">Set Reminder</span>
                  </div>
                  <input type="text" value={reminderTitle} onChange={e => setReminderTitle(e.target.value)} placeholder="Reminder title…" className="w-full border border-slate-200 rounded-lg px-3 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-orange-300 mb-2" />
                  <input type="date" value={reminderDate} onChange={e => setReminderDate(e.target.value)} className="w-full border border-slate-200 rounded-lg px-3 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-orange-300 mb-2" />
                  <input type="time" value={reminderTime} onChange={e => setReminderTime(e.target.value)} className="w-full border border-slate-200 rounded-lg px-3 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-orange-300 mb-3" />
                  <div className="flex gap-2">
                    <button onClick={() => setShowReminderMenu(false)} className="flex-1 py-1.5 rounded-lg border border-slate-200 text-xs text-slate-500 hover:bg-slate-50" style={{ fontWeight: 600 }}>Cancel</button>
                    <button onClick={handleAddReminder} className="flex-1 py-1.5 rounded-lg bg-orange-500 text-white text-xs hover:bg-orange-600" style={{ fontWeight: 600 }}>Set</button>
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      );
    }

    /* ─── VIEW TAB ─── */
    if (activeTab === "View") {
      return (
        <div className="ln-editor-viewbar flex items-center h-10 px-3 gap-4 overflow-x-auto scrollbar-hide text-[var(--color-text-secondary)] bg-[var(--color-background)] border-b border-slate-200/50">
          <div className="flex items-center gap-2 shrink-0">
            <span className="text-[10px] text-slate-400 uppercase tracking-wider" style={{ fontWeight: 700 }}>Color</span>
            <div className="flex gap-1">
              {COLORS.map(c => (
                <button key={c.id} onClick={() => updateNote(note.id, { color_style: c.id })}
                  className={`w-5 h-5 rounded-full border transition-all ${(note.color_style || "white") === c.id ? "scale-110 ring-2 ring-offset-1 ring-[var(--color-primary)]" : `${c.border} hover:scale-105`} ${c.class}`} />
              ))}
            </div>
          </div>
          <div className="w-px h-5 bg-slate-200/50 shrink-0" />
          <div className="flex items-center gap-2 shrink-0">
            <span className="text-[10px] text-slate-400 uppercase tracking-wider" style={{ fontWeight: 700 }}>Pattern</span>
            <div className="flex items-center bg-[var(--color-surface)] border border-slate-200/50 rounded p-0.5">
              {PATTERNS.map(p => (
                <button key={p.id} onClick={() => updateNote(note.id, { paper_style: p.id })}
                  className={`px-2 py-0.5 text-[10px] rounded transition-colors ${(note.paper_style || "plain") === p.id ? "bg-[var(--color-primary)] text-white shadow-sm" : "hover:bg-[var(--color-background)] text-[var(--color-text-secondary)]"}`}
                  style={{ fontWeight: 600 }}>{p.label}</button>
              ))}
            </div>
          </div>
        </div>
      );
    }

    return null;
  };

  /* ═══════════════════════════════════════════════
     RENDER
     ═══════════════════════════════════════════════ */
  return (
    <div className="h-full flex flex-col bg-[var(--color-surface)] overflow-hidden" data-editor-shell>
      {/* CSS for draw tool animation + editor styles */}
      <style>{`
        @keyframes dtPop { 0%{transform:scale(.95);opacity:0} 100%{transform:scale(1);opacity:1} }
        [data-luminote-editor] h1 { font-size:2em; font-weight:bold; margin:.4em 0; }
        [data-luminote-editor] h2 { font-size:1.5em; font-weight:bold; margin:.4em 0; }
        [data-luminote-editor] h3 { font-size:1.2em; font-weight:bold; margin:.4em 0; }
        [data-luminote-editor] blockquote { border-left:3px solid #6366F1; margin:8px 0; padding:4px 16px; color:#6B7280; }
        [data-luminote-editor] ul { list-style:disc; padding-left:24px; margin:4px 0; }
        [data-luminote-editor] ol { list-style:decimal; padding-left:24px; margin:4px 0; }
        [data-luminote-editor] hr { border:none; border-top:1.5px solid #E5E7EB; margin:12px 0; }
        [data-luminote-editor] img {
          max-width:100%; height:auto; border-radius:8px; margin:6px 4px;
          display:inline-block; cursor:move;
          border:2px solid transparent; transition:border-color .2s;
          user-select:none;
          -webkit-user-drag:none;
        }
        [data-luminote-editor] img:hover { border-color:#6366F1; }
        [data-luminote-editor] img::selection { background:rgba(99,102,241,.2); }
        [data-luminote-editor] mark { background:#FEF08A; border-radius:2px; }
        [data-luminote-editor] a { color:#6366F1; text-decoration:underline; }
        [data-luminote-editor]:empty:before { content:attr(data-placeholder); color:#94a3b8; pointer-events:none; }

        html[data-theme="obsidian"] [data-editor-shell] .ln-editor-tabs {
          background: #0b0f19;
          border-bottom-color: #2f3644;
        }

        html[data-theme="obsidian"] [data-editor-shell] .ln-editor-tab {
          background: #111827;
          border-color: #2f3644;
          color: #9ca3af;
        }

        html[data-theme="obsidian"] [data-editor-shell] .ln-editor-tab:hover {
          background: #1f2937;
          color: #e5e7eb;
        }

        html[data-theme="obsidian"] [data-editor-shell] .ln-editor-tab.is-active {
          background: #020617 !important;
          border-color: #374151 !important;
          color: #ffffff !important;
        }

        html[data-theme="obsidian"] [data-editor-shell] .ln-editor-header,
        html[data-theme="obsidian"] [data-editor-shell] .ln-editor-toolbar,
        html[data-theme="obsidian"] [data-editor-shell] .ln-editor-viewbar {
          background: #0f172a;
          border-color: #334155;
        }

        html[data-theme="obsidian"] [data-editor-shell] .ln-editor-title {
          color: #e5e7eb !important;
          caret-color: #f8fafc;
        }

        html[data-theme="obsidian"] [data-editor-shell] .ln-editor-title::placeholder {
          color: #94a3b8;
        }

        html[data-theme="obsidian"] [data-editor-shell] .ln-editor-mode-tabs {
          background: #0f172a;
          border-color: #334155;
        }

        html[data-theme="obsidian"] [data-editor-shell] .ln-editor-mode-tab {
          color: #cbd5e1;
        }

        html[data-theme="obsidian"] [data-editor-shell] .ln-editor-tool-btn,
        html[data-theme="obsidian"] [data-editor-shell] .ln-editor-dropdown-trigger,
        html[data-theme="obsidian"] [data-editor-shell] .ln-editor-dropdown-label,
        html[data-theme="obsidian"] [data-editor-shell] .ln-editor-toolbar button {
          color: #e5e7eb;
        }

        html[data-theme="obsidian"] [data-editor-shell] .ln-editor-dropdown-panel {
          background: #111827 !important;
          border-color: #334155 !important;
          color: #e5e7eb !important;
        }

        html[data-theme="obsidian"] [data-editor-shell] .ln-editor-dropdown-item {
          color: #e5e7eb !important;
        }

        html[data-theme="obsidian"] [data-editor-shell] .ln-editor-dropdown-item:hover,
        html[data-theme="obsidian"] [data-editor-shell] .ln-editor-dropdown-item.bg-indigo-50 {
          background: #1f2937 !important;
          color: #ffffff !important;
        }

        html[data-theme="obsidian"] [data-editor-shell] [data-luminote-editor] {
          color: #f8fafc !important;
          caret-color: #f8fafc;
          border-top: 1px solid #334155;
        }

        html[data-theme="obsidian"] [data-editor-shell] .ln-editor-canvas-shell {
          border-top: 1px solid #334155;
        }

        html[data-theme="obsidian"] [data-editor-shell] [data-luminote-editor]:empty:before {
          color: #94a3b8;
        }
      `}</style>

      {/* ── Chrome Tabs ── */}
      <div className="ln-editor-tabs flex items-end px-2 pt-1.5 bg-[#E5E7EB] border-b border-gray-300 gap-0.5 overflow-x-auto scrollbar-hide shrink-0">
        {openTabs.map(tabId => {
          const tNote = notes.find(n => n.id === tabId);
          const isActive = id === tabId;
          return (
            <div key={tabId} onClick={() => navigate(`/home/editor/${tabId}`)}
              className={`ln-editor-tab group flex items-center gap-1.5 max-w-[180px] min-w-[100px] px-2.5 py-1.5 rounded-t-lg cursor-pointer border border-b-0 transition-colors ${isActive ? "is-active bg-white border-gray-300 text-gray-900 z-10" : "bg-[#F3F4F6] border-transparent text-gray-500 hover:bg-white/60"}`}>
              <FileText size={12} className={isActive ? "text-[var(--color-primary)]" : "text-gray-400"} />
              <span className="text-[11px] truncate flex-1" style={{ fontWeight: 600 }}>{tNote?.title || "Untitled Note"}</span>
              <button onClick={e => handleCloseTab(e, tabId)}
                className={`p-0.5 rounded-full hover:bg-gray-200 transition-colors ${isActive ? "opacity-100" : "opacity-0 group-hover:opacity-100"}`}><X size={10} /></button>
            </div>
          );
        })}
        <button onClick={handleNewTab} className="p-1 ml-0.5 mb-0.5 rounded hover:bg-gray-300 text-gray-500 transition-colors"><Plus size={14} /></button>
      </div>

      {/* ── Header ── */}
      <div className="bg-[var(--color-surface)] shrink-0 z-40 shadow-[0_2px_8px_rgba(0,0,0,0.02)]">
        <header className="ln-editor-header flex items-center justify-between px-2 py-1.5">
          <div className="flex items-center gap-1 min-w-0">
            <button onClick={() => navigate("/home")} className="w-7 h-7 flex items-center justify-center rounded text-[var(--color-text-secondary)] hover:bg-[var(--color-background)] transition-colors shrink-0"><ArrowLeft size={16} /></button>
            <input type="text" value={title} onChange={e => { const nextTitle = e.target.value; setTitle(nextTitle); isDirty.current = true; persistEditorDraft(nextTitle, content, drawSnapshot); }}
              className="ln-editor-title text-sm text-[var(--color-text-primary)] bg-transparent outline-none w-[140px] focus:w-[200px] transition-all border border-transparent hover:border-slate-200/50 rounded px-1.5 py-0.5" style={{ fontWeight: 600 }} placeholder="Rename Note..." />
          </div>

          {/* Ribbon Tabs — only Home, Draw, View */}
          <div className="ln-editor-mode-tabs absolute left-1/2 -translate-x-1/2 flex items-center bg-[var(--color-background)] rounded-full p-0.5 border border-slate-200/50">
            {(["Home","Draw","View"] as const).map(tab => (
              <button key={tab} onClick={() => setActiveTab(tab)}
                className={`ln-editor-mode-tab px-4 py-1 rounded-full text-xs transition-all ${activeTab === tab ? "bg-[var(--color-primary)] text-white shadow-sm" : "text-[var(--color-text-secondary)] hover:bg-[var(--color-surface)]"}`}
                style={{ fontWeight: 600 }}>{tab}</button>
            ))}
          </div>

          <div className="flex items-center gap-1">
            <button onClick={handleSummarize}
              className="px-2.5 h-7 flex items-center gap-1 rounded bg-[var(--color-primary)]/10 text-[var(--color-primary)] hover:bg-[var(--color-primary)]/20 transition-colors text-[11px]" style={{ fontWeight: 600 }}>
              <Sparkles size={12} /> Summarize
            </button>
            <button onClick={handleShare} title="Copy link"
              className="w-7 h-7 flex items-center justify-center rounded text-[var(--color-text-secondary)] hover:bg-[var(--color-background)] transition-colors hidden sm:flex">
              <Share2 size={14} />
            </button>
            <div className="relative">
              <button onClick={e => {
                const r = (e.currentTarget as HTMLElement).getBoundingClientRect();
                setMoreMenuPos({ top: r.bottom + 4, left: Math.max(8, r.right - 180) });
                setShowMoreMenu(v => !v);
              }}
                className="w-7 h-7 flex items-center justify-center rounded text-[var(--color-text-secondary)] hover:bg-[var(--color-background)] transition-colors">
                <MoreHorizontal size={16} />
              </button>
              {showMoreMenu && (
                <>
                  <div style={{ position: "fixed", inset: 0, zIndex: 99990 }} onClick={() => setShowMoreMenu(false)} />
                  <div style={{ position: "fixed", top: moreMenuPos.top, left: moreMenuPos.left, zIndex: 99999, background: "white", border: "1px solid #e2e8f0", boxShadow: "0 12px 40px rgba(0,0,0,.18)", borderRadius: 12, padding: "4px 0", width: 180 }}>
                    <button onClick={handleExportText} className="w-full text-left px-4 py-2.5 text-xs hover:bg-gray-50 flex items-center gap-2" style={{ fontWeight: 500 }}>
                      📄 Download as .txt
                    </button>
                    <button onClick={handlePrint} className="w-full text-left px-4 py-2.5 text-xs hover:bg-gray-50 flex items-center gap-2" style={{ fontWeight: 500 }}>
                      🖨️ Print
                    </button>
                    <button onClick={() => { handleShare(); setShowMoreMenu(false); }} className="w-full text-left px-4 py-2.5 text-xs hover:bg-gray-50 flex items-center gap-2" style={{ fontWeight: 500 }}>
                      🔗 Copy Link
                    </button>
                    <div className="h-px bg-gray-100 mx-3 my-1" />
                    <button onClick={() => { if (note) { clearCanvasSnapshot(); updateNote(note.id, { title: "", content: "" }); if (editorRef.current) { while (editorRef.current.firstChild) { editorRef.current.removeChild(editorRef.current.firstChild); } } setTitle(""); setContent(""); } setShowMoreMenu(false); }} className="w-full text-left px-4 py-2.5 text-xs hover:bg-red-50 text-red-500 flex items-center gap-2" style={{ fontWeight: 500 }}>
                      🗑️ Clear Note
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>
        </header>

        {renderToolbar()}
      </div>

      {/* ── Editor Canvas ── */}
      <div ref={editorCanvasShellRef} className="ln-editor-canvas-shell flex-1 overflow-auto relative">
        <div className={`min-h-full ${currentColorObj.class} relative transition-colors duration-300`} style={getPatternStyle()}>
          <div
            ref={editorRef}
            data-luminote-editor
            contentEditable
            suppressContentEditableWarning
            onInput={handleEditorInput}
            onMouseDown={(e) => {
              if (activeTab === "Draw") return;
              const target = e.target as HTMLElement;
              if (target instanceof HTMLImageElement) {
                selectImage(target);
                startImageMove(e);
              } else {
                clearActiveImage();
              }
            }}
            onMouseMove={(e) => {
              if (activeTab === "Draw") return;
              const target = e.target as HTMLElement;
              if (target instanceof HTMLImageElement) {
                if (activeImageRef.current !== target) {
                  selectImage(target);
                } else {
                  refreshActiveImageBox();
                }
              }
            }}
            onDragOver={(e) => {
              if ([...e.dataTransfer.items].some((item) => item.type.startsWith("image/"))) {
                e.preventDefault();
                e.dataTransfer.dropEffect = "copy";
              }
            }}
            onDrop={(e) => {
              const files = [...e.dataTransfer.files].filter((f) => f.type.startsWith("image/"));
              if (!files.length) return;
              e.preventDefault();
              focusEditor();
              const rangeFromPoint = document.caretRangeFromPoint?.(e.clientX, e.clientY);
              if (rangeFromPoint) {
                const sel = window.getSelection();
                sel?.removeAllRanges();
                sel?.addRange(rangeFromPoint);
              }
              void insertImageFromFile(files[0]);
            }}
            onKeyUp={updateFormatState}
            onMouseUp={updateFormatState}
            onKeyDown={() => { isDirty.current = true; }}
            spellCheck
            data-placeholder="Start typing…"
            style={{
              minHeight: "100%",
              padding: `${LINE_HEIGHT}px 72px 48px`,
              lineHeight: `${LINE_HEIGHT}px`,
              fontSize: `${defaultSize}px`,
              fontFamily: defaultFont.css,
              color: "var(--color-text-primary, #1e293b)",
              outline: "none",
              position: "relative",
              zIndex: 10,
              whiteSpace: "pre-wrap",
              wordBreak: "break-word",
            }}
            className="focus:outline-none"
          />

          {/* Drawing Canvas + Eraser cursor overlay */}
          <div style={{ position: "absolute", inset: 0, zIndex: 30, pointerEvents: activeTab === "Draw" ? "auto" : "none" }}>
            <canvas
              ref={canvasRef}
              style={{
                position: "absolute", inset: 0, width: "100%", height: "100%",
                cursor: "none",
                touchAction: "none",
              }}
              onPointerDown={startDrawing}
              onPointerMove={e => { draw(e); handleCanvasMouseMove(e); }}
              onPointerUp={stopDrawing}
              onPointerOut={e => { stopDrawing(e); handleCanvasLeave(); }}
              onPointerCancel={e => { stopDrawing(e); handleCanvasLeave(); }}
            />
            {/* Eraser circle cursor */}
            {drawTool === "eraser" && eraserCircle && (
              <div
                style={{
                  position: "absolute",
                  left: eraserCircle.x,
                  top:  eraserCircle.y,
                  width:  eraserSize * 6,
                  height: eraserSize * 6,
                  borderRadius: "50%",
                  border: "2px solid #374151",
                  background: "rgba(255,255,255,0.3)",
                  transform: "translate(-50%, -50%)",
                  pointerEvents: "none",
                  boxShadow: "0 0 0 1px rgba(0,0,0,.15)",
                }}
              />
            )}
            {/* Crosshair cursor for other tools */}
            {drawTool !== "eraser" && eraserCircle === null && activeTab === "Draw" && (
              <style>{`canvas { cursor: crosshair !important; }`}</style>
            )}
          </div>

          {activeTab !== "Draw" && activeImageBox.visible && activeImageRef.current && (
            <div
              style={{
                position: "fixed",
                top: activeImageBox.centerY,
                left: activeImageBox.centerX,
                width: activeImageBox.width,
                height: activeImageBox.height,
                transform: `translate(-50%, -50%) rotate(${activeImageBox.rotation}deg)`,
                transformOrigin: "center center",
                zIndex: 60,
                pointerEvents: "none",
              }}
            >
              <div
                style={{
                  position: "absolute",
                  inset: 0,
                  border: "1.5px solid rgba(99,102,241,.65)",
                  borderRadius: 8,
                }}
              />

              {[
                { dir: "n", top: "0%", left: "50%", cursor: "ns-resize" },
                { dir: "s", top: "100%", left: "50%", cursor: "ns-resize" },
                { dir: "e", top: "50%", left: "100%", cursor: "ew-resize" },
                { dir: "w", top: "50%", left: "0%", cursor: "ew-resize" },
                { dir: "ne", top: "0%", left: "100%", cursor: "nesw-resize" },
                { dir: "nw", top: "0%", left: "0%", cursor: "nwse-resize" },
                { dir: "se", top: "100%", left: "100%", cursor: "nwse-resize" },
                { dir: "sw", top: "100%", left: "0%", cursor: "nesw-resize" },
              ].map((h) => (
                <button
                  key={h.dir}
                  onMouseDown={(e) => startImageResize(h.dir, e)}
                  style={{
                    position: "absolute",
                    top: h.top,
                    left: h.left,
                    transform: "translate(-50%, -50%)",
                    width: 10,
                    height: 10,
                    borderRadius: 999,
                    border: "1px solid #6366F1",
                    background: "#fff",
                    cursor: h.cursor,
                    pointerEvents: "auto",
                  }}
                />
              ))}

              <button
                onMouseDown={startImageRotate}
                title="Rotate image"
                style={{
                  position: "absolute",
                  top: "calc(100% + 22px)",
                  left: "50%",
                  transform: "translate(-50%, -50%)",
                  width: 28,
                  height: 28,
                  borderRadius: 999,
                  border: "1px solid rgba(148,163,184,.5)",
                  background: "#fff",
                  color: "#64748B",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  cursor: "grab",
                  boxShadow: "0 8px 18px rgba(0,0,0,.12)",
                  pointerEvents: "auto",
                }}
              >
                <RotateCw size={14} />
              </button>
            </div>
          )}
        </div>
      </div>

      {/* ── AI Floating Button ── */}
      {aiPopupPos && !showAiChat && (
        <div style={{ position: "fixed", top: Math.max(10, aiPopupPos.top), left: Math.max(10, aiPopupPos.left), transform: "translateX(-50%)", zIndex: 99999 }}>
          <button onMouseDown={e => {
            e.preventDefault();
            setShowAiChat(true);
            setAiPopupPos(null);
          }}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-gray-900 text-white rounded-full text-xs shadow-lg hover:bg-gray-800 transition-colors"
            style={{ fontWeight: 600 }}>
            <Sparkles size={13} className="text-yellow-400" />
            Ask Luminote AI
          </button>
        </div>
      )}

      {/* ── AI Chat Modal ── */}
      {showAiChat && (
        <div className="flex flex-col bg-white rounded-xl shadow-[0_12px_40px_rgba(0,0,0,0.2)] border border-gray-200 overflow-hidden"
             style={{ position: "fixed", bottom: 24, right: 24, width: 340, height: 460, zIndex: 99999 }}>
          <div className="bg-gray-900 text-white px-4 py-3 flex items-center justify-between shrink-0">
            <div className="flex items-center gap-2">
              <Sparkles size={14} className="text-yellow-400" />
              <span className="text-sm font-semibold">Luminote AI</span>
            </div>
            <button onClick={() => setShowAiChat(false)} className="text-gray-400 hover:text-white transition-colors"><X size={16} /></button>
          </div>
          
          <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-3 bg-gray-50/50 text-[13px]">
            {aiChatHistory.length === 0 && (
              <div className="text-center text-gray-500 mt-4">
                {selectedText ? "Ask a question about your selected text..." : "Ask me anything..."}
              </div>
            )}
            {aiChatHistory.map((m, i) => (
              <div key={i} className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}>
                <div className={`max-w-[85%] p-3 rounded-xl whitespace-pre-wrap ${m.role === "user" ? "bg-indigo-600 text-white rounded-br-none shadow-sm" : "bg-white text-gray-800 border border-gray-200 rounded-bl-none shadow-sm"}`}>
                  {m.content}
                </div>
              </div>
            ))}
            {isAiLoading && (
              <div className="flex justify-start">
                <div className="bg-white border border-gray-200 p-3 rounded-xl rounded-bl-none shadow-sm flex items-center gap-1.5">
                  <div className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce" style={{animationDelay: "0ms"}}></div>
                  <div className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce" style={{animationDelay: "150ms"}}></div>
                  <div className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce" style={{animationDelay: "300ms"}}></div>
                </div>
              </div>
            )}
          </div>
          
          <div className="p-3 bg-white border-t border-gray-100 flex gap-2 shrink-0">
            <input type="text" value={aiInput} onChange={e => setAiInput(e.target.value)} onKeyDown={e => { if(e.key === "Enter") handleSendAi() }} placeholder="Ask something..." 
              className="flex-1 text-[13px] bg-gray-100 rounded-full px-4 py-2 outline-none focus:ring-2 focus:ring-indigo-100 transition-all border border-transparent focus:border-indigo-200 focus:bg-white" />
            <button onClick={handleSendAi} disabled={!aiInput.trim() || isAiLoading} 
              className="w-9 h-9 shrink-0 flex items-center justify-center bg-indigo-600 text-white rounded-full hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors">
              <ArrowLeft size={16} className="rotate-180" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
