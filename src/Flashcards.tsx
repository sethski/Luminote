/**
 * Flashcards.tsx — "Stacks" redesign
 * - Stack-based grid UI (like Quizlet decks)
 * - Folder-style Add Stacks modal with color picker
 * - Study Stacks mode
 * - AI generation from notes
 */
import React, { useState, useEffect, useCallback, useMemo } from "react";
import { useNavigate } from "react-router";
import {
  ArrowLeft, Plus, Sparkles, Brain, Loader2,
  ChevronLeft, ChevronRight, Check, X, Trash2,
  FolderOpen, BookOpen, RotateCcw, Zap,
} from "lucide-react";
import { supabase, Flashcard } from "./supabaseClient";
import { useAuth } from "./AuthContext";
import { useNotes } from "./NotesContext";
import { generateFlashcards } from "./qwen";
import { useToast } from "./toast";

/* ─── CSS ──────────────────────────────────────── */
const CSS = `
@import url('https://fonts.googleapis.com/css2?family=DM+Serif+Display:ital@0;1&family=Outfit:wght@400;500;600;700&display=swap');
.fc-root  { font-family:'Outfit',sans-serif; }
.fc-serif { font-family:'DM Serif Display',serif; }

@keyframes fc-up    { from{opacity:0;transform:translateY(14px)} to{opacity:1;transform:none} }
@keyframes fc-spin  { to{transform:rotate(360deg)} }
@keyframes fc-fade  { from{opacity:0} to{opacity:1} }
@keyframes fc-pop   { 0%{transform:scale(.94);opacity:0} 100%{transform:scale(1);opacity:1} }
@keyframes fc-flip  {
  0%  { transform:rotateY(0deg); }
  50% { transform:rotateY(90deg); }
  100%{ transform:rotateY(0deg); }
}

.fc-a1 { animation:fc-up .4s ease both .05s }
.fc-a2 { animation:fc-up .4s ease both .15s }
.fc-a3 { animation:fc-up .4s ease both .25s }
.fc-spin{ animation:fc-spin .8s linear infinite }
.fc-pop { animation:fc-pop .26s cubic-bezier(.34,1.56,.64,1) both }
.fc-flip { animation:fc-flip .4s ease }

.fc-overlay {
  position:fixed;inset:0;z-index:9999;
  background:rgba(14,17,23,.55);backdrop-filter:blur(6px);
  display:flex;align-items:center;justify-content:center;padding:20px;
  animation:fc-fade .2s ease both;
}

/* Stack cards */
.fc-stack-card {
  border-radius:20px;overflow:hidden;cursor:pointer;
  border:1px solid rgba(0,0,0,.06);
  box-shadow:0 2px 12px rgba(0,0,0,.06);
  transition:transform .2s ease,box-shadow .2s ease;
  background:white;
}
.fc-stack-card:hover { transform:translateY(-4px); box-shadow:0 12px 32px rgba(0,0,0,.12); }

.fc-color-dot {
  width:34px;height:34px;border-radius:50%;cursor:pointer;
  border:3px solid transparent;transition:transform .15s,border-color .15s;
}
.fc-color-dot:hover { transform:scale(1.12); }
.fc-color-dot.selected { border-color:white; outline:3px solid #6366F1; }

.fc-btn-primary {
  display:flex;align-items:center;gap:7px;
  padding:10px 20px;border-radius:14px;border:none;cursor:pointer;
  font-family:'Outfit',sans-serif;font-size:14px;font-weight:600;
  transition:all .2s;
}
.fc-btn-primary:hover { filter:brightness(1.08); transform:translateY(-1px); }

.fc-btn-outline {
  display:flex;align-items:center;gap:7px;
  padding:10px 20px;border-radius:14px;cursor:pointer;
  font-family:'Outfit',sans-serif;font-size:14px;font-weight:600;
  border:1.5px solid #E5E7EB;background:white;color:#374151;
  transition:all .2s;
}
.fc-btn-outline:hover { border-color:#6366F1;color:#6366F1;transform:translateY(-1px); }

/* Mobile-first responsive adjustments for modal and stack layouts. */
@media (max-width: 768px) {
  .fc-overlay { align-items: flex-start; padding: 12px; }
  .fc-stack-card { border-radius: 16px; }
  .fc-btn-primary,
  .fc-btn-outline { min-height: 44px; }
}
`;

