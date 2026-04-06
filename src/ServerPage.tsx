import React from "react";
import { useNavigate, useParams } from "react-router";
import {
  ArrowLeft, Search, Bell, Settings, Hash, Mic, Video, FileText,
  FolderOpen, Paperclip, Sparkles, UserPlus, Info, Users,
  MessageSquare, MoreHorizontal, Download, PlayCircle, Loader2, X, Check
} from "lucide-react";
import { supabase } from "./supabaseClient";
import { useAuth } from "./AuthContext";
import { useToast } from "./toast";

const CSS = `
@import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap');
.sp-root { font-family: 'Inter', sans-serif; display: flex; height: 100vh; background: white; color: #0F172A; }

/* Sidebar */
.sp-sidebar { width: 280px; border-right: 1px solid #E2E8F0; display: flex; flex-direction: column; flex-shrink: 0; }
.sp-sidebar-header { padding: 24px; border-bottom: 1px solid #E2E8F0; }
.sp-back-btn { display: flex; align-items: center; gap: 8px; font-size: 14px; font-weight: 600; color: #475569; padding: 10px 16px; border: 1px solid #E2E8F0; border-radius: 8px; width: 100%; justify-content: center; background: white; cursor: pointer; transition: all 0.2s; box-shadow: 0 1px 2px rgba(0,0,0,0.05); }
.sp-back-btn:hover { background: #F8FAFC; color: #0F172A; }

.sp-server-info { display: flex; align-items: center; justify-content: space-between; padding: 24px; }
.sp-server-title { font-size: 20px; font-weight: 700; color: #0F172A; }
.sp-server-subtitle { font-size: 10px; font-weight: 700; color: #94A3B8; text-transform: uppercase; letter-spacing: 0.5px; }

.sp-nav-section { flex: 1; overflow-y: auto; padding: 0 16px; }
.sp-section-title { font-size: 11px; font-weight: 700; color: #94A3B8; text-transform: uppercase; letter-spacing: 0.5px; margin: 24px 0 12px 12px; }
.sp-channel { display: flex; align-items: center; gap: 12px; padding: 10px 12px; border-radius: 8px; font-size: 14px; font-weight: 600; color: #475569; cursor: pointer; transition: all 0.2s; background: none; border: none; width: 100%; text-align: left; }
.sp-channel:hover { background: #F1F5F9; color: #0F172A; }
.sp-channel.active { background: #ECFDF5; color: #047857; }

.sp-user-footer { display: flex; align-items: center; justify-content: space-between; padding: 20px 24px; border-top: 1px solid #E2E8F0; }

/* Main Chat */
.sp-main { flex: 1; display: flex; flex-direction: column; min-width: 0; }
.sp-header { height: 72px; border-bottom: 1px solid #E2E8F0; display: flex; align-items: center; padding: 0 32px; justify-content: space-between; }
.sp-header-left { display: flex; align-items: center; gap: 12px; }

.sp-chat-area { flex: 1; overflow-y: auto; padding: 32px; display: flex; flex-direction: column; gap: 24px; background: #FAFAFA; }
.sp-message { background: white; border: 1px solid #E2E8F0; border-radius: 16px; padding: 24px; box-shadow: 0 1px 3px rgba(0,0,0,0.02); }
.sp-msg-header { display: flex; align-items: center; gap: 12px; margin-bottom: 12px; }
.sp-msg-author { font-size: 15px; font-weight: 600; color: #0F172A; }
.sp-msg-time { font-size: 12px; font-weight: 500; color: #94A3B8; }
.sp-msg-text { font-size: 15px; color: #475569; line-height: 1.5; }

.sp-input-area { padding: 24px; border-top: 1px solid #E2E8F0; display: flex; gap: 12px; background: white; align-items: center; }
.sp-input-box { flex: 1; border: 1px solid #E2E8F0; border-radius: 100px; display: flex; align-items: center; padding: 8px 8px 8px 24px; background: white; box-shadow: 0 1px 2px rgba(0,0,0,0.05); }
.sp-input { border: none; outline: none; font-size: 15px; width: 100%; color: #0F172A; background: transparent; }
.sp-btn-post { background: #059669; color: white; border: none; padding: 10px 24px; border-radius: 100px; font-weight: 600; font-size: 14px; cursor: pointer; transition: all 0.2s; }
.sp-btn-post:hover { background: #047857; }
.sp-btn-post:disabled { opacity: 0.5; cursor: not-allowed; }

/* Right Sidebar */
.sp-right-aside { width: 320px; border-left: 1px solid #E2E8F0; display: flex; flex-direction: column; padding: 24px; background: white; flex-shrink: 0; overflow-y: auto; }
.sp-aside-section { font-size: 11px; font-weight: 700; color: #94A3B8; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 16px; display: flex; justify-content: space-between; align-items: center; }

.sp-invite-card { background: #F8FAFC; border: 1px solid #E2E8F0; border-radius: 16px; padding: 20px; margin-top: auto; }
`;

