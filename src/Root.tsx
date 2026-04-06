/**
 * Root.tsx — Authenticated app shell
 * - Fixed: imports from correct relative paths (not ../store/)
 * - Fixed: uses AuthContext for user profile (no hardcoded "Alex Rivera")
 * - Fixed: NotesProvider removed (App.tsx already provides it)
 * - Fixed: isOffline/setOfflineMode removed (not in new API)
 * - Fixed: nav routes updated to /home/* pattern
 * - Fixed: figma:asset logo replaced with inline SVG
 */
import React, { useState } from "react";
import { Outlet, NavLink, useNavigate, useLocation } from "react-router";
import {
  Home, Search, Settings, Plus, Bell, FileText,
  MessageSquare, Users, BookOpen, CalendarCheck,
  Grid3X3, Cloud, ChevronRight,
} from "lucide-react";
import { useNotes } from "./NotesContext";
import { useAuth } from "./AuthContext";

/* ─── Logo SVG (replaces figma:asset) ─────────── */
function LuminoteLogo({ size = 16 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 16 16" fill="none">
      <rect width="16" height="16" rx="4" fill="white" fillOpacity=".2" />
      <path d="M8 2L14 10H10V14H6V10H2L8 2Z" fill="white" />
    </svg>
  );
}

/* ─── NavItem (sidebar) ────────────────────────── */
function NavItem({
  to, icon: Icon, label,
}: {
  to: string; icon: React.ElementType; label: string;
}) {
  const location = useLocation();
  const active   = location.pathname.startsWith(to);

  return (
    <NavLink
      to={to}
      className="flex items-center gap-3 px-4 py-2.5 rounded-xl transition-all duration-200"
      style={({ isActive }) => ({
        background: active ? "rgba(99,102,241,.08)" : "transparent",
        color:      active ? "#6366F1" : "#6B7280",
        fontWeight: active ? 600 : 500,
      })}
    >
      <Icon size={18} strokeWidth={active ? 2.5 : 2} />
      <span className="hidden md:block text-sm">{label}</span>
    </NavLink>
  );
}

/* ─── MobileNavItem ────────────────────────────── */
function MobileNavItem({
  to, icon: Icon, label, exact = false,
}: {
  to: string; icon: React.ElementType; label: string; exact?: boolean;
}) {
  const location = useLocation();
  const active   = exact ? location.pathname === to : location.pathname.startsWith(to);

  return (
    <NavLink
      to={to}
      className="flex flex-col items-center justify-center w-full transition-colors"
      style={{ color: active ? "#6366F1" : "#9CA3AF" }}
    >
      <Icon size={22} strokeWidth={active ? 2.5 : 2} />
      <span style={{ fontSize: 9, marginTop: 3, fontWeight: 600, letterSpacing: ".03em" }}>{label}</span>
    </NavLink>
  );
}

/* ─── Root (no extra NotesProvider — App.tsx has it) */
export function Root() {
  return <RootInner />;
}