/* ─── Constants ─────────────────────────────────── */
const STACK_COLORS = [
  "#6EE05A", "#FF7B7B", "#FFB347", "#FF82C8",
  "#7B8BFF", "#5AD4FF", "#A78BFA", "#34D399",
];

const STACK_COLOR_GRADIENTS: Record<string, string> = {
  "#6EE05A": "linear-gradient(135deg, #6EE05A, #4caf50)",
  "#FF7B7B": "linear-gradient(135deg, #FF7B7B, #ef4444)",
  "#FFB347": "linear-gradient(135deg, #FFB347, #f97316)",
  "#FF82C8": "linear-gradient(135deg, #FF82C8, #ec4899)",
  "#7B8BFF": "linear-gradient(135deg, #7B8BFF, #6366F1)",
  "#5AD4FF": "linear-gradient(135deg, #5AD4FF, #0ea5e9)",
  "#A78BFA": "linear-gradient(135deg, #A78BFA, #8b5cf6)",
  "#34D399": "linear-gradient(135deg, #34D399, #10b981)",
};

type Mode = "stacks" | "stack-detail" | "study";

interface Stack {
  name: string;
  color: string;
  cards: Flashcard[];
}

/* ─── Folder SVG Icon ───────────────────────────── */
function FolderIcon({ color, size = 40 }: { color: string; size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 40 40" fill="none">
      <path
        d="M4 10C4 8.34 5.34 7 7 7H16L19 11H33C34.66 11 36 12.34 36 14V31C36 32.66 34.66 34 33 34H7C5.34 34 4 32.66 4 31V10Z"
        fill={color}
        fillOpacity=".9"
      />
      <path
        d="M4 14H36V31C36 32.66 34.66 34 33 34H7C5.34 34 4 32.66 4 31V14Z"
        fill={color}
      />
    </svg>
  );
}

/* ─── Add Stack Modal ───────────────────────────── */
function AddStackModal({
  onClose,
  onAdd,
}: {
  onClose: () => void;
  onAdd: (name: string, color: string) => void;
}) {
  const [name, setName] = useState("");
  const [color, setColor] = useState(STACK_COLORS[0]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    onAdd(name.trim(), color);
    onClose();
  };

  return (
    <div className="fc-overlay" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div
        className="fc-pop"
        style={{
          background: "white",
          borderRadius: 28,
          width: "100%",
          maxWidth: 480,
          overflow: "hidden",
          boxShadow: "0 32px 80px rgba(0,0,0,.2)",
        }}
      >
        {/* Modal header with preview */}
        <div
          style={{
            height: 130,
            background: STACK_COLOR_GRADIENTS[color] ?? color,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            position: "relative",
          }}
        >
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 8 }}>
            <FolderIcon color="rgba(255,255,255,0.85)" size={52} />
            <span style={{ color: "white", fontWeight: 700, fontSize: 15, opacity: 0.9 }}>
              {name || "New Stack"}
            </span>
          </div>
          <button
            type="button"
            onClick={onClose}
            style={{
              position: "absolute", top: 14, right: 14,
              width: 32, height: 32, borderRadius: 10,
              border: "none", background: "rgba(255,255,255,.25)",
              cursor: "pointer", color: "white",
              display: "flex", alignItems: "center", justifyContent: "center",
            }}
          >
            <X size={16} />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} style={{ padding: "24px 28px 28px" }}>
          <div style={{ marginBottom: 20 }}>
            <label style={{ fontSize: 11, fontWeight: 700, color: "#9CA3AF", textTransform: "uppercase", letterSpacing: ".08em", display: "block", marginBottom: 8 }}>
              Stack Name
            </label>
            <input
              autoFocus
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Biology Chapter 3"
              style={{
                width: "100%", padding: "12px 16px", borderRadius: 14,
                border: "1.5px solid #E5E7EB", fontSize: 14,
                fontFamily: "inherit", outline: "none",
                color: "#0E1117", background: "#FAFAFA",
                boxSizing: "border-box",
                transition: "border-color .2s",
              }}
              onFocus={(e) => (e.target.style.borderColor = "#6366F1")}
              onBlur={(e) => (e.target.style.borderColor = "#E5E7EB")}
            />
          </div>

          <div style={{ marginBottom: 28 }}>
            <label style={{ fontSize: 11, fontWeight: 700, color: "#9CA3AF", textTransform: "uppercase", letterSpacing: ".08em", display: "block", marginBottom: 12 }}>
              Color
            </label>
            <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
              {STACK_COLORS.map((c) => (
                <button
                  key={c}
                  type="button"
                  className={`fc-color-dot ${color === c ? "selected" : ""}`}
                  style={{ background: c }}
                  onClick={() => setColor(c)}
                  aria-label={`Color ${c}`}
                />
              ))}
            </div>
          </div>

          <button
            type="submit"
            disabled={!name.trim()}
            style={{
              width: "100%", padding: "14px", borderRadius: 16,
              background: !name.trim() ? "#E5E7EB" : "linear-gradient(135deg,#6366F1,#8B5CF6)",
              color: !name.trim() ? "#9CA3AF" : "white",
              border: "none", cursor: name.trim() ? "pointer" : "not-allowed",
              fontFamily: "inherit", fontSize: 15, fontWeight: 700,
              display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
              transition: "all .2s",
            }}
          >
            <FolderOpen size={17} />
            Create Stack
          </button>
        </form>
      </div>
    </div>
  );
}

