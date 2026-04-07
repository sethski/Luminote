import React, { useState } from "react";
import { Outlet, NavLink, useNavigate, useLocation } from "react-router";
import {
  Home,
  Search,
  Settings,
  Plus,
  FileText,
  MessageSquare,
  Users,
  BookOpen,
  CalendarCheck,
  Grid3X3,
  ChevronRight,
} from "lucide-react";
import { useNotes } from "./NotesContext";
import { useAuth } from "./AuthContext";

function LuminoteLogo({ size = 16 }: { size?: number }) {
  return <img src="/src/assets/logo.svg" alt="Luminote" width={size} height={size} className="object-contain" />;
}

function NavItem({
  to,
  icon: Icon,
  label,
}: {
  to: string;
  icon: React.ElementType;
  label: string;
}) {
  const location = useLocation();
  const active = to === "/home" ? location.pathname === "/home" : location.pathname.startsWith(to);

  return (
    <NavLink
      to={to}
      className={`flex items-center gap-3 px-4 py-2.5 rounded-xl transition-all duration-200 ${
        active
          ? "bg-indigo-500/10 text-indigo-500 font-semibold"
          : "text-[#6B7280] dark:text-slate-400 hover:text-indigo-500"
      }`}
    >
      <Icon size={18} strokeWidth={active ? 2.5 : 2} />
      <span className="hidden md:block text-sm">{label}</span>
    </NavLink>
  );
}

function MobileNavItem({
  to,
  icon: Icon,
  label,
  exact = false,
}: {
  to: string;
  icon: React.ElementType;
  label: string;
  exact?: boolean;
}) {
  const location = useLocation();
  const active = exact ? location.pathname === to : location.pathname.startsWith(to);

  return (
    <NavLink to={to} className="flex flex-col items-center justify-center w-full transition-colors" style={{ color: active ? "#6366F1" : "#9CA3AF" }}>
      <Icon size={22} strokeWidth={active ? 2.5 : 2} />
      <span style={{ fontSize: 9, marginTop: 3, fontWeight: 600, letterSpacing: ".03em" }}>{label}</span>
    </NavLink>
  );
}

export function Root() {
  return <RootInner />;
}

