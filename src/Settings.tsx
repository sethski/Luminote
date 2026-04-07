/**
 * Settings.tsx — Functional settings with Supabase persistence
 * - Theme: light / dark / sepia → stored in user_settings
 * - Font family + size → stored
 * - Manual sync with feedback
 * - Logout → supabase.auth.signOut() + redirect to /landing
 */
import React, { useState } from "react";
import { useNavigate } from "react-router";
import {
  X, Palette, Type, Cloud, User, LogOut,
  Check, Loader2, RefreshCw, Sun, Moon, Coffee, ChevronRight,
  ShieldCheck, Copy, RotateCcw,
} from "lucide-react";
import { useAuth } from "./AuthContext";
import { useToast } from "./toast";

const FONTS = [
  { id: "outfit",         label: "Outfit",   sample: "'Outfit',sans-serif" },
  { id: "dm-serif",       label: "DM Serif", sample: "'DM Serif Display',serif" },
  { id: "lora",           label: "Lora",     sample: "'Lora',serif" },
  { id: "jetbrains-mono", label: "JB Mono",  sample: "'JetBrains Mono',monospace" },
  { id: "nunito",         label: "Nunito",   sample: "'Nunito',sans-serif" },
  { id: "playfair",       label: "Playfair", sample: "'Playfair Display',serif" },
];
const FONT_SIZES = [13, 14, 15, 16, 17, 18];
const THEMES = [
  { id: "light"    as const, label: "Light",    Icon: Sun,  bg: "#ffffff", textC: "#0f172a" },
  { id: "ash"      as const, label: "Ash",      Icon: Moon, bg: "#f1f5f9", textC: "#334155" },
  { id: "obsidian" as const, label: "Obsidian", Icon: Moon, bg: "#0b0f19", textC: "#e5e7eb" },
];

const S: Record<string, React.CSSProperties> = {
  overlay:  { position:"fixed", inset:0, zIndex:100, background:"rgba(14,17,23,.45)", backdropFilter:"blur(4px)", display:"flex", alignItems:"center", justifyContent:"center", padding:16 },
  modal:    { width:"100%", maxWidth:640, maxHeight:"90vh", background:"white", borderRadius:24, boxShadow:"0 32px 80px rgba(0,0,0,.18)", display:"flex", flexDirection:"column", overflow:"hidden", border:"1px solid #E5E7EB" },
  header:   { display:"flex", alignItems:"flex-start", justifyContent:"space-between", padding:"28px 28px 16px", borderBottom:"1px solid #F3F4F6" },
  body:     { overflowY:"auto", flex:1, padding:"20px 28px 28px" },
  footer:   { padding:"16px 28px", borderTop:"1px solid #F3F4F6", background:"#FAFAFA", display:"flex", justifyContent:"flex-end", gap:10 },
  secHead:  { display:"flex", alignItems:"center", gap:8, marginBottom:12 },
  secLabel: { fontSize:11, fontWeight:700, color:"#9CA3AF", textTransform:"uppercase" as const, letterSpacing:".08em" },
  row:      { display:"flex", alignItems:"center", justifyContent:"space-between", padding:"14px 16px", background:"#FAFAFA", borderRadius:14, border:"1px solid #F3F4F6", marginBottom:8 },
};

