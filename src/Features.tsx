import React from "react";
import { useNavigate } from "react-router";
import { FileText, MessageSquare, Users, BookOpen, CalendarCheck, Calendar, Image, Mic, Search, Settings, Upload } from "lucide-react";

const features = [
  { name: "All Notes", icon: FileText, color: "bg-blue-50 text-blue-500", to: "/home/all-notes" },
  { name: "Hangout", icon: MessageSquare, color: "bg-violet-50 text-violet-500", to: "/home/hangout" },
  { name: "Personal", icon: Users, color: "bg-rose-50 text-rose-500", to: "/home/personal" },
  { name: "Flashcards", icon: BookOpen, color: "bg-amber-50 text-amber-500", to: "/home/flashcards" },
  { name: "Study Planner", icon: CalendarCheck, color: "bg-emerald-50 text-emerald-500", to: "/home/study-planner" },
  { name: "Calendar", icon: Calendar, color: "bg-indigo-50 text-indigo-500", to: "/home/calendar" },
  { name: "Upload Image", icon: Image, color: "bg-pink-50 text-pink-500", to: "/home/upload-image" },
  { name: "Voice Memo", icon: Mic, color: "bg-red-50 text-red-500", to: "/home/voice-memo" },
  { name: "Search", icon: Search, color: "bg-cyan-50 text-cyan-500", to: "/home/search" },
  { name: "Settings", icon: Settings, color: "bg-gray-100 text-gray-500", to: "/home/settings" },
];

export function Features() {
  const navigate = useNavigate();

  return (
    <div className="flex-1 overflow-auto p-4 sm:p-6 lg:p-8 min-[1440px]:p-10">
      <h1 className="mb-1 text-xl text-gray-900 sm:text-2xl" style={{ fontWeight: 700 }}>All Features</h1>
      <p className="mb-5 text-sm text-gray-400 sm:mb-6">Everything Luminote has to offer.</p>

      {/* Responsive grid aligned to key breakpoints. */}
      <div className="grid grid-cols-2 gap-3 min-[480px]:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 min-[1440px]:grid-cols-5">
        {features.map((f) => (
          <button
            key={f.name}
            onClick={() => navigate(f.to)}
            className="flex min-h-28 flex-col items-center gap-2.5 rounded-2xl border border-gray-100 bg-white p-4 transition-all active:scale-[0.97] hover:shadow-md sm:min-h-32 sm:p-5"
          >
            <div className={`w-12 h-12 rounded-2xl ${f.color} flex items-center justify-center`}>
              <f.icon size={22} />
            </div>
            <span className="text-sm text-gray-700" style={{ fontWeight: 600 }}>{f.name}</span>
          </button>
        ))}
      </div>
    </div>
  );
}
