import React, { useState, useEffect, useRef, useCallback } from "react";
import { useParams, useNavigate } from "react-router";
import {
  ArrowLeft, Share2, MoreHorizontal,
  Undo, Redo, Bold, Italic, Underline, Strikethrough,
  Highlighter, List, ListOrdered, AlignLeft,
  AlignCenter, AlignRight,
  Tag, PenTool, Eraser, Plus, X, Sparkles,
  FileText, ChevronDown, Bell, Clock, Image as ImageIcon,
  Star,
} from "lucide-react";
import { useNotes } from "./NotesContext";
import { useAuth } from "./AuthContext";
import { useToast } from "./toast";

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
    const span = document.createElement("span");
    span.style.fontSize = `${size}px`;
    span.innerHTML = el.innerHTML;
    el.parentNode?.replaceChild(span, el);
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
  const { notes, notesLoading, updateNote, addNote, addReminder } = useNotes();
  const { settings: userSettings } = useAuth();
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
  const [title,   setTitle]   = useState(note?.title   || "");
  const [content, setContent] = useState(note?.content || "");
  const isDirty   = useRef(false);
  const editorRef = useRef<HTMLDivElement>(null);

  /* ── Toolbar state ── */
  const [activeTab,        setActiveTab]        = useState<"Home"|"Draw"|"View">("Home");
  const [showTagMenu,      setShowTagMenu]      = useState(false);
  const [showReminderMenu, setShowReminderMenu] = useState(false);
  const [reminderTitle,    setReminderTitle]    = useState("");
  const [reminderDate,     setReminderDate]     = useState("");
  const [reminderTime,     setReminderTime]     = useState("09:00");
  const [showFontDropdown, setShowFontDropdown] = useState(false);
  const [showSizeDropdown, setShowSizeDropdown] = useState(false);
  const [showHeadingDropdown, setShowHeadingDropdown] = useState(false);
  const [headingDropdownPos, setHeadingDropdownPos] = useState({ top: 0, left: 0 });
  const [currentHeading,   setCurrentHeading]   = useState("p");
  const [isFavorite,       setIsFavorite]       = useState(false);
  const [showMoreMenu,     setShowMoreMenu]     = useState(false);
  const [tagMenuPos,       setTagMenuPos]       = useState({ top: 0, left: 0 });
  const [reminderMenuPos,  setReminderMenuPos]  = useState({ top: 0, left: 0 });
  const [moreMenuPos,      setMoreMenuPos]      = useState({ top: 0, left: 0 });

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

  /* ── Sync note → editor ── */
  useEffect(() => {
    if (note) {
      setTitle(note.title);
      setContent(note.content);
      isDirty.current = false;
    }
  }, [id, note?.id]);

  useEffect(() => {
    if (editorRef.current && note) {
      if (editorRef.current.innerHTML !== note.content) {
        editorRef.current.innerHTML = note.content || "";
      }
    }
  }, [id, note?.id]);

  /* ── Debounced save ── */
  useEffect(() => {
    if (!note || !isDirty.current) return;
    const timeout = setTimeout(() => {
      updateNote(note.id, { title, content });
      isDirty.current = false;
    }, 1500);
    return () => clearTimeout(timeout);
  }, [title, content, note?.id]);

  /* ── Canvas resize ── */
  useEffect(() => {
    if (canvasRef.current && activeTab === "Draw") {
      const canvas = canvasRef.current;
      const parent = canvas.parentElement;
      if (parent) { canvas.width = parent.scrollWidth; canvas.height = parent.scrollHeight; }
    }
  }, [activeTab, content]);

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
    setContent(editorRef.current.innerHTML);
    isDirty.current = true;
    updateFormatState();
  }, [updateFormatState]);

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

  /* ── Image insert ── */
  const handleInsertImage = () => {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = "image/*";
    input.onchange = () => {
      const file = input.files?.[0];
      if (!file) return;
      const url = URL.createObjectURL(file);
      focusEditor();
      document.execCommand("insertHTML", false,
        `<img src="${url}" alt="${file.name}" style="max-width:200px;height:auto;border-radius:8px;margin:6px 4px;display:inline-block;cursor:pointer;resize:both;overflow:auto;" />`
      );
      handleEditorInput();
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
        <div className="flex items-center h-auto min-h-[44px] px-3 py-1.5 gap-1.5 flex-wrap bg-[var(--color-background)] border-b border-slate-200/50">
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
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs border transition-all ${
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
              onClick={() => { const c = canvasRef.current; if (c) c.getContext("2d")?.clearRect(0, 0, c.width, c.height); }}
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
              className="flex items-center gap-1 bg-[var(--color-surface)] border border-slate-200/50 rounded px-2 py-1 hover:border-[var(--color-primary)] transition-colors"
            >
              <span className="text-xs w-[72px] truncate text-[var(--color-text-primary)]" style={{ fontWeight: 600 }}>{headingObj.label}</span>
              <ChevronDown size={10} />
            </button>
            {showHeadingDropdown && (
              <>
                <div style={{ position: "fixed", inset: 0, zIndex: 99990 }} onMouseDown={() => setShowHeadingDropdown(false)} />
                <div style={{
                  position: "fixed", top: headingDropdownPos.top, left: headingDropdownPos.left,
                  zIndex: 99999, background: "white", border: "1px solid #e2e8f0",
                  boxShadow: "0 12px 40px rgba(0,0,0,.18)", borderRadius: 12, padding: "6px 0", width: 200,
                }}>
                  {HEADING_OPTIONS.map(h => (
                    <button key={h.value}
                      onMouseDown={e => { e.preventDefault(); applyHeading(h.value); }}
                      className={`w-full text-left px-4 py-2.5 flex items-center gap-3 hover:bg-indigo-50 transition-colors ${currentHeading === h.value ? "bg-indigo-50" : ""}`}
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
              className="flex items-center gap-1 bg-[var(--color-surface)] border border-slate-200/50 rounded px-2 py-1 hover:border-[var(--color-primary)] transition-colors"
              style={{ fontFamily: currentFont.css }}
            >
              <span className="text-xs w-20 truncate text-[var(--color-text-primary)]">{currentFont.label}</span>
              <ChevronDown size={10} />
            </button>
            {showFontDropdown && (
              <>
                <div style={{ position: "fixed", inset: 0, zIndex: 99990 }} onMouseDown={() => setShowFontDropdown(false)} />
                <div style={{ position: "fixed", top: fontDropdownPos.top, left: fontDropdownPos.left, zIndex: 99999, background: "white", border: "1px solid #e2e8f0", boxShadow: "0 8px 32px rgba(0,0,0,.15)", borderRadius: 12, padding: "4px 0", width: 192, maxHeight: 240, overflowY: "auto" }}>
                  {FONT_FAMILIES.map(f => (
                    <button key={f.value}
                      onMouseDown={e => { e.preventDefault(); handleFontFamily(f); }}
                      className={`w-full text-left px-3 py-2 text-xs hover:bg-indigo-50 transition-colors ${currentFont.value === f.value ? "text-[var(--color-primary)] font-bold bg-indigo-50" : "text-gray-800"}`}
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
              className="flex items-center gap-1 bg-[var(--color-surface)] border border-slate-200/50 rounded px-2 py-1 hover:border-[var(--color-primary)] transition-colors"
            >
              <span className="text-xs text-[var(--color-text-primary)] w-5 text-center">{currentSize}</span>
              <ChevronDown size={10} />
            </button>
            {showSizeDropdown && (
              <>
                <div style={{ position: "fixed", inset: 0, zIndex: 99990 }} onMouseDown={() => setShowSizeDropdown(false)} />
                <div style={{ position: "fixed", top: sizeDropdownPos.top, left: sizeDropdownPos.left, zIndex: 99999, background: "white", border: "1px solid #e2e8f0", boxShadow: "0 8px 32px rgba(0,0,0,.15)", borderRadius: 12, padding: "4px 0", width: 80, maxHeight: 200, overflowY: "auto" }}>
                  {FONT_SIZES.map(s => (
                    <button key={s}
                      onMouseDown={e => { e.preventDefault(); handleFontSize(s); }}
                      className={`w-full text-center px-3 py-1.5 text-xs hover:bg-indigo-50 transition-colors ${currentSize === s ? "text-[var(--color-primary)] font-bold bg-indigo-50" : "text-gray-800"}`}>
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

          {/* Highlight */}
          <button onMouseDown={e => { e.preventDefault(); focusEditor(); document.execCommand("styleWithCSS", false, "true"); document.execCommand("hiliteColor", false, "#FEF08A"); handleEditorInput(); }} title="Highlight"
            className="p-1.5 hover:bg-[var(--color-surface)] rounded flex items-center gap-0.5">
            <Highlighter size={15} /><div className="w-1.5 h-1.5 rounded-full bg-yellow-400" />
          </button>

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
                        const sel = note.tags.includes(tag);
                        return (
                          <button key={tag} onClick={() => updateNote(note.id, { tags: sel ? note.tags.filter(t => t !== tag) : [...note.tags, tag] })}
                            className={`text-[10px] px-2 py-1 rounded tracking-wider transition-colors ${sel ? "bg-[var(--color-primary)] text-white" : "bg-gray-100 text-gray-500 hover:bg-indigo-50"}`}
                            style={{ fontWeight: 700 }}>{tag}</button>
                        );
                      })}
                    </div>
                  </div>
                  <div className="h-px bg-gray-200 my-2" />
                  <form onSubmit={e => { e.preventDefault(); const input = (e.currentTarget.elements.namedItem("customTag") as HTMLInputElement); const newTag = input.value.trim().toUpperCase(); if (newTag && !note.tags.includes(newTag)) { updateNote(note.id, { tags: [...note.tags, newTag] }); input.value = ""; } }} className="flex gap-2">
                    <input name="customTag" type="text" placeholder="Add tag..." className="flex-1 bg-gray-50 border border-gray-200 rounded p-1.5 text-xs focus:outline-none focus:ring-1 focus:ring-indigo-400" />
                    <button type="submit" className="bg-gray-50 hover:bg-gray-100 rounded px-2 text-xs border border-gray-200" style={{ fontWeight: 600 }}>Add</button>
                  </form>
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
        <div className="flex items-center h-10 px-3 gap-4 overflow-x-auto scrollbar-hide text-[var(--color-text-secondary)] bg-[var(--color-background)] border-b border-slate-200/50">
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
    <div className="h-full flex flex-col bg-[var(--color-surface)] overflow-hidden">
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
          max-width:200px; height:auto; border-radius:8px; margin:6px 4px;
          display:inline-block; cursor:nwse-resize;
          border:2px solid transparent; transition:border-color .2s;
        }
        [data-luminote-editor] img:hover { border-color:#6366F1; }
        [data-luminote-editor] img::selection { background:rgba(99,102,241,.2); }
        [data-luminote-editor] mark { background:#FEF08A; border-radius:2px; }
        [data-luminote-editor] a { color:#6366F1; text-decoration:underline; }
        [data-luminote-editor]:empty:before { content:attr(data-placeholder); color:#94a3b8; pointer-events:none; }
      `}</style>

      {/* ── Chrome Tabs ── */}
      <div className="flex items-end px-2 pt-1.5 bg-[#E5E7EB] border-b border-gray-300 gap-0.5 overflow-x-auto scrollbar-hide shrink-0">
        {openTabs.map(tabId => {
          const tNote = notes.find(n => n.id === tabId);
          const isActive = id === tabId;
          return (
            <div key={tabId} onClick={() => navigate(`/home/editor/${tabId}`)}
              className={`group flex items-center gap-1.5 max-w-[180px] min-w-[100px] px-2.5 py-1.5 rounded-t-lg cursor-pointer border border-b-0 transition-colors ${isActive ? "bg-white border-gray-300 text-gray-900 z-10" : "bg-[#F3F4F6] border-transparent text-gray-500 hover:bg-white/60"}`}>
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
        <header className="flex items-center justify-between px-2 py-1.5">
          <div className="flex items-center gap-1 min-w-0">
            <button onClick={() => navigate("/home")} className="w-7 h-7 flex items-center justify-center rounded text-[var(--color-text-secondary)] hover:bg-[var(--color-background)] transition-colors shrink-0"><ArrowLeft size={16} /></button>
            <input type="text" value={title} onChange={e => { setTitle(e.target.value); isDirty.current = true; }}
              className="text-sm text-[var(--color-text-primary)] bg-transparent outline-none w-[140px] focus:w-[200px] transition-all border border-transparent hover:border-slate-200/50 rounded px-1.5 py-0.5" style={{ fontWeight: 600 }} placeholder="Rename Note..." />
          </div>

          {/* Ribbon Tabs — only Home, Draw, View */}
          <div className="absolute left-1/2 -translate-x-1/2 flex items-center bg-[var(--color-background)] rounded-full p-0.5 border border-slate-200/50">
            {(["Home","Draw","View"] as const).map(tab => (
              <button key={tab} onClick={() => setActiveTab(tab)}
                className={`px-4 py-1 rounded-full text-xs transition-all ${activeTab === tab ? "bg-[var(--color-primary)] text-white shadow-sm" : "text-[var(--color-text-secondary)] hover:bg-[var(--color-surface)]"}`}
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
                    <button onClick={() => { if (note) { updateNote(note.id, { title: "", content: "" }); if (editorRef.current) editorRef.current.innerHTML = ""; setTitle(""); setContent(""); } setShowMoreMenu(false); }} className="w-full text-left px-4 py-2.5 text-xs hover:bg-red-50 text-red-500 flex items-center gap-2" style={{ fontWeight: 500 }}>
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
      <div className="flex-1 overflow-auto relative">
        <div className={`min-h-full ${currentColorObj.class} relative transition-colors duration-300`} style={getPatternStyle()}>
          <div
            ref={editorRef}
            data-luminote-editor
            contentEditable
            suppressContentEditableWarning
            onInput={handleEditorInput}
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