const Initials = ({ name, size = 32 }: { name: string; size?: number }) => {
  const initials = name.substring(0, 2).toUpperCase();
  const colors = ["#EF4444", "#F59E0B", "#10B981", "#3B82F6", "#6366F1", "#8B5CF6", "#EC4899"];
  const color = colors[name.length % colors.length];
  
  return (
    <div style={{
      width: size, height: size, borderRadius: "50%", background: color,
      color: "white", display: "flex", alignItems: "center", justifyContent: "center",
      fontSize: size * 0.35, fontWeight: 700, flexShrink: 0, boxShadow: "0 2px 4px rgba(0,0,0,0.1)"
    }}>
      {initials}
    </div>
  );
};

export function ServerPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const toast = useToast();
  const { server: serverSlug } = useParams();
  
  const [messages, setMessages] = React.useState<any[]>([]);
  const [channels, setChannels] = React.useState<any[]>([]);
  const [activeChannel, setActiveChannel] = React.useState<any>(null);
  const [currentSpace, setCurrentSpace] = React.useState<any>(null);
  const [loading, setLoading] = React.useState(true);
  const [inputText, setInputText] = React.useState("");
  const [posting, setPosting] = React.useState(false);

  const loadMessages = React.useCallback(async (channelId: string) => {
    if (!serverSlug || !channelId) return;
    const { data } = await supabase
      .from("server_messages")
      .select("*, author:profiles!author_id(*)")
      .eq("server_id", serverSlug)
      .eq("channel_id", channelId)
      .order("created_at", { ascending: true });
    
    if (data) setMessages(data);
  }, [serverSlug]);

  React.useEffect(() => {
    async function load() {
      if (!serverSlug) return;
      setLoading(true);
      
      const { data: spaces } = await (supabase.from("spaces") as any).select("*");
      const space = spaces?.find((s: any) => s.name.toLowerCase().replace(/\s+/g, '-') === serverSlug);
      
      if (space) {
        setCurrentSpace(space);
        
        // Fetch channels for this space
        let { data: channelData } = await (supabase.from("channels") as any)
          .select("*")
          .eq("space_id", space.id)
          .order("created_at", { ascending: true });
        

        if (channelData && channelData.length > 0) {
          setChannels(channelData);
          const first = channelData[0];
          setActiveChannel(first);
          await loadMessages(first.id);
        }
      }
      setLoading(false);
    }
    load();
  }, [serverSlug, loadMessages]);

  React.useEffect(() => {
    if (!serverSlug || !activeChannel) return;

    const channel = supabase
      .channel(`chat-${activeChannel.id}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'server_messages',
          filter: `channel_id=eq.${activeChannel.id}`
        },
        () => {
          loadMessages(activeChannel.id);
        }
      )
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [serverSlug, activeChannel, loadMessages]);

  const handleSendMessage = async () => {
    if (!user || !inputText.trim() || !serverSlug || !activeChannel) return;
    setPosting(true);
    try {
      const { error } = await (supabase
        .from("server_messages") as any)
        .insert({
          server_id: serverSlug,
          channel_id: activeChannel.id,
          author_id: user.id,
          text: inputText.trim()
        });
      
      if (error) throw error;
      setInputText("");
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setPosting(false);
    }
  };

  const switchChannel = async (channel: any) => {
    if (channel.id === activeChannel?.id) return;
    setLoading(true);
    setActiveChannel(channel);
    await loadMessages(channel.id);
    setLoading(false);
  };

  return (
    <div className="sp-root">
      <style>{CSS}</style>

      {/* LEFT SIDEBAR */}
      <div className="sp-sidebar">
        <div className="sp-sidebar-header">
          <button className="sp-back-btn" onClick={() => navigate('/home/hangout')}>
            <ArrowLeft size={16} /> Return to Dashboard
          </button>
        </div>

        <div className="sp-server-info">
          <div style={{ display: "flex", gap: 12, alignItems: "center", width: "100%" }}>
            {currentSpace?.image_url ? (
              <img src={currentSpace.image_url} style={{ width: 40, height: 40, borderRadius: 12, objectFit: "cover" }} alt="" />
            ) : (
              <div style={{ background: "#059669", color: "white", width: 40, height: 40, borderRadius: 12, display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 700 }}>
                {currentSpace?.name?.substring(0,1).toUpperCase() || "S"}
              </div>
            )}
            <div style={{ flex: 1, minWidth: 0 }}>
              <div className="sp-server-title" style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                {currentSpace?.name || serverSlug}
              </div>
              <div className="sp-server-subtitle">SANCTUARY</div>
            </div>
          </div>
          <Settings size={18} color="#64748B" cursor="pointer" />
        </div>

        <div className="sp-nav-section">
          {[
            { tag: 'DISCOURSE', category: 'discourse' },
            { tag: 'KNOWLEDGE', category: 'knowledge' },
            { tag: 'LIVE', category: 'live' }
          ].map(section => (
            <div key={section.tag} style={{ marginBottom: 28 }}>
              <div className="sp-section-title">{section.tag}</div>
              {channels.filter(c => c.category === section.category).map(item => {
                const isActive = activeChannel?.id === item.id;
                let Icon = Hash;
                if (item.name === 'announcements') Icon = Bell;
                if (item.name === 'shared-notes') Icon = FileText;
                if (item.name === 'resource-vault') Icon = FolderOpen;
                if (item.type === 'voice') Icon = Mic;
                if (item.type === 'video') Icon = Video;

                return (
                  <button 
                    key={item.id} 
                    className={`sp-channel ${isActive ? 'active' : ''}`}
                    onClick={() => switchChannel(item)}
                  >
                    <Icon size={18} strokeWidth={isActive ? 2.5 : 2} />
                    {item.name}
                  </button>
                );
              })}
            </div>
          ))}
        </div>

        <div className="sp-user-footer">
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <Initials name={user?.email || "?"} size={32} />
            <div style={{ fontSize: 13, fontWeight: 600 }}>{user?.email?.split('@')[0]}</div>
          </div>
          <Settings size={18} color="#64748B" />
        </div>
      </div>

      {/* MAIN CHAT */}
      <div className="sp-main">
        <div className="sp-header">
          <div className="sp-header-left">
            <div className="sp-header-title">
              <span style={{ color: "#94A3B8" }}>#</span>
              {activeChannel?.name || "general"}
            </div>
          </div>
        </div>

        <div className="sp-chat-area">
          {loading ? (
            <div style={{ display: "flex", justifyContent: "center", padding: 40 }}><Loader2 size={32} className="animate-spin" color="#059669" /></div>
          ) : messages.length === 0 ? (
            <div style={{ textAlign: "center", padding: "100px 20px" }}>
              <div style={{ width: 80, height: 80, background: "#F1F5F9", borderRadius: 32, margin: "0 auto 24px", display: "flex", alignItems: "center", justifyContent: "center" }}>
                <MessageSquare size={40} color="#94A3B8" />
              </div>
              <h2 style={{ fontSize: 24, fontWeight: 700, color: "#0F172A", marginBottom: 8 }}>Welcome to #{activeChannel?.name}!</h2>
              <p style={{ color: "#64748B", fontSize: 16 }}>This is the beginning of your journey in this channel.</p>
            </div>
          ) : (
            messages.map(msg => (
              <div key={msg.id} className="sp-message">
                <div className="sp-msg-header">
                  {msg.author?.avatar_url ? (
                    <img src={msg.author.avatar_url} style={{ width: 36, height: 36, borderRadius: "50%" }} alt="" />
                  ) : (
                    <Initials name={msg.author?.display_name || msg.author?.email || "?"} size={36} />
                  )}
                  <span className="sp-msg-author">{msg.author?.display_name || msg.author?.email?.split('@')[0] || "Unknown"}</span>
                  <span className="sp-msg-time">{new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                </div>
                <div className="sp-msg-text">{msg.text}</div>
              </div>
            ))
          )}
        </div>

        <div className="sp-input-area">
          <button style={{ width: 44, height: 44, borderRadius: 12, background: "#F1F5F9", border: "1px solid #E2E8F0", display: "flex", alignItems: "center", justifyContent: "center", color: "#64748B", cursor: "pointer" }}>
            <Paperclip size={20} />
          </button>
          <div className="sp-input-box">
            <input 
              type="text" 
              className="sp-input" 
              placeholder={`Message #${activeChannel?.name || 'general'}...`} 
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleSendMessage()}
              disabled={posting}
            />
            <div style={{ display: "flex", alignItems: "center", gap: 12, paddingRight: 8 }}>
              <Sparkles size={20} color="#94A3B8" cursor="pointer" />
              <button 
                className="sp-btn-post" 
                onClick={handleSendMessage}
                disabled={posting || !inputText.trim()}
              >
                {posting ? <Loader2 size={16} className="animate-spin" /> : "Post"}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* RIGHT SIDEBAR */}
      <div className="sp-right-aside">
        <div className="sp-aside-section">
          <span>FELLOWS</span>
          <Users size={14} />
        </div>
        <div style={{ textAlign: "center", padding: "40px 20px", color: "#94A3B8" }}>
          <Users size={32} style={{ margin: "0 auto", opacity: 0.5, marginBottom: 12 }} />
          <div style={{ fontSize: 13, fontWeight: 600 }}>Circle Empty</div>
          <div style={{ fontSize: 11 }}>Invite peers to this sanctuary.</div>
        </div>

        <div className="sp-aside-section" style={{ marginTop: 24 }}>
          <span>LAB EVENTS</span>
        </div>
        <div style={{ textAlign: "center", color: "#94A3B8", fontSize: 12, fontStyle: "italic" }}>
          No upcoming sessions.
        </div>

        <div className="sp-invite-card">
          <div style={{ fontSize: 15, fontWeight: 700, color: "#0F172A", marginBottom: 4 }}>Expand the Circle</div>
          <div style={{ fontSize: 13, color: "#64748B", marginBottom: 16 }}>Link up with fellow learners.</div>
          <button className="sp-btn-post" style={{ width: "100%" }}>Invite Member</button>
        </div>
      </div>
    </div>
  );
}
