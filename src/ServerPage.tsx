import React from "react";
import { useNavigate, useParams } from "react-router";
import {
  ArrowLeft, Search, Bell, Settings, Hash, Mic, Video, FileText,
  FolderOpen, Paperclip, Sparkles, UserPlus, Info, Users,
  MessageSquare, MoreHorizontal, Download, PlayCircle, Loader2, X, Check,
  MicOff, VideoOff, LogOut, Headphones, VolumeX, Monitor, AlertCircle
} from "lucide-react";
import { supabase } from "./supabaseClient";
import { useAuth } from "./AuthContext";
import { useToast } from "./toast";

const CSS = `
@import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap');
.sp-root { font-family: 'Inter', sans-serif; display: flex; height: 100vh; background: var(--bg-main); color: var(--text-primary); transition: background-color 300ms ease-in-out, color 300ms ease-in-out; }

/* Sidebar */
.sp-sidebar { width: 280px; border-right: 1px solid var(--border); display: flex; flex-direction: column; flex-shrink: 0; }
.sp-sidebar-header { padding: 24px; border-bottom: 1px solid var(--border); }
.sp-back-btn { display: flex; align-items: center; gap: 8px; font-size: 14px; font-weight: 600; color: var(--text-secondary); padding: 10px 16px; border: 1px solid var(--border); border-radius: 8px; width: 100%; justify-content: center; background: var(--bg-card); cursor: pointer; transition: all 0.2s; box-shadow: 0 1px 2px rgba(0,0,0,0.05); }
.sp-back-btn:hover { background: var(--bg-main); color: var(--text-primary); }

.sp-server-info { display: flex; align-items: center; justify-content: space-between; padding: 24px; }
.sp-server-title { font-size: 20px; font-weight: 700; color: var(--text-primary); }
.sp-server-subtitle { font-size: 10px; font-weight: 700; color: var(--text-secondary); text-transform: uppercase; letter-spacing: 0.5px; }

.sp-nav-section { flex: 1; overflow-y: auto; padding: 0 16px; }
.sp-section-title { font-size: 11px; font-weight: 700; color: var(--text-secondary); text-transform: uppercase; letter-spacing: 0.5px; margin: 24px 0 12px 12px; }
.sp-channel { display: flex; align-items: center; gap: 12px; padding: 10px 12px; border-radius: 8px; font-size: 14px; font-weight: 600; color: var(--text-secondary); cursor: pointer; transition: all 0.2s; background: none; border: none; width: 100%; text-align: left; }
.sp-channel:hover { background: var(--bg-card); color: var(--text-primary); }
.sp-channel.active { background: rgba(16, 185, 129, 0.1); color: #047857; }

.sp-user-footer { display: flex; align-items: center; justify-content: space-between; padding: 20px 24px; border-top: 1px solid var(--border); }

/* Main Chat */
.sp-main { flex: 1; display: flex; flex-direction: column; min-width: 0; }
.sp-header { height: 72px; border-bottom: 1px solid var(--border); display: flex; align-items: center; padding: 0 32px; justify-content: space-between; }
.sp-header-left { display: flex; align-items: center; gap: 12px; }

.sp-chat-area { flex: 1; overflow-y: auto; padding: 32px; display: flex; flex-direction: column; gap: 24px; background: var(--bg-main); transition: background-color 300ms ease-in-out; }
.sp-message { background: var(--bg-card); border: 1px solid var(--border); border-radius: 16px; padding: 24px; box-shadow: 0 1px 3px rgba(0,0,0,0.02); transition: background-color 300ms ease-in-out, border-color 300ms ease-in-out; }
.sp-msg-header { display: flex; align-items: center; gap: 12px; margin-bottom: 12px; }
.sp-msg-author { font-size: 15px; font-weight: 600; color: var(--text-primary); }
.sp-msg-time { font-size: 12px; font-weight: 500; color: var(--text-secondary); }
.sp-msg-text { font-size: 15px; color: var(--text-secondary); line-height: 1.5; }

.sp-input-area { padding: 24px; border-top: 1px solid var(--border); display: flex; gap: 12px; background: var(--bg-card); align-items: center; transition: background-color 300ms ease-in-out, border-color 300ms ease-in-out; }
.sp-input-box { flex: 1; border: 1px solid var(--border); border-radius: 100px; display: flex; align-items: center; padding: 8px 8px 8px 24px; background: var(--bg-main); box-shadow: 0 1px 2px rgba(0,0,0,0.05); transition: background-color 300ms ease-in-out, border-color 300ms ease-in-out; }
.sp-input { border: none; outline: none; font-size: 15px; width: 100%; color: var(--text-primary); background: transparent; }
.sp-btn-post { background: var(--accent); color: white; border: none; padding: 10px 24px; border-radius: 100px; font-weight: 600; font-size: 14px; cursor: pointer; transition: all 0.2s; }
.sp-btn-post:hover { opacity: 0.9; transform: translateY(-1px); }
.sp-btn-post:disabled { opacity: 0.5; cursor: not-allowed; }

/* Right Sidebar */
.sp-right-aside { width: 320px; border-left: 1px solid var(--border); display: flex; flex-direction: column; padding: 24px; background: var(--bg-card); flex-shrink: 0; overflow-y: auto; transition: background-color 300ms ease-in-out, border-color 300ms ease-in-out; }
.sp-aside-section { font-size: 11px; font-weight: 700; color: var(--text-secondary); text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 16px; display: flex; justify-content: space-between; align-items: center; }

.sp-invite-card { background: var(--bg-main); border: 1px solid var(--border); border-radius: 16px; padding: 20px; margin-top: auto; transition: background-color 300ms ease-in-out, border-color 300ms ease-in-out; }

/* Call Interface Styles */
.sp-call-container { flex: 1; display: flex; flex-direction: column; background: var(--bg-main); position: relative; overflow: hidden; animation: fadeIn 0.8s ease-out; }
@keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }

.sp-call-header { padding: 24px 40px; display: flex; justify-content: space-between; align-items: center; background: var(--bg-card); backdrop-filter: blur(12px); z-index: 20; transition: background-color 300ms ease-in-out; }
.sp-call-status { display: flex; align-items: center; gap: 10px; color: #10B981; font-size: 14px; font-weight: 700; letter-spacing: 0.5px; text-transform: uppercase; }

/* Grid and Card Styles */
.sp-call-grid { flex: 1; display: grid; gap: 24px; padding: 40px; align-content: center; justify-content: center; width: 100%; max-width: 1600px; margin: 0 auto; height: 100%; }
.sp-call-grid.with-share { grid-template-columns: repeat(auto-fit, minmax(400px, 1fr)); }
.sp-participant { background: var(--bg-card); border-radius: 32px; display: flex; flex-direction: column; align-items: center; justify-content: center; position: relative; aspect-ratio: 16/10; border: 1px solid var(--border); transition: all 0.4s cubic-bezier(0.4, 0, 0.2, 1); overflow: hidden; cursor: pointer; box-shadow: 0 10px 30px rgba(0,0,0,0.2); backdrop-filter: blur(10px); }
.sp-participant:hover { border-color: var(--accent); transform: translateY(-4px) scale(1.01); box-shadow: 0 20px 40px rgba(0,0,0,0.4); }
.sp-participant.thumb { aspect-ratio: 1/1; width: 130px; border-radius: 20px; flex-shrink: 0; border-width: 2px; }
.sp-participant.thumb .sp-participant-name { font-size: 10px; padding: 4px 10px; bottom: 10px; left: 10px; }
.sp-participant.thumb .sp-mic-indicator { top: 10px; right: 10px; width: 24px; height: 24px; }
.sp-participant.stage { flex: 1; width: 100%; height: 100%; max-height: 85vh; border-radius: 40px; background: var(--bg-main); box-shadow: 0 40px 100px rgba(0,0,0,0.6); }
.sp-participant.speaking { border-color: #10B981; box-shadow: 0 0 30px rgba(16, 185, 129, 0.3); }

.sp-participant-name { position: absolute; bottom: 20px; left: 24px; background: rgba(0,0,0,0.6); padding: 6px 16px; border-radius: 100px; color: white; font-size: 13px; font-weight: 700; backdrop-filter: blur(8px); z-index: 5; border: 1px solid rgba(255,255,255,0.1); max-width: 85%; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }

/* Call View Layouts */
.sp-call-stage-view { flex: 1; display: flex; flex-direction: column; gap: 32px; padding: 24px; min-height: 0; align-items: center; position: relative; }
.sp-stage-area { flex: 1; width: 100%; max-width: 1400px; display: flex; align-items: center; justify-content: center; position: relative; min-height: 0; padding-top: 10px; }
.sp-thumbnail-bar { display: flex; gap: 20px; overflow-x: auto; padding: 16px 40px; align-items: center; background: var(--bg-card); backdrop-filter: blur(20px); border-radius: 100px; border: 1px solid var(--border); box-shadow: 0 10px 40px rgba(0,0,0,0.3); margin: 0 auto 10px; min-width: 200px; max-width: 90vw; }
.sp-thumbnail-bar::-webkit-scrollbar { display: none; }

.sp-call-toolbar { position: absolute; bottom: 32px; left: 50%; transform: translateX(-50%); display: flex; align-items: center; gap: 16px; background: var(--bg-card); backdrop-filter: blur(24px); padding: 14px 28px; border-radius: 100px; border: 1px solid var(--border); box-shadow: 0 20px 60px rgba(0,0,0,0.5); z-index: 40; transition: transform 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275); }
.sp-call-toolbar:hover { transform: translateX(-50%) scale(1.02); }
.sp-tool-btn { width: 52px; height: 52px; border-radius: 50%; display: flex; align-items: center; justify-content: center; background: rgba(255,255,255,0.08); color: white; border: none; cursor: pointer; transition: all 0.3s; position: relative; }
.sp-tool-btn:hover { background: rgba(255,255,255,0.18); transform: translateY(-4px) scale(1.1); }
.sp-tool-btn.active { background: white; color: var(--text-primary); box-shadow: 0 0 20px rgba(255,255,255,0.3); }
.sp-tool-btn.danger { background: #EF4444; color: white; box-shadow: 0 0 20px rgba(239, 68, 68, 0.2); }
.sp-tool-btn.danger:hover { background: #DC2626; box-shadow: 0 0 30px rgba(239, 68, 68, 0.4); }

.sp-video-feed { width: 100%; height: 100%; object-fit: contain; border-radius: 32px; background: #000; }
.sp-mic-indicator { position: absolute; top: 20px; right: 20px; width: 36px; height: 36px; border-radius: 50%; background: rgba(0,0,0,0.6); display: flex; align-items: center; justify-content: center; border: 1px solid rgba(255,255,255,0.1); backdrop-filter: blur(8px); z-index: 10; shadow: 0 4px 10px rgba(0,0,0,0.2); }

/* Reactions */
@keyframes floatReaction {
  0% { transform: translateY(0) scale(0.5); opacity: 0; }
  20% { opacity: 1; transform: translateY(-40px) scale(1.1); }
  100% { transform: translateY(-180px) scale(1); opacity: 0; }
}
.sp-reactions-overlay { position: absolute; inset: 0; pointer-events: none; z-index: 50; overflow: hidden; }
.sp-reaction-item { position: absolute; bottom: 100px; display: flex; flex-direction: column; align-items: center; gap: 4px; animation: floatReaction 3s ease-out forwards; }
.sp-reaction-emoji { font-size: 42px; filter: drop-shadow(0 4px 8px rgba(0,0,0,0.3)); }
.sp-reaction-name { background: rgba(0,0,0,0.6); color: white; padding: 2px 10px; border-radius: 100px; font-size: 11px; font-weight: 700; backdrop-filter: blur(4px); white-space: nowrap; }

.sp-reaction-bar { display: flex; gap: 8px; background: var(--bg-card); backdrop-filter: blur(20px); padding: 8px; border-radius: 100px; border: 1px solid var(--border); margin-bottom: 8px; position: absolute; bottom: 100%; left: 50%; transform: translateX(-50%); }
.sp-react-btn { width: 36px; height: 36px; border-radius: 50%; border: none; background: transparent; cursor: pointer; transition: all 0.2s; font-size: 20px; display: flex; align-items: center; justify-content: center; }
.sp-react-btn:hover { background: rgba(255,255,255,0.1); transform: scale(1.2); }

/* Presence & Join Animations */
@keyframes participantEnter {
  0% { opacity: 0; transform: scale(0.95) translateY(10px); }
  100% { opacity: 1; transform: scale(1) translateY(0); }
}
.sp-participant-card { animation: participantEnter 0.5s cubic-bezier(0.16, 1, 0.3, 1) forwards; }
.sp-join-toast { position: fixed; bottom: 32px; left: 32px; background: var(--bg-card); color: var(--text-primary); padding: 12px 20px; border-radius: 12px; font-size: 13px; font-weight: 600; box-shadow: 0 10px 20px rgba(0,0,0,0.2); z-index: 100; display: flex; align-items: center; gap: 10px; border: 1px solid var(--border); animation: participantEnter 0.4s ease; transform: none; transition: background-color 300ms ease-in-out, color 300ms ease-in-out, border-color 300ms ease-in-out; }

/* Side Chat */
.sp-side-chat {
  width: 340px;
  background: var(--bg-card);
  border-left: 1px solid var(--border);
  display: flex;
  flex-direction: column;
  transition: margin-right 0.3s cubic-bezier(0.4, 0, 0.2, 1), opacity 0.3s ease, background-color 300ms ease-in-out, border-color 300ms ease-in-out;
}
.sp-side-chat.collapsed {
  margin-right: -340px;
  opacity: 0;
  pointer-events: none;
}
.sp-side-chat-messages {
  flex: 1;
  overflow-y: auto;
  padding: 24px;
  display: flex;
  flex-direction: column;
  gap: 20px;
}
.sp-side-chat-input {
  padding: 16px 24px 24px;
  border-top: 1px solid var(--border);
}
.sp-side-msg {
  font-size: 14px;
  color: var(--text-secondary);
  line-height: 1.4;
}
.sp-side-msg-header {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-bottom: 6px;
}
.sp-side-msg-author {
  font-weight: 600;
  font-size: 14px;
  color: var(--text-primary);
}
.sp-side-msg-time {
  font-size: 11px;
  color: var(--text-secondary);
}
.sp-chat-toggle {
  position: absolute;
  top: 24px;
  right: 32px;
  z-index: 30;
  background: rgba(30, 41, 59, 0.4);
  border: 1px solid rgba(255,255,255,0.1);
  color: white;
  width: 44px;
  height: 44px;
  border-radius: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: all 0.2s;
  backdrop-filter: blur(8px);
}
.sp-chat-toggle:hover {
  background: rgba(30, 41, 59, 0.7);
  border-color: rgba(255,255,255,0.2);
}

.sp-prejoin {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 40px;
  background: var(--bg-main);
}
.sp-prejoin-card {
  width: min(520px, 100%);
  background: var(--bg-card);
  border: 1px solid var(--border);
  border-radius: 28px;
  padding: 34px;
  text-align: center;
  box-shadow: 0 20px 60px rgba(0,0,0,0.4);
  backdrop-filter: blur(12px);
  transition: background-color 300ms ease-in-out, border-color 300ms ease-in-out;
}
.sp-prejoin-title {
  color: var(--text-primary);
  font-size: 40px;
  font-weight: 800;
  letter-spacing: -0.6px;
  margin: 0 0 12px;
}
.sp-prejoin-subtitle {
  color: var(--text-secondary);
  font-size: 18px;
  margin: 0 0 28px;
}
.sp-join-btn {
  background: #10B981;
  color: #042F2E;
  border: none;
  border-radius: 999px;
  padding: 12px 28px;
  font-size: 15px;
  font-weight: 800;
  cursor: pointer;
  display: inline-flex;
  align-items: center;
  gap: 10px;
  transition: transform 0.2s ease, box-shadow 0.2s ease, background 0.2s ease;
  box-shadow: 0 12px 30px rgba(16, 185, 129, 0.28);
}
.sp-join-btn:hover {
  background: #34D399;
  transform: translateY(-2px);
  box-shadow: 0 16px 34px rgba(16, 185, 129, 0.38);
}
`;