/* ─── Stack Card ────────────────────────────────── */
function StackCard({ stack, onClick }: { stack: Stack; onClick: () => void }) {
  const gradient = STACK_COLOR_GRADIENTS[stack.color] ?? stack.color;
  return (
    <div className="fc-stack-card" onClick={onClick}>
      {/* Color banner */}
      <div style={{ height: 90, background: gradient, position: "relative", overflow: "hidden" }}>
        {/* Subtle folder tab */}
        <div style={{
          position: "absolute", top: 0, left: 16,
          width: 50, height: 10, background: "rgba(255,255,255,.18)",
          borderRadius: "0 0 8px 8px",
        }} />
        <div style={{
          position: "absolute", inset: 0,
          display: "flex", alignItems: "center", justifyContent: "center",
        }}>
          <FolderIcon color="rgba(255,255,255,0.75)" size={44} />
        </div>
      </div>
      {/* Info */}
      <div style={{ padding: "14px 16px 16px" }}>
        <div style={{ fontSize: 14, fontWeight: 700, color: "#0E1117", marginBottom: 4, lineHeight: 1.3 }}>
          {stack.name}
        </div>
        <div style={{ fontSize: 12, color: "#9CA3AF", fontWeight: 500 }}>
          {stack.cards.length} card{stack.cards.length !== 1 ? "s" : ""}
        </div>
      </div>
    </div>
  );
}