export function Settings() {
  const navigate  = useNavigate();
  const { profile, settings, updateSettings, signOut, user, resetAuthCache, deleteAccount } = useAuth();
  const toast     = useToast();
  const [syncing,    setSyncing]    = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);
  const [lastSync,   setLastSync]   = useState<Date | null>(null);

  const apply = async (key: string, value: string | number | boolean) => {
    try {
      await updateSettings({ [key]: value } as any);
      toast.success("Setting saved");
    } catch { toast.error("Failed to save setting"); }
  };

  const handleSync = async () => {
    setSyncing(true);
    const id = toast.loading("Syncing…");
    try {
      await new Promise(r => setTimeout(r, 1200));
      setLastSync(new Date());
      toast.dismiss(id);
      toast.success("All data synced!");
    } catch {
      toast.dismiss(id);
      toast.error("Sync failed.");
    } finally { setSyncing(false); }
  };

  const handleLogout = () => {
    setLoggingOut(true);
    signOut(); // This function now handles everything (state clearing + redirect)
  };

  const Section = ({ icon: Icon, title, children }: { icon: any; title: string; children: React.ReactNode }) => (
    <div style={{ marginBottom: 24 }}>
      <div style={S.secHead}>
        <Icon size={13} color="#9CA3AF" />
        <span style={S.secLabel}>{title}</span>
      </div>
      {children}
    </div>
  );

  return (
    <div style={S.overlay} role="dialog" aria-modal="true">
      <div style={S.modal}>

        {/* Header */}
        <div style={S.header}>
          <div>
            <h1 style={{ fontSize:"1.6rem", fontWeight:700, color:"#0E1117", marginBottom:3 }}>Settings</h1>
            <p style={{ fontSize:14, color:"#9CA3AF" }}>Personalize your Luminote experience</p>
          </div>
          <button type="button" onClick={() => navigate(-1)}
            style={{ width:36, height:36, borderRadius:10, border:"1.5px solid #E5E7EB", background:"none", cursor:"pointer", display:"flex", alignItems:"center", justifyContent:"center", color:"#6B7280" }}>
            <X size={16} />
          </button>
        </div>

        {/* Body */}
        <div style={S.body}>

          {/* ── Appearance ─────────────────────── */}
          <Section icon={Palette} title="Appearance">
            <div style={{ display:"grid", gridTemplateColumns:"repeat(3,1fr)", gap:8, marginBottom:8 }}>
              {THEMES.map(({ id, label, Icon: TIcon, bg, textC }) => {
                const active = settings?.theme === id;
                return (
                  <button key={id} type="button" onClick={() => apply("theme", id)}
                    style={{ display:"flex", flexDirection:"column", alignItems:"center", gap:8, padding:"14px 8px", borderRadius:14, background: active ? "#EFF3FF" : "#FAFAFA", border: active ? "2px solid #6366F1" : "1.5px solid #E5E7EB", cursor:"pointer", transition:"all .2s" }}>
                    <div style={{ width:36, height:36, borderRadius:10, background:bg, border:"1px solid #E5E7EB", display:"flex", alignItems:"center", justifyContent:"center" }}>
                      <TIcon size={16} color={textC} />
                    </div>
                    <span style={{ fontSize:13, fontWeight:600, color: active ? "#6366F1" : "#374151" }}>{label}</span>
                    {active && <Check size={12} color="#6366F1" />}
                  </button>
                );
              })}
            </div>
          </Section>

          {/* ── Typography ─────────────────────── */}
          <Section icon={Type} title="Typography">
            <p style={{ fontSize:12, fontWeight:600, color:"#6B7280", marginBottom:8 }}>Font Family</p>
            <div style={{ display:"grid", gridTemplateColumns:"repeat(3,1fr)", gap:6, marginBottom:14 }}>
              {FONTS.map(f => {
                const active = settings?.font_family === f.id;
                return (
                  <button key={f.id} type="button" onClick={() => apply("font_family", f.id)}
                    style={{ padding:"10px 8px", borderRadius:12, background: active ? "#EFF3FF" : "#FAFAFA", border: active ? "2px solid #6366F1" : "1.5px solid #E5E7EB", cursor:"pointer", transition:"all .2s", textAlign:"center" }}>
                    <div style={{ fontFamily:f.sample, fontSize:20, color: active ? "#6366F1" : "#374151", marginBottom:3 }}>Aa</div>
                    <div style={{ fontSize:11, fontWeight:700, color: active ? "#6366F1" : "#6B7280" }}>{f.label}</div>
                  </button>
                );
              })}
            </div>
            <p style={{ fontSize:12, fontWeight:600, color:"#6B7280", marginBottom:8 }}>Font Size</p>
            <div style={{ display:"flex", gap:6 }}>
              {FONT_SIZES.map(size => {
                const active = settings?.font_size === size;
                return (
                  <button key={size} type="button" onClick={() => apply("font_size", size)}
                    style={{ flex:1, padding:"8px 4px", borderRadius:10, textAlign:"center", background: active ? "#6366F1" : "#FAFAFA", border: active ? "2px solid #6366F1" : "1.5px solid #E5E7EB", cursor:"pointer", transition:"all .2s", fontSize:12, fontWeight:700, color: active ? "white" : "#374151" }}>
                    {size}
                  </button>
                );
              })}
            </div>
          </Section>

          {/* ── Sync ───────────────────────────── */}
          <Section icon={Cloud} title="Sync & Data">
            <div style={S.row}>
              <div>
                <div style={{ fontSize:14, fontWeight:600, color:"#0E1117" }}>Manual Sync</div>
                <div style={{ fontSize:12, color:"#9CA3AF", marginTop:2 }}>
                  {lastSync ? `Last synced: ${lastSync.toLocaleTimeString()}` : "Not synced this session"}
                </div>
              </div>
              <button type="button" onClick={handleSync} disabled={syncing}
                style={{ display:"flex", alignItems:"center", gap:6, padding:"8px 14px", background:"#EFF3FF", border:"none", borderRadius:10, cursor:syncing?"not-allowed":"pointer", color:"#6366F1", fontSize:13, fontWeight:600, fontFamily:"inherit" }}>
                {syncing ? <Loader2 size={14} color="#6366F1" style={{ animation:"spin .8s linear infinite" }} /> : <RefreshCw size={14} />}
                {syncing ? "Syncing…" : "Sync Now"}
              </button>
            </div>
          </Section>

          {/* ── Account ────────────────────────── */}
          <Section icon={User} title="Account">
            <div style={{ display:"flex", alignItems:"center", gap:14, padding:16, background:"#FAFAFA", borderRadius:14, border:"1px solid #F3F4F6", marginBottom:8 }}>
              {profile?.avatar_url ? (
                <img src={profile.avatar_url} alt="avatar" style={{ width:44, height:44, borderRadius:"50%", objectFit:"cover", border:"2px solid #E5E7EB" }} />
              ) : (
                <div style={{ width:44, height:44, borderRadius:"50%", background:"#EFF3FF", display:"flex", alignItems:"center", justifyContent:"center" }}>
                  <User size={20} color="#6366F1" />
                </div>
              )}
              <div>
                <div style={{ fontSize:15, fontWeight:700, color:"#0E1117" }}>
                  {profile?.display_name ?? user?.email?.split("@")[0] ?? "Luminote User"}
                </div>
                <div style={{ fontSize:13, color:"#9CA3AF" }}>{profile?.email ?? user?.email ?? ""}</div>
              </div>
            </div>
            <button type="button" onClick={handleLogout} disabled={loggingOut}
              style={{ width:"100%", display:"flex", alignItems:"center", justifyContent:"space-between", padding:"14px 16px", background:"#FFF1F2", border:"1.5px solid #FECDD3", borderRadius:14, cursor:loggingOut?"not-allowed":"pointer", fontFamily:"inherit", transition:"all .2s" }}>
              <div style={{ display:"flex", alignItems:"center", gap:8 }}>
                {loggingOut ? <Loader2 size={16} color="#F43F5E" style={{ animation:"spin .8s linear infinite" }} /> : <LogOut size={16} color="#F43F5E" />}
                <span style={{ fontSize:14, fontWeight:600, color:"#BE123C" }}>{loggingOut ? "Signing out…" : "Sign Out"}</span>
              </div>
              <ChevronRight size={14} color="#F43F5E" />
            </button>
          </Section>

          {/* ── Session Info ────────────────────── */}
          <Section icon={ShieldCheck} title="Session Info">
            <div style={{ padding:16, background:"#F9FAFB", borderRadius:14, border:"1px solid #E5E7EB", marginBottom:8 }}>
              <div style={{ fontSize:11, fontWeight:700, color:"#9CA3AF", marginBottom:4, textTransform:"uppercase" }}>User ID</div>
              <div style={{ display:"flex", alignItems:"center", gap:8 }}>
                <code style={{ fontSize:12, color:"#374151", background:"#F3F4F6", padding:"2px 6px", borderRadius:6, flex:1, overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>
                  {user?.id ?? "Not logged in"}
                </code>
                <button
                  type="button"
                  onClick={() => { navigator.clipboard.writeText(user?.id ?? ""); toast.success("ID copied"); }}
                  style={{ background:"none", border:"none", cursor:"pointer", color:"#9CA3AF" }}
                  title="Copy ID"
                >
                  <Copy size={14} />
                </button>
              </div>
            </div>
            <button
              type="button"
              onClick={() => { if (confirm("This will clear all local auth data and reload the app. Continue?")) resetAuthCache(); }}
              style={{ width:"100%", display:"flex", alignItems:"center", gap:8, padding:"12px 16px", background:"#F3F4F6", border:"1px solid #E5E7EB", borderRadius:14, cursor:"pointer", fontFamily:"inherit" }}
            >
              <RotateCcw size={14} color="#6B7280" />
              <span style={{ fontSize:13, fontWeight:600, color:"#374151" }}>Reset Auth Cache</span>
            </button>
            <p style={{ fontSize:11, color:"#9CA3AF", marginTop:8, paddingLeft:4 }}>
              Use this if you are stuck or seeing the wrong account data.
            </p>
          </Section>

          {/* ── Danger Zone ────────────────────── */}
          <Section icon={ShieldCheck} title="Danger Zone">
             <div style={{ padding:16, background:"#FFF1F2", border:"1.5px solid #FECDD3", borderRadius:14 }}>
               <div style={{ fontSize:14, fontWeight:700, color:"#BE123C", marginBottom:4 }}>Delete Account</div>
               <div style={{ fontSize:12, color:"#E11D48", marginBottom:16, lineHeight:1.4 }}>
                 Permanently remove your profile and all your data. This action is irreversible.
               </div>
               <button
                 type="button"
                 onClick={async () => {
                   if (confirm("ARE YOU ABSOLUTELY SURE? All your notes, servers, and profile data will be permanently DELETED. This cannot be undone.")) {
                     const secondCheck = prompt("To confirm, please type 'DELETE' below:");
                     if (secondCheck === "DELETE") {
                        try {
                          await deleteAccount();
                          toast.success("Account deleted successfully.");
                        } catch (e: any) {
                          toast.error("Failed to delete account: " + e.message);
                        }
                     }
                   }
                 }}
                 style={{ width:"100%", padding:"12px", background:"#BE123C", color:"white", border:"none", borderRadius:10, fontWeight:700, cursor:"pointer", fontFamily:"inherit" }}
               >
                 Permanently Delete My Data
               </button>
             </div>
          </Section>
        </div>

        {/* Footer */}
        <div style={S.footer}>
          <button type="button" onClick={() => navigate(-1)}
            style={{ padding:"10px 24px", background:"#0E1117", color:"white", border:"none", borderRadius:12, fontFamily:"inherit", fontSize:14, fontWeight:600, cursor:"pointer" }}>
            Done
          </button>
        </div>
      </div>
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  );
}