const Initials = ({ name, size = 32 }: { name: string; size?: number }) => {
  const initials = name.substring(0, 2).toUpperCase();
  const colors = [
    "linear-gradient(135deg, #FF6B6B 0%, #EE5253 100%)",
    "linear-gradient(135deg, #FF9F43 0%, #FF9F43 100%)",
    "linear-gradient(135deg, #10AC84 0%, #10B981 100%)",
    "linear-gradient(135deg, #2E86DE 0%, #54A0FF 100%)",
    "linear-gradient(135deg, #5F27CD 0%, #341F97 100%)",
    "linear-gradient(135deg, #8B5CF6 0%, #6D28D9 100%)",
    "linear-gradient(135deg, #F368E0 0%, #FF9FF3 100%)"
  ];
  const color = colors[name.length % colors.length];
  
  return (
    <div style={{
      width: size, height: size, borderRadius: "50%", background: color,
      color: "white", display: "flex", alignItems: "center", justifyContent: "center",
      fontSize: size * 0.38, fontWeight: 800, flexShrink: 0, 
      boxShadow: `0 10px 25px rgba(0,0,0,0.3), inset 0 0 10px rgba(255,255,255,0.2)`,
      textShadow: "0 2px 4px rgba(0,0,0,0.2)",
      border: "4px solid rgba(255,255,255,0.08)"
    }}>
      {initials}
    </div>
  );
};

