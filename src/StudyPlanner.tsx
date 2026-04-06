/**
 * StudyPlanner.tsx — Supabase-backed study planner + Qwen AI
 * - Full CRUD for study tasks (todo / in_progress / done)
 * - Priority levels with color coding
 * - AI study plan generator via Qwen
 * - Toast feedback on all actions
 */
import React, { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router";
import {
  ArrowLeft, Plus, Sparkles, Loader2, Check,
  Trash2, Calendar, ChevronDown, ChevronUp,
  AlertTriangle, Clock, CheckCircle2, Circle,
  X,
} from "lucide-react";
import { supabase, StudyPlan } from "./supabaseClient";
import { useAuth } from "./AuthContext";
import { generateStudyPlan } from "./qwen";
import { useToast } from "./toast";
import { format, isPast, parseISO, differenceInDays } from "date-fns";

const CSS = `
@import url('https://fonts.googleapis.com/css2?family=DM+Serif+Display:ital@0;1&family=Outfit:wght@400;500;600;700&display=swap');
.sp-root  { font-family:'Outfit',sans-serif; }
.sp-serif { font-family:'DM Serif Display',serif; }
@keyframes sp-up   { from{opacity:0;transform:translateY(12px)} to{opacity:1;transform:none} }
@keyframes sp-spin { to{transform:rotate(360deg)} }
.sp-a1{animation:sp-up .4s ease both .05s}
.sp-a2{animation:sp-up .4s ease both .15s}
.sp-spin{animation:sp-spin .8s linear infinite}
.sp-task { transition:box-shadow .2s,transform .15s; }
.sp-task:hover { box-shadow:0 4px 16px rgba(0,0,0,.06); }
`;

const PRIORITY_CONFIG = {
  low:    { color:"#16A34A", bg:"#F0FDF4", border:"#BBF7D0", label:"Low" },
  medium: { color:"#D97706", bg:"#FFFBEB", border:"#FDE68A", label:"Medium" },
  high:   { color:"#E11D48", bg:"#FFF1F2", border:"#FECDD3", label:"High" },
};
const STATUS_CONFIG = {
  todo:        { icon:<Circle size={15} />,        color:"#9CA3AF", label:"To Do" },
  in_progress: { icon:<Clock size={15} />,         color:"#D97706", label:"In Progress" },
  done:        { icon:<CheckCircle2 size={15} />, color:"#16A34A", label:"Done" },
};

const emptyForm = { title:"", subject:"", due_date:"", priority:"medium" as "low"|"medium"|"high", notes:"" };

export function StudyPlanner() {
  const navigate = useNavigate();
  const { user }  = useAuth();
  const toast     = useToast();

  const [plans,      setPlans]      = useState<StudyPlan[]>([]);
  const [loading,    setLoading]    = useState(true);
  const [showForm,   setShowForm]   = useState(false);
  const [form,       setForm]       = useState(emptyForm);
  const [saveBusy,   setSaveBusy]   = useState(false);
  const [actionBusy, setActionBusy] = useState<Record<string, boolean>>({});
  const [filter,     setFilter]     = useState<"all"|"todo"|"in_progress"|"done">("all");

  /* AI plan state */
  const [showAI,      setShowAI]      = useState(false);
  const [aiSubject,   setAiSubject]   = useState("");
  const [aiDays,      setAiDays]      = useState("7");
  const [aiTopics,    setAiTopics]    = useState("");
  const [aiResult,    setAiResult]    = useState("");
  const [aiBusy,      setAiBusy]      = useState(false);

  const loadPlans = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    const { data, error } = await supabase
      .from("study_plans")
      .select("*")
      .eq("user_id", user.id)
      .order("due_date", { ascending: true, nullsFirst: false });
    if (!error && data) setPlans(data as StudyPlan[]);
    setLoading(false);
  }, [user?.id]);

  useEffect(() => { loadPlans(); }, [loadPlans]);

  /* ── Add plan ──────────────────────────────────── */
  const addPlan = async () => {
    if (!form.title.trim() || !user) return;
    setSaveBusy(true);
    const { data, error } = await supabase
      .from("study_plans")
      .insert({ user_id: user.id, ...form, due_date: form.due_date || null })
      .select().single();
    if (error) { toast.error("Failed to add task."); }
    else {
      setPlans(prev => [...prev, data as StudyPlan]);
      setForm(emptyForm); setShowForm(false);
      toast.success("Study task added!");
    }
    setSaveBusy(false);
  };

  /* ── Update status ─────────────────────────────── */
  const updateStatus = async (id: string, status: StudyPlan["status"]) => {
    setActionBusy(prev => ({ ...prev, [id]: true }));
    const { error } = await supabase.from("study_plans").update({ status }).eq("id", id);
    if (error) toast.error("Failed to update.");
    else {
      setPlans(prev => prev.map(p => p.id === id ? { ...p, status } : p));
      if (status === "done") toast.success("Task completed! 🎉");
    }
    setActionBusy(prev => ({ ...prev, [id]: false }));
  };

  /* ── Delete plan ───────────────────────────────── */
  const deletePlan = async (id: string) => {
    setActionBusy(prev => ({ ...prev, [id]: true }));
    const { error } = await supabase.from("study_plans").delete().eq("id", id);
    if (error) toast.error("Failed to delete.");
    else { setPlans(prev => prev.filter(p => p.id !== id)); toast.info("Task removed."); }
    setActionBusy(prev => ({ ...prev, [id]: false }));
  };

  /* ── AI generate plan ──────────────────────────── */
  const runAiPlan = async () => {
    if (!aiSubject.trim()) { toast.error("Enter a subject first."); return; }
    setAiBusy(true);
    const id = toast.loading("Qwen AI is creating your study plan…");
    try {
      const result = await generateStudyPlan(aiSubject, parseInt(aiDays) || 7, aiTopics || "All topics");
      setAiResult(result);
      toast.dismiss(id);
      toast.success("Study plan generated!");
    } catch(e: any) {
      toast.dismiss(id);
      toast.error(e?.message ?? "Generation failed.");
    } finally { setAiBusy(false); }
  };

  const filtered = plans.filter(p => filter === "all" || p.status === filter);
  const statsCount = { todo: plans.filter(p=>p.status==="todo").length, in_progress: plans.filter(p=>p.status==="in_progress").length, done: plans.filter(p=>p.status==="done").length };

  const renderAiText = (text: string) => text.split("\n").map((line, i) => {
    if (line.startsWith("## ")) return <div key={i} style={{ fontWeight:700, fontSize:14, color:"#0E1117", marginTop:10, marginBottom:3 }}>{line.slice(3)}</div>;
    if (line.startsWith("- ")) return <div key={i} style={{ paddingLeft:14, color:"#374151", fontSize:13, lineHeight:1.6 }}>• {line.slice(2)}</div>;
    if (line.startsWith("**") && line.endsWith("**")) return <div key={i} style={{ fontWeight:600, color:"#0E1117", fontSize:13 }}>{line.slice(2,-2)}</div>;
    return <div key={i} style={{ fontSize:13, color:"#374151", lineHeight:1.6 }}>{line || <br />}</div>;
  });

  return (
    <div className="sp-root" style={{ minHeight:"100vh", background:"#FAFAF8" }}>
      <style>{CSS}</style>

      {/* Header */}
      <div style={{ background:"white", borderBottom:"1px solid #EBEBEB", position:"sticky", top:0, zIndex:10 }}>
        <div style={{ maxWidth:800, margin:"0 auto", padding:"16px 20px", display:"flex", alignItems:"center", gap:12 }}>
          <button type="button" onClick={() => navigate(-1)}
            style={{ width:36, height:36, borderRadius:10, border:"1px solid #E5E7EB", background:"none", cursor:"pointer", display:"flex", alignItems:"center", justifyContent:"center", color:"#6B7280" }}>
            <ArrowLeft size={16} />
          </button>
          <div>
            <h1 className="sp-serif" style={{ fontSize:"1.4rem", color:"#0E1117", margin:0 }}>Study Planner</h1>
            <p style={{ fontSize:12, color:"#9CA3AF", margin:0 }}>{plans.length} task{plans.length!==1?"s":""} planned</p>
          </div>
          <div style={{ marginLeft:"auto", display:"flex", gap:8 }}>
            <button type="button" onClick={() => setShowAI(a => !a)}
              style={{ display:"flex", alignItems:"center", gap:6, padding:"9px 14px", background:"#EFF3FF", border:"none", borderRadius:12, cursor:"pointer", color:"#6366F1", fontSize:13, fontWeight:600, fontFamily:"inherit" }}>
              <Sparkles size={14} /> AI Plan
            </button>
            <button type="button" onClick={() => setShowForm(f => !f)}
              style={{ display:"flex", alignItems:"center", gap:6, padding:"9px 14px", background:"#0E1117", color:"white", border:"none", borderRadius:12, cursor:"pointer", fontFamily:"inherit", fontSize:13, fontWeight:600 }}>
              <Plus size={14} /> Add Task
            </button>
          </div>
        </div>
      </div>

      <div style={{ maxWidth:800, margin:"0 auto", padding:"24px 20px" }}>

        {/* Stats */}
        <div className="sp-a1" style={{ display:"grid", gridTemplateColumns:"repeat(3,1fr)", gap:10, marginBottom:20 }}>
          {(["todo","in_progress","done"] as const).map(s => {
            const cfg = STATUS_CONFIG[s];
            return (
              <button key={s} type="button" onClick={() => setFilter(filter===s ? "all" : s)}
                style={{ padding:"14px", background:"white", borderRadius:16, border: filter===s ? `2px solid ${cfg.color}` : "1px solid #EBEBEB", cursor:"pointer", textAlign:"center", transition:"all .2s" }}>
                <div style={{ fontSize:"1.4rem", fontWeight:700, color:cfg.color }}>{statsCount[s]}</div>
                <div style={{ fontSize:12, color:"#9CA3AF", marginTop:2, fontWeight:500 }}>{cfg.label}</div>
              </button>
            );
          })}
        </div>

        {/* AI Plan Panel */}
        {showAI && (
          <div className="sp-a2" style={{ background:"white", borderRadius:20, border:"1px solid #EBEBEB", padding:20, marginBottom:20 }}>
            <div style={{ display:"flex", alignItems:"center", gap:8, marginBottom:14 }}>
              <Sparkles size={15} color="#6366F1" />
              <span style={{ fontSize:14, fontWeight:700, color:"#0E1117" }}>Qwen AI Study Plan Generator</span>
              <button type="button" onClick={() => setShowAI(false)} style={{ marginLeft:"auto", color:"#9CA3AF", background:"none", border:"none", cursor:"pointer" }}><X size={16} /></button>
            </div>
            <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:10, marginBottom:10 }}>
              <input value={aiSubject} onChange={e => setAiSubject(e.target.value)} placeholder="Subject (e.g. Calculus)"
                style={{ padding:"10px 12px", borderRadius:10, border:"1.5px solid #E5E7EB", fontSize:13, fontFamily:"inherit", outline:"none" }} />
              <input value={aiDays} onChange={e => setAiDays(e.target.value)} type="number" min="1" max="60" placeholder="Days until exam"
                style={{ padding:"10px 12px", borderRadius:10, border:"1.5px solid #E5E7EB", fontSize:13, fontFamily:"inherit", outline:"none" }} />
            </div>
            <input value={aiTopics} onChange={e => setAiTopics(e.target.value)} placeholder="Topics to cover (optional: integration, limits, derivatives…)"
              style={{ width:"100%", padding:"10px 12px", borderRadius:10, border:"1.5px solid #E5E7EB", fontSize:13, fontFamily:"inherit", outline:"none", boxSizing:"border-box", marginBottom:10 }} />
            <button type="button" onClick={runAiPlan} disabled={aiBusy || !aiSubject.trim()}
              style={{ display:"flex", alignItems:"center", gap:6, padding:"10px 18px", background:"#6366F1", color:"white", border:"none", borderRadius:10, cursor:aiBusy?"not-allowed":"pointer", fontFamily:"inherit", fontSize:13, fontWeight:600 }}>
              {aiBusy ? <Loader2 size={14} className="sp-spin" /> : <Sparkles size={14} />}
              {aiBusy ? "Generating…" : "Generate Plan"}
            </button>
            {aiResult && (
              <div style={{ marginTop:16, padding:"14px 16px", background:"#F9FAFB", borderRadius:12, border:"1px solid #E5E7EB", maxHeight:300, overflowY:"auto" }}>
                {renderAiText(aiResult)}
              </div>
            )}
          </div>
        )}

        {/* Add form */}
        {showForm && (
          <div className="sp-a2" style={{ background:"white", borderRadius:20, border:"1.5px solid #6366F1", padding:20, marginBottom:20 }}>
            <h3 style={{ fontSize:14, fontWeight:700, color:"#0E1117", marginBottom:14 }}>New Study Task</h3>
            <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:10, marginBottom:10 }}>
              <input value={form.title} onChange={e => setForm(f => ({...f,title:e.target.value}))} placeholder="Task title *"
                style={{ padding:"10px 12px", borderRadius:10, border:"1.5px solid #E5E7EB", fontSize:13, fontFamily:"inherit", outline:"none", gridColumn:"1/-1" }} />
              <input value={form.subject} onChange={e => setForm(f => ({...f,subject:e.target.value}))} placeholder="Subject (optional)"
                style={{ padding:"10px 12px", borderRadius:10, border:"1.5px solid #E5E7EB", fontSize:13, fontFamily:"inherit", outline:"none" }} />
              <input value={form.due_date} onChange={e => setForm(f => ({...f,due_date:e.target.value}))} type="date"
                style={{ padding:"10px 12px", borderRadius:10, border:"1.5px solid #E5E7EB", fontSize:13, fontFamily:"inherit", outline:"none" }} />
            </div>
            <div style={{ display:"flex", gap:8, marginBottom:12 }}>
              {(["low","medium","high"] as const).map(p => {
                const cfg = PRIORITY_CONFIG[p];
                const active = form.priority === p;
                return (
                  <button key={p} type="button" onClick={() => setForm(f => ({...f,priority:p}))}
                    style={{ flex:1, padding:"8px", borderRadius:10, border: active ? `2px solid ${cfg.color}` : "1.5px solid #E5E7EB", background: active ? cfg.bg : "white", cursor:"pointer", fontSize:12, fontWeight:600, color: active ? cfg.color : "#6B7280", fontFamily:"inherit" }}>
                    {cfg.label}
                  </button>
                );
              })}
            </div>
            <div style={{ display:"flex", gap:8, justifyContent:"flex-end" }}>
              <button type="button" onClick={() => { setShowForm(false); setForm(emptyForm); }}
                style={{ padding:"8px 16px", borderRadius:10, border:"1.5px solid #E5E7EB", background:"none", cursor:"pointer", fontFamily:"inherit", fontSize:13, color:"#6B7280" }}>Cancel</button>
              <button type="button" onClick={addPlan} disabled={saveBusy || !form.title.trim()}
                style={{ display:"flex", alignItems:"center", gap:6, padding:"8px 16px", background:"#6366F1", color:"white", border:"none", borderRadius:10, cursor:saveBusy?"not-allowed":"pointer", fontFamily:"inherit", fontSize:13, fontWeight:600 }}>
                {saveBusy ? <Loader2 size={13} className="sp-spin" /> : <Plus size={13} />} Add Task
              </button>
            </div>
          </div>
        )}

        {/* Tasks list */}
        {loading ? (
          <div style={{ display:"flex", justifyContent:"center", padding:40 }}>
            <Loader2 size={24} color="#6366F1" className="sp-spin" />
          </div>
        ) : filtered.length === 0 ? (
          <div style={{ textAlign:"center", padding:"60px 20px", background:"white", borderRadius:20, border:"1px solid #EBEBEB" }}>
            <Calendar size={36} color="#D1D5DB" style={{ marginBottom:12 }} />
            <h3 className="sp-serif" style={{ fontSize:"1.2rem", color:"#0E1117" }}>
              {filter === "all" ? "No study tasks yet" : `No ${STATUS_CONFIG[filter as keyof typeof STATUS_CONFIG].label} tasks`}
            </h3>
            <p style={{ fontSize:14, color:"#9CA3AF" }}>Add a task or generate a plan with AI above.</p>
          </div>
        ) : (
          <div style={{ display:"flex", flexDirection:"column", gap:10 }}>
            {filtered.map(plan => {
              const pri = PRIORITY_CONFIG[plan.priority];
              const sta = STATUS_CONFIG[plan.status];
              const overdue = plan.due_date && isPast(parseISO(plan.due_date)) && plan.status !== "done";
              const daysLeft = plan.due_date ? differenceInDays(parseISO(plan.due_date), new Date()) : null;

              return (
                <div key={plan.id} className="sp-task"
                  style={{ background:"white", borderRadius:16, border:"1px solid #EBEBEB", padding:"14px 16px", display:"flex", gap:12, alignItems:"flex-start" }}>

                  {/* Status circle */}
                  <button type="button"
                    disabled={actionBusy[plan.id]}
                    onClick={() => {
                      const next = plan.status === "todo" ? "in_progress" : plan.status === "in_progress" ? "done" : "todo";
                      updateStatus(plan.id, next);
                    }}
                    title="Click to advance status"
                    style={{ marginTop:2, color:sta.color, background:"none", border:"none", cursor:"pointer", flexShrink:0, padding:0 }}>
                    {actionBusy[plan.id] ? <Loader2 size={16} className="sp-spin" /> : sta.icon}
                  </button>

                  <div style={{ flex:1, minWidth:0 }}>
                    <div style={{ display:"flex", alignItems:"center", gap:8, flexWrap:"wrap" }}>
                      <span style={{ fontSize:14, fontWeight:600, color: plan.status==="done" ? "#9CA3AF" : "#0E1117", textDecoration: plan.status==="done" ? "line-through" : "none" }}>
                        {plan.title}
                      </span>
                      <span style={{ fontSize:10, fontWeight:700, padding:"2px 8px", borderRadius:100, background:pri.bg, color:pri.color, border:`1px solid ${pri.border}` }}>
                        {pri.label}
                      </span>
                    </div>
                    {plan.subject && <div style={{ fontSize:12, color:"#9CA3AF", marginTop:2 }}>{plan.subject}</div>}
                    {plan.due_date && (
                      <div style={{ display:"flex", alignItems:"center", gap:4, marginTop:4 }}>
                        {overdue && <AlertTriangle size={12} color="#E11D48" />}
                        <span style={{ fontSize:11, color: overdue ? "#E11D48" : "#9CA3AF", fontWeight: overdue ? 600 : 400 }}>
                          {overdue ? "Overdue: " : daysLeft !== null && daysLeft >= 0 ? `${daysLeft}d left · ` : ""}
                          {format(parseISO(plan.due_date), "MMM d, yyyy")}
                        </span>
                      </div>
                    )}
                  </div>

                  <button type="button" disabled={actionBusy[plan.id]} onClick={() => deletePlan(plan.id)}
                    style={{ padding:6, borderRadius:8, border:"none", background:"none", cursor:"pointer", color:"#D1D5DB", flexShrink:0 }}>
                    <Trash2 size={14} />
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