function RootInner() {
  const { searchQuery, setSearchQuery, addNote } = useNotes();
  const { profile, user } = useAuth();
  const navigate  = useNavigate();
  const location  = useLocation();
  const [noteCreating, setNoteCreating] = useState(false);

  /* Create note and navigate to editor */
  const handleAddNote = async () => {
    if (noteCreating) return;
    setNoteCreating(true);
    try {
      const id = await addNote();
      navigate(`/home/editor/${id}`);
    } catch {
      /* no-op — user stays on current page */
    } finally { setNoteCreating(false); }
  };

  /* Hide chrome for immersive screens */
  const hideNavigation =
    location.pathname.includes("/editor/") ||
    location.pathname.includes("/calendar") ||
    location.pathname.includes("/upload-image") ||
    location.pathname.includes("/voice-memo") ||
    location.pathname.includes("/hangout") ||
    location.pathname.includes("/personal") ||
    location.pathname.includes("/flashcards");

  /* Avatar initials fallback */
  const initials = profile?.display_name
    ? profile.display_name.split(" ").map(w => w[0]).join("").slice(0, 2).toUpperCase()
    : user?.email?.[0]?.toUpperCase() ?? "U";

  return (
    <div className="flex h-screen overflow-hidden" style={{ background: "var(--color-background, #FAFAF8)", color: "var(--color-text-primary, #0E1117)" }}>

      {/* ── Desktop Sidebar ─────────────────── */}
      {!hideNavigation && (
        <aside
          className="hidden md:flex flex-col w-[240px] border-r z-20"
          style={{ background: "var(--color-surface, white)", borderColor: "#EBEBEB", boxShadow: "4px 0 24px rgba(0,0,0,.02)" }}
        >
          {/* Brand */}
          <div className="flex items-center gap-3 px-6 py-6 mb-2">
            <div className="w-9 h-9 rounded-xl bg-[#0E1117] flex items-center justify-center shrink-0">
              <LuminoteLogo size={16} />
            </div>
            <span className="text-lg font-bold tracking-tight text-[#0E1117]" style={{ fontFamily: "'Bricolage Grotesque', 'DM Serif Display', serif" }}>
              Luminote
            </span>
          </div>

          {/* Nav links */}
          <nav className="flex-1 px-3 space-y-0.5 overflow-y-auto">
            <NavItem to="/home"            icon={Home}         label="Home"          />
            <NavItem to="/home/all-notes"  icon={FileText}     label="All Notes"     />
            <NavItem to="/home/hangout"    icon={MessageSquare} label="Hangout"      />
            <NavItem to="/home/personal"   icon={Users}        label="Personal Hub"  />

            <div className="px-4 pt-6 pb-2">
              <span className="text-[10px] font-bold text-[#C4C9D4] uppercase tracking-widest">Learning Tools</span>
            </div>
            <NavItem to="/home/flashcards"    icon={BookOpen}     label="Flashcards"    />
            <NavItem to="/home/study-planner" icon={CalendarCheck} label="Study Planner" />
          </nav>

          {/* User profile footer */}
          <div className="p-4 border-t" style={{ borderColor: "#F3F4F6" }}>
            <div
              className="flex items-center justify-between p-3 rounded-2xl cursor-pointer transition-colors hover:bg-gray-50"
              onClick={() => navigate("/home/settings")}
              style={{ border: "1px solid #F3F4F6" }}
            >
              <div className="flex items-center gap-3">
                {profile?.avatar_url ? (
                  <img src={profile.avatar_url} alt="avatar"
                    className="w-9 h-9 rounded-full object-cover"
                    style={{ border: "2px solid #EBEBEB" }} />
                ) : (
                  <div className="w-9 h-9 rounded-full flex items-center justify-center text-white text-xs font-bold"
                    style={{ background: "linear-gradient(135deg, #6366F1, #8B5CF6)" }}>
                    {initials}
                  </div>
                )}
                <div>
                  <p className="text-sm font-semibold text-[#0E1117] leading-tight truncate max-w-[110px]">
                    {profile?.display_name ?? "Student"}
                  </p>
                  <div className="flex items-center gap-1.5 mt-0.5">
                    <div className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                    <p className="text-[10px] text-gray-400 font-medium">Active</p>
                  </div>
                </div>
              </div>
              <ChevronRight size={14} color="#C4C9D4" />
            </div>
          </div>
        </aside>
      )}

      {/* ── Main content ────────────────────── */}
      <main className={`flex-1 flex flex-col relative h-full overflow-hidden ${!hideNavigation ? "pb-[72px] md:pb-0" : ""}`}
        style={{ background: "#FAFAF8" }}>

        {/* Desktop header */}
        {!hideNavigation && (
          <header
            className="hidden md:flex items-center justify-between px-8 py-4 sticky top-0 z-10"
            style={{ background: "rgba(250,250,248,.9)", backdropFilter: "blur(12px)", borderBottom: "1px solid #EBEBEB" }}
          >
            <div className="flex-1 max-w-xl relative">
              <Search size={16} color="#9CA3AF"
                style={{ position: "absolute", left: 14, top: "50%", transform: "translateY(-50%)", pointerEvents: "none" }} />
              <input
                type="text"
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                placeholder="Search notes…"
                style={{
                  width: "100%", paddingLeft: 40, paddingRight: 16,
                  paddingTop: 9, paddingBottom: 9,
                  border: "1.5px solid #EBEBEB", borderRadius: 12,
                  background: "white", fontSize: 14, fontFamily: "inherit",
                  color: "#0E1117", outline: "none", transition: "border-color .2s",
                }}
                onFocus={e => (e.target.style.borderColor = "#6366F1")}
                onBlur={e  => (e.target.style.borderColor = "#EBEBEB")}
              />
            </div>
            <div className="flex items-center gap-3 ml-4">
              <button type="button"
                className="w-9 h-9 rounded-full border flex items-center justify-center relative transition-colors hover:bg-gray-50"
                style={{ borderColor: "#EBEBEB", background: "white" }}>
                <Bell size={16} color="#6B7280" />
                <span className="absolute top-1.5 right-1.5 w-1.5 h-1.5 bg-red-500 rounded-full" />
              </button>
              <button type="button" onClick={() => navigate("/home/settings")}>
                {profile?.avatar_url ? (
                  <img src={profile.avatar_url} alt="avatar"
                    className="w-9 h-9 rounded-full object-cover"
                    style={{ border: "2px solid #EBEBEB" }} />
                ) : (
                  <div className="w-9 h-9 rounded-full flex items-center justify-center text-white text-xs font-bold"
                    style={{ background: "linear-gradient(135deg, #6366F1, #8B5CF6)" }}>
                    {initials}
                  </div>
                )}
              </button>
            </div>
          </header>
        )}

        <div className="flex-1 overflow-auto">
          <Outlet />
        </div>
      </main>

      {/* ── Mobile bottom nav ───────────────── */}
      {!hideNavigation && (
        <div
          className="md:hidden fixed bottom-0 left-0 right-0 h-[72px] flex items-center justify-around px-2 z-50"
          style={{ background: "rgba(255,255,255,.95)", backdropFilter: "blur(12px)", borderTop: "1px solid #EBEBEB", boxShadow: "0 -4px 20px rgba(0,0,0,.05)" }}
        >
          <MobileNavItem to="/home"                 icon={Home}         label="Home"    exact />
          <MobileNavItem to="/home/search"          icon={Search}       label="Search"  />
          {/* FAB */}
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
          <MobileNavItem to="/home/features" icon={Grid3X3}       label="Features" />
          <MobileNavItem to="/home/settings" icon={Settings}      label="Settings" />
        </div>
      )}
    </div>
  );
}
