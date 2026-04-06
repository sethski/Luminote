/**
 * Personal.tsx — AI Study Hub powered by Qwen
 * - Lumi chatbot (conversational AI assistant)
 * - AI study suggestions based on user notes
 * - Courses list (local state, extendable to Supabase)
 * - All Qwen calls use the qwen.ts service
 */
import React, { useState, useRef, useEffect } from "react";
import { useNavigate } from "react-router";
import {
  ArrowLeft, Sparkles, Send, Loader2, BookOpen,
  Plus, Brain, MessageSquare, CalendarDays,
  ChevronRight, RotateCcw,
} from "lucide-react";
import { lumiChat, getStudySuggestions } from "./qwen";
import { useNotes } from "./NotesContext";
import { useAuth } from "./AuthContext";
import { useToast } from "./toast";

type ChatMessage = { role: "user" | "assistant"; content: string };

const CSS = `
@import url('https://fonts.googleapis.com/css2?family=DM+Serif+Display:ital@0;1&family=Outfit:wght@400;500;600;700&display=swap');
.ps-root  { font-family:'Outfit',sans-serif; }
.ps-serif { font-family:'DM Serif Display',serif; }
@keyframes ps-up   { from{opacity:0;transform:translateY(12px)} to{opacity:1;transform:none} }
@keyframes ps-fade { from{opacity:0} to{opacity:1} }
@keyframes ps-spin { to{transform:rotate(360deg)} }
@keyframes ps-dots { 0%,100%{opacity:.3} 50%{opacity:1} }
.ps-a1{animation:ps-up .4s ease both .05s}
.ps-a2{animation:ps-up .4s ease both .15s}
.ps-spin{animation:ps-spin .8s linear infinite}
.ps-dot{animation:ps-dots 1.2s ease infinite}
.chat-bubble-enter{animation:ps-fade .25s ease}
.chat-scroll::-webkit-scrollbar{width:4px}
.chat-scroll::-webkit-scrollbar-thumb{background:#E5E7EB;border-radius:4px}
`;

