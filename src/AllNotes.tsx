import React, { useState, useMemo } from "react";
import { Link, useNavigate } from "react-router";
import { Search, Filter, Pin, Star, Plus, X, Send, Bot, FileText, Trash2 } from "lucide-react";
import { useNotes, Note } from "./NotesContext";
import { useAuth } from "./AuthContext";
import { lumiChat } from "./qwen";
import { getCleanPreview } from "./utils";
import { formatDistanceToNow } from "date-fns";
import { motion, AnimatePresence } from "motion/react";

type ChatMode = "notes" | "general";

type SearchResultNote = {
  id: string;
  title: string;
  content: string;
  matchedText: string;
  tags?: string[];
  created_at?: string;
  updated_at?: string;
};

type ChatMessage = {
  role: "user" | "bot";
  text: string;
  notes?: SearchResultNote[];
};

type NoteAiResult = {
  answer: string;
  relevantNoteIds: string[];
};

async function parseApiResponse(response: Response): Promise<any> {
  const raw = await response.text();
  if (!raw) return {};

  try {
    return JSON.parse(raw);
  } catch {
    return {
      error: response.ok
        ? "Received an invalid server response."
        : `Request failed (${response.status}).`,
      raw,
    };
  }
}

function stripMarkup(text: string): string {
  return (text || "")
    .replace(/<[^>]*>/g, " ")
    .replace(/[\[\]{}]/g, " ")
    .replace(/[#*_`]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function findMatchedSnippet(content: string, query: string): string {
  const cleanContent = stripMarkup(content);
  const q = query.trim().toLowerCase();
  const tokens = q.split(/\s+/).filter(Boolean);
  const sentences = cleanContent
    .split(/(?<=[.!?])\s+/)
    .map((s) => s.trim())
    .filter(Boolean);

  const exact = sentences.find((s) => s.toLowerCase().includes(q));
  if (exact) return exact;

  const tokenBased = sentences.find((s) => tokens.some((t) => t.length > 2 && s.toLowerCase().includes(t)));
  if (tokenBased) return tokenBased;

  if (!cleanContent) return "Empty note";
  return cleanContent.length > 220 ? `${cleanContent.slice(0, 220)}...` : cleanContent;
}

function toSearchResultNote(note: Note, query: string): SearchResultNote {
  return {
    id: note.id,
    title: note.title || "Untitled Note",
    content: note.content || "",
    matchedText: findMatchedSnippet(note.content || "", query),
    tags: Array.isArray(note.tags) ? note.tags : [],
    created_at: (note as any).created_at,
    updated_at: (note as any).updated_at,
  };
}

function parseAiJson(raw: string): NoteAiResult | null {
  if (!raw) return null;

  const cleaned = raw.replace(/```json|```/g, "").trim();
  const firstBrace = cleaned.indexOf("{");
  const lastBrace = cleaned.lastIndexOf("}");
  const jsonCandidate = firstBrace >= 0 && lastBrace > firstBrace
    ? cleaned.slice(firstBrace, lastBrace + 1)
    : cleaned;

  try {
    const parsed = JSON.parse(jsonCandidate);
    const answer = typeof parsed?.answer === "string" ? parsed.answer.trim() : "";
    const relevantNoteIds = Array.isArray(parsed?.relevantNoteIds)
      ? parsed.relevantNoteIds.filter((id: unknown) => typeof id === "string")
      : [];

    if (!answer) return null;
    return { answer, relevantNoteIds };
  } catch {
    return null;
  }
}

async function aiSearchAcrossLocalNotes(query: string, notes: Note[]): Promise<NoteAiResult | null> {
  if (!notes.length) return null;

  const maxCorpusChars = 26000;
  let usedChars = 0;

  const corpusChunks: string[] = [];
  for (const note of notes) {
    const title = (note.title || "Untitled Note").slice(0, 120);
    const content = stripMarkup(note.content || "").slice(0, 700);
    const tags = (Array.isArray(note.tags) ? note.tags : []).join(", ");
    const chunk = `ID:${note.id}\nTITLE:${title}\nTAGS:${tags}\nCONTENT:${content}`;

    if (usedChars + chunk.length > maxCorpusChars) break;
    corpusChunks.push(chunk);
    usedChars += chunk.length;
  }

  if (!corpusChunks.length) return null;

  const prompt = [
    "You are an AI note retrieval assistant.",
    "Use ONLY the provided notes to answer the question.",
    "Return STRICT JSON ONLY with this shape:",
    '{"answer":"short helpful answer","relevantNoteIds":["id1","id2"]}',
    "relevantNoteIds must contain only IDs from the provided notes.",
    "If information is missing, say that clearly in answer.",
    `QUESTION: ${query}`,
    "NOTES:",
    corpusChunks.join("\n\n---\n\n"),
  ].join("\n");

  try {
    const raw = await lumiChat(prompt);
    return parseAiJson(raw);
  } catch {
    return null;
  }
}

function rankLocalNotes(notes: Note[], query: string): SearchResultNote[] {
  const q = query.trim().toLowerCase();
  if (!q) return [];

  const tokens = q.split(/\s+/).filter(Boolean);

  const ranked = notes
    .map((note) => {
      const title = (note.title || "").toLowerCase();
      const content = (note.content || "").toLowerCase();
      const tags = (Array.isArray(note.tags) ? note.tags : []).map((t) => String(t).toLowerCase());

      let score = 0;
      if (title.includes(q)) score += 6;
      if (content.includes(q)) score += 5;
      if (tags.some((t) => t.includes(q))) score += 4;

      for (const token of tokens) {
        if (title.includes(token)) score += 2;
        if (content.includes(token)) score += 1;
        if (tags.some((t) => t.includes(token))) score += 1;
      }

      if (score === 0) return null;

      const sentences = (note.content || "")
        .split(/(?<=[.!?])\s+/)
        .map((s) => s.trim())
        .filter(Boolean);
      const matchedText =
        sentences.find((s) => s.toLowerCase().includes(q)) ||
        sentences.find((s) => tokens.some((t) => s.toLowerCase().includes(t))) ||
        stripMarkup(note.content || "").slice(0, 220);

      return {
        score,
        note: {
          id: note.id,
          title: note.title || "Untitled Note",
          content: note.content || "",
          matchedText: matchedText || "",
          tags: Array.isArray(note.tags) ? note.tags : [],
          created_at: (note as any).created_at,
          updated_at: (note as any).updated_at,
        } as SearchResultNote,
      };
    })
    .filter(Boolean)
    .sort((a, b) => (b as any).score - (a as any).score)
    .slice(0, 20)
    .map((item) => (item as any).note as SearchResultNote);

  return ranked;
}

export function AllNotes() {
  const { notes, searchQuery, setSearchQuery, addNote, deleteNote } = useNotes();
  const { user, session } = useAuth();
  const navigate = useNavigate();
  const [isChatbotOpen, setIsChatbotOpen] = useState(false);
  const [chatMode, setChatMode] = useState<ChatMode>("notes");
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([
    {
      role: "bot",
      text:
        "Hi! I can search your personal notes in Note Search Mode, or answer general questions in General Chat Mode.",
    },
  ]);
  const [chatInput, setChatInput] = useState("");
  const [isSendingMessage, setIsSendingMessage] = useState(false);

  const filteredNotes = useMemo(() => {
    return notes.filter(n => {
      const searchLower = searchQuery.toLowerCase();
      const titleMatch = n.title?.toLowerCase().includes(searchLower) ?? false;
      const contentMatch = n.content?.toLowerCase().includes(searchLower) ?? false;
      const tagsMatch = Array.isArray(n.tags) && n.tags.some(t => t?.toLowerCase().includes(searchLower));
      return titleMatch || contentMatch || tagsMatch;
    });
  }, [notes, searchQuery]);

  const handleAddNote = () => {
    addNote().then(id => navigate(`/home/editor/${id}`));
  };

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    const input = chatInput.trim();
    if (!input || isSendingMessage) return;

    setChatMessages(prev => [...prev, { role: "user", text: input }]);
    setChatInput("");
    setIsSendingMessage(true);

    if (!user || !session?.access_token) {
      setChatMessages(prev => [
        ...prev,
        {
          role: "bot",
          text: "Please sign in to use the assistant.",
        },
      ]);
      setIsSendingMessage(false);
      return;
    }

    const authHeaders = {
      "Content-Type": "application/json",
      Authorization: `Bearer ${session.access_token}`,
    };

    try {
      if (chatMode === "notes") {
        let localKeywordResults: SearchResultNote[] = [];

        try {
          const response = await fetch("/api/search-notes", {
            method: "POST",
            headers: authHeaders,
            body: JSON.stringify({ query: input, userId: user.id }),
          });

          const data = await parseApiResponse(response);
          if (response.ok && Array.isArray(data?.notes) && data.notes.length > 0) {
            localKeywordResults = data.notes as SearchResultNote[];
          }
        } catch {
          // Continue with local AI search path.
        }

        if (!localKeywordResults.length) {
          localKeywordResults = rankLocalNotes(notes, input);
        }

        const aiResult = await aiSearchAcrossLocalNotes(input, notes);

        let notesResult: SearchResultNote[] = localKeywordResults;
        if (aiResult?.relevantNoteIds?.length) {
          const byId = new Map(notes.map((n) => [n.id, n]));
          const aiNotes = aiResult.relevantNoteIds
            .map((id) => byId.get(id))
            .filter((n): n is Note => Boolean(n))
            .map((n) => toSearchResultNote(n, input));
          if (aiNotes.length) {
            notesResult = aiNotes;
          }
        }

        if (!notesResult.length) {
          notesResult = rankLocalNotes(notes, input);
        }

        const answerText = aiResult?.answer?.trim();

        if (notesResult.length > 0) {
          const noteCountLabel = `${notesResult.length} note${notesResult.length === 1 ? "" : "s"}`;
          setChatMessages(prev => [
            ...prev,
            {
              role: "bot",
              text: answerText
                ? `${answerText} I pulled ${noteCountLabel} from your notes that support this.`
                : `I reviewed your notes and found ${noteCountLabel} that relate to "${input}".`,
              notes: notesResult,
            },
          ]);
        } else {
          setChatMessages(prev => [
            ...prev,
            {
              role: "bot",
              text: answerText || `I looked through your notes but couldn't find a solid answer for "${input}" yet.`,
            },
          ]);
        }
        return;
      }

      const history = chatMessages
        .filter((m) => m.role === "user" || m.role === "bot")
        .slice(-8)
        .map((m) => ({ role: m.role === "bot" ? "assistant" : "user", content: m.text }));

      let replyText = "";
      let apiWorked = false;

      try {
        const response = await fetch("/api/chat", {
          method: "POST",
          headers: authHeaders,
          body: JSON.stringify({ message: input, userId: user.id, history }),
        });

        const data = await parseApiResponse(response);
        if (response.ok && typeof data?.content === "string" && data.content.trim()) {
          apiWorked = true;
          replyText = data.content;
        }
      } catch {
        // Fall back to client AI below.
      }

      if (!apiWorked) {
        const clientHistory = history
          .map((m) => ({
            role: m.role === "assistant" ? "assistant" : "user",
            content: m.content,
          }))
          .filter((m) => m.content);
        replyText = await lumiChat(input, clientHistory as any);
      }

      setChatMessages(prev => [
        ...prev,
        {
          role: "bot",
          text: replyText || "I could not generate a response right now.",
        },
      ]);
    } catch (error) {
      setChatMessages(prev => [
        ...prev,
        {
          role: "bot",
          text: error instanceof Error ? error.message : "Something went wrong while sending your message.",
        },
      ]);
    } finally {
      setIsSendingMessage(false);
    }
  };

  const getTagColor = (tag: string) => {
    const t = tag.toUpperCase();
    if (['RESEARCH', 'INSPIRATION'].includes(t)) return 'bg-blue-50 text-blue-600';
    if (['PLANNING', 'TEAM'].includes(t)) return 'bg-purple-50 text-purple-600';
    if (['TECH'].includes(t)) return 'bg-orange-50 text-orange-600';
    if (['PERSONAL'].includes(t)) return 'bg-green-50 text-green-600';
    if (['CREATIVE'].includes(t)) return 'bg-pink-50 text-pink-600';
    return 'bg-gray-100 text-gray-600';
  };

  const getTagTextColor = (tag: string) => {
    const t = tag.toUpperCase();
    if (['RESEARCH', 'INSPIRATION'].includes(t)) return 'text-blue-600';
    if (['PLANNING', 'TEAM'].includes(t)) return 'text-purple-600';
    if (['TECH'].includes(t)) return 'text-orange-600';
    if (['PERSONAL'].includes(t)) return 'text-green-600';
    if (['CREATIVE'].includes(t)) return 'text-pink-600';
    return 'text-gray-500';
  };

  const getNotePreview = (content: string) => {
    return getCleanPreview(content);
  };

  const getNoteDate = (note: Partial<Note>) => {
    const raw = (note as any).updated_at || (note as any).created_at || (note as any).updatedAt || (note as any).createdAt;
    const d = raw ? new Date(raw) : null;
    return d && !Number.isNaN(d.getTime()) ? d : new Date();
  };

  return (
    <div className="relative flex h-full w-full max-w-[1760px] flex-col p-4 sm:p-6 lg:p-8 min-[1440px]:p-10">
      
      {/* Header Area */}
      <div className="mb-6 flex flex-col gap-4 sm:mb-8 md:flex-row md:items-end md:justify-between">
        <div>
          <h1 className="mb-1 text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">All Notes</h1>
          <p className="text-slate-500 font-medium">{filteredNotes.length} notes found in your library</p>
        </div>
        
        <div className="flex w-full flex-col items-stretch gap-3 sm:flex-row sm:items-center md:w-auto">
          <div className="relative flex-1 sm:min-w-[18rem] md:w-80">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search notes..."
              className="min-h-11 w-full rounded-xl border border-transparent bg-[var(--color-background)] py-3 pl-11 pr-4 font-medium text-[var(--color-text-primary)] placeholder-slate-400 transition-all focus:border-[var(--color-primary)] focus:bg-[var(--color-surface)] focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]/20"
            />
          </div>
          <button className="flex min-h-11 shrink-0 items-center justify-center gap-2 rounded-xl border border-slate-200/50 bg-[var(--color-surface)] px-4 py-2.5 font-semibold text-[var(--color-text-primary)] shadow-sm transition-colors hover:bg-[var(--color-background)]">
            <Filter size={18} />
            <span className="hidden sm:inline">Filter</span>
          </button>
        </div>
      </div>

      {/* Grid Area */}
      {/* Responsive grid: 1 col mobile, 2 at >=480, 3 at >=1024, 4 at >=1440. */}
      <div className="scrollbar-hide grid flex-1 grid-cols-1 gap-4 overflow-y-auto pb-28 pr-1 min-[480px]:grid-cols-2 sm:gap-5 lg:grid-cols-3 lg:gap-6 lg:pb-8 min-[1440px]:grid-cols-4">
        {filteredNotes.length > 0 ? (
          filteredNotes.map((note, index) => (
            <Link
              key={note.id}
              to={`/home/editor/${note.id}`}
              className="group flex min-h-[260px] flex-col rounded-3xl border border-slate-200/50 bg-[var(--color-surface)] p-5 shadow-[0px_4px_24px_rgba(0,0,0,0.02)] transition-all duration-300 hover:-translate-y-1 hover:shadow-[0px_8px_32px_rgba(0,0,0,0.06)] sm:p-6"
            >
              {/* Note Content Preview (Replaces Photo) */}
              <div className="w-full h-24 mb-5 flex flex-col justify-start">
                 <p className="text-[var(--color-text-secondary)] text-[15px] font-serif leading-relaxed italic line-clamp-3">
                   "{getNotePreview(note.content)}"
                 </p>
              </div>

              <div className="flex-1 flex flex-col">
                <h3 className="font-bold text-[var(--color-text-primary)] text-[17px] leading-snug line-clamp-2 mb-3">
                  {note.title || "Untitled Note"}
                </h3>
                
                {/* Tags */}
                <div className="flex flex-wrap gap-2 mb-4">
                  {Array.isArray(note.tags) && note.tags.map(tag => (
                    <span 
                      key={tag} 
                      className={`text-[10px] font-bold px-2.5 py-1 rounded tracking-wider ${getTagColor(tag)}`}
                    >
                      {tag.toUpperCase()}
                    </span>
                  ))}
                  {(!Array.isArray(note.tags) || note.tags.length === 0) && (
                     <span className="text-[10px] font-bold px-2.5 py-1 rounded tracking-wider bg-slate-100 text-slate-400">UNTAGGED</span>
                  )}
                </div>
                
                <div className="flex items-center justify-between mt-auto pt-4 border-t border-slate-50">
                  <span className="text-xs text-slate-400 font-medium">
                    Last edited {formatDistanceToNow(getNoteDate(note))} ago
                  </span>
                  <div className="flex items-center gap-2">
                    {index === 0 && <Pin size={14} className="text-slate-400" />}
                    {index === 3 && <Star size={14} className="text-blue-500" fill="currentColor" />}
                    <button 
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        deleteNote(note.id);
                      }}
                      className="p-1.5 ml-1 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-md transition-all opacity-0 group-hover:opacity-100"
                      title="Delete Note"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                </div>
              </div>
            </Link>
          ))
        ) : (
          <div className="col-span-full flex flex-col items-center justify-center py-20 text-center bg-[var(--color-surface)] rounded-3xl border border-dashed border-slate-200/50">
            <div className="w-16 h-16 bg-[var(--color-background)] rounded-2xl flex items-center justify-center mb-4">
              <FileText size={24} className="text-[var(--color-text-secondary)]" />
            </div>
            <h3 className="text-lg font-bold text-[var(--color-text-primary)] mb-1">No notes found</h3>
            <p className="text-[var(--color-text-secondary)] text-sm font-medium">Try adjusting your search terms.</p>
          </div>
        )}
      </div>

      {/* Floating Add Note Button (Bottom Right) */}
      <button 
        onClick={handleAddNote}
        className="fixed bottom-28 right-4 z-20 flex h-14 w-14 items-center justify-center rounded-full bg-[var(--color-primary)] text-white shadow-lg transition-all hover:scale-105 hover:brightness-110 sm:right-6 lg:bottom-10 lg:right-10"
      >
        <Plus size={24} />
      </button>

      {/* Chatbot Floating Button */}
      <button 
        onClick={() => setIsChatbotOpen(true)}
        className="fixed bottom-28 right-20 z-20 flex h-14 w-14 items-center justify-center rounded-full border border-slate-200/50 bg-[var(--color-surface)] text-[var(--color-text-primary)] shadow-lg transition-all hover:scale-105 hover:bg-[var(--color-background)] sm:right-24 lg:bottom-10 lg:right-28"
      >
        <Bot size={24} className="text-[var(--color-primary)]" />
      </button>

      {/* Chatbot Drawer/Popover */}
      <AnimatePresence>
        {isChatbotOpen && (
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.95 }}
            transition={{ duration: 0.2 }}
            className="fixed bottom-28 right-3 z-30 flex w-[min(24rem,calc(100vw-1.5rem))] flex-col overflow-hidden rounded-2xl border border-slate-200/50 bg-[var(--color-surface)] shadow-2xl sm:right-6 sm:w-96 lg:bottom-28 lg:right-10"
            style={{ height: '500px', maxHeight: 'calc(100vh - 120px)' }}
          >
            {/* Header */}
            <div className="flex items-center justify-between p-4 bg-[var(--color-background)] border-b border-slate-200/50">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-[var(--color-primary)]/10 flex items-center justify-center">
                  <Bot size={18} className="text-[var(--color-primary)]" />
                </div>
                <div>
                  <h3 className="font-bold text-[var(--color-text-primary)] text-sm">Luminote AI</h3>
                  <div className="flex items-center gap-1.5">
                    <div className="w-2 h-2 rounded-full bg-green-500"></div>
                    <p className="text-[10px] text-[var(--color-text-secondary)] font-medium">Online</p>
                  </div>
                </div>
              </div>
              <button 
                onClick={() => setIsChatbotOpen(false)}
                className="w-8 h-8 rounded-full flex items-center justify-center text-[var(--color-text-secondary)] hover:bg-[var(--color-background)] transition-colors"
              >
                <X size={18} />
              </button>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-[var(--color-surface)]">
              {chatMessages.map((msg, i) => (
                <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                  <div 
                    className={`max-w-[85%] rounded-2xl px-4 py-2.5 text-sm ${
                      msg.role === 'user' 
                        ? 'bg-[var(--color-primary)] text-white rounded-tr-sm' 
                        : 'bg-[var(--color-background)] text-[var(--color-text-primary)] rounded-tl-sm'
                    }`}
                  >
                    <p>{msg.text}</p>

                    {msg.role === "bot" && msg.notes && msg.notes.length > 0 && (
                      <div className="mt-3 space-y-2">
                        {msg.notes.map((result) => (
                          <Link
                            key={result.id}
                            to={`/home/editor/${result.id}`}
                            className="block rounded-xl border border-slate-200/60 bg-white px-3 py-2.5 transition-colors hover:bg-slate-50"
                          >
                            <p className="text-xs font-semibold text-[var(--color-text-primary)]">{result.title || "Untitled Note"}</p>
                            <p className="mt-1 text-xs leading-relaxed text-[var(--color-text-secondary)] line-clamp-3">
                              {getCleanPreview(result.matchedText || "") || "No matching excerpt available."}
                            </p>
                            <div className="mt-2 flex items-center justify-between gap-2">
                              <span className="text-[10px] text-slate-400">
                                Updated {formatDistanceToNow(getNoteDate(result))} ago
                              </span>
                              {Array.isArray(result.tags) && result.tags.length > 0 && (
                                <span className={`text-[10px] font-semibold uppercase ${getTagTextColor(result.tags[0])}`}>
                                  {result.tags[0]}
                                </span>
                              )}
                            </div>
                          </Link>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>

            {/* Input Area */}
            <div className="p-4 border-t border-slate-200/50 bg-[var(--color-surface)]">
              <div className="mb-3 grid grid-cols-2 rounded-full bg-[var(--color-background)] p-1">
                <button
                  type="button"
                  onClick={() => setChatMode("notes")}
                  className={`rounded-full px-3 py-1.5 text-xs font-semibold transition-all ${
                    chatMode === "notes"
                      ? "bg-[var(--color-primary)] text-white"
                      : "text-[var(--color-text-secondary)]"
                  }`}
                >
                  Ask About Notes
                </button>
                <button
                  type="button"
                  onClick={() => setChatMode("general")}
                  className={`rounded-full px-3 py-1.5 text-xs font-semibold transition-all ${
                    chatMode === "general"
                      ? "bg-[var(--color-primary)] text-white"
                      : "text-[var(--color-text-secondary)]"
                  }`}
                >
                  Ask Me Anything
                </button>
              </div>

              <form onSubmit={handleSendMessage} className="flex items-center gap-2">
                <input 
                  type="text"
                  value={chatInput}
                  onChange={(e) => setChatInput(e.target.value)}
                  placeholder={chatMode === "notes" ? "Ask about notes..." : "Ask me anything..."}
                  className="flex-1 bg-[var(--color-background)] border border-slate-200/50 rounded-full px-4 py-2 text-sm text-[var(--color-text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]/20 focus:border-[var(--color-primary)] transition-all"
                />
                <button 
                  type="submit"
                  disabled={!chatInput.trim() || isSendingMessage}
                  className="w-9 h-9 rounded-full bg-[var(--color-primary)] text-white flex items-center justify-center disabled:opacity-50 transition-opacity"
                >
                  <Send size={16} className="ml-1" />
                </button>
              </form>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

    </div>
  );
}