export function ServerPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const toast = useToast();
  const { server: serverSlug, channel: channelIdFromUrl } = useParams();

  const isMissingServerMessagesTable = (error: any) => {
    const message = String(error?.message ?? "").toLowerCase();
    const details = String(error?.details ?? "").toLowerCase();
    const hint = String(error?.hint ?? "").toLowerCase();
    return (
      message.includes("public.server_messages") ||
      message.includes("schema cache") ||
      details.includes("public.server_messages") ||
      hint.includes("public.server_messages")
    );
  };

  const formatMessageDateTime = (value: string) => {
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return "Unknown time";
    return date.toLocaleString([], {
      month: "short",
      day: "numeric",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };
  
  const [messages, setMessages] = React.useState<any[]>([]);
  const [channels, setChannels] = React.useState<any[]>([]);
  const [activeChannel, setActiveChannel] = React.useState<any>(null);
  const [currentSpace, setCurrentSpace] = React.useState<any>(null);
  const [loading, setLoading] = React.useState(true);
  const [inputText, setInputText] = React.useState("");
  const [posting, setPosting] = React.useState(false);
  const [chatSchemaMissing, setChatSchemaMissing] = React.useState(false);
  const [isChatVisible, setIsChatVisible] = React.useState(false); // Collapsed by default
  const [isInVoiceSession, setIsInVoiceSession] = React.useState(false);
  const [localStream, setLocalStream] = React.useState<MediaStream | null>(null);
  const [screenStream, setScreenStream] = React.useState<MediaStream | null>(null);
  const [isMicOn, setIsMicOn] = React.useState(false); // Default OFF
  const [isCamOn, setIsCamOn] = React.useState(false); // Default OFF
  const [isDeafened, setIsDeafened] = React.useState(false);
  const [isSharingScreen, setIsSharingScreen] = React.useState(false);
  const [sharer, setSharer] = React.useState<{ id: string, name: string } | null>(null);
  const [participants, setParticipants] = React.useState<any[]>([]);
  const [newJoiner, setNewJoiner] = React.useState<string | null>(null);
  const [activeReactions, setActiveReactions] = React.useState<any[]>([]);
  const [focusedId, setFocusedId] = React.useState<string | null>(null);
  const videoRef = React.useRef<HTMLVideoElement>(null);
  const screenVideoRef = React.useRef<HTMLVideoElement>(null);
  const channelRef = React.useRef<any>(null);

  const isLive = activeChannel?.type === 'voice' || activeChannel?.type === 'video';

  const loadMessages = React.useCallback(async (channelId: string) => {
    if (!serverSlug || !channelId) return;
    try {
      const { data, error } = await supabase
        .from("server_messages")
        .select("*, author:profiles!author_id(*)")
        .eq("server_id", serverSlug)
        .eq("channel_id", channelId)
        .order("created_at", { ascending: true });

      if (error) throw error;
      
      setChatSchemaMissing(false);
      if (data) setMessages(data);
    } catch (err) {
      if (isMissingServerMessagesTable(err)) {
        setChatSchemaMissing(true);
      }
      console.error("Failed to load messages:", err);
    }
  }, [serverSlug]);

  const sendReaction = (emoji: string) => {
    if (!channelRef.current || !user) return;
    channelRef.current.send({
      type: 'broadcast',
      event: 'reaction',
      payload: { emoji, user_id: user.id, display_name: user.email?.split('@')[0], id: Math.random() }
    });
    // Record locally too
    const r = { emoji, user_id: user.id, display_name: user.email?.split('@')[0], id: Math.random(), x: 45 + Math.random() * 10 };
    setActiveReactions(prev => [...prev, r]);
    setTimeout(() => setActiveReactions(prev => prev.filter(rx => rx.id !== r.id)), 3000);
  };

  const toggleFocus = (id: string) => {
    setFocusedId(prev => (prev === id ? null : id));
  };

  const leaveLiveSession = React.useCallback(() => {
    if (screenStream) {
      screenStream.getTracks().forEach(track => track.stop());
    }
    if (localStream) {
      localStream.getTracks().forEach(track => track.stop());
    }
    setScreenStream(null);
    setLocalStream(null);
    setIsSharingScreen(false);
    setSharer(null);
    setParticipants([]);
    setIsMicOn(false);
    setIsCamOn(false);
    setIsDeafened(false);
    setFocusedId(null);
    setIsChatVisible(false);
    setIsInVoiceSession(false);
  }, [localStream, screenStream]);

  const joinLiveSession = () => {
    setFocusedId(null);
    setIsChatVisible(false);
    setIsInVoiceSession(true);
  };

  const handleSendMessage = async () => {
    if (!user || !inputText.trim() || !serverSlug || !activeChannel) return;
    if (chatSchemaMissing) {
      toast.error("Chat is not configured yet. Run src/luminote_schema.sql in Supabase SQL Editor.");
      return;
    }
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
      setChatSchemaMissing(false);
      setInputText("");
    } catch (err: any) {
      if (isMissingServerMessagesTable(err)) {
        setChatSchemaMissing(true);
        toast.error("Missing table: public.server_messages. Run src/luminote_schema.sql in Supabase SQL Editor.");
        return;
      }
      toast.error(err.message);
    } finally {
      setPosting(false);
    }
  };

  const toggleMic = async () => {
    if (isMicOn) {
      // Turn OFF
      if (localStream) {
        const audioTrack = localStream.getAudioTracks()[0];
        if (audioTrack) {
          audioTrack.stop();
          localStream.removeTrack(audioTrack);
        }
      }
      setIsMicOn(false);
    } else {
      // Turn ON
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        const newTrack = stream.getAudioTracks()[0];
        if (localStream) {
          localStream.addTrack(newTrack);
        } else {
          setLocalStream(stream);
        }
        setIsMicOn(true);
      } catch (err) {
        console.warn("Failed to start mic", err);
        toast.error("Could not access microphone");
      }
    }
  };

  const toggleDeafen = () => {
    const newState = !isDeafened;
    setIsDeafened(newState);
    if (newState && isMicOn) {
      toggleMic(); // Fully toggle off mic when deafening
    }
  };

  const toggleCam = async () => {
    if (!localStream) return;
    
    const videoTrack = localStream.getVideoTracks()[0];
    if (videoTrack) {
      // Turn OFF
      videoTrack.stop();
      localStream.removeTrack(videoTrack);
      setIsCamOn(false);
    } else {
      // Turn ON
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ video: true });
        const newTrack = stream.getVideoTracks()[0];
        localStream.addTrack(newTrack);
        setIsCamOn(true);
      } catch (err) {
        console.warn("Failed to start camera", err);
        toast.error("Could not access camera");
      }
    }
  };

  const toggleScreenShare = async () => {
    if (!user) {
      toast.error("You must be signed in to share your screen.");
      return;
    }

    if (!isSharingScreen) {
      try {
        const stream = await navigator.mediaDevices.getDisplayMedia({ 
          video: true,
          audio: false, // Don't capture system audio by default for focus
          selfBrowserSurface: "exclude", // Hint to browser to stay on the Luminote tab
          surfaceSwitching: "include" 
        } as any);
        setScreenStream(stream);
        setIsSharingScreen(true);
        
        // Broadcast sharing
        channelRef.current?.send({
          type: 'broadcast',
          event: 'sharing_started',
          payload: { user_id: user.id, display_name: user.email?.split('@')[0] }
        });

        stream.getVideoTracks()[0].onended = () => {
          setScreenStream(null);
          setIsSharingScreen(false);
          channelRef.current?.send({ type: 'broadcast', event: 'sharing_stopped' });
        };
      } catch (err) {
        console.warn("Screen share denied", err);
      }
    } else {
      if (screenStream) screenStream.getTracks().forEach(t => t.stop());
      setScreenStream(null);
      setIsSharingScreen(false);
      channelRef.current?.send({ type: 'broadcast', event: 'sharing_stopped' });
    }
  };

  const endSession = () => {
    leaveLiveSession();
  };

  const cleanSwitchChannel = async (channel: any) => {
    if (channel.id === activeChannel?.id) return;
    navigate(`/home/hangout/${serverSlug}/${channel.id}`);
  };

  // 1. Load Server & Channels (Runs on serverSlug change)
  React.useEffect(() => {
    async function loadServer() {
      if (!serverSlug) return;
      setLoading(true);
      
      try {
        const { data: spaces } = await (supabase.from("spaces") as any).select("*");
        const space = spaces?.find((s: any) => s.name.toLowerCase().replace(/\s+/g, '-') === serverSlug);
        
        if (space) {
          setCurrentSpace(space);
          const { data: channelData } = await (supabase.from("channels") as any)
            .select("*")
            .eq("space_id", space.id)
            .order("created_at", { ascending: true });
          
          if (channelData) {
            setChannels(channelData);
            // If no channel is in URL, pick the first one and navigate
            if (!channelIdFromUrl && channelData.length > 0) {
              navigate(`/home/hangout/${serverSlug}/${channelData[0].id}`, { replace: true });
            }
          }
        } else {
          // If space not found after fetch, wait a tiny bit then redirect
          setTimeout(() => {
            if (!currentSpace) {
              toast.error("Sanctuary not found");
              navigate('/home/hangout');
            }
          }, 2000);
        }
      } catch (err) {
        console.error("Load Server Error:", err);
        navigate('/home/hangout');
      } finally {
        setLoading(false);
      }
    }
    loadServer();
  }, [serverSlug]);

  // 2. Load Active Channel & Messages (Runs on channelIdFromUrl change)
  React.useEffect(() => {
    if (!channelIdFromUrl || channels.length === 0) return;
    
    const targetChannel = channels.find(c => c.id === channelIdFromUrl);
    if (targetChannel) {
      if (activeChannel?.id !== targetChannel.id) {
        setMessages([]); // Data hygiene: clear context instantly
      }
      setActiveChannel(targetChannel);
      loadMessages(targetChannel.id);
    }
  }, [channelIdFromUrl, channels, loadMessages]);

  // Hardware Setup Effect
  React.useEffect(() => {
    if (!activeChannel) return;
    if (activeChannel.type === 'voice' || activeChannel.type === 'video') {
      setIsInVoiceSession(false);
      setIsChatVisible(false);
      setFocusedId(null);
    }
  }, [activeChannel?.id]);

  React.useEffect(() => {
    if (!isLive) {
      leaveLiveSession();
    }
    if (isLive && !isInVoiceSession) {
      leaveLiveSession();
    }
    return () => {
      if (localStream) {
        localStream.getTracks().forEach(track => track.stop());
      }
      if (screenStream) {
        screenStream.getTracks().forEach(track => track.stop());
      }
    };
  }, [isLive, isInVoiceSession, leaveLiveSession]);

  // Presence Effect
  React.useEffect(() => {
    if (!isLive || !isInVoiceSession || !activeChannel || !user) return;

    const channel = supabase.channel(`presence-${activeChannel.id}`, {
      config: { presence: { key: user.id } }
    });

    channelRef.current = channel;

    channel
      .on('presence', { event: 'sync' }, () => {
        const state = channel.presenceState();
        const users = Object.values(state).flat().filter((p: any) => p.user_id !== user.id);
        const mappedUsers = users.map((p: any) => ({ ...p, id: p.user_id, type: 'fellow', presence: p }));
        setParticipants(mappedUsers);
      })
      .on('presence', { event: 'join' }, ({ newPresences }) => {
        const joiner = newPresences[0] as any;
        if (joiner && joiner.user_id !== user.id) {
          setNewJoiner(joiner.display_name || "Someone");
          setTimeout(() => setNewJoiner(null), 4000);
        }
      })
      .on('broadcast', { event: 'reaction' }, ({ payload }) => {
        const r = { ...payload, timestamp: Date.now(), x: 40 + Math.random() * 20 };
        setActiveReactions(prev => [...prev, r]);
        setTimeout(() => setActiveReactions(prev => prev.filter(rx => rx.id !== r.id)), 3000);
      })
      .on('broadcast', { event: 'sharing_started' }, ({ payload }) => {
        setSharer({ id: payload.user_id, name: payload.display_name });
      })
      .on('broadcast', { event: 'sharing_stopped' }, () => {
        setSharer(null);
      })
      .subscribe(async (status) => {
        if (status === 'SUBSCRIBED') {
          await channel.track({
            user_id: user.id,
            display_name: user.email?.split('@')[0],
            online_at: new Date().toISOString(),
            isMicOn,
            isCamOn
          });
        }
      });

    return () => { channel.unsubscribe(); channelRef.current = null; };
  }, [isLive, isInVoiceSession, activeChannel, user, isMicOn, isCamOn]);

  // Ensure video elements stay updated using Callback Refs for stability
  const userVideoCallback = React.useCallback((el: HTMLVideoElement | null) => {
    if (el && localStream) {
      el.srcObject = localStream;
    }
  }, [localStream]);

  const screenVideoCallback = React.useCallback((el: HTMLVideoElement | null) => {
    if (el && screenStream) {
      el.srcObject = screenStream;
    }
  }, [screenStream]);


  React.useEffect(() => {
    if (!serverSlug || !activeChannel || chatSchemaMissing) return;

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
  }, [serverSlug, activeChannel, loadMessages, chatSchemaMissing]);

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
                      onClick={() => cleanSwitchChannel(item)}
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

      {/* MAIN CONTENT AREA */}
      <div className="sp-main">
        {isLive ? (
          <div className="sp-call-container">
            <div className="sp-call-header">
              <div className="sp-call-status">
                <div style={{ width: 10, height: 10, borderRadius: "50%", background: "#10B981" }} />
                Live: {activeChannel?.name}
              </div>
              <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
                <button className="sp-tool-btn" title="Add Fellows"><UserPlus size={18} /></button>
                <div className="h-6 w-px bg-white/10 mx-2" />
                {isInVoiceSession && (
                  <button 
                    className="sp-chat-toggle" 
                    style={{ position: 'relative', top: 'auto', right: 'auto' }}
                    onClick={() => setIsChatVisible(!isChatVisible)}
                    title={isChatVisible ? "Collapse Chat" : "Open Chat"}
                  >
                    <MessageSquare size={20} />
                  </button>
                )}
              </div>
            </div>

            {!isInVoiceSession ? (
              <div className="sp-prejoin">
                <div className="sp-prejoin-card">
                  <h2 className="sp-prejoin-title"># {activeChannel?.name}</h2>
                  <p className="sp-prejoin-subtitle">You are not connected to voice yet.</p>
                  <button className="sp-join-btn" onClick={joinLiveSession}>
                    <Mic size={18} /> Join Voice
                  </button>
                </div>
              </div>
            ) : focusedId ? (
              <div className="sp-call-stage-view">
                <div className="sp-stage-area">
                  {((item) => {
                    if (!item) return null;
                    
                    if (item.type === 'screen') {
                      return (
                        <div key={item.id} className="sp-participant sp-participant-card stage" onClick={() => toggleFocus(item.id)}>
                            <video ref={screenVideoCallback} autoPlay muted playsInline className="sp-video-feed" key="local-screen-active" />
                            <div className="sp-participant-name">Your Screen</div>
                        </div>
                      );
                    }
                    if (item.type === 'local') {
                      return (
                        <div key={item.id} className={`sp-participant ${isMicOn ? 'speaking' : ''} stage`} onClick={() => toggleFocus(item.id)}>
                          {isCamOn && localStream && localStream.getVideoTracks().length > 0 ? (
                            <video ref={userVideoCallback} autoPlay muted playsInline className="sp-video-feed" key={localStream.id} />
                          ) : (
                            <Initials name={user?.email || "?"} size={240} />
                          )}
                          <div className="sp-participant-name">{user?.email?.split('@')[0]} (You)</div>
                          <div className="sp-mic-indicator" style={{ color: isMicOn ? "#10B981" : "#EF4444" }}>
                            {isMicOn ? <Mic size={20} /> : <MicOff size={20} />}
                          </div>
                        </div>
                      );
                    }
                    if (item.type === 'sharer') {
                      return (
                        <div key={item.id} className="sp-participant sp-participant-card stage" style={{ background: "linear-gradient(135deg, #064E3B 0%, #0F172A 100%)" }} onClick={() => toggleFocus(item.id)}>
                          <div className="flex flex-col items-center gap-6">
                            <Monitor size={80} color="#10B981" className="drop-shadow-2xl" />
                            <div style={{ color: "white", fontWeight: 800, fontSize: 24, letterSpacing: "-0.5px" }}>{item.name} is sharing</div>
                          </div>
                          <div className="sp-participant-name">Screencast</div>
                        </div>
                      );
                    }
                    return (
                      <div key={item.id} className={`sp-participant sp-participant-card ${item.presence?.isMicOn ? 'speaking' : ''} stage`} onClick={() => toggleFocus(item.id)}>
                        <Initials name={item.display_name || "?"} size={200} />
                        <div className="sp-participant-name">{item.display_name}</div>
                        <div className="sp-mic-indicator" style={{ color: item.presence?.isMicOn ? "#10B981" : "#EF4444" }}>
                          {item.presence?.isMicOn ? <Mic size={20} /> : <MicOff size={20} />}
                        </div>
                      </div>
                    );
                  })([
                    ...(isSharingScreen && screenStream ? [{ id: 'screen', type: 'screen', stream: screenStream }] : []),
                    { id: 'local', type: 'local', stream: localStream, user: user },
                    ...(sharer && sharer.id !== user?.id ? [{ id: sharer.id, type: 'sharer', name: sharer.name }] : []),
                    ...participants.map(p => ({ ...p, id: p.user_id, type: 'fellow', presence: p }))
                  ].find(p => p.id === focusedId))}
                </div>
                <div className="sp-thumbnail-bar">
                  {[
                    ...(isSharingScreen && screenStream ? [{ id: 'screen', type: 'screen', stream: screenStream }] : []),
                    { id: 'local', type: 'local', stream: localStream, user: user },
                    ...(sharer && sharer.id !== user?.id ? [{ id: sharer.id, type: 'sharer', name: sharer.name }] : []),
                    ...participants.map(p => ({ ...p, id: p.user_id, type: 'fellow', presence: p }))
                  ].filter(p => p.id !== focusedId).map(item => (
                    <div key={item.id} className={`sp-participant thumb ${item.type === 'local' ? (isMicOn ? 'speaking' : '') : (item.presence?.isMicOn ? 'speaking' : '')}`} onClick={() => toggleFocus(item.id)}>
                      {item.type === 'local' ? (
                         isCamOn && localStream && localStream.getVideoTracks().length > 0 ? (
                           <video ref={userVideoCallback} autoPlay muted playsInline className="sp-video-feed" key={localStream.id} />
                         ) : <Initials name={user?.email || "?"} size={60} />
                      ) : item.type === 'screen' ? (
                           <video ref={screenVideoCallback} autoPlay muted playsInline className="sp-video-feed" key="local-screen-active" />
                      ) : item.type === 'sharer' ? (
                           <Monitor size={32} color="#10B981" />
                      ) : (
                         <Initials name={item.display_name || "?"} size={60} />
                      )}
                      <div className="sp-mic-indicator" style={{ 
                        color: item.type === 'local' ? (isMicOn ? "#10B981" : "#EF4444") : (item.presence?.isMicOn ? "#10B981" : "#EF4444") 
                      }}>
                        {item.type === 'local' ? (isMicOn ? <Mic size={14} /> : <MicOff size={14} />) : (item.presence?.isMicOn ? <Mic size={14} /> : <MicOff size={14} />)}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <div className={`sp-call-grid ${isSharingScreen || sharer ? 'with-share' : ''}`} style={{ 
                gridTemplateColumns: ([
                  ...(isSharingScreen && screenStream ? [{ id: 'screen', type: 'screen', stream: screenStream }] : []),
                  { id: 'local', type: 'local', stream: localStream, user: user },
                  ...(sharer && sharer.id !== user?.id ? [{ id: sharer.id, type: 'sharer', name: sharer.name }] : []),
                  ...participants.map(p => ({ ...p, id: p.user_id, type: 'fellow', presence: p }))
                ].length === 1) 
                  ? "minmax(300px, 600px)" 
                  : (isChatVisible ? "repeat(auto-fit, minmax(300px, 1fr))" : "repeat(auto-fit, minmax(400px, 1fr))"),
                gridAutoRows: "auto",
                justifyContent: "center",
                maxWidth: 1600,
                margin: "0 auto",
                padding: "40px",
                alignContent: "center",
                height: "100%"
              }}>
                {[
                  ...(isSharingScreen && screenStream ? [{ id: 'screen', type: 'screen', stream: screenStream }] : []),
                  { id: 'local', type: 'local', stream: localStream, user: user },
                  ...(sharer && sharer.id !== user?.id ? [{ id: sharer.id, type: 'sharer', name: sharer.name }] : []),
                  ...participants.map(p => ({ ...p, id: p.user_id, type: 'fellow', presence: p }))
                ].map(item => (
                  <div key={item.id} className={`sp-participant sp-participant-card ${item.type === 'local' ? (isMicOn ? 'speaking' : '') : (item.presence?.isMicOn ? 'speaking' : '')}`} onClick={() => toggleFocus(item.id)}>
                    {item.type === 'local' ? (
                       isCamOn && localStream && localStream.getVideoTracks().length > 0 ? (
                         <video ref={userVideoCallback} autoPlay muted playsInline className="sp-video-feed" key={localStream.id} />
                       ) : <Initials name={user?.email || "?"} size={120} />
                    ) : item.type === 'screen' ? (
                         <video ref={screenVideoCallback} autoPlay muted playsInline className="sp-video-feed" key="local-screen-active" />
                    ) : item.type === 'sharer' ? (
                         <div className="flex flex-col items-center gap-6">
                           <Monitor size={80} color="#10B981" />
                           <div style={{ color: "white", fontWeight: 800, fontSize: 18 }}>{item.name} is sharing</div>
                         </div>
                    ) : (
                       <Initials name={item.display_name || "?"} size={100} />
                    )}
                    <div className="sp-participant-name">{item.display_name || (item.type === 'local' ? user?.email?.split('@')[0] : 'Screencast')}</div>
                    <div className="sp-mic-indicator" style={{ 
                      color: item.type === 'local' ? (isMicOn ? "#10B981" : "#EF4444") : (item.presence?.isMicOn ? "#10B981" : "#EF4444") 
                    }}>
                      {item.type === 'local' ? (isMicOn ? <Mic size={20} /> : <MicOff size={20} />) : (item.presence?.isMicOn ? <Mic size={20} /> : <MicOff size={20} />)}
                    </div>
                  </div>
                ))}
              </div>
            )}

            {activeReactions.length > 0 && (
              <div className="sp-reactions-overlay">
                {activeReactions.map(r => (
                  <div key={r.id} className="sp-reaction-item" style={{ left: `${r.x || 50}%` }}>
                    <span className="sp-reaction-emoji">{r.emoji}</span>
                    <span className="sp-reaction-name">{r.display_name || "Fellow"}</span>
                  </div>
                ))}
              </div>
            )}

            {newJoiner && (
              <div className="sp-join-toast">
                <div className="w-2 h-2 rounded-full bg-emerald-500" />
                {newJoiner} joined the Study Sanctuary
              </div>
            )}

            {isInVoiceSession && (
              <div className="sp-call-toolbar">
                <div className="sp-reaction-bar">
                  {["❤️", "🔥", "😂", "🤯", "👍", "👋"].map(emoji => (
                    <button key={emoji} className="sp-react-btn" onClick={() => sendReaction(emoji)}>{emoji}</button>
                  ))}
                </div>

                <button className={`sp-tool-btn ${isMicOn ? 'active' : 'danger'}`} onClick={toggleMic} title={isMicOn ? "Mute Mic" : "Unmute Mic"}>
                  {isMicOn ? <Mic size={20} /> : <MicOff size={20} />}
                </button>
                <button className={`sp-tool-btn ${isCamOn ? 'active' : 'danger'}`} onClick={toggleCam} title={isCamOn ? "Stop Video" : "Start Video"}>
                  {isCamOn ? <Video size={20} /> : <VideoOff size={20} />}
                </button>
                <button className={`sp-tool-btn ${isDeafened ? 'active' : ''}`} onClick={toggleDeafen} title={isDeafened ? "Undeafen" : "Deafen"}>
                  {isDeafened ? <VolumeX size={20} /> : <Headphones size={20} />}
                </button>
                <button className={`sp-tool-btn ${isSharingScreen ? 'active' : ''}`} onClick={toggleScreenShare} title={isSharingScreen ? "Stop Sharing" : "Screen Share"}>
                  <PlayCircle size={20} />
                </button>
                <div className="w-px h-8 bg-white/20 mx-2" />
                <button className="sp-tool-btn danger" onClick={endSession} title="End Session"><X size={20} strokeWidth={3} /></button>
              </div>
            )}
          </div>
        ) : (
          <div className="sp-sidebar-chat-wrapper" style={{ display: "contents" }}>
            {!isLive && (
              <div className="sp-header">
                <div className="sp-header-left">
                  <div className="sp-header-title">
                    <span style={{ color: "#94A3B8" }}>#</span>
                    {activeChannel?.name || "general"}
                  </div>
                </div>
              </div>
            )}
            <div className="sp-chat-area">
              {loading ? (
                <div style={{ display: "flex", justifyContent: "center", padding: 40 }}><Loader2 size={32} className="animate-spin" color="#059669" /></div>
              ) : chatSchemaMissing ? (
                <div style={{ textAlign: "center", padding: "100px 20px" }}>
                  <div style={{ width: 80, height: 80, background: "#FEF2F2", borderRadius: 32, margin: "0 auto 24px", display: "flex", alignItems: "center", justifyContent: "center" }}>
                    <AlertCircle size={40} color="#DC2626" />
                  </div>
                  <h2 style={{ fontSize: 24, fontWeight: 700, color: "#0F172A", marginBottom: 8 }}>Chat setup required</h2>
                  <p style={{ color: "#64748B", fontSize: 16, maxWidth: 560, margin: "0 auto" }}>
                    Table <strong>public.server_messages</strong> was not found in your Supabase project. Run <strong>src/luminote_schema.sql</strong> in the Supabase SQL Editor, then refresh.
                  </p>
                </div>
              ) : messages.length === 0 ? (
                <div style={{ textAlign: "center", padding: "100px 20px" }}>
                  <div style={{ width: 80, height: 80, background: "#F1F5F9", borderRadius: 32, margin: "0 auto 24px", display: "flex", alignItems: "center", justifyContent: "center" }}>
                    <MessageSquare size={40} color="#94A3B8" />
                  </div>
                  <h2 style={{ fontSize: 24, fontWeight: 700, color: "#0F172A", marginBottom: 8 }}>#{activeChannel?.name}</h2>
                  <p style={{ color: "#64748B", fontSize: 16 }}>Start the conversation!</p>
                </div>
              ) : (
                messages.map(msg => (
                  <div key={msg.id} className="sp-message">
                    <div className="sp-msg-header">
                      {msg.author?.avatar_url ? (
                        <img src={msg.author.avatar_url} style={{ width: 40, height: 40, borderRadius: "50%" }} alt="" />
                      ) : <Initials name={msg.author?.display_name || msg.author?.email || "?"} size={40} />}
                      <div style={{ overflow: "hidden" }}>
                        <div className="sp-msg-author">{msg.author?.display_name || msg.author?.email?.split('@')[0] || "Unknown"}</div>
                        <div className="sp-msg-time">{formatMessageDateTime(msg.created_at)}</div>
                      </div>
                    </div>
                    <div className="sp-msg-text">{msg.text}</div>
                  </div>
                ))
              )}
            </div>
            <div className="sp-input-area">
              <div className="sp-input-box">
                <input 
                  type="text" className="sp-input" placeholder={`Message #${activeChannel?.name || 'chat'}...`} 
                  value={inputText} onChange={(e) => setInputText(e.target.value)} onKeyDown={(e) => e.key === "Enter" && handleSendMessage()} disabled={posting || chatSchemaMissing}
                />
                <button className="sp-btn-post" onClick={handleSendMessage} disabled={posting || !inputText.trim() || chatSchemaMissing}><Sparkles size={16} /></button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* RIGHT SIDEBAR / SIDE CHAT */}
      {isLive && isInVoiceSession ? (
        <div className={`sp-side-chat ${!isChatVisible ? 'collapsed' : ''}`}>
           <div className="sp-side-chat-messages">
             {chatSchemaMissing ? (
               <div style={{ textAlign: "center", padding: "40px 10px" }}>
                 <h2 style={{ fontSize: 16, fontWeight: 700, color: "#0F172A", marginBottom: 8 }}>Chat unavailable</h2>
                 <p style={{ color: "#64748B", fontSize: 13 }}>Run src/luminote_schema.sql in Supabase SQL Editor.</p>
               </div>
             ) : messages.length === 0 ? (
               <div style={{ textAlign: "center", padding: "40px 10px" }}>
                 <h2 style={{ fontSize: 18, fontWeight: 700, color: "#0F172A", marginBottom: 8 }}>#{activeChannel?.name}</h2>
                 <p style={{ color: "#64748B", fontSize: 13 }}>Start the conversation!</p>
               </div>
             ) : (
               messages.map(msg => (
                 <div key={msg.id} className="sp-side-msg">
                    <div className="sp-side-msg-header">
                      {msg.author?.avatar_url ? <img src={msg.author.avatar_url} style={{ width: 28, height: 28, borderRadius: "50%" }} alt="" /> : <Initials name={msg.author?.display_name || msg.author?.email || "?"} size={28} />}
                      <div style={{ overflow: "hidden" }}>
                        <div className="sp-side-msg-author">{msg.author?.display_name || msg.author?.email?.split('@')[0] || "Unknown"}</div>
                        <div className="sp-side-msg-time">{formatMessageDateTime(msg.created_at)}</div>
                      </div>
                    </div>
                    <div>{msg.text}</div>
                 </div>
               ))
             )}
           </div>
           <div className="sp-side-chat-input">
             <div className="sp-input-box" style={{ padding: "6px 6px 6px 18px" }}>
               <input 
                 type="text" className="sp-input" style={{ fontSize: 14 }} placeholder={`Msg...`} 
                 value={inputText} onChange={(e) => setInputText(e.target.value)} onKeyDown={(e) => e.key === "Enter" && handleSendMessage()} disabled={posting || chatSchemaMissing}
               />
               <button className="sp-btn-post" style={{ padding: "8px 20px" }} onClick={handleSendMessage} disabled={posting || !inputText.trim() || chatSchemaMissing}><Sparkles size={16} /></button>
             </div>
           </div>
        </div>
      ) : (
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
      )}
    </div>
  );
}
