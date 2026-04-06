import React, { useState, useMemo } from "react";
import { Link, useNavigate } from "react-router";
import { Search, Filter, Pin, Star, Plus, MessageSquare, X, Send, Bot, FileText, Trash2 } from "lucide-react";
import { useNotes, Note } from "./NotesContext";
import { formatDistanceToNow } from "date-fns";
import { motion, AnimatePresence } from "motion/react";

export function AllNotes() {
  const { notes, searchQuery, setSearchQuery, addNote, deleteNote } = useNotes();
  const navigate = useNavigate();
  const [isChatbotOpen, setIsChatbotOpen] = useState(false);
  const [chatMessages, setChatMessages] = useState<{role: 'user' | 'bot', text: string}[]>([
    { role: 'bot', text: "Hi! I'm your Luminote Assistant. I can help you find notes, summarize concepts, or create new tags based on your notes." }
  ]);
  const [chatInput, setChatInput] = useState("");

  const filteredNotes = useMemo(() => {
    return notes.filter(n =>
      n.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      n.content.toLowerCase().includes(searchQuery.toLowerCase()) ||
      n.tags.some(t => t.toLowerCase().includes(searchQuery.toLowerCase()))
    );
  }, [notes, searchQuery]);

  const handleAddNote = () => {
    addNote().then(id => navigate(`/home/editor/${id}`));
  };

  const handleSendMessage = (e: React.FormEvent) => {
    e.preventDefault();
    if (!chatInput.trim()) return;
    
    setChatMessages(prev => [...prev, { role: 'user', text: chatInput }]);
    const input = chatInput;
    setChatInput("");
    
    // Fake bot response
    setTimeout(() => {
      setChatMessages(prev => [...prev, { 
        role: 'bot', 
        text: `I understand you're asking about "${input}". I'm still learning how to process your specific notes, but I'm here to help with general questions!` 
      }]);
    }, 1000);
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

  const getNotePreview = (content: string) => {
    // Return a short sentence
    const cleanContent = content.replace(/[#*`\n]/g, " ").trim();
    if (!cleanContent) return "Empty note";
    return cleanContent.length > 80 ? cleanContent.substring(0, 80) + '...' : cleanContent;
  };

  const getNoteDate = (note: Note) => {
    const raw = (note as any).updated_at || (note as any).created_at || (note as any).updatedAt || (note as any).createdAt;
    const d = raw ? new Date(raw) : null;
    return d && !Number.isNaN(d.getTime()) ? d : new Date();
  };

  return (
    <div className="h-full flex flex-col p-6 md:p-10 max-w-[1400px] mx-auto w-full relative">
      
      {/* Header Area */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-8">
        <div>
          <h1 className="text-3xl font-bold text-slate-900 tracking-tight mb-2">All Notes</h1>
          <p className="text-slate-500 font-medium">{filteredNotes.length} notes found in your library</p>
        </div>
        
        <div className="flex items-center gap-3 w-full md:w-auto">
          <div className="relative flex-1 md:w-80">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search notes..."
              className="w-full pl-11 pr-4 py-2.5 bg-[var(--color-background)] border border-transparent rounded-xl text-[var(--color-text-primary)] placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]/20 focus:border-[var(--color-primary)] focus:bg-[var(--color-surface)] transition-all font-medium"
            />
          </div>
          <button className="flex items-center justify-center gap-2 px-4 py-2.5 bg-[var(--color-surface)] border border-slate-200/50 rounded-xl text-[var(--color-text-primary)] font-semibold hover:bg-[var(--color-background)] transition-colors shadow-sm shrink-0">
            <Filter size={18} />
            <span className="hidden sm:inline">Filter</span>
          </button>
        </div>
      </div>

      {/* Grid Area */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 pb-24 md:pb-8 flex-1 overflow-y-auto pr-2 scrollbar-hide">
        {filteredNotes.length > 0 ? (
          filteredNotes.map((note, index) => (
            <Link
              key={note.id}
              to={`/home/editor/${note.id}`}
              className="group bg-[var(--color-surface)] rounded-3xl p-6 shadow-[0px_4px_24px_rgba(0,0,0,0.02)] border border-slate-200/50 hover:shadow-[0px_8px_32px_rgba(0,0,0,0.06)] hover:-translate-y-1 transition-all duration-300 flex flex-col h-[280px]"
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
                  {note.tags.map(tag => (
                    <span 
                      key={tag} 
                      className={`text-[10px] font-bold px-2.5 py-1 rounded tracking-wider ${getTagColor(tag)}`}
                    >
                      {tag.toUpperCase()}
                    </span>
                  ))}
                  {note.tags.length === 0 && (
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
        className="fixed bottom-24 right-6 md:bottom-10 md:right-10 w-14 h-14 bg-[var(--color-primary)] text-white rounded-full flex items-center justify-center shadow-lg hover:brightness-110 hover:scale-105 transition-all z-20"
      >
        <Plus size={24} />
      </button>

      {/* Chatbot Floating Button */}
      <button 
        onClick={() => setIsChatbotOpen(true)}
        className="fixed bottom-24 right-24 md:bottom-10 md:right-28 w-14 h-14 bg-[var(--color-surface)] text-[var(--color-text-primary)] border border-slate-200/50 rounded-full flex items-center justify-center shadow-lg hover:bg-[var(--color-background)] hover:scale-105 transition-all z-20"
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
            className="fixed bottom-24 right-6 md:bottom-28 md:right-10 w-80 sm:w-96 bg-[var(--color-surface)] rounded-2xl shadow-2xl border border-slate-200/50 z-30 flex flex-col overflow-hidden"
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
                    {msg.text}
                  </div>
                </div>
              ))}
            </div>

            {/* Input Area */}
            <div className="p-4 border-t border-slate-200/50 bg-[var(--color-surface)]">
              <form onSubmit={handleSendMessage} className="flex items-center gap-2">
                <input 
                  type="text"
                  value={chatInput}
                  onChange={(e) => setChatInput(e.target.value)}
                  placeholder="Ask me anything..."
                  className="flex-1 bg-[var(--color-background)] border border-slate-200/50 rounded-full px-4 py-2 text-sm text-[var(--color-text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]/20 focus:border-[var(--color-primary)] transition-all"
                />
                <button 
                  type="submit"
                  disabled={!chatInput.trim()}
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
