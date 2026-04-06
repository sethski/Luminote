import React, { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router";
import {
  ArrowLeft, UserPlus, Users, Check, X,
  Loader2, Search, MessageSquare, Clock,
  UserCheck, AlertCircle, Bell, Filter, Edit3,
  ThumbsUp, Share2, MoreHorizontal, Download,
  FlaskConical, Sigma, Code, BookOpen, Settings, HelpCircle, User, FileText, UploadCloud
} from "lucide-react";
import { supabase, Friendship, Profile } from "./supabaseClient";
import { useAuth } from "./AuthContext";
import { useToast } from "./toast";

const Initials = ({ name, size = 32 }: { name: string; size?: number }) => {
  const initials = name.substring(0, 2).toUpperCase();
  const colors = ["#EF4444", "#F59E0B", "#10B981", "#3B82F6", "#6366F1", "#8B5CF6", "#EC4899"];
  const color = colors[name.length % colors.length];
  
  return (
    <div style={{
      width: size,
      height: size,
      borderRadius: "50%",
      background: color,
      color: "white",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      fontSize: size * 0.35,
      fontWeight: 700,
      flexShrink: 0,
      boxShadow: "0 2px 4px rgba(0,0,0,0.1)"
    }}>
      {initials}
    </div>
  );
};

const SpaceIconFallback = Initials;

/* ─── Types ────────────────────────────────────────── */
type FriendshipWithProfile = Friendship & {
  other: Profile;
};

/* ─── CSS ──────────────────────────────────────────── */
const CSS = `
@import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap');
.hg-root { font-family: 'Inter', sans-serif; display: flex; min-height: 100vh; background: #F8FAFC; color: #0F172A; }

/* Sidebar */
.hg-sidebar { width: 250px; background: white; border-right: 1px solid #E2E8F0; display: flex; flex-direction: column; padding: 24px 16px; flex-shrink: 0; }
.hg-sidebar-title { font-size: 20px; font-weight: 700; color: #065F46; letter-spacing: -0.5px; margin-bottom: 2px; }
.hg-sidebar-subtitle { font-size: 10px; font-weight: 600; color: #94A3B8; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 32px; }
.hg-section-title { font-size: 11px; font-weight: 700; color: #94A3B8; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 12px; margin-top: 24px; padding-left: 12px; }
.hg-nav-item { display: flex; align-items: center; gap: 12px; padding: 10px 12px; border-radius: 8px; font-size: 14px; font-weight: 500; color: #475569; cursor: pointer; transition: all 0.2s; border: none; background: none; width: 100%; text-align: left; }
.hg-nav-item:hover { background: #F1F5F9; color: #0F172A; }
.hg-nav-item.active { background: #6EE7B7; color: #064E3B; font-weight: 600; }

/* Main Content */
.hg-main { flex: 1; display: flex; flex-direction: column; height: 100vh; overflow: hidden; }
.hg-header { height: 72px; background: white; border-bottom: 1px solid #E2E8F0; display: flex; align-items: center; justify-content: space-between; padding: 0 32px; }
.hg-search-bar { display: flex; align-items: center; gap: 8px; background: #F1F5F9; padding: 10px 16px; border-radius: 100px; width: 320px; }
.hg-search-input { border: none; background: transparent; outline: none; font-size: 14px; width: 100%; color: #0F172A; }

.hg-top-tabs { display: flex; align-items: center; gap: 24px; height: 100%; margin-left: auto; margin-right: 32px; }
.hg-top-tab { font-size: 13px; font-weight: 600; color: #64748B; text-transform: uppercase; letter-spacing: 0.5px; height: 100%; display: flex; align-items: center; border-bottom: 2px solid transparent; cursor: pointer; transition: color 0.2s; }
.hg-top-tab:hover { color: #0F172A; }
.hg-top-tab.active { color: #059669; border-bottom-color: #059669; }

.hg-content-scroll { flex: 1; overflow-y: auto; padding: 32px; }
.hg-content-inner { max-width: 1000px; margin: 0 auto; }

/* Cards & Feeds */
.hg-page-title { font-size: 32px; font-weight: 700; color: #0F172A; letter-spacing: -0.5px; margin-bottom: 8px; }
.hg-page-subtitle { font-size: 15px; color: #64748B; margin-bottom: 32px; }

.hg-feed-tabs { display: flex; gap: 8px; margin-bottom: 24px; }
.hg-feed-tab { padding: 8px 24px; border-radius: 100px; font-size: 13px; font-weight: 600; cursor: pointer; text-transform: uppercase; border: 1px solid #E2E8F0; background: white; color: #64748B; transition: all 0.2s; }
.hg-feed-tab.active { background: #065F46; color: white; border-color: #065F46; }

.hg-post-card { background: white; border-radius: 24px; padding: 24px; margin-bottom: 16px; box-shadow: 0 1px 3px rgba(0,0,0,0.05); border: 1px solid #E2E8F0; }
.hg-pending-card { background: white; border-radius: 24px; padding: 24px; box-shadow: 0 1px 3px rgba(0,0,0,0.05); border: 1px solid #E2E8F0; }

.btn-primary { background: #065F46; color: white; padding: 10px 20px; border-radius: 100px; font-size: 14px; font-weight: 500; border: none; cursor: pointer; display: flex; align-items: center; justify-content: center; gap: 8px; transition: all 0.2s; }
.btn-primary:hover { background: #047857; }
`;

type Tab = "FEED" | "FRIENDS";
export function Hangout() {
  const navigate = useNavigate();
  const { user, profile } = useAuth();
  const toast = useToast();

  const [topTab, setTopTab] = useState<Tab>("FEED");
  const [friends, setFriends] = useState<FriendshipWithProfile[]>([]);
  const [incoming, setIncoming] = useState<FriendshipWithProfile[]>([]);
  const [feedPosts, setFeedPosts] = useState<any[]>([]);
  const [spaces, setSpaces] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchEmail, setSearchEmail] = useState("");
  const [sendBusy, setSendBusy] = useState(false);
  const [actionBusy, setActionBusy] = useState<Record<string, boolean>>({});

  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newSpaceName, setNewSpaceName] = useState("");
  const [newSpaceType, setNewSpaceType] = useState<"community" | "server">("server");
  const [newSpaceImage, setNewSpaceImage] = useState<File | null>(null);
  const [newSpaceImagePreview, setNewSpaceImagePreview] = useState<string | null>(null);
  const [createBusy, setCreateBusy] = useState(false);

  /* ── Load friendships ─────────────────────────────── */
  const loadFriendships = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    const { data: accepted } = await supabase
      .from("friendships")
      .select("*, requester:profiles!requester_id(*), addressee:profiles!addressee_id(*)")
      .eq("status", "accepted")
      .or(`requester_id.eq.${user.id},addressee_id.eq.${user.id}`);

    if (accepted) {
      setFriends(accepted.map((f: any) => ({
        ...f,
        other: f.requester_id === user.id ? f.addressee : f.requester,
      })));
    }

    const { data: pending } = await supabase
      .from("friendships")
      .select("*, requester:profiles!requester_id(*)")
      .eq("addressee_id", user.id)
      .eq("status", "pending");

    if (pending) {
      setIncoming(pending.map((f: any) => ({ ...f, other: f.requester })));
    }

    const { data: posts } = await supabase
      .from("hangout_posts")
      .select("*")
      .order("created_at", { ascending: false });
    
    if (posts) setFeedPosts(posts);

    const { data: spaceData } = await supabase
      .from("spaces")
      .select("*")
      .order("created_at", { ascending: true });
    
    if (spaceData) setSpaces(spaceData);


    setLoading(false);
  }, [user?.id]);

  useEffect(() => {
    loadFriendships();

    if (!user) return;

    // Real-time subscription for friend requests
    const channel = supabase
      .channel('friendship-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'friendships',
          filter: `or(requester_id.eq.${user.id},addressee_id.eq.${user.id})`
        },
        () => {
          loadFriendships();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user, loadFriendships]);

  /* ── Send friend request ──────────────────────────── */
  const sendRequest = async () => {
    if (!searchEmail.trim() || !user) return;
    if (searchEmail.trim() === profile?.email) {
      toast.error("You can't add yourself.");
      return;
    }
    setSendBusy(true);
    try {
      const { data: target } = await supabase
        .from("profiles")
        .select("id, display_name, email")
        .eq("email", searchEmail.trim().toLowerCase())
        .single();
      if (!target) { toast.error("No user found with that email."); return; }

      const { data: existing } = await supabase
        .from("friendships")
        .select("id, status")
        .or(`and(requester_id.eq.${user.id},addressee_id.eq.${target.id}),and(requester_id.eq.${target.id},addressee_id.eq.${user.id})`)
        .single();

      if (existing) {
        const msg = existing.status === "accepted" ? "Already friends!" : "Request already sent.";
        toast.info(msg); return;
      }

      const { error } = await supabase
        .from("friendships")
        .insert({ requester_id: user.id, addressee_id: target.id, status: "pending" });

      if (error) throw error;
      toast.success(`Friend request sent to ${target.display_name ?? target.email}!`);
      setSearchEmail("");
    } catch (e: any) {
      toast.error(e?.message ?? "Failed to send request.");
    } finally { setSendBusy(false); }
  };

  /* ── Accept / Decline ─────────────────────────────── */
  const respond = async (friendshipId: string, accept: boolean) => {
    setActionBusy(prev => ({ ...prev, [friendshipId]: true }));
    try {
      if (accept) {
        const { error } = await supabase.from("friendships").update({ status: "accepted" }).eq("id", friendshipId);
        if (error) throw error;
        toast.success("Friend request accepted!");
      } else {
        const { error } = await supabase.from("friendships").delete().eq("id", friendshipId);
        if (error) throw error;
        toast.info("Request declined.");
      }
      await loadFriendships();
    } catch { toast.error("Action failed."); }
    finally { setActionBusy(prev => ({ ...prev, [friendshipId]: false })); }
  };

  const Initials = ({ name, size = 40 }: { name: string; size?: number }) => {
    const initials = name.split(" ").map(p => p[0]).join("").toUpperCase().slice(0, 2);
    return (
      <div style={{ width: size, height: size, borderRadius: "50%", background: "#E2E8F0", color: "#64748B", display: "flex", alignItems: "center", justifyContent: "center", fontSize: size * 0.4, fontWeight: 600, flexShrink: 0 }}>
        {initials}
      </div>
    );
  };

  return (
    <div className="hg-root">
      <style>{CSS}</style>
      
      {/* SIDEBAR */}
      <div className="hg-sidebar">
        <div style={{ padding: "0 12px", marginBottom: "16px", display: "flex", flexDirection: "column", gap: "16px" }}>
          <button onClick={() => navigate('/home')} style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13, fontWeight: 600, color: "#475569", padding: "8px 12px", border: "1px solid #E2E8F0", borderRadius: 8, background: "white", cursor: "pointer", transition: "all 0.2s" }} onMouseOver={e => e.currentTarget.style.background = "#F8FAFC"} onMouseOut={e => e.currentTarget.style.background = "white"}>
            <ArrowLeft size={16} /> Return to Dashboard
          </button>
          <div>
            <div className="hg-sidebar-title">Hangout</div>
            <div className="hg-sidebar-subtitle">Intellectual Sanctuary</div>
          </div>
        </div>

        <div className="hg-section-title">Communities</div>
        {spaces.filter(s => s.type === 'community').map(s => (
          <button key={s.id} className="hg-nav-item">
            {s.image_url ? (
              <img src={s.image_url} style={{ width: 24, height: 24, borderRadius: "50%", objectFit: "cover" }} alt="" />
            ) : (
              <SpaceIconFallback name={s.name} size={24} />
            )}
            {s.name}
          </button>
        ))}
        {spaces.filter(s => s.type === 'community').length === 0 && (
          <div style={{ padding: "0 12px", fontSize: 12, color: "#94A3B8" }}>No communities yet.</div>
        )}

        <div className="hg-section-title">Servers</div>
        {spaces.filter(s => s.type === 'server').map(s => (
          <button key={s.id} className="hg-nav-item" onClick={() => navigate(`/home/hangout/${s.name.toLowerCase().replace(/\s+/g, '-')}`)}>
            {s.image_url ? (
              <img src={s.image_url} style={{ width: 24, height: 24, borderRadius: "50%", objectFit: "cover" }} alt="" />
            ) : (
              <SpaceIconFallback name={s.name} size={24} />
            )}
            {s.name}
          </button>
        ))}
        {spaces.filter(s => s.type === 'server').length === 0 && (
          <div style={{ padding: "0 12px", fontSize: 12, color: "#94A3B8" }}>No servers yet.</div>
        )}

        <div className="hg-section-title">Social</div>
        <button className="hg-nav-item"><User size={18} /> Friends</button>

        <div style={{ flex: 1 }} />
        
        <button className="btn-primary" style={{ marginBottom: 24, width: "100%" }} onClick={() => setShowCreateModal(true)}>Create New Space</button>
        
        <button className="hg-nav-item" style={{ marginBottom: 4 }}><Settings size={18} /> Settings</button>
        <button className="hg-nav-item"><HelpCircle size={18} /> Help</button>
      </div>

      {/* CREATE SPACE MODAL */}
      {showCreateModal && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(15, 23, 42, 0.6)", backdropFilter: "blur(4px)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000, padding: 20 }}>
          <div style={{ background: "white", width: "100%", maxWidth: 440, borderRadius: 24, padding: 32, boxShadow: "0 25px 50px -12px rgba(0,0,0,0.25)" }}>
            <h2 style={{ fontSize: 24, fontWeight: 700, color: "#0F172A", marginBottom: 8 }}>Create a new space</h2>
            <p style={{ fontSize: 14, color: "#64748B", marginBottom: 32 }}>Build a home for your study group or research lab.</p>
            
            <div style={{ marginBottom: 24 }}>
              <label style={{ display: "block", fontSize: 13, fontWeight: 700, color: "#475569", marginBottom: 8, textTransform: "uppercase", letterSpacing: 0.5 }}>Space Type</label>
              <div style={{ display: "flex", gap: 12 }}>
                <button
                  onClick={() => setNewSpaceType("server")}
                  style={{ flex: 1, padding: "12px", borderRadius: 12, border: "1px solid", borderColor: newSpaceType === "server" ? "#065F46" : "#E2E8F0", background: newSpaceType === "server" ? "#ECFDF5" : "white", color: newSpaceType === "server" ? "#065F46" : "#64748B", fontWeight: 600, fontSize: 14, cursor: "pointer", transition: "all 0.2s" }}
                >
                  Server
                </button>
                <button
                  onClick={() => setNewSpaceType("community")}
                  style={{ flex: 1, padding: "12px", borderRadius: 12, border: "1px solid", borderColor: newSpaceType === "community" ? "#065F46" : "#E2E8F0", background: newSpaceType === "community" ? "#ECFDF5" : "white", color: newSpaceType === "community" ? "#065F46" : "#64748B", fontWeight: 600, fontSize: 14, cursor: "pointer", transition: "all 0.2s" }}
                >
                  Community
                </button>
              </div>
            </div>

            <div style={{ marginBottom: 24 }}>
              <label style={{ display: "block", fontSize: 13, fontWeight: 700, color: "#475569", marginBottom: 8, textTransform: "uppercase", letterSpacing: 0.5 }}>Name</label>
              <input
                type="text"
                placeholder="e.g. Quantum Physics 101"
                value={newSpaceName}
                onChange={(e) => setNewSpaceName(e.target.value)}
                style={{ width: "100%", padding: "12px 16px", borderRadius: 12, border: "1px solid #E2E8F0", outline: "none", fontSize: 15, transition: "border-color 0.2s" }}
              />
            </div>

            <div style={{ marginBottom: 32 }}>
              <label style={{ display: "block", fontSize: 13, fontWeight: 700, color: "#475569", marginBottom: 8, textTransform: "uppercase", letterSpacing: 0.5 }}>Space Image (Optional)</label>
              <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
                <div style={{ width: 64, height: 64, borderRadius: "50%", background: "#F1F5F9", border: "2px dashed #CBD5E1", display: "flex", alignItems: "center", justifyContent: "center", overflow: "hidden", cursor: "pointer" }} onClick={() => document.getElementById('space-image-input')?.click()}>
                  {newSpaceImagePreview ? (
                    <img src={newSpaceImagePreview} style={{ width: "100%", height: "100%", objectFit: "cover" }} alt="" />
                  ) : (
                    <UploadCloud size={24} color="#94A3B8" />
                  )}
                </div>
                <div>
                  <button onClick={() => document.getElementById('space-image-input')?.click()} style={{ fontSize: 13, fontWeight: 600, color: "#065F46", background: "none", border: "none", cursor: "pointer", padding: 0 }}>Upload image</button>
                  <p style={{ fontSize: 12, color: "#94A3B8", marginTop: 4 }}>JPG, PNG or GIF. Max 2MB.</p>
                </div>
                <input
                  id="space-image-input"
                  type="file"
                  accept="image/*"
                  hidden
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) {
                      setNewSpaceImage(file);
                      setNewSpaceImagePreview(URL.createObjectURL(file));
                    }
                  }}
                />
              </div>
            </div>

            <div style={{ display: "flex", gap: 12 }}>
              <button
                onClick={() => {
                  setShowCreateModal(false);
                  setNewSpaceName("");
                  setNewSpaceImage(null);
                  setNewSpaceImagePreview(null);
                }}
                style={{ flex: 1, padding: "12px", borderRadius: 12, border: "1px solid #E2E8F0", background: "white", color: "#64748B", fontWeight: 600, fontSize: 15, cursor: "pointer" }}
              >
                Cancel
              </button>
              <button
                disabled={!newSpaceName.trim() || createBusy}
                onClick={async () => {
                  if (!user) return;
                  setCreateBusy(true);
                  try {
                    let imageUrl = null;
                    if (newSpaceImage) {
                      const fileExt = newSpaceImage.name.split('.').pop();
                      const fileName = `${Math.random()}.${fileExt}`;
                      const filePath = `space_avatars/${fileName}`;
                      
                      const { error: uploadError } = await supabase.storage
                        .from('spaces')
                        .upload(filePath, newSpaceImage);
                      
                      if (uploadError) throw uploadError;
                      
                      const { data: { publicUrl } } = supabase.storage
                        .from('spaces')
                        .getPublicUrl(filePath);
                      imageUrl = publicUrl;
                    }

                    const { data: newSpace, error } = await (supabase
                      .from("spaces") as any)
                      .insert({
                        name: newSpaceName,
                        type: newSpaceType,
                        image_url: imageUrl,
                        created_by: user.id
                      })
                      .select()
                      .single();

                    if (error) throw error;

                    if (newSpace) {
                      // AUTO-CREATE DEFAULT CHANNELS
                      const defaultChannels = [
                        { space_id: newSpace.id, name: 'general', category: 'discourse', type: 'text' },
                        { space_id: newSpace.id, name: 'announcements', category: 'discourse', type: 'text' },
                        { space_id: newSpace.id, name: 'shared-notes', category: 'knowledge', type: 'text' },
                        { space_id: newSpace.id, name: 'resource-vault', category: 'knowledge', type: 'text' },
                        { space_id: newSpace.id, name: 'Voice Study', category: 'live', type: 'voice' },
                        { space_id: newSpace.id, name: 'Video Lab', category: 'live', type: 'video' }
                      ];
                      
                      await (supabase.from('channels') as any).insert(defaultChannels);
                    }
                    
                    if (error) throw error;
                    
                    toast.success(`${newSpaceType === 'server' ? 'Server' : 'Community'} created!`);
                    setShowCreateModal(false);
                    setNewSpaceName("");
                    setNewSpaceImage(null);
                    setNewSpaceImagePreview(null);
                    await loadFriendships();
                  } catch (err: any) {
                    toast.error(err.message);
                  } finally {
                    setCreateBusy(false);
                  }
                }}
                style={{ flex: 2, padding: "12px", borderRadius: 12, border: "none", background: "#065F46", color: "white", fontWeight: 700, fontSize: 15, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 8, opacity: (!newSpaceName.trim() || createBusy) ? 0.6 : 1 }}
              >
                {createBusy ? <Loader2 size={20} className="animate-spin" /> : "Create Space"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MAIN CONTENT */}
      <div className="hg-main">
        
        {/* HEADER */}
        <div className="hg-header">
          <div className="hg-search-bar">
            <Search size={16} color="#94A3B8" />
            <input type="text" className="hg-search-input" placeholder="Search spaces or friends..." />
          </div>

          <div className="hg-top-tabs">
            <div className={`hg-top-tab ${topTab === "FEED" ? "active" : ""}`} onClick={() => setTopTab("FEED")}>Feed</div>
            <div className={`hg-top-tab ${topTab === "FRIENDS" ? "active" : ""}`} onClick={() => setTopTab("FRIENDS")}>
              Friends
              {incoming.length > 0 && (
                <span style={{ marginLeft: 6, background: topTab === "FRIENDS" ? "#059669" : "#E2E8F0", color: topTab === "FRIENDS" ? "white" : "#64748B", padding: "2px 8px", borderRadius: 100, fontSize: 10, fontWeight: 700 }}>{incoming.length}</span>
              )}
            </div>
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
            <div style={{ position: "relative", cursor: "pointer", color: "#64748B" }}>
              <Bell size={20} />
              {incoming.length > 0 && <div style={{ position: "absolute", top: 0, right: 0, width: 8, height: 8, background: "#EF4444", borderRadius: "50%", border: "2px solid white" }} />}
            </div>
            <img src={profile?.avatar_url || `https://ui-avatars.com/api/?name=${profile?.display_name || user?.email}&background=E2E8F0&color=475569`} alt="" style={{ width: 36, height: 36, borderRadius: "50%" }} />
          </div>
        </div>

        {/* CONTENT SCROLL */}
        <div className="hg-content-scroll">
          <div className="hg-content-inner">
            
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", marginBottom: 32 }}>
              <div>
                <h1 className="hg-page-title">The Hangout</h1>
                <div className="hg-page-subtitle">Your focused hub for academic collaboration and staying connected.</div>
                
                {topTab === "FEED" && (
                  <div className="hg-feed-tabs">
                    <div className="hg-feed-tab active">For You</div>
                    <div className="hg-feed-tab">Following</div>
                    <div className="hg-feed-tab">Trending</div>
                  </div>
                )}
              </div>
              
              {topTab === "FEED" && (
                <div style={{ display: "flex", gap: 12, marginBottom: 56 }}>
                  <button style={{ display: "flex", alignItems: "center", gap: 8, padding: "8px 16px", borderRadius: 100, border: "1px solid #E2E8F0", background: "white", color: "#475569", fontSize: 14, fontWeight: 600, cursor: "pointer" }}>
                    <Filter size={16} /> Filter
                  </button>
                  <button className="btn-primary" style={{ padding: "8px 20px" }}>
                    <Edit3 size={16} /> Post
                  </button>
                </div>
              )}
            </div>

            {/* TAB: FEED */}
            {topTab === "FEED" && (
              <div style={{ display: "flex", gap: 24, alignItems: "flex-start" }}>
                {/* Left Column (Posts) */}
                <div style={{ flex: 1, minWidth: 0 }}>
                  {feedPosts.map(post => (
                    <div key={post.id} className="hg-post-card">
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 16 }}>
                        <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
                          <div style={{ width: 40, height: 40, borderRadius: "50%", background: post.icon_bg || "#E0F2FE", color: post.icon_color || "#059669", display: "flex", alignItems: "center", justifyContent: "center" }}>
                            {post.icon_name === 'Code' ? <Code size={18} strokeWidth={2.5}/> :
                             post.icon_name === 'FlaskConical' ? <FlaskConical size={18} strokeWidth={2.5}/> :
                             <Sigma size={18} strokeWidth={2.5}/>}
                          </div>
                          <div>
                            <div style={{ fontSize: 14, fontWeight: 700, color: "#1E293B" }}>{post.tag}</div>
                            <div style={{ fontSize: 12, color: "#94A3B8" }}>{post.sub}</div>
                          </div>
                        </div>
                        <button style={{ background: "none", border: "none", color: "#94A3B8", cursor: "pointer" }}><MoreHorizontal size={20} /></button>
                      </div>

                      {post.title && <h3 style={{ fontSize: 16, fontWeight: 600, color: "#0F172A", margin: "0 0 8px" }}>{post.title}</h3>}
                      <p style={{ fontSize: 14, color: "#475569", lineHeight: 1.5, margin: "0 0 16px" }}>{post.body}</p>

                      {post.attachment && (
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", background: "#F8FAFC", border: "1px solid #E2E8F0", borderRadius: 12, padding: "12px 16px", marginBottom: 16 }}>
                          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                            <div style={{ color: "#059669" }}><FileText size={24} /></div>
                            <div>
                              <div style={{ fontSize: 13, fontWeight: 600, color: "#0F172A" }}>{post.attachment.name}</div>
                              <div style={{ fontSize: 11, color: "#94A3B8", fontWeight: 500, marginTop: 2 }}>{post.attachment.size}</div>
                            </div>
                          </div>
                          <button className="btn-primary" style={{ padding: "6px 12px", fontSize: 13 }}>Download</button>
                        </div>
                      )}

                      <div style={{ display: "flex", alignItems: "center", gap: 24, marginTop: post.attachment ? 0 : 4 }}>
                        <button style={{ display: "flex", alignItems: "center", gap: 6, background: "none", border: "none", color: "#64748B", fontSize: 13, fontWeight: 500, cursor: "pointer" }}><ThumbsUp size={16} /> {post.upvotes}</button>
                        <button style={{ display: "flex", alignItems: "center", gap: 6, background: "none", border: "none", color: "#64748B", fontSize: 13, fontWeight: 500, cursor: "pointer" }}><MessageSquare size={16} /> {post.comments}</button>
                        <button style={{ display: "flex", alignItems: "center", gap: 6, background: "none", border: "none", color: "#64748B", fontSize: 13, fontWeight: 500, cursor: "pointer" }}><Share2 size={16} /> Share</button>
                        {post.button_text && (
                          <div style={{ marginLeft: "auto" }}>
                            <button style={{ background: "#6EE7B7", color: "#064E3B", padding: "6px 16px", borderRadius: 100, border: "none", fontSize: 13, fontWeight: 600, cursor: "pointer" }}>{post.button_text}</button>
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>

                {/* Right Column (Sidebar Cards) */}
                <div style={{ width: 300, flexShrink: 0 }}>
                  <div className="hg-pending-card">
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
                      <h3 style={{ fontSize: 15, fontWeight: 600, color: "#0F172A", margin: 0 }}>Pending Requests</h3>
                      <div style={{ background: "#6EE7B7", color: "#064E3B", fontSize: 11, fontWeight: 700, width: 20, height: 20, borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center" }}>
                        {incoming.length > 0 ? incoming.length : 1}
                      </div>
                    </div>
                    
                    <div style={{ display: "flex", flexDirection: "column", gap: 12, marginBottom: 24 }}>
                      {incoming.slice(0, 1).map(f => (
                        <div key={f.id} style={{ background: "#F1F5F9", borderRadius: 16, padding: "12px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                            {f.other.avatar_url ? (
                              <img src={f.other.avatar_url} style={{ width: 36, height: 36, borderRadius: "50%", objectFit: "cover" }} alt="" />
                            ) : (
                              <Initials name={f.other.display_name || f.other.email || "?"} size={36} />
                            )}
                            <div>
                              <div style={{ fontSize: 13, fontWeight: 600, color: "#0F172A", maxWidth: 100, overflow: "hidden", textOverflow: "ellipsis" }}>{f.other.display_name || "New Friend"}</div>
                              <div style={{ fontSize: 11, color: "#94A3B8" }}>Just now</div>
                            </div>
                          </div>
                          <div style={{ display: "flex", gap: 6 }}>
                            <button disabled={actionBusy[f.id]} onClick={() => respond(f.id, true)} style={{ width: 28, height: 28, borderRadius: "50%", background: "#059669", color: "white", border: "none", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer" }}>
                              {actionBusy[f.id] ? <Loader2 size={12} className="spin" /> : <Check size={14} strokeWidth={3} />}
                            </button>
                            <button disabled={actionBusy[f.id]} onClick={() => respond(f.id, false)} style={{ width: 28, height: 28, borderRadius: "50%", background: "#E2E8F0", color: "#64748B", border: "none", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer" }}>
                              <X size={14} strokeWidth={3} />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>

                    {incoming.length === 0 && (
                      <div style={{ textAlign: "center", color: "#94A3B8", padding: "20px 0" }}>
                        <div style={{ marginBottom: 8 }}><UserCheck size={24} style={{ margin: "0 auto", opacity: 0.5 }}/></div>
                        <div style={{ fontSize: 11, fontWeight: 600, textTransform: "uppercase", letterSpacing: 0.5 }}>No pending requests</div>
                      </div>
                    )}

                    {incoming.length > 1 && (
                      <div style={{ textAlign: "center", color: "#94A3B8" }}>
                        <div style={{ fontSize: 11, fontWeight: 600, textTransform: "uppercase", letterSpacing: 0.5 }}>And {incoming.length - 1} others...</div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* TAB: FRIENDS (Merged with Requests) */}
            {topTab === "FRIENDS" && (
              <div style={{ maxWidth: 800, display: "flex", flexDirection: "column", gap: 32 }}>
                
                {/* Search / Add Friend Section */}
                <div style={{ background: "white", borderRadius: 24, border: "1px solid #E2E8F0", padding: 32 }}>
                  <div style={{ display: "flex", gap: 12, alignItems: "flex-end" }}>
                    <div style={{ flex: 1 }}>
                      <label style={{ display: "block", fontSize: 13, fontWeight: 700, color: "#475569", marginBottom: 8, textTransform: "uppercase", letterSpacing: 0.5 }}>Add Friend by Gmail</label>
                      <div style={{ position: "relative" }}>
                        <Search size={16} color="#94A3B8" style={{ position: "absolute", left: 16, top: "50%", transform: "translateY(-50%)" }} />
                        <input type="email" value={searchEmail} onChange={e => setSearchEmail(e.target.value)} onKeyDown={e => e.key === "Enter" && sendRequest()} placeholder="e.g. friend@gmail.com" style={{ width: "100%", padding: "12px 16px 12px 42px", borderRadius: 12, border: "1px solid #E2E8F0", background: "#F8FAFC", fontSize: 14, outline: "none", boxSizing: "border-box" }} />
                      </div>
                    </div>
                    <button onClick={sendRequest} disabled={sendBusy || !searchEmail.trim()} className="btn-primary" style={{ padding: "12px 32px", height: 44, borderRadius: 12, opacity: (!searchEmail.trim() && !sendBusy) ? 0.5 : 1 }}>
                      {sendBusy ? <Loader2 size={18} className="animate-spin" /> : <UserPlus size={18} />} Send Request
                    </button>
                  </div>
                </div>

                {/* Pending Requests Section */}
                {incoming.length > 0 && (
                  <div style={{ background: "#F1F5F9", borderRadius: 24, padding: 32 }}>
                    <h3 style={{ fontSize: 14, fontWeight: 700, color: "#475569", textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 20, display: "flex", alignItems: "center", gap: 8 }}>
                      <Clock size={16} /> Pending Requests ({incoming.length})
                    </h3>
                    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))", gap: 16 }}>
                      {incoming.map(f => (
                        <div key={f.id} style={{ display: "flex", alignItems: "center", gap: 16, padding: "16px 20px", background: "white", borderRadius: 16, border: "1px solid #E2E8F0", boxShadow: "0 1px 3px rgba(0,0,0,0.02)" }}>
                          {f.other.avatar_url ? <img src={f.other.avatar_url} alt="" style={{ width: 44, height: 44, borderRadius: "50%", objectFit: "cover" }} /> : <Initials name={f.other.display_name ?? f.other.email ?? "?"} size={44} />}
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <div style={{ fontSize: 15, fontWeight: 600, color: "#0F172A", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{f.other.display_name ?? "Luminote User"}</div>
                            <div style={{ fontSize: 13, color: "#64748B" }}>{f.other.email}</div>
                          </div>
                          <div style={{ display: "flex", gap: 8 }}>
                            <button disabled={actionBusy[f.id]} onClick={() => respond(f.id, true)} style={{ width: 32, height: 32, borderRadius: "50%", background: "#059669", color: "white", border: "none", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer" }}>
                              {actionBusy[f.id] ? <Loader2 size={14} className="animate-spin" /> : <Check size={18} strokeWidth={3} />}
                            </button>
                            <button disabled={actionBusy[f.id]} onClick={() => respond(f.id, false)} style={{ width: 32, height: 32, borderRadius: "50%", background: "#E2E8F0", color: "#64748B", border: "none", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer" }}>
                              <X size={18} strokeWidth={3} />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* My Friends List */}
                <div>
                  <h3 style={{ fontSize: 14, fontWeight: 700, color: "#94A3B8", textTransform: "uppercase", letterSpacing: 1, marginBottom: 16, paddingLeft: 4 }}>My Friends</h3>
                  {loading ? (
                    <div style={{ display: "flex", justifyContent: "center", padding: 40 }}><Loader2 size={24} color="#059669" className="animate-spin" /></div>
                  ) : friends.length === 0 ? (
                    <div style={{ textAlign: "center", padding: 60, background: "white", borderRadius: 24, border: "1px solid #E2E8F0" }}>
                      <div style={{ width: 64, height: 64, borderRadius: "50%", background: "#F1F5F9", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 16px" }}>
                        <Users size={32} color="#94A3B8" />
                      </div>
                      <h4 style={{ fontSize: 16, fontWeight: 600, color: "#0F172A", marginBottom: 4 }}>Your circle is empty</h4>
                      <p style={{ fontSize: 14, color: "#64748B" }}>Add a friend using their Gmail above to get started.</p>
                    </div>
                  ) : (
                    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: 16 }}>
                      {friends.map(f => (
                        <div key={f.id} style={{ display: "flex", alignItems: "center", gap: 16, padding: "16px 20px", background: "white", borderRadius: 16, border: "1px solid #E2E8F0", transition: "all 0.2s" }} onMouseOver={e => e.currentTarget.style.borderColor = "#6EE7B7"} onMouseOut={e => e.currentTarget.style.borderColor = "#E2E8F0"}>
                          {f.other.avatar_url ? <img src={f.other.avatar_url} alt="" style={{ width: 48, height: 48, borderRadius: "50%", objectFit: "cover" }} /> : <Initials name={f.other.display_name ?? f.other.email ?? "?"} size={48} />}
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <div style={{ fontSize: 15, fontWeight: 600, color: "#0F172A", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{f.other.display_name ?? "Luminote User"}</div>
                            <div style={{ fontSize: 13, color: "#64748B" }}>{f.other.email}</div>
                          </div>
                          <div style={{ width: 8, height: 8, borderRadius: "50%", background: "#10B981" }} />
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}