export function Personal() {
  const navigate = useNavigate();
  const { user, profile } = useAuth();
  const { notes }   = useNotes();
  const toast       = useToast();

  /* ── Lumi chat ───────────────────────────────────── */
  const [messages,  setMessages]  = useState<ChatMessage[]>([
    { role: "assistant", content: `Hey ${profile?.display_name?.split(" ")[0] ?? "there"}! 👋 I'm Lumi, your AI study assistant. Ask me anything about your notes, or let me suggest a study plan for you!` },
  ]);
  const [input,     setInput]     = useState("");
  const [chatBusy,  setChatBusy]  = useState(false);
  const chatEndRef  = useRef<HTMLDivElement>(null);
  const inputRef    = useRef<HTMLInputElement>(null);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const sendChat = async () => {
    const msg = input.trim();
    if (!msg || chatBusy) return;
    setInput("");
    const newMsgs: ChatMessage[] = [...messages, { role: "user", content: msg }];
    setMessages(newMsgs);
    setChatBusy(true);
    try {
      // Pass last 6 messages as history for context
      const history = newMsgs.slice(-7, -1).map(m => ({ role: m.role as "user" | "assistant", content: m.content }));
      const reply = await lumiChat(msg, history);
      setMessages(prev => [...prev, { role: "assistant", content: reply }]);
    } catch {
      setMessages(prev => [...prev, { role: "assistant", content: "Sorry, I'm having trouble connecting right now. Please try again!" }]);
    } finally { setChatBusy(false); }
  };

  /* ── AI study suggestions ────────────────────────── */
  const [suggestions, setSuggestions] = useState("");
  const [suggBusy,    setSuggBusy]    = useState(false);

  const fetchSuggestions = async () => {
    if (!notes.length) { toast.info("Create some notes first, then I can suggest study strategies!"); return; }
    setSuggBusy(true);
    try {
      const combined = notes.slice(0, 5).map(n => `${n.title}: ${n.content.slice(0, 200)}`).join("\n\n");
      const result   = await getStudySuggestions(combined);
      setSuggestions(result);
    } catch { toast.error("Could not generate suggestions. Check your Qwen API key."); }
    finally { setSuggBusy(false); }
  };

  /* ── Quick prompt chips ──────────────────────────── */
  const quickPrompts = [
    "Summarize my recent notes",
    "What should I study today?",
    "Give me quiz questions on my notes",
    "Make me a study plan for this week",
  ];

  /* ── Render markdown-ish text ────────────────────── */
  const renderText = (text: string) => {
    return text.split("\n").map((line, i) => {
      if (line.startsWith("**") && line.endsWith("**"))
        return <div key={i} style={{ fontWeight:700, color:"#0E1117", marginTop:4 }}>{line.slice(2, -2)}</div>;
      if (line.startsWith("- "))
        return <div key={i} style={{ paddingLeft:12, color:"#374151" }}>• {line.slice(2)}</div>;
      if (line.startsWith("## "))
        return <div key={i} style={{ fontWeight:700, fontSize:15, color:"#0E1117", marginTop:8 }}>{line.slice(3)}</div>;
      return <div key={i} style={{ color:"#374151", lineHeight:1.6 }}>{line || <br />}</div>;
    });
  };

  return (
    <div className="ps-root" style={{ minHeight:"100vh", background:"#FAFAF8" }}>
      <style>{CSS}</style>

      {/* Header */}
      <div style={{ background:"white", borderBottom:"1px solid #EBEBEB", position:"sticky", top:0, zIndex:10 }}>
        <div style={{ maxWidth:900, margin:"0 auto", padding:"16px 20px", display:"flex", alignItems:"center", gap:12 }}>
          <button type="button" onClick={() => navigate(-1)}
            style={{ width:36, height:36, borderRadius:10, border:"1px solid #E5E7EB", background:"none", cursor:"pointer", display:"flex", alignItems:"center", justifyContent:"center", color:"#6B7280" }}>
            <ArrowLeft size={16} />
          </button>
          <div>
            <h1 className="ps-serif" style={{ fontSize:"1.4rem", color:"#0E1117", margin:0 }}>Personal Hub</h1>
            <p style={{ fontSize:12, color:"#9CA3AF", margin:0 }}>Powered by Qwen AI</p>
          </div>
          <div style={{ marginLeft:"auto", display:"flex", alignItems:"center", gap:8, background:"#EFF3FF", borderRadius:100, padding:"6px 12px" }}>
            <Sparkles size={13} color="#6366F1" />
            <span style={{ fontSize:12, fontWeight:600, color:"#6366F1" }}>Qwen AI Active</span>
          </div>
        </div>
      </div>

      <div style={{ maxWidth:900, margin:"0 auto", padding:"24px 20px", display:"grid", gridTemplateColumns:"1fr 1fr", gap:20 }}>

        {/* ── LUMI CHAT ────────────────────────── */}
        <div className="ps-a1" style={{ background:"white", borderRadius:20, border:"1px solid #EBEBEB", display:"flex", flexDirection:"column", height:580 }}>
          {/* Chat header */}
          <div style={{ padding:"16px 20px", borderBottom:"1px solid #F3F4F6", display:"flex", alignItems:"center", gap:10 }}>
            <div style={{ width:36, height:36, borderRadius:12, background:"linear-gradient(135deg,#6366F1,#8B5CF6)", display:"flex", alignItems:"center", justifyContent:"center" }}>
              <Brain size={18} color="white" />
            </div>
            <div>
              <div style={{ fontSize:14, fontWeight:700, color:"#0E1117" }}>Lumi</div>
              <div style={{ fontSize:11, color:"#9CA3AF" }}>AI Study Assistant</div>
            </div>
            <button type="button" onClick={() => setMessages([{ role:"assistant", content:`Hey ${profile?.display_name?.split(" ")[0] ?? "there"}! How can I help you study today?` }])}
              title="Clear chat"
              style={{ marginLeft:"auto", width:30, height:30, borderRadius:8, border:"1px solid #E5E7EB", background:"none", cursor:"pointer", display:"flex", alignItems:"center", justifyContent:"center", color:"#9CA3AF" }}>
              <RotateCcw size={13} />
            </button>
          </div>

          {/* Messages */}
          <div className="chat-scroll" style={{ flex:1, overflowY:"auto", padding:"16px 16px 8px" }}>
            {messages.map((m, i) => (
              <div key={i} className="chat-bubble-enter"
                style={{ display:"flex", justifyContent: m.role==="user" ? "flex-end" : "flex-start", marginBottom:12 }}>
                {m.role === "assistant" && (
                  <div style={{ width:26, height:26, borderRadius:8, background:"linear-gradient(135deg,#6366F1,#8B5CF6)", display:"flex", alignItems:"center", justifyContent:"center", marginRight:8, flexShrink:0, marginTop:2 }}>
                    <Sparkles size={12} color="white" />
                  </div>
                )}
                <div style={{
                  maxWidth:"80%",
                  padding:"10px 14px",
                  borderRadius: m.role==="user" ? "18px 18px 4px 18px" : "18px 18px 18px 4px",
                  background: m.role==="user" ? "#6366F1" : "#F3F4F6",
                  color: m.role==="user" ? "white" : "#374151",
                  fontSize:13, lineHeight:1.55,
                }}>
                  {m.role === "assistant" ? renderText(m.content) : m.content}
                </div>
              </div>
            ))}
            {chatBusy && (
              <div style={{ display:"flex", alignItems:"center", gap:8, marginBottom:12 }}>
                <div style={{ width:26, height:26, borderRadius:8, background:"linear-gradient(135deg,#6366F1,#8B5CF6)", display:"flex", alignItems:"center", justifyContent:"center" }}>
                  <Sparkles size={12} color="white" />
                </div>
                <div style={{ padding:"10px 14px", background:"#F3F4F6", borderRadius:"18px 18px 18px 4px", display:"flex", gap:4, alignItems:"center" }}>
                  {[0,1,2].map(i => (
                    <div key={i} className="ps-dot" style={{ width:6, height:6, borderRadius:"50%", background:"#9CA3AF", animationDelay:`${i*0.2}s` }} />
                  ))}
                </div>
              </div>
            )}
            <div ref={chatEndRef} />
          </div>

          {/* Quick prompts */}
          {messages.length <= 2 && (
            <div style={{ padding:"0 16px 8px", display:"flex", flexWrap:"wrap", gap:6 }}>
              {quickPrompts.map(p => (
                <button key={p} type="button" onClick={() => { setInput(p); inputRef.current?.focus(); }}
                  style={{ fontSize:11, padding:"5px 10px", borderRadius:100, border:"1.5px solid #E5E7EB", background:"white", cursor:"pointer", color:"#6B7280", fontFamily:"inherit", fontWeight:500 }}>
                  {p}
                </button>
              ))}
            </div>
          )}

          {/* Input */}
          <div style={{ padding:"12px 16px", borderTop:"1px solid #F3F4F6", display:"flex", gap:8 }}>
            <input
              ref={inputRef}
              type="text"
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={e => e.key === "Enter" && !e.shiftKey && sendChat()}
              placeholder="Ask Lumi anything…"
              style={{ flex:1, padding:"10px 14px", borderRadius:12, border:"1.5px solid #E5E7EB", background:"#FAFAFA", fontSize:13, fontFamily:"inherit", color:"#0E1117", outline:"none" }}
            />
            <button type="button" onClick={sendChat} disabled={chatBusy || !input.trim()}
              style={{ width:38, height:38, borderRadius:12, background:"#6366F1", border:"none", display:"flex", alignItems:"center", justifyContent:"center", cursor:chatBusy?"not-allowed":"pointer", opacity: !input.trim() ? .5 : 1 }}>
              {chatBusy ? <Loader2 size={15} color="white" className="ps-spin" /> : <Send size={15} color="white" />}
            </button>
          </div>
        </div>

        {/* ── AI STUDY SUGGESTIONS ─────────────── */}
        <div className="ps-a2">
          <div style={{ background:"white", borderRadius:20, border:"1px solid #EBEBEB", overflow:"hidden" }}>
            <div style={{ padding:"16px 20px", borderBottom:"1px solid #F3F4F6", display:"flex", alignItems:"center", justifyContent:"space-between" }}>
              <div style={{ display:"flex", alignItems:"center", gap:10 }}>
                <div style={{ width:36, height:36, borderRadius:12, background:"#FFFBEB", display:"flex", alignItems:"center", justifyContent:"center" }}>
                  <Brain size={18} color="#D97706" />
                </div>
                <div>
                  <div style={{ fontSize:14, fontWeight:700, color:"#0E1117" }}>Study Suggestions</div>
                  <div style={{ fontSize:11, color:"#9CA3AF" }}>AI-analyzed from your notes</div>
                </div>
              </div>
              <button type="button" onClick={fetchSuggestions} disabled={suggBusy}
                style={{ display:"flex", alignItems:"center", gap:6, padding:"7px 14px", background:"#FFFBEB", border:"1.5px solid #FDE68A", borderRadius:10, cursor:suggBusy?"not-allowed":"pointer", color:"#D97706", fontSize:12, fontWeight:600, fontFamily:"inherit" }}>
                {suggBusy ? <Loader2 size={13} className="ps-spin" /> : <Sparkles size={13} />}
                {suggBusy ? "Analyzing…" : "Generate"}
              </button>
            </div>

            <div style={{ padding:"16px 20px", minHeight:180 }}>
              {suggestions ? (
                <div style={{ fontSize:13, lineHeight:1.7 }}>
                  {renderText(suggestions)}
                </div>
              ) : (
                <div style={{ textAlign:"center", padding:"30px 0" }}>
                  <Brain size={36} color="#D1D5DB" style={{ marginBottom:12 }} />
                  <p style={{ fontSize:13, color:"#9CA3AF" }}>
                    Click "Generate" to get personalized AI study suggestions based on your notes.
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* Quick links */}
          <div style={{ marginTop:16, display:"flex", flexDirection:"column", gap:8 }}>
            {[
              { label:"Flashcards",   sub:"Study with spaced repetition", icon:BookOpen,  to:"/home/flashcards",    color:"#EFF3FF", iconColor:"#6366F1" },
              { label:"Study Planner",sub:"AI-powered schedule",          icon:CalendarDays, to:"/home/study-planner", color:"#F0FDF4", iconColor:"#16A34A" },
            ].map(({ label, sub, icon: Icon, to, color, iconColor }) => (
              <button key={label} type="button" onClick={() => navigate(to)}
                style={{ display:"flex", alignItems:"center", gap:12, padding:"14px 16px", background:"white", border:"1px solid #EBEBEB", borderRadius:14, cursor:"pointer", textAlign:"left", fontFamily:"inherit", transition:"all .2s" }}
                className="hg-card">
                <div style={{ width:38, height:38, borderRadius:12, background:color, display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0 }}>
                  <Icon size={17} color={iconColor} />
                </div>
                <div style={{ flex:1 }}>
                  <div style={{ fontSize:14, fontWeight:600, color:"#0E1117" }}>{label}</div>
                  <div style={{ fontSize:12, color:"#9CA3AF" }}>{sub}</div>
                </div>
                <ChevronRight size={15} color="#C4C9D4" />
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