function RootInner() {
  const { addNote } = useNotes();
  const { profile, user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [noteCreating, setNoteCreating] = useState(false);

  const handleAddNote = async () => {
    if (noteCreating) return;
    setNoteCreating(true);
    try {
      const id = await addNote();
      navigate(`/home/editor/${id}`);
    } finally {
      setNoteCreating(false);
    }
  };

  const hideNavigation =
    location.pathname.includes("/editor/") ||
    location.pathname.includes("/calendar") ||
    location.pathname.includes("/upload-image") ||
    location.pathname.includes("/voice-memo") ||
    location.pathname.includes("/hangout") ||
    location.pathname.includes("/flashcards");

  const initials = profile?.display_name
    ? profile.display_name
        .split(" ")
        .map((w) => w[0])
        .join("")
        .slice(0, 2)
        .toUpperCase()
    : user?.email?.[0]?.toUpperCase() ?? "U";

  return (
    <div className="flex h-screen overflow-hidden transition-colors duration-300" style={{ background: "var(--color-background, #F8FAFC)", color: "var(--color-text-primary, #0E1117)" }}>
      {!hideNavigation && (
        <aside
          className="hidden md:flex flex-col w-[240px] border-r z-20 transition-colors duration-300"
          style={{ background: "var(--color-surface, #FFFFFF)", borderColor: "rgba(148,163,184,.25)", boxShadow: "4px 0 24px rgba(0,0,0,.02)" }}
        >
          <div className="flex items-center gap-3 px-6 py-6 mb-2">
            <div className="w-14 h-14 rounded-xl bg-[#0E1117] flex items-center justify-center shrink-0">
              <LuminoteLogo size={32} />
            </div>
            <span className="text-lg font-bold tracking-tight" style={{ color: "var(--color-text-primary, #0E1117)", fontFamily: "'Bricolage Grotesque', 'DM Serif Display', serif" }}>
              Luminote
            </span>
          </div>

          <nav className="flex-1 px-3 space-y-0.5 overflow-y-auto">
            <NavItem to="/home" icon={Home} label="Home" />
            <NavItem to="/home/all-notes" icon={FileText} label="All Notes" />
            <NavItem to="/home/hangout" icon={MessageSquare} label="Hangout" />
            <NavItem to="/home/personal" icon={Users} label="Personal Hub" />

            <div className="px-4 pt-6 pb-2">
              <span className="text-[10px] font-bold uppercase tracking-widest" style={{ color: "var(--color-text-secondary, #94A3B8)" }}>
                Learning Tools
              </span>
            </div>
            <NavItem to="/home/flashcards" icon={BookOpen} label="Flashcards" />
            <NavItem to="/home/study-planner" icon={CalendarCheck} label="Study Planner" />
          </nav>

          <div className="p-4 border-t" style={{ borderColor: "rgba(148,163,184,.25)" }}>
            <div
              className="flex items-center justify-between p-3 rounded-2xl cursor-pointer transition-colors border"
              onClick={() => navigate("/home/settings")}
              style={{ borderColor: "rgba(148,163,184,.25)" }}
            >
              <div className="flex items-center gap-3">
                {profile?.avatar_url ? (
                  <img src={profile.avatar_url} alt="avatar" className="w-9 h-9 rounded-full object-cover" style={{ border: "2px solid rgba(148,163,184,.25)" }} />
                ) : (
                  <div className="w-9 h-9 rounded-full flex items-center justify-center text-white text-xs font-bold" style={{ background: "linear-gradient(135deg, #6366F1, #8B5CF6)" }}>
                    {initials}
                  </div>
                )}
                <div>
                  <p className="text-sm font-semibold leading-tight truncate max-w-[110px]" style={{ color: "var(--color-text-primary, #0E1117)" }}>
                    {profile?.display_name ?? user?.email?.split("@")[0] ?? "User"}
                  </p>
                  <div className="flex items-center gap-1.5 mt-0.5">
                    <div className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                    <p className="text-[10px] font-medium" style={{ color: "var(--color-text-secondary, #94A3B8)" }}>
                      Active
                    </p>
                  </div>
                </div>
              </div>
              <ChevronRight size={14} color="#94A3B8" />
            </div>
          </div>
        </aside>
      )}

      <main
        className={`flex-1 flex flex-col relative h-full overflow-hidden transition-colors duration-300 ${!hideNavigation ? "pb-[72px] md:pb-0" : ""}`}
        style={{ background: "var(--color-background, #F8FAFC)" }}
      >
        <div className="flex-1 overflow-auto">
          <Outlet />
        </div>
      </main>

      {!hideNavigation && (
        <div
          className="md:hidden fixed bottom-0 left-0 right-0 h-[72px] flex items-center justify-around px-2 z-50"
          style={{
            background: "color-mix(in srgb, var(--color-surface, #FFFFFF) 95%, transparent)",
            backdropFilter: "blur(12px)",
            borderTop: "1px solid rgba(148,163,184,.25)",
            boxShadow: "0 -4px 20px rgba(0,0,0,.05)",
          }}
        >
          <MobileNavItem to="/home" icon={Home} label="Home" exact />
          <MobileNavItem to="/home/search" icon={Search} label="Search" />

          <div className="relative -top-5">
            <button
              type="button"
              onClick={handleAddNote}
              disabled={noteCreating}
              className="w-14 h-14 rounded-full flex items-center justify-center text-white transition-transform active:scale-90"
              style={{ background: "#0E1117", boxShadow: "0 8px 24px rgba(14,17,23,.25)" }}
              aria-label="Create new note"
            >
              <Plus size={26} />
            </button>
          </div>

          <MobileNavItem to="/home/features" icon={Grid3X3} label="Features" />
          <MobileNavItem to="/home/settings" icon={Settings} label="Settings" />
        </div>
      )}
    </div>
  );
}

