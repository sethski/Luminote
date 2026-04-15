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
  pen:         { thin: 1.5, medium: 3,  thick: 6 },
  pencil:      { thin: 2,   medium: 5,  thick: 9 },
  highlighter: { thin: 14,  medium: 22, thick: 36 },
  eraser:      { thin: 12,  medium: 24, thick: 42 },
};
const DRAW_PALETTE = [
  "#000000","#434343","#666666","#999999","#B7B7B7","#CCCCCC","#D9D9D9","#EFEFEF","#F3F3F3","#FFFFFF",
  "#980000","#FF0000","#FF9900","#FFFF00","#00FF00","#00FFFF","#4A86E8","#0000FF","#9900FF","#FF00FF",
  "#E6B8AF","#F4CCCC","#FCE5CD","#FFF2CC","#D9EAD3","#D0E0E3","#C9DAF8","#CFE2F3","#D9D2E9","#EAD1DC",
  "#DD7E6B","#EA9999","#F9CB9C","#FFE599","#B6D7A8","#A2C4C9","#A4C2F4","#9FC5E8","#B4A7D6","#D5A6BD",
  "#CC4125","#E06666","#F6B26B","#FFD966","#93C47D","#76A5AF","#6D9EEB","#6FA8DC","#8E7CC3","#C27BA0",
];

/* ═══════════════════════════════════════════════════
   HELPERS
═══════════════════════════════════════════════════ */
const hexRgba = (hex: string, a: number) => {
  const c = hex.replace("#", "");
  const r = parseInt(c.slice(0, 2), 16), g = parseInt(c.slice(2, 4), 16), b = parseInt(c.slice(4, 6), 16);
  return `rgba(${r},${g},${b},${a})`;
};

const DRAW_KEY = (id: string) => `luminote-draw-${id}`;
const EMBED_S = "<!--LUMINOTE_DRAW_START-->";
const EMBED_E = "<!--LUMINOTE_DRAW_END-->";

function extractDraw(raw: string): { text: string; draw: string | null } {
  if (!raw) return { text: "", draw: null };
  const s = raw.indexOf(EMBED_S), e = raw.indexOf(EMBED_E);
  if (s < 0 || e < 0 || e <= s) return { text: raw, draw: null };
  const d = raw.slice(s + EMBED_S.length, e).trim();
  const t = (raw.slice(0, s) + raw.slice(e + EMBED_E.length)).trim();
  return { text: t, draw: d || null };
}

/* ═══════════════════════════════════════════════════
   SUB-COMPONENTS
═══════════════════════════════════════════════════ */
function BottomColorPicker({ color, onChange }: { color: string; onChange: (c: string) => void }) {
  return (
    <div className="flex flex-wrap gap-1 p-3 bg-white border-t overflow-y-auto max-h-32">
      {DRAW_PALETTE.map(c => (
        <button key={c} onClick={() => onChange(c)}
          className={`w-6 h-6 rounded-full border border-gray-200 transition-transform active:scale-90 ${color === c ? 'ring-2 ring-blue-500 scale-110' : ''}`}
          style={{ backgroundColor: c }} />
      ))}
    </div>
  );
}