/* ─── Main Component ────────────────────────────── */
export function Flashcards() {
  const navigate   = useNavigate();
  const { user }   = useAuth();
  const { notes }  = useNotes();
  const toast      = useToast();

  const [cards,       setCards]       = useState<Flashcard[]>([]);
  const [loading,     setLoading]     = useState(true);
  const [mode,        setMode]        = useState<Mode>("stacks");
  const [activeStack, setActiveStack] = useState<string | null>(null);
  const [showAddModal, setShowAddModal] = useState(false);
  const [genBusy,     setGenBusy]     = useState(false);
  const [selNoteId,   setSelNoteId]   = useState("");

  // Study mode state
  const [studyIdx,  setStudyIdx]  = useState(0);
  const [flipped,   setFlipped]   = useState(false);
  const [animating, setAnimating] = useState(false);

  // Manual add card (inside stack detail)
  const [showAddCard, setShowAddCard] = useState(false);
  const [newFront,    setNewFront]    = useState("");
  const [newBack,     setNewBack]     = useState("");
  const [saveBusy,    setSaveBusy]    = useState(false);

  /* ── Load cards ──────────────────────────────── */
  const loadCards = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    const { data, error } = await supabase
      .from("flashcards").select("*").eq("user_id", user.id)
      .order("created_at", { ascending: false });
    if (!error && data) setCards(data as Flashcard[]);
    setLoading(false);
  }, [user?.id]);

  useEffect(() => { loadCards(); }, [loadCards]);

  /* ── Derive stacks ───────────────────────────── */
  const stacks = useMemo<Stack[]>(() => {
    const map = new Map<string, Stack>();
    for (const card of cards) {
      const name  = card.deck_name || "Default";
      const color = STACK_COLORS[([...name].reduce((a, c) => a + c.charCodeAt(0), 0)) % STACK_COLORS.length];
      if (!map.has(name)) map.set(name, { name, color, cards: [] });
      map.get(name)!.cards.push(card);
    }
    return [...map.values()];
  }, [cards]);

  const currentStack = stacks.find((s) => s.name === activeStack);
  const studyCards   = currentStack?.cards ?? cards;
  const studyCard    = studyCards[studyIdx];

  /* ── Create stack (just sets the deck name; cards added after) */
  const handleAddStack = async (name: string, _color: string) => {
    // We persist the color by encoding it in the deck_name… or we just store a placeholder card.
    // Simplest: create a "shell" with a placeholder that won't show, or just track in state.
    // For now, stacks are inferred from cards. We'll note the color preference in localStorage.
    const key = `luminote-stack-color-${name}`;
    localStorage.setItem(key, _color);
    setActiveStack(name);
    setMode("stack-detail");
  };

  /* ── Get stack color ─────────────────────────── */
  const getStackColor = (name: string): string => {
    const stored = localStorage.getItem(`luminote-stack-color-${name}`);
    if (stored) return stored;
    return STACK_COLORS[([...name].reduce((a, c) => a + c.charCodeAt(0), 0)) % STACK_COLORS.length];
  };

  /* ── Add card manually ───────────────────────── */
  const addCard = async () => {
    if (!newFront.trim() || !newBack.trim() || !user) return;
    setSaveBusy(true);
    const deckName = activeStack ?? "Default";
    const { data, error } = await (supabase.from("flashcards") as any)
      .insert({ user_id: user.id, deck_name: deckName, front: newFront.trim(), back: newBack.trim() })
      .select().single();
    if (error) { toast.error("Failed to add card."); }
    else {
      setCards(prev => [data as Flashcard, ...prev]);
      setNewFront(""); setNewBack(""); setShowAddCard(false);
      toast.success("Flashcard added!");
    }
    setSaveBusy(false);
  };

  /* ── Delete card ─────────────────────────────── */
  const deleteCard = async (id: string) => {
    const { error } = await supabase.from("flashcards").delete().eq("id", id);
    if (error) toast.error("Failed to delete.");
    else { setCards(prev => prev.filter(c => c.id !== id)); toast.info("Card deleted."); }
  };

  /* ── AI generate ─────────────────────────────── */
  const generateFromNote = async () => {
    const note = notes.find(n => n.id === selNoteId);
    if (!note || !user) { toast.error("Select a note first."); return; }
    setGenBusy(true);
    const id = toast.loading("Generating flashcards…");
    try {
      const generated = await generateFlashcards(note.content, note.title, 6);
      if (!generated.length) { toast.dismiss(id); toast.error("No flashcards generated."); return; }
      const deckName = activeStack ?? note.title;
      const { data, error } = await (supabase.from("flashcards") as any).insert(
        generated.map(g => ({ user_id: user.id, deck_name: deckName, front: g.front, back: g.back }))
      ).select();
      toast.dismiss(id);
      if (error) throw error;
      setCards(prev => [...(data as Flashcard[]), ...prev]);
      toast.success(`${generated.length} cards created!`);
      setSelNoteId("");
    } catch (e: any) { toast.dismiss(id); toast.error(e?.message ?? "Generation failed."); }
    finally { setGenBusy(false); }
  };

  /* ── Study helpers ───────────────────────────── */
  const flip = () => {
    if (animating) return;
    setAnimating(true);
    setTimeout(() => { setFlipped(f => !f); setAnimating(false); }, 200);
  };
  const next = () => { setFlipped(false); setStudyIdx(i => Math.min(i + 1, studyCards.length - 1)); };
  const prev = () => { setFlipped(false); setStudyIdx(i => Math.max(i - 1, 0)); };
  const rate = async (easy: boolean) => {
    const card = studyCards[studyIdx];
    if (!card) return;
    const newInterval  = easy ? Math.round(card.interval * card.ease_factor) : 1;
    const newEase      = easy ? Math.min(card.ease_factor + 0.1, 2.8) : Math.max(card.ease_factor - 0.2, 1.3);
    const nextReview   = new Date();
    nextReview.setDate(nextReview.getDate() + newInterval);
    await (supabase.from("flashcards") as any).update({ interval: newInterval, ease_factor: newEase, next_review: nextReview.toISOString().split("T")[0] }).eq("id", card.id);
    setCards(prev => prev.map(c => c.id === card.id ? { ...c, interval: newInterval, ease_factor: newEase } : c));
    if (studyIdx < studyCards.length - 1) next();
    else { setMode(activeStack ? "stack-detail" : "stacks"); toast.success("Study session complete! 🎉"); }
  };

  const stackColor = activeStack ? getStackColor(activeStack) : "#6366F1";
  const stackGradient = STACK_COLOR_GRADIENTS[stackColor] ?? stackColor;

  return (
    <div className="fc-root" style={{ minHeight: "100vh", background: "#F4F5F7" }}>
      <style>{CSS}</style>
      {showAddModal && (
        <AddStackModal onClose={() => setShowAddModal(false)} onAdd={handleAddStack} />
      )}

      {/* ─── STUDY MODE ───────────────────────────────── */}
      {mode === "study" && studyCard && (
        <div style={{ minHeight: "100vh", background: "#FAFAF8", display: "flex", flexDirection: "column" }}>
          {/* Study header */}
          <div style={{ padding: "14px clamp(14px, 3vw, 24px)", borderBottom: "1px solid #EBEBEB", background: "white", display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
            <button type="button" onClick={() => { setMode(activeStack ? "stack-detail" : "stacks"); setFlipped(false); setStudyIdx(0); }}
              style={{ width: 36, height: 36, borderRadius: 10, border: "1px solid #E5E7EB", background: "none", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", color: "#6B7280" }}>
              <ArrowLeft size={16} />
            </button>
            <div>
              <div className="fc-serif" style={{ fontSize: "1.1rem", color: "#0E1117" }}>Study Session</div>
              <div style={{ fontSize: 12, color: "#9CA3AF" }}>{activeStack ?? "All Stacks"}</div>
            </div>
            <div style={{ marginLeft: "auto", fontSize: 13, fontWeight: 600, color: "#9CA3AF" }}>
              {studyIdx + 1} / {studyCards.length}
            </div>
          </div>

          <div style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "32px clamp(14px, 3vw, 24px)", gap: 24 }}>
            {/* Progress bar */}
            <div style={{ width: "100%", maxWidth: 560, height: 4, borderRadius: 4, background: "#E5E7EB" }}>
              <div style={{ height: "100%", borderRadius: 4, background: stackGradient, width: `${((studyIdx + 1) / studyCards.length) * 100}%`, transition: "width .4s ease" }} />
            </div>

            {/* Card */}
            <div style={{ width: "100%", maxWidth: 560, cursor: "pointer" }} onClick={flip}>
              <div className={animating ? "fc-flip" : ""}
                style={{ background: "white", borderRadius: 28, border: "1px solid #EBEBEB", padding: "56px 48px", textAlign: "center", minHeight: 260, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", boxShadow: "0 8px 40px rgba(0,0,0,.08)", position: "relative" }}>
                <div style={{ position: "absolute", top: 18, left: "50%", transform: "translateX(-50%)", fontSize: 10, fontWeight: 700, color: "#C4C9D4", textTransform: "uppercase", letterSpacing: ".08em", background: "#F3F4F6", padding: "3px 10px", borderRadius: 100 }}>
                  {flipped ? "Answer" : "Question"}
                </div>
                <p className="fc-serif" style={{ fontSize: "1.5rem", color: "#0E1117", lineHeight: 1.5, margin: 0 }}>
                  {flipped ? studyCard.back : studyCard.front}
                </p>
                {!flipped && <p style={{ fontSize: 12, color: "#C4C9D4", marginTop: 24 }}>Tap to reveal answer</p>}
              </div>
            </div>

            {/* Buttons */}
            {flipped ? (
              <div style={{ display: "flex", gap: 14 }}>
                <button type="button" onClick={() => rate(false)}
                  style={{ display: "flex", alignItems: "center", gap: 8, padding: "13px 28px", background: "#FFF1F2", border: "2px solid #FECDD3", borderRadius: 16, cursor: "pointer", color: "#BE123C", fontSize: 14, fontWeight: 700, fontFamily: "inherit" }}>
                  <X size={16} /> Hard
                </button>
                <button type="button" onClick={() => rate(true)}
                  style={{ display: "flex", alignItems: "center", gap: 8, padding: "13px 28px", background: "#F0FDF4", border: "2px solid #BBF7D0", borderRadius: 16, cursor: "pointer", color: "#15803D", fontSize: 14, fontWeight: 700, fontFamily: "inherit" }}>
                  <Check size={16} /> Easy
                </button>
              </div>
            ) : (
              <div style={{ display: "flex", gap: 12 }}>
                <button type="button" onClick={prev} disabled={studyIdx === 0}
                  style={{ width: 44, height: 44, borderRadius: 14, border: "1.5px solid #E5E7EB", background: "white", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", color: "#374151", opacity: studyIdx === 0 ? .3 : 1 }}>
                  <ChevronLeft size={20} />
                </button>
                <button type="button" onClick={next} disabled={studyIdx === studyCards.length - 1}
                  style={{ width: 44, height: 44, borderRadius: 14, border: "1.5px solid #E5E7EB", background: "white", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", color: "#374151", opacity: studyIdx === studyCards.length - 1 ? .3 : 1 }}>
                  <ChevronRight size={20} />
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ─── STACK DETAIL MODE ────────────────────────── */}
      {mode === "stack-detail" && (
        <div style={{ minHeight: "100vh", background: "#FAFAF8" }}>
          {/* Banner */}
          <div style={{ height: 180, background: stackGradient, position: "relative", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 8 }}>
            <button type="button" onClick={() => setMode("stacks")}
              style={{ position: "absolute", top: 20, left: 20, width: 38, height: 38, borderRadius: 12, border: "none", background: "rgba(255,255,255,.25)", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", color: "white" }}>
              <ArrowLeft size={17} />
            </button>
            <FolderIcon color="rgba(255,255,255,.8)" size={48} />
            <div className="fc-serif" style={{ fontSize: "1.4rem", color: "white" }}>{activeStack}</div>
            <div style={{ fontSize: 13, color: "rgba(255,255,255,.75)", fontWeight: 500 }}>
              {currentStack?.cards.length ?? 0} cards
            </div>
            {/* Study button */}
            {(currentStack?.cards.length ?? 0) > 0 && (
              <button type="button"
                onClick={() => { setStudyIdx(0); setFlipped(false); setMode("study"); }}
                style={{ position: "absolute", top: 20, right: 20, display: "flex", alignItems: "center", gap: 6, padding: "9px 18px", background: "rgba(255,255,255,.9)", border: "none", borderRadius: 12, cursor: "pointer", fontFamily: "inherit", fontSize: 13, fontWeight: 700, color: "#374151" }}>
                <Brain size={14} /> Study
              </button>
            )}
          </div>

          <div style={{ maxWidth: 960, margin: "0 auto", padding: "24px clamp(14px, 3vw, 24px)" }}>
            {/* AI Generate */}
            <div className="fc-a1" style={{ background: "white", borderRadius: 20, border: "1px solid #EBEBEB", padding: 20, marginBottom: 16 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12 }}>
                <Sparkles size={15} color="#6366F1" />
                <span style={{ fontSize: 14, fontWeight: 700, color: "#0E1117" }}>Generate with AI</span>
              </div>
              <div style={{ display: "flex", gap: 10 }}>
                <select value={selNoteId} onChange={e => setSelNoteId(e.target.value)}
                  style={{ flex: 1, padding: "10px 14px", borderRadius: 12, border: "1.5px solid #E5E7EB", background: "#FAFAFA", fontSize: 13, fontFamily: "inherit", color: selNoteId ? "#0E1117" : "#9CA3AF", outline: "none" }}>
                  <option value="">Select a note to generate from…</option>
                  {notes.map(n => <option key={n.id} value={n.id}>{n.title || "Untitled Note"}</option>)}
                </select>
                <button type="button" onClick={generateFromNote} disabled={genBusy || !selNoteId}
                  style={{ display: "flex", alignItems: "center", gap: 6, padding: "10px 16px", background: "#6366F1", color: "white", border: "none", borderRadius: 12, cursor: genBusy ? "not-allowed" : "pointer", fontFamily: "inherit", fontSize: 13, fontWeight: 600, opacity: !selNoteId ? .5 : 1 }}>
                  {genBusy ? <Loader2 size={14} className="fc-spin" /> : <Sparkles size={14} />}
                  {genBusy ? "Generating…" : "Generate"}
                </button>
              </div>
            </div>

            {/* Manual add card */}
            {!showAddCard ? (
              <button type="button" onClick={() => setShowAddCard(true)}
                style={{ width: "100%", display: "flex", alignItems: "center", gap: 8, padding: 14, border: "1.5px dashed #D1D5DB", borderRadius: 16, background: "none", cursor: "pointer", color: "#9CA3AF", fontFamily: "inherit", fontSize: 14, fontWeight: 500, marginBottom: 16, justifyContent: "center" }}>
                <Plus size={16} /> Add card manually
              </button>
            ) : (
              <div className="fc-a2" style={{ background: "white", borderRadius: 16, border: "1.5px solid #6366F1", padding: 16, marginBottom: 16 }}>
                <textarea value={newFront} onChange={e => setNewFront(e.target.value)} placeholder="Front (question)…"
                  style={{ width: "100%", padding: "10px 12px", borderRadius: 10, border: "1.5px solid #E5E7EB", fontSize: 13, fontFamily: "inherit", resize: "none", outline: "none", marginBottom: 8, boxSizing: "border-box" }} rows={2} />
                <textarea value={newBack} onChange={e => setNewBack(e.target.value)} placeholder="Back (answer)…"
                  style={{ width: "100%", padding: "10px 12px", borderRadius: 10, border: "1.5px solid #E5E7EB", fontSize: 13, fontFamily: "inherit", resize: "none", outline: "none", marginBottom: 10, boxSizing: "border-box" }} rows={2} />
                <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
                  <button type="button" onClick={() => { setShowAddCard(false); setNewFront(""); setNewBack(""); }}
                    style={{ padding: "7px 14px", borderRadius: 10, border: "1.5px solid #E5E7EB", background: "none", cursor: "pointer", fontFamily: "inherit", fontSize: 13, color: "#6B7280" }}>Cancel</button>
                  <button type="button" onClick={addCard} disabled={saveBusy || !newFront.trim() || !newBack.trim()}
                    style={{ padding: "7px 14px", borderRadius: 10, background: "#6366F1", color: "white", border: "none", cursor: "pointer", fontFamily: "inherit", fontSize: 13, fontWeight: 600 }}>
                    {saveBusy ? <Loader2 size={13} className="fc-spin" /> : "Add Card"}
                  </button>
                </div>
              </div>
            )}

            {/* Cards list */}
            {!currentStack || currentStack.cards.length === 0 ? (
              <div style={{ textAlign: "center", padding: "60px 20px" }}>
                <BookOpen size={36} color="#D1D5DB" style={{ marginBottom: 12 }} />
                <h3 className="fc-serif" style={{ fontSize: "1.1rem", color: "#0E1117" }}>No cards yet</h3>
                <p style={{ fontSize: 14, color: "#9CA3AF" }}>Add cards manually or generate with AI above.</p>
              </div>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                {currentStack.cards.map((card, i) => (
                  <div key={card.id} style={{ background: "white", borderRadius: 16, border: "1px solid #EBEBEB", padding: "14px 16px", display: "flex", gap: 14, alignItems: "flex-start" }}>
                    <div style={{ width: 26, height: 26, borderRadius: 8, background: "#EFF3FF", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 11, fontWeight: 700, color: "#6366F1", flexShrink: 0, marginTop: 1 }}>
                      {i + 1}
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 13, fontWeight: 600, color: "#0E1117", marginBottom: 4 }}>{card.front}</div>
                      <div style={{ fontSize: 12, color: "#6B7280", borderLeft: "2px solid #E5E7EB", paddingLeft: 8 }}>{card.back}</div>
                    </div>
                    <button type="button" onClick={() => deleteCard(card.id)}
                      style={{ padding: 6, borderRadius: 8, border: "none", background: "none", cursor: "pointer", color: "#D1D5DB" }}>
                      <Trash2 size={14} />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ─── STACKS LIST MODE ─────────────────────────── */}
      {mode === "stacks" && (
        <div style={{ minHeight: "100vh", background: "#F4F5F7" }}>
          {/* Header */}
          <div style={{ background: "white", borderBottom: "1px solid #EBEBEB", padding: "16px clamp(14px, 3vw, 28px)", display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
            <button type="button" onClick={() => navigate(-1)}
              style={{ width: 36, height: 36, borderRadius: 10, border: "1px solid #E5E7EB", background: "none", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", color: "#6B7280" }}>
              <ArrowLeft size={16} />
            </button>
            <div className="fc-serif" style={{ fontSize: "1.5rem", color: "#0E1117", flex: 1 }}>
              My Stacks
            </div>
            {/* Action buttons */}
            <div style={{ display: "flex", gap: 10, flexWrap: "wrap", width: "100%", justifyContent: "flex-end" }}>
              <button
                type="button"
                className="fc-btn-outline"
                onClick={() => setShowAddModal(true)}
              >
                <FolderOpen size={16} />
                Add Stacks
              </button>
              <button
                type="button"
                className="fc-btn-primary"
                onClick={() => {
                  if (cards.length === 0) { toast.error("No cards to study yet. Add some first!"); return; }
                  setActiveStack(null);
                  setStudyIdx(0);
                  setFlipped(false);
                  setMode("study");
                }}
                style={{ background: "linear-gradient(135deg,#6366F1,#8B5CF6)", color: "white" }}
              >
                <Brain size={16} />
                Study Stacks
              </button>
            </div>
          </div>

          {/* Content */}
          <div style={{ maxWidth: 1120, margin: "0 auto", padding: "24px clamp(14px, 3vw, 24px)" }}>
            {loading ? (
              <div style={{ display: "flex", justifyContent: "center", padding: 80 }}>
                <Loader2 size={28} color="#6366F1" className="fc-spin" />
              </div>
            ) : stacks.length === 0 ? (
              <div className="fc-a1" style={{ textAlign: "center", padding: "80px 20px", display: "flex", flexDirection: "column", alignItems: "center", gap: 16 }}>
                <div style={{ width: 80, height: 80, borderRadius: 24, background: "linear-gradient(135deg,#EFF3FF,#F5F3FF)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                  <FolderOpen size={36} color="#6366F1" />
                </div>
                <div>
                  <h3 className="fc-serif" style={{ fontSize: "1.3rem", color: "#0E1117", margin: "0 0 8px" }}>No stacks yet</h3>
                  <p style={{ fontSize: 14, color: "#9CA3AF", maxWidth: 280, margin: "0 auto" }}>
                    Create your first stack to start organizing your flashcards.
                  </p>
                </div>
                <button
                  type="button"
                  className="fc-btn-primary"
                  onClick={() => setShowAddModal(true)}
                  style={{ background: "linear-gradient(135deg,#6366F1,#8B5CF6)", color: "white", marginTop: 8 }}
                >
                  <FolderOpen size={16} />
                  Add Stacks
                </button>
              </div>
            ) : (
              <div className="fc-a1" style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))", gap: 18 }}>
                {stacks.map(stack => (
                  <StackCard
                    key={stack.name}
                    stack={{ ...stack, color: getStackColor(stack.name) }}
                    onClick={() => { setActiveStack(stack.name); setMode("stack-detail"); }}
                  />
                ))}
                {/* Add new stack card */}
                <div
                  onClick={() => setShowAddModal(true)}
                  style={{
                    borderRadius: 20, border: "2px dashed #D1D5DB",
                    minHeight: 160, display: "flex", flexDirection: "column",
                    alignItems: "center", justifyContent: "center", gap: 10,
                    cursor: "pointer", color: "#9CA3AF", transition: "all .2s",
                  }}
                  onMouseEnter={e => { (e.currentTarget as HTMLElement).style.borderColor = "#6366F1"; (e.currentTarget as HTMLElement).style.color = "#6366F1"; }}
                  onMouseLeave={e => { (e.currentTarget as HTMLElement).style.borderColor = "#D1D5DB"; (e.currentTarget as HTMLElement).style.color = "#9CA3AF"; }}
                >
                  <Plus size={28} />
                  <span style={{ fontSize: 13, fontWeight: 600 }}>New Stack</span>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
