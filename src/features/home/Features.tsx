import React from "react";
import { useNavigate } from "react-router";
import {
  FileText, MessageSquare, Users, BookOpen, CalendarCheck, Calendar,
  Image, Mic, Search, Settings,
} from "lucide-react";

const FEATURES_CSS = `
@import url('https://fonts.googleapis.com/css2?family=DM+Serif+Display:ital@0;1&family=DM+Sans:opsz,wght@9..40,400;9..40,500;9..40,600;9..40,700&display=swap');
.ft-root { font-family: 'DM Sans', sans-serif; }
.ft-serif { font-family: 'DM Serif Display', serif; }
.ft-card {
  border: 1px solid #EBEBEB;
  background: #FFFFFF;
  transition: border-color .2s, transform .2s, box-shadow .2s;
}
.ft-card:hover {
  border-color: #D4D9FF;
  box-shadow: 0 12px 32px rgba(14,17,23,.06);
  transform: translateY(-2px);
}
.ft-icon {
  background: #F4F6FF;
  color: #4059FF;
}
`;

const features = [
  { name: "All Notes", icon: FileText, to: "/home/all-notes" },
  { name: "Hangout", icon: MessageSquare, to: "/home/hangout" },
  { name: "Personal", icon: Users, to: "/home/personal" },
  { name: "Flashcards", icon: BookOpen, to: "/home/flashcards" },
  { name: "Study Planner", icon: CalendarCheck, to: "/home/study-planner" },
  { name: "Calendar", icon: Calendar, to: "/home/calendar" },
  { name: "Upload Image", icon: Image, to: "/home/upload-image" },
  { name: "Voice Memo", icon: Mic, to: "/home/voice-memo" },
  { name: "Search", icon: Search, to: "/home/search" },
  { name: "Settings", icon: Settings, to: "/home/settings" },
];

export function Features() {
  const navigate = useNavigate();

  return (
    <div className="ft-root flex-1 overflow-auto p-4 sm:p-6 lg:p-8 min-[1440px]:p-10" style={{ background: "var(--bg-main, #FAFAF8)" }}>
      <style>{FEATURES_CSS}</style>
      <h1 className="ft-serif mb-1 text-2xl sm:text-3xl" style={{ color: "#0E1117", fontWeight: 400 }}>
        All Features
      </h1>
      <p className="mb-6 text-sm" style={{ color: "#6B7280" }}>
        Everything Luminote has to offer.
      </p>

      <div className="grid grid-cols-2 gap-3 min-[480px]:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 min-[1440px]:grid-cols-5">
        {features.map((f) => (
          <button
            key={f.name}
            type="button"
            onClick={() => navigate(f.to)}
            className="ft-card flex min-h-28 flex-col items-center gap-2.5 rounded-[20px] p-4 active:scale-[0.98] sm:min-h-32 sm:p-5"
          >
            <div className="ft-icon flex h-12 w-12 items-center justify-center rounded-2xl">
              <f.icon size={22} strokeWidth={2} />
            </div>
            <span className="text-sm" style={{ fontWeight: 600, color: "#0E1117" }}>{f.name}</span>
          </button>
        ))}
      </div>
    </div>
  );
}