function DrawBar({ mode, tool, sz, color, onMode, onTool, onSz, onColor }: any) {
  const [showPicker, setShowPicker] = useState(false);
  return (
    <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-[100] flex flex-col items-center gap-2">
      {showPicker && <div className="mb-2 rounded-xl shadow-2xl border bg-white overflow-hidden w-64 animate-in slide-in-from-bottom-4">
        <BottomColorPicker color={color} onChange={c => { onColor(c); setShowPicker(false); }} />
      </div>}
      <div className="bg-white/90 backdrop-blur-md border border-gray-200 rounded-full px-4 py-2 flex items-center gap-2 shadow-xl">
        <button onClick={() => onMode("draw")} className={`p-2 rounded-lg transition-all ${mode === "draw" ? 'bg-blue-100 text-blue-600 ring-1 ring-blue-200' : 'text-gray-500 hover:bg-gray-100'}`}>
          <PenTool size={20} />
        </button>
        <button onClick={() => onMode("lasso")} className={`p-2 rounded-lg transition-all ${mode === "lasso" ? 'bg-purple-100 text-purple-600 ring-1 ring-purple-200' : 'text-gray-500 hover:bg-gray-100'}`}>
          <Sparkles size={20} />
        </button>
        <button onClick={() => onMode("text")} className={`p-2 rounded-lg transition-all ${mode === "text" ? 'bg-gray-100 text-gray-900 border' : 'text-gray-500 hover:bg-gray-100'}`}>
          <Type size={20} />
        </button>
        <div className="w-px h-6 bg-gray-200 mx-1" />
        {mode === "draw" && (
          <>
            {(["pen", "pencil", "highlighter", "eraser"] as DrawTool[]).map(t => (
              <button key={t} onClick={() => onTool(t)} className={`p-2 rounded-lg transition-all ${tool === t ? 'bg-gray-100 text-gray-900 ring-1 ring-gray-200' : 'text-gray-400 hover:text-gray-600'}`}>
                {t === "pen" && <PenTool size={18} />}
                {t === "pencil" && <Type size={18} />}
                {t === "highlighter" && <Highlighter size={18} />}
                {t === "eraser" && <Eraser size={18} />}
              </button>
            ))}
            <div className="w-px h-6 bg-gray-200 mx-1" />
            {(["thin", "medium", "thick"] as StrokeSize[]).map(s => (
              <button key={s} onClick={() => onSz(s)} className={`w-8 h-8 flex items-center justify-center rounded-lg transition-all ${sz === s ? 'bg-gray-100 border-gray-300' : 'hover:bg-gray-50'}`}>
                <div className="bg-gray-600 rounded-full" style={{ width: s === "thin" ? 4 : s === "medium" ? 8 : 12, height: s === "thin" ? 4 : s === "medium" ? 8 : 12 }} />
              </button>
            ))}
            <button onClick={() => setShowPicker(!showPicker)} className="w-8 h-8 rounded-full border-2 border-white shadow-sm ring-1 ring-gray-200" style={{ backgroundColor: color }} />
          </>
        )}
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════
   MAIN COMPONENT
═══════════════════════════════════════════════════ */
export function Editor() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { notes, updateNote, deleteNote, addTagToNote, removeTagFromNote } = useNotes();
  const { user } = useAuth();
  const { toast } = useToast();

  const note = notes.find(n => n.id === id);

  // States
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [bgColor, setBgColor] = useState("white");
  const [isFavorite, setIsFavorite] = useState(false);
  const [showShare, setShowShare] = useState(false);
  const [showMore, setShowMore] = useState(false);
  const [showTags, setShowTags] = useState(false);
  const [showCourses, setShowCourses] = useState(false);
  const [showLineSettings, setShowLineSettings] = useState(false);
  const [newTagName, setNewTagName] = useState("");

  // Draw States
  const [mode, setMode] = useState<ToolMode>("text");
  const [tool, setTool] = useState<DrawTool>("pen");
  const [sz, setSz] = useState<StrokeSize>("medium");
  const [color, setColor] = useState("#000000");

  // AI States
  const [aiLoading, setAiLoading] = useState(false);
  const [aiResult, setAiResult] = useState("");
  const [showAiModal, setShowAiModal] = useState(false);
  const [aiPrompt, setAiPrompt] = useState("");
  const [chatHistory, setChatHistory] = useState<{ role: "user" | "ai"; text: string }[]>([]);
  const [showAiChat, setShowAiChat] = useState(false);

  // Refs
  const editorRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const drawingRef = useRef(false);
  const pathsRef = useRef<any[]>([]);
  const currentPathRef = useRef<any>(null);
  const redoStackRef = useRef<any[]>([]);

  // Init
  useEffect(() => {
    if (note) {
      setTitle(note.title);
      const { text, draw } = extractDraw(note.content || "");
      setContent(text);
      setBgColor(note.bg_color || "white");
      setIsFavorite(note.is_favorite || false);

      const savedDraw = localStorage.getItem(DRAW_KEY(note.id));
      if (savedDraw) {
        try { pathsRef.current = JSON.parse(savedDraw); } catch (e) { pathsRef.current = []; }
      } else if (draw) {
        try { pathsRef.current = JSON.parse(draw); } catch (e) { pathsRef.current = []; }
      }
      requestAnimationFrame(redraw);
    }
  }, [id, note]);

  // Redraw
  const redraw = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.lineCap = "round";
    ctx.lineJoin = "round";

    pathsRef.current.forEach(p => {
      if (p.points.length < 2) return;
      ctx.beginPath();
      ctx.strokeStyle = p.tool === "highlighter" ? hexRgba(p.color, 0.4) : p.color;
      ctx.lineWidth = p.width;
      ctx.globalCompositeOperation = p.tool === "eraser" ? "destination-out" : "source-over";
      ctx.moveTo(p.points[0].x, p.points[0].y);
      for (let i = 1; i < p.points.length; i++) {
        ctx.lineTo(p.points[i].x, p.points[i].y);
      }
      ctx.stroke();
    });

    if (currentPathRef.current && currentPathRef.current.points.length > 1) {
      const p = currentPathRef.current;
      ctx.beginPath();
      ctx.strokeStyle = p.tool === "highlighter" ? hexRgba(p.color, 0.4) : p.color;
      ctx.lineWidth = p.width;
      ctx.globalCompositeOperation = p.tool === "eraser" ? "destination-out" : "source-over";
      ctx.moveTo(p.points[0].x, p.points[0].y);
      for (let i = 1; i < p.points.length; i++) {
        ctx.lineTo(p.points[i].x, p.points[i].y);
      }
      ctx.stroke();
    }
    ctx.globalCompositeOperation = "source-over";
  }, []);

  // Events
  const onPointerDown = (e: React.PointerEvent) => {
    if (mode === "text") return;
    drawingRef.current = true;
    redoStackRef.current = [];
    const rect = canvasRef.current?.getBoundingClientRect();
    if (!rect) return;
    const x = e.clientX - rect.left, y = e.clientY - rect.top;
    currentPathRef.current = {
      tool, color, width: STROKE_WIDTHS[tool][sz],
      points: [{ x, y }]
    };
    redraw();
  };

  const onPointerMove = (e: React.PointerEvent) => {
    if (!drawingRef.current || !currentPathRef.current) return;
    const rect = canvasRef.current?.getBoundingClientRect();
    if (!rect) return;
    const x = e.clientX - rect.left, y = e.clientY - rect.top;
    currentPathRef.current.points.push({ x, y });
    redraw();
  };

  const onPointerUp = () => {
    if (!drawingRef.current) return;
    drawingRef.current = false;
    if (currentPathRef.current) {
      pathsRef.current.push(currentPathRef.current);
      currentPathRef.current = null;
      saveDraw();
    }
  };

  const saveDraw = () => {
    if (!id) return;
    localStorage.setItem(DRAW_KEY(id), JSON.stringify(pathsRef.current));
    redraw();
  };

  const commitCap = () => {
    if (!id) return;
    const snap = JSON.stringify(pathsRef.current);
    const fullContent = content + "\n\n" + EMBED_S + snap + EMBED_E;
    updateNote(id, { content: fullContent });
  };

  const handleUndo = () => {
    if (pathsRef.current.length === 0) return;
    redoStackRef.current.push(pathsRef.current.pop());
    saveDraw();
  };
  const handleRedo = () => {
    if (redoStackRef.current.length === 0) return;
    pathsRef.current.push(redoStackRef.current.pop());
    saveDraw();
  };

  // AI Logic
  const askAI = async (prompt: string, type: "summary" | "chat") => {
    if (!content.trim() && type === "summary") {
      toast("Please add some content first", "error");
      return;
    }
    setAiLoading(true);
    try {
      const resp = await fetch("/api/qwen", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          prompt: type === "summary" ? `Summarize this note elegantly:\n\n${content}` : prompt,
          context: content
        })
      });
      const data = await resp.json();
      if (type === "summary") {
        setAiResult(data.reply);
        setShowAiModal(true);
      } else {
        setChatHistory(prev => [...prev, { role: "ai", text: data.reply }]);
      }
    } catch (e) {
      toast("AI service unavailable", "error");
    } finally {
      setAiLoading(false);
    }
  };

  if (!note) return <div className="p-8 text-center text-gray-400">Note not found</div>;

  return (
    <div className={`min-h-screen transition-colors duration-500 flex flex-col`} style={{ backgroundColor: PAGE_COLORS.find(c => c.id === bgColor)?.hex }}>
      {/* ══ Header ══ */}
      <header className="sticky top-0 z-[110] bg-white/80 backdrop-blur-md border-b border-gray-100 px-4 h-14 flex items-center justify-between shadow-sm">
        <div className="flex items-center gap-2">
          <button onClick={() => navigate("/dashboard")} className="p-2 hover:bg-gray-100 rounded-lg text-gray-500 transition-colors">
            <ArrowLeft size={20} />
          </button>
          <div className="h-6 w-px bg-gray-200 mx-1" />
          <input value={title} onChange={e => { setTitle(e.target.value); updateNote(id!, { title: e.target.value }); }} placeholder="Untitled Note"
            className="bg-transparent border-none focus:ring-0 text-lg font-semibold text-gray-800 placeholder:text-gray-300 w-48 md:w-64" />
        </div>

        <div className="flex items-center gap-1 md:gap-3">
          <button onClick={handleUndo} className="p-2 hover:bg-gray-100 rounded-lg text-gray-500"><Undo size={18} /></button>
          <button onClick={handleRedo} className="p-2 hover:bg-gray-100 rounded-lg text-gray-500"><Redo size={18} /></button>
          <div className="h-6 w-px bg-gray-200 mx-1" />
          <button onClick={() => askAI("", "summary")} disabled={aiLoading} className="flex items-center gap-1.5 px-3 py-1.5 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-full text-sm font-medium hover:shadow-lg transition-all disabled:opacity-50">
            <Sparkles size={14} className={aiLoading ? 'animate-spin' : ''} />
            <span className="hidden sm:inline">Summarize</span>
          </button>
          <button onClick={() => setShowAiChat(true)} className="p-2 hover:bg-blue-50 text-blue-600 rounded-lg border border-blue-100"><Sparkles size={18} /></button>
          <button onClick={() => setShowMore(!showMore)} className="p-2 hover:bg-gray-100 rounded-lg text-gray-500 transition-colors"><MoreHorizontal size={20} /></button>
        </div>
      </header>

      {/* ══ Editor Body ══ */}
      <main className="flex-1 overflow-y-auto relative py-12 px-4 md:px-0">
        <div className="max-w-4xl mx-auto bg-white min-h-[1100px] shadow-2xl relative border border-gray-100 rounded-sm">
          {/* Rules / Lines */}
          <div className="absolute inset-x-0 top-0 bottom-0 pointer-events-none" style={{
            backgroundImage: `linear-gradient(to bottom, transparent ${LINE_H - 1}px, #e5e7eb ${LINE_H - 1}px, #e5e7eb ${LINE_H}px)`,
            backgroundSize: `100% ${LINE_H}px`
          }}>
            <div className="absolute top-0 left-12 md:left-20 bottom-0 w-px bg-red-100" />
          </div>

          {/* Draw Layer */}
          <canvas ref={canvasRef} width={900} height={1500} onPointerDown={onPointerDown} onPointerMove={onPointerMove} onPointerUp={onPointerUp}
            className={`absolute inset-0 z-10 w-full h-full touch-none cursor-crosshair ${mode === "text" ? 'pointer-events-none' : ''}`} />

          {/* Text Layer */}
          <div ref={editorRef} contentEditable={mode === "text"} suppressContentEditableWarning
            onInput={e => { const t = e.currentTarget.innerText; setContent(t); updateNote(id!, { content: t + "\n\n" + EMBED_S + JSON.stringify(pathsRef.current) + EMBED_E }); }}
            className={`relative z-0 min-h-full p-12 md:p-20 pt-16 outline-none text-gray-800 leading-[28px] text-lg font-serif whitespace-pre-wrap ${mode !== "text" ? 'select-none' : ''}`}>
            {content}
          </div>
        </div>
      </main>

      {/* ══ Toolbars / Modals ══ */}
      {showAiChat && (
        <div className="fixed bottom-24 right-6 w-80 md:w-96 bg-white rounded-2xl shadow-2xl border border-gray-100 z-[200] flex flex-col animate-in slide-in-from-right-4">
          <div className="p-4 border-b flex justify-between items-center bg-gray-50 rounded-t-2xl">
            <h3 className="font-semibold flex items-center gap-2 text-gray-700"><Sparkles size={16} className="text-blue-500" /> Ask Luminote</h3>
            <button onClick={() => setShowAiChat(false)} className="text-gray-400 hover:text-gray-600"><X size={15} /></button>
          </div>
          <div className="flex-1 p-4 overflow-y-auto max-h-[400px] bg-slate-50/50">
            {chatHistory.map((m, i) => (
              <div key={i} className={`mb-3 flex ${m.role === "user" ? 'justify-end' : 'justify-start'}`}>
                <div className={`max-w-[85%] p-3 rounded-2xl text-sm ${m.role === 'user' ? 'bg-blue-600 text-white shadow-md' : 'bg-white border text-gray-700'}`}>
                  {m.text}
                </div>
              </div>
            ))}
          </div>
          <div className="p-3 border-t bg-white rounded-b-2xl">
            <div className="flex gap-2">
              <input value={aiPrompt} onChange={e => setAiPrompt(e.target.value)} onKeyDown={e => e.key === "Enter" && (setChatHistory(p => [...p, { role: "user", text: aiPrompt }]), askAI(aiPrompt, "chat"), setAiPrompt(""))}
                placeholder="Ask something..." className="flex-1 bg-gray-100 border-none rounded-xl px-4 py-2 text-sm focus:ring-1 focus:ring-blue-400" />
              <button onClick={() => { setChatHistory(p => [...p, { role: "user", text: aiPrompt }]); askAI(aiPrompt, "chat"); setAiPrompt(""); }} className="bg-blue-600 text-white p-2 rounded-xl hover:bg-blue-700 transition-colors shadow-sm">
                <Sparkles size={18} />
              </button>
            </div>
          </div>
        </div>
      )}

      {showAiModal && (
        <div className="fixed inset-0 z-[300] flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white w-full max-w-lg rounded-3xl shadow-2xl overflow-hidden animate-in zoom-in-95">
            <div className="p-8">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-10 h-10 bg-blue-100 rounded-xl flex items-center justify-center text-blue-600"><Sparkles size={24} /></div>
                <h3 className="text-xl font-bold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">AI Summary</h3>
              </div>
              <div className="bg-gray-50 rounded-2xl p-6 text-gray-700 leading-relaxed font-serif text-lg border border-gray-100 italic">
                "{aiResult}"
              </div>
              <div className="mt-8 flex gap-3">
                <button onClick={() => { setContent(prev => aiResult + "\n\n" + prev); setShowAiModal(false); }} className="flex-1 py-3 bg-blue-600 text-white rounded-xl font-semibold hover:bg-blue-700 transition-all shadow-lg active:scale-95">Add to Note</button>
                <button onClick={() => setShowAiModal(false)} className="px-6 py-3 border border-gray-200 text-gray-500 rounded-xl font-medium hover:bg-gray-50 transition-colors">Dismiss</button>
              </div>
            </div>
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
