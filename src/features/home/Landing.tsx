/**
 * Landing.tsx — Luminote Public Landing Page
 * Design: Soft-professional / editorial-light
 * Fonts: DM Serif Display (headings) + DM Sans (body)
 * Palette: Warm white (#FAFAF8), deep slate (#0E1117), accent blue (#4059FF)
 */
import React, { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router";
import {
  ArrowRight, Sparkles, Mic, Image as ImageIcon,
  BookOpen, Zap, Check, FileText, Users, Star,
  Brain, Calendar, Tag, ChevronDown,
} from "lucide-react";

/* ─── Injected CSS ─────────────────────────────── */
const LAND_CSS = `
@import url('https://fonts.googleapis.com/css2?family=DM+Serif+Display:ital@0;1&family=DM+Sans:ital,opsz,wght@0,9..40,300;0,9..40,400;0,9..40,500;0,9..40,600;0,9..40,700;1,9..40,400&display=swap');

.ln-root   { font-family: 'DM Sans', sans-serif; background: #FAFAF8; color: #0E1117; }
.ln-serif  { font-family: 'DM Serif Display', serif; }
.ln-serif-i { font-family: 'DM Serif Display', serif; font-style: italic; }

/* ── Animations ─────────────────────────────── */
@keyframes ln-up {
  from { opacity:0; transform:translateY(24px); }
  to   { opacity:1; transform:translateY(0);    }
}
@keyframes ln-fade { from{opacity:0} to{opacity:1} }
@keyframes ln-float {
  0%,100% { transform: translateY(0px); }
  50%     { transform: translateY(-8px); }
}
@keyframes ln-float2 {
  0%,100% { transform: translateY(0px) rotate(2deg); }
  50%     { transform: translateY(-12px) rotate(2deg); }
}
@keyframes ln-marquee {
  from { transform: translateX(0); }
  to   { transform: translateX(-50%); }
}
@keyframes ln-spin {
  to { transform: rotate(360deg); }
}
@keyframes ln-pulse-ring {
  0%   { box-shadow: 0 0 0 0   rgba(64,89,255,.25); }
  70%  { box-shadow: 0 0 0 12px rgba(64,89,255,0);  }
  100% { box-shadow: 0 0 0 0   rgba(64,89,255,0);   }
}
@keyframes ln-line {
  from { width: 0; }
  to   { width: 100%; }
}
@keyframes ln-count {
  from { opacity: 0; transform: translateY(8px); }
  to   { opacity: 1; transform: translateY(0); }
}

.a1 { animation: ln-up .6s ease both .05s; }
.a2 { animation: ln-up .6s ease both .18s; }
.a3 { animation: ln-up .6s ease both .31s; }
.a4 { animation: ln-up .6s ease both .44s; }
.a5 { animation: ln-up .6s ease both .57s; }
.a6 { animation: ln-up .6s ease both .70s; }
.af { animation: ln-fade .8s ease both; }

.ln-float1 { animation: ln-float  6s ease-in-out infinite; }
.ln-float2 { animation: ln-float2 8s ease-in-out infinite 1.5s; }
.ln-float3 { animation: ln-float  5s ease-in-out infinite 3s; }

/* ── Marquee ─────────────────────────────────── */
.ln-marquee-track { animation: ln-marquee 28s linear infinite; }
.ln-marquee-track:hover { animation-play-state: paused; }

/* ── Nav ─────────────────────────────────────── */
.ln-nav-link {
  font-size: 14px; font-weight: 500; color: #6B7280;
  text-decoration: none; transition: color .2s;
  position: relative; padding-bottom: 2px;
}
.ln-nav-link::after {
  content: ''; position: absolute; bottom: 0; left: 0;
  width: 0; height: 1.5px; background: #4059FF;
  transition: width .25s ease;
}
.ln-nav-link:hover { color: #0E1117; }
.ln-nav-link:hover::after { width: 100%; }

/* ── Buttons ─────────────────────────────────── */
.ln-btn-primary {
  display: inline-flex; align-items: center; gap: 8px;
  background: #0E1117; color: white;
  padding: 14px 28px; border-radius: 100px;
  font-size: 15px; font-weight: 600; border: none; cursor: pointer;
  font-family: 'DM Sans', sans-serif;
  transition: background .2s, transform .15s, box-shadow .2s;
  box-shadow: 0 4px 20px rgba(14,17,23,.15);
}
.ln-btn-primary:hover {
  background: #1e2330;
  transform: translateY(-1px);
  box-shadow: 0 8px 28px rgba(14,17,23,.2);
}
.ln-btn-primary:active { transform: scale(.98); }

.ln-btn-outline {
  display: inline-flex; align-items: center; gap: 8px;
  background: transparent; color: #0E1117;
  padding: 13px 24px; border-radius: 100px;
  font-size: 14px; font-weight: 600; cursor: pointer;
  border: 1.5px solid #E5E7EB;
  font-family: 'DM Sans', sans-serif;
  transition: border-color .2s, background .2s;
}
.ln-btn-outline:hover { border-color: #0E1117; background: #F5F5F3; }

.ln-btn-accent {
  display: inline-flex; align-items: center; gap: 8px;
  background: #4059FF; color: white;
  padding: 14px 28px; border-radius: 100px;
  font-size: 15px; font-weight: 600; border: none; cursor: pointer;
  font-family: 'DM Sans', sans-serif;
  transition: background .2s, transform .15s, box-shadow .2s;
  box-shadow: 0 8px 32px rgba(64,89,255,.3);
  animation: ln-pulse-ring 2.5s infinite;
}
.ln-btn-accent:hover {
  background: #2d45f0;
  transform: translateY(-2px);
  box-shadow: 0 12px 40px rgba(64,89,255,.4);
}
.ln-btn-accent:active { transform: scale(.98); }

/* ── Cards ──────────────────────────────────── */
.ln-card {
  background: white; border: 1px solid #EBEBEB;
  border-radius: 24px; overflow: hidden;
  transition: transform .3s ease, box-shadow .3s ease;
}
.ln-card:hover {
  transform: translateY(-4px);
  box-shadow: 0 20px 48px rgba(0,0,0,.07);
}

/* ── Feature icon ─────────────────────────────*/
.ln-icon-wrap {
  width: 48px; height: 48px; border-radius: 14px;
  display: flex; align-items: center; justify-content: center;
  margin-bottom: 20px;
}

/* ── Horizontal rule ─────────────────────────── */
.ln-hr { border: none; border-top: 1px solid #EBEBEB; margin: 0; }

/* ── Tag pill ──────────────────────────────── */
.ln-pill {
  display: inline-flex; align-items: center; gap: 6px;
  background: #F0F0EE; border-radius: 100px;
  padding: 6px 14px; font-size: 13px; font-weight: 600; color: #555;
}

/* ── Highlight underline ─────────────────────── */
.ln-underline {
  position: relative; display: inline-block;
}
.ln-underline::after {
  content: ''; position: absolute;
  bottom: 2px; left: 0; right: 0; height: 3px;
  background: #4059FF; border-radius: 2px;
  animation: ln-line .6s ease both .9s;
}

/* ── Scrollbar hide ─────────────────────────── */
.ln-no-scroll::-webkit-scrollbar { display: none; }
.ln-no-scroll { -ms-overflow-style: none; scrollbar-width: none; }

/* Breakpoint tuning: <=480 phones, <=768 tablets, and 1440+ desktops. */
@media (max-width: 768px) {
  .ln-btn-primary,
  .ln-btn-outline,
  .ln-btn-accent { min-height: 44px; }
}

@media (max-width: 480px) {
  .ln-root nav .max-w-6xl { padding-left: 14px; padding-right: 14px; }
}

@media (min-width: 1440px) {
  .ln-root .max-w-6xl { max-width: 1320px; }
}
`;

/* ─── Feature data ─────────────────────────────── */
const FEATURES = [
  {
    Icon: ImageIcon,
    color: "#EFF3FF",
    iconColor: "#4059FF",
    label: "Smart OCR",
    desc: "Photograph handwritten notes or whiteboards — AI extracts clean, searchable text in seconds.",
    tag: "Image → Text",
  },
  {
    Icon: Mic,
    color: "#FDF2F8",
    iconColor: "#C026D3",
    label: "Voice Memos",
    desc: "Record lectures or quick thoughts. Real-time transcription with speaker formatting.",
    tag: "Speech → Text",
  },
  {
    Icon: Brain,
    color: "#FFFBEB",
    iconColor: "#D97706",
    label: "AI Summaries",
    desc: "One tap turns any note into a concise study guide with key points and action items.",
    tag: "AI-Powered",
  },
  {
    Icon: Tag,
    color: "#F0FDF4",
    iconColor: "#16A34A",
    label: "Auto-Tagging",
    desc: "Every note is categorized the moment you save — Research, Planning, Tech, and more.",
    tag: "Auto-Organize",
  },
  {
    Icon: Zap,
    color: "#FFF7ED",
    iconColor: "#EA580C",
    label: "Offline First",
    desc: "Full functionality with zero internet. Your notes never wait for a connection.",
    tag: "Always Ready",
  },
  {
    Icon: Users,
    color: "#F0F9FF",
    iconColor: "#0284C7",
    label: "Study Together",
    desc: "Shared spaces to collaborate on notes, share resources, and build knowledge as a group.",
    tag: "Community",
  },
];

const TESTIMONIALS = [
  { text: "The OCR feature alone is worth it. I photograph my lecture slides and they're searchable instantly.", name: "Marcus T.", role: "Computer Science, Year 2" },
  { text: "Voice memos with live transcription changed how I take notes during lab sessions.", name: "Sofia R.", role: "Chemistry, Year 4" },
  { text: "Finally a notes app built for the way students actually think and work.", name: "Anya K.", role: "Biochemistry, Year 3" },
];

const MARQUEE_ITEMS = [
  "Smart OCR", "Voice Transcription", "AI Summaries", "Offline-First",
  "Auto Tagging", "Sync Everywhere", "Study Together", "Smart Reminders",
];

/* ─── Counter component ───────────────────────── */
function Counter({ end, suffix = "" }: { end: number; suffix?: string }) {
  const [val, setVal] = useState(0);
  const ref = useRef<HTMLSpanElement>(null);
  useEffect(() => {
    let start = 0;
    const step = end / 40;
    const timer = setInterval(() => {
      start += step;
      if (start >= end) { setVal(end); clearInterval(timer); }
      else setVal(Math.floor(start));
    }, 30);
    return () => clearInterval(timer);
  }, [end]);
  return <span ref={ref}>{val.toLocaleString()}{suffix}</span>;
}

/* ─── Main component ──────────────────────────── */
export function Landing() {
  const navigate = useNavigate();
  const [openFaq, setOpenFaq] = useState<number | null>(null);

  const faqs = [
    { q: "Is Luminote free to use?", a: "Yes — Luminote is completely free for students. Create an account and start capturing notes immediately with no credit card required." },
    { q: "Does OCR work on handwritten notes?", a: "Absolutely. Our AI engine handles handwriting, printed text, whiteboards, and mixed documents with high accuracy." },
    { q: "Can I use it without internet?", a: "Yes. Luminote is offline-first — you have full functionality locally and everything syncs automatically when you reconnect." },
    { q: "How does the AI auto-tagging work?", a: "When you save a note, our AI reads the content and applies relevant tags like RESEARCH, TECH, or PLANNING based on context." },
  ];

  return (
    <div className="ln-root min-h-screen">
      <style>{LAND_CSS}</style>

      {/* ── NAV ────────────────────────────────── */}
      <nav className="sticky top-0 z-50 bg-[#FAFAF8]/90 backdrop-blur-md border-b border-[#EBEBEB]">
        <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
          {/* Logo */}
          <div className="flex items-center gap-2.5 af">
            <div className="w-8 h-8 rounded-xl bg-[#0E1117] flex items-center justify-center">
              <BookOpen size={15} color="white" />
            </div>
            <span className="ln-serif text-lg">Luminote</span>
          </div>

          {/* Desktop links */}
          <div className="hidden md:flex items-center gap-8 af">
            <a href="#features" className="ln-nav-link">Features</a>
            <a href="#how" className="ln-nav-link">How it works</a>
            <a href="#faq" className="ln-nav-link">FAQ</a>
          </div>

          {/* CTA row */}
          <div className="flex items-center gap-3 af">
            <button
              type="button"
              onClick={() => navigate("/login")}
              className="ln-btn-outline hidden sm:inline-flex"
              style={{ padding: "9px 20px", fontSize: "13px" }}
            >
              Sign In
            </button>
            <button
              type="button"
              onClick={() => navigate("/login")}
              className="ln-btn-primary"
              style={{ padding: "9px 20px", fontSize: "13px" }}
            >
              Get Started <ArrowRight size={14} />
            </button>
          </div>
        </div>
      </nav>

      {/* ── HERO ───────────────────────────────── */}
      <section className="max-w-6xl mx-auto px-6 pt-20 pb-24 md:pt-28 md:pb-32">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">

          {/* Left */}
          <div>
            <div className="ln-pill a1 mb-6">
              <Sparkles size={13} /> For students, by students
            </div>

            <h1 className="ln-serif a2 text-[3rem] md:text-[3.75rem] lg:text-[4.25rem] leading-[1.05] tracking-tight mb-6">
              Notes that{" "}
              <span className="ln-serif-i ln-underline text-[#4059FF]">think</span>
              <br />alongside you.
            </h1>

            <p className="a3 text-[#6B7280] text-lg leading-relaxed mb-8 max-w-md">
              Capture handwritten notes via OCR, transcribe voice with AI,
              auto-tag everything, and sync offline — all in one calm, focused space.
            </p>

            <div className="a4 flex flex-wrap items-center gap-4 mb-10">
              <button
                type="button"
                onClick={() => navigate("/login")}
                className="ln-btn-accent"
              >
                Start for Free <ArrowRight size={16} />
              </button>
              <div className="flex items-center gap-2 text-sm text-[#9CA3AF]">
                <Check size={14} className="text-emerald-500" />
                No credit card required
              </div>
            </div>

            {/* Stats */}
            <div className="a5 flex flex-wrap gap-8 pt-8 border-t border-[#EBEBEB]">
              {[
                { end: 10000, suffix: "+", label: "Students" },
                { end: 50000, suffix: "+", label: "Notes created" },
                { end: 4.9, suffix: "★", label: "Rating" },
              ].map(({ end, suffix, label }) => (
                <div key={label}>
                  <div className="ln-serif text-2xl text-[#0E1117]">
                    {end < 10 ? end : <Counter end={end} suffix={suffix} />}
                    {end < 10 ? suffix : ""}
                  </div>
                  <div className="text-xs text-[#9CA3AF] mt-0.5 font-medium">{label}</div>
                </div>
              ))}
            </div>
          </div>

          {/* Right — floating card mockups */}
          <div className="relative h-[420px] hidden lg:block af">
            {/* Main card */}
            <div className="ln-float1 absolute top-0 left-0 w-[290px] bg-white rounded-[20px] shadow-[0_16px_48px_rgba(0,0,0,.1)] p-6 border border-[#EBEBEB]">
              <div className="flex items-center gap-2 mb-4">
                <div className="w-3 h-3 rounded-full bg-red-400" />
                <div className="w-3 h-3 rounded-full bg-yellow-400" />
                <div className="w-3 h-3 rounded-full bg-green-400" />
              </div>
              <p className="ln-serif text-[#0E1117] text-base mb-3">Design System Notes</p>
              <div className="space-y-2 mb-4">
                {[100, 83, 67, 90, 55].map((w, i) => (
                  <div key={i} className="h-2 bg-[#F3F3F1] rounded-full" style={{ width: `${w}%` }} />
                ))}
              </div>
              <div className="flex gap-1.5">
                <span className="text-[10px] font-bold bg-blue-50 text-blue-600 px-2 py-1 rounded-lg">RESEARCH</span>
                <span className="text-[10px] font-bold bg-purple-50 text-purple-600 px-2 py-1 rounded-lg">DESIGN</span>
              </div>
            </div>

            {/* OCR badge */}
            <div
              className="ln-float2 absolute top-[200px] right-4 bg-[#0E1117] text-white rounded-2xl px-4 py-3 shadow-xl"
            >
              <div className="flex items-center gap-2 mb-1">
                <ImageIcon size={14} />
                <span className="text-sm font-semibold">OCR Complete</span>
              </div>
              <div className="text-white/50 text-xs">1,240 chars extracted</div>
            </div>

            {/* Voice chip */}
            <div className="ln-float3 absolute bottom-10 left-10 bg-white border border-[#EBEBEB] rounded-2xl px-4 py-3 shadow-lg flex items-center gap-3">
              <div className="w-8 h-8 rounded-xl bg-[#FDF2F8] flex items-center justify-center">
                <Mic size={14} color="#C026D3" />
              </div>
              <div>
                <div className="text-xs font-semibold text-[#0E1117]">Voice transcribed</div>
                <div className="text-[10px] text-[#9CA3AF]">12 sec ago</div>
              </div>
              <div className="w-2 h-2 rounded-full bg-emerald-400 ml-1" />
            </div>

            {/* Dot grid decoration */}
            <div
              className="absolute inset-0 -z-10 opacity-30"
              style={{
                backgroundImage: "radial-gradient(#D1D5DB 1px, transparent 1px)",
                backgroundSize: "24px 24px",
              }}
            />
          </div>
        </div>
      </section>

      {/* ── MARQUEE ────────────────────────────── */}
      <div className="border-y border-[#EBEBEB] bg-white overflow-hidden py-3.5">
        <div className="flex items-center gap-10 ln-marquee-track ln-no-scroll whitespace-nowrap" style={{ width: "max-content" }}>
          {[...MARQUEE_ITEMS, ...MARQUEE_ITEMS, ...MARQUEE_ITEMS].map((item, i) => (
            <span key={i} className="flex items-center gap-3 text-sm font-medium text-[#9CA3AF]">
              <span className="w-1 h-1 rounded-full bg-[#4059FF] inline-block" />
              {item}
            </span>
          ))}
        </div>
      </div>

      {/* ── HOW IT WORKS ───────────────────────── */}
      <section id="how" className="max-w-6xl mx-auto px-6 py-24">
        <div className="text-center mb-16">
          <div className="ln-pill inline-flex mb-4"><Zap size={13} /> Simple by design</div>
          <h2 className="ln-serif text-4xl md:text-5xl mb-4">Three steps. Zero friction.</h2>
          <p className="text-[#6B7280] max-w-md mx-auto">
            Luminote gets out of your way so you can focus on learning.
          </p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {[
            { n: "01", title: "Capture anything", desc: "Type, photograph, or record — Luminote accepts your notes in whatever form they come." },
            { n: "02", title: "AI organizes it", desc: "Auto-tagging, OCR conversion, and voice transcription happen instantly in the background." },
            { n: "03", title: "Find it anywhere", desc: "Everything is searchable, synced, and available even when you're offline." },
          ].map(({ n, title, desc }) => (
            <div key={n} className="relative p-8 rounded-[20px] bg-white border border-[#EBEBEB]">
              <div className="ln-serif text-[4rem] text-[#F3F3F1] leading-none mb-4 select-none">{n}</div>
              <h3 className="ln-serif text-xl text-[#0E1117] mb-2">{title}</h3>
              <p className="text-[#6B7280] text-sm leading-relaxed">{desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ── FEATURES ───────────────────────────── */}
      <section id="features" className="bg-white border-y border-[#EBEBEB]">
        <div className="max-w-6xl mx-auto px-6 py-24">
          <div className="text-center mb-16">
            <div className="ln-pill inline-flex mb-4"><Brain size={13} /> Packed with intelligence</div>
            <h2 className="ln-serif text-4xl md:text-5xl mb-4">Everything in one place</h2>
            <p className="text-[#6B7280] max-w-md mx-auto">
              From lecture hall to late-night revision — Luminote adapts to every moment.
            </p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {FEATURES.map(({ Icon, color, iconColor, label, desc, tag }) => (
              <div key={label} className="ln-card p-7">
                <div className="ln-icon-wrap" style={{ background: color }}>
                  <Icon size={20} color={iconColor} />
                </div>
                <div className="flex items-start justify-between mb-2">
                  <h3 className="ln-serif text-lg text-[#0E1117]">{label}</h3>
                  <span
                    className="text-[10px] font-bold px-2 py-1 rounded-lg ml-2 mt-0.5 whitespace-nowrap"
                    style={{ background: color, color: iconColor }}
                  >
                    {tag}
                  </span>
                </div>
                <p className="text-[#6B7280] text-sm leading-relaxed">{desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── TESTIMONIALS ───────────────────────── */}
      <section className="max-w-6xl mx-auto px-6 py-24">
        <div className="text-center mb-12">
          <h2 className="ln-serif text-4xl md:text-5xl mb-3">Students love it.</h2>
          <p className="text-[#9CA3AF]">Don't take our word for it.</p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          {TESTIMONIALS.map((t, i) => (
            <div key={i} className="p-7 rounded-[20px] bg-white border border-[#EBEBEB]">
              <div className="flex gap-0.5 mb-4">
                {Array(5).fill(0).map((_, j) => (
                  <Star key={j} size={13} color="#F59E0B" fill="#F59E0B" />
                ))}
              </div>
              <p className="text-[#374151] text-sm leading-relaxed mb-5 ln-serif-i">"{t.text}"</p>
              <div>
                <div className="text-[#0E1117] text-sm font-semibold">{t.name}</div>
                <div className="text-[#9CA3AF] text-xs mt-0.5">{t.role}</div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ── FAQ ────────────────────────────────── */}
      <section id="faq" className="bg-white border-t border-[#EBEBEB]">
        <div className="max-w-2xl mx-auto px-6 py-24">
          <h2 className="ln-serif text-4xl text-center mb-12">Common questions</h2>
          <div className="space-y-3">
            {faqs.map(({ q, a }, i) => (
              <div
                key={i}
                className="rounded-[16px] border border-[#EBEBEB] overflow-hidden transition-shadow"
                style={{ boxShadow: openFaq === i ? "0 4px 20px rgba(0,0,0,.05)" : "" }}
              >
                <button
                  type="button"
                  onClick={() => setOpenFaq(openFaq === i ? null : i)}
                  className="w-full flex items-center justify-between p-5 text-left"
                  aria-expanded={openFaq === i}
                >
                  <span className="font-semibold text-[#0E1117] text-sm">{q}</span>
                  <ChevronDown
                    size={16}
                    color="#9CA3AF"
                    style={{ transform: openFaq === i ? "rotate(180deg)" : "", transition: "transform .2s" }}
                  />
                </button>
                {openFaq === i && (
                  <div className="px-5 pb-5 text-[#6B7280] text-sm leading-relaxed border-t border-[#EBEBEB] pt-4">
                    {a}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── FINAL CTA ──────────────────────────── */}
      <section className="max-w-6xl mx-auto px-6 py-24">
        <div
          className="rounded-[32px] p-12 md:p-16 text-center"
          style={{ background: "linear-gradient(135deg, #0E1117 0%, #1a2240 100%)" }}
        >
          <div className="ln-pill inline-flex mb-5" style={{ background: "rgba(255,255,255,.08)", color: "rgba(255,255,255,.7)" }}>
            <BookOpen size={13} /> By student, for student
          </div>
          <h2 className="ln-serif text-white text-4xl md:text-5xl mb-4">
            Ready to study smarter?
          </h2>
          <p className="text-white/50 mb-8 max-w-md mx-auto text-base">
            Join thousands of students already capturing, organizing, and understanding more with Luminote.
          </p>
          <button
            type="button"
            onClick={() => navigate("/login")}
            className="ln-btn-accent mb-6 mx-auto"
          >
            Get Started Free <ArrowRight size={16} />
          </button>
          <div className="flex items-center justify-center gap-6 text-xs text-white/30 flex-wrap">
            {["Free forever", "No credit card", "Works offline", "WCAG accessible"].map(item => (
              <span key={item} className="flex items-center gap-1.5">
                <Check size={11} className="text-emerald-400" /> {item}
              </span>
            ))}
          </div>
        </div>
      </section>

      {/* ── FOOTER ─────────────────────────────── */}
      <footer className="border-t border-[#EBEBEB] py-8 px-6">
        <div className="max-w-6xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-[#0E1117] flex items-center justify-center">
              <BookOpen size={12} color="white" />
            </div>
            <span className="ln-serif">Luminote</span>
          </div>
          <p className="text-xs text-[#9CA3AF]">© 2026 Luminote. All rights reserved.</p>
          <div className="flex gap-5 text-xs text-[#9CA3AF]">
            <button type="button" className="hover:text-[#0E1117] transition-colors">Privacy</button>
            <button type="button" className="hover:text-[#0E1117] transition-colors">Terms</button>
            <button type="button" className="hover:text-[#0E1117] transition-colors">Contact</button>
          </div>
        </div>
      </footer>
    </div>
  );
}
