import React, { useState, useMemo } from "react";
import { Link } from "react-router";
import { Search as SearchIcon, Filter, X, Hash, MoreVertical, FileText, Calendar as CalendarIcon, Pin, Star } from "lucide-react";
import { format } from "date-fns";
import { useNotes, Note } from "./NotesContext";

export function Search() {
  const { notes, searchQuery, setSearchQuery } = useNotes();
  const [activeFilters, setActiveFilters] = useState<string[]>([]);

  // Extract all unique tags
  const allTags = useMemo(() => {
    const tags = new Set<string>();
    notes.forEach(note => note.tags.forEach(t => tags.add(t)));
    return Array.from(tags);
  }, [notes]);

  const toggleFilter = (tag: string) => {
    setActiveFilters(prev => 
      prev.includes(tag) ? prev.filter(t => t !== tag) : [...prev, tag]
    );
  };

  const filteredNotes = useMemo(() => {
    return notes.filter(n => {
      const matchesSearch = n.title.toLowerCase().includes(searchQuery.toLowerCase()) || 
                            n.content.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesFilters = activeFilters.length === 0 || activeFilters.every(tag => n.tags.includes(tag));
      return matchesSearch && matchesFilters;
    });
  }, [notes, searchQuery, activeFilters]);

  const NoteResult = ({ note }: { note: Note }) => (
    <Link to={`/home/editor/${note.id}`} className="flex items-start gap-5 p-5 bg-white rounded-3xl border border-gray-100 shadow-[0_4px_24px_rgba(0,0,0,0.02)] hover:shadow-[0_8px_32px_rgba(0,0,0,0.06)] hover:-translate-y-1 transition-all duration-300 group">
      <div className="w-14 h-14 rounded-2xl bg-gray-50 text-gray-400 group-hover:bg-blue-50 group-hover:text-blue-500 flex items-center justify-center flex-shrink-0 transition-colors">
        <FileText size={24} />
      </div>
      <div className="flex-1 min-w-0 py-1">
        <div className="flex items-start justify-between gap-4 mb-2">
           <h3 className="font-bold text-gray-900 text-lg truncate">{note.title || "Untitled Note"}</h3>
           <div className="flex items-center gap-3 shrink-0">
             <span className="text-xs font-semibold text-gray-400">{format(new Date(note.updatedAt), "MMM d")}</span>
             <button className="text-gray-300 hover:text-gray-900 transition-colors">
               <MoreVertical size={18} />
             </button>
           </div>
        </div>
        <p className="text-sm text-gray-500 line-clamp-2 leading-relaxed mb-4 font-serif">{note.content.replace(/[#*`]/g, "")}</p>
        
        <div className="flex flex-wrap gap-2">
          {note.tags.map(tag => (
            <span key={tag} className="flex items-center gap-1.5 text-[11px] font-bold tracking-wider uppercase bg-gray-50 border border-gray-100 text-gray-500 px-3 py-1.5 rounded-lg">
              {tag}
            </span>
          ))}
        </div>
      </div>
    </Link>
  );

  return (
    <div className="h-full flex flex-col max-w-[900px] mx-auto w-full p-4 md:p-10">
      {/* Header */}
      <header className="mb-8">
        <h1 className="text-4xl font-bold tracking-tight text-gray-900 mb-3">Search & Filter</h1>
        <p className="text-gray-500 font-medium text-lg">Find what you need across all your workspace.</p>
      </header>

      {/* Search Input */}
      <div className="relative mb-8 group">
        <div className="relative bg-white border border-gray-200 rounded-[24px] flex items-center shadow-[0_8px_32px_rgba(0,0,0,0.04)] focus-within:ring-4 focus-within:ring-[var(--color-primary)]/10 focus-within:border-[var(--color-primary)]/30 transition-all">
          <SearchIcon className="ml-6 text-gray-400 group-focus-within:text-[var(--color-primary)] transition-colors" size={24} />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search notes, tags, content..."
            className="flex-1 py-5 px-5 text-lg bg-transparent border-none outline-none text-gray-900 placeholder-gray-400 font-medium"
            autoFocus
          />
          {searchQuery && (
            <button 
              onClick={() => setSearchQuery("")}
              className="mr-5 w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center text-gray-500 hover:bg-gray-200 transition-colors"
            >
              <X size={16} strokeWidth={3} />
            </button>
          )}
        </div>
      </div>

      {/* Filters */}
      <div className="mb-10">
        <div className="flex items-center gap-3 mb-4">
          <Filter size={18} className="text-gray-400" />
          <h3 className="text-sm font-bold text-gray-900 uppercase tracking-wider">Quick Filters</h3>
        </div>
        
        <div className="flex flex-wrap gap-3">
          {allTags.map(tag => {
            const isActive = activeFilters.includes(tag);
            return (
              <button
                key={tag}
                onClick={() => toggleFilter(tag)}
                className={`px-5 py-2.5 rounded-xl text-sm font-bold transition-all flex items-center gap-2 border ${
                  isActive 
                    ? "bg-[var(--color-primary)] text-white border-[var(--color-primary)] shadow-[0_4px_16px_rgba(79,126,255,0.3)]" 
                    : "bg-white text-gray-600 border-gray-200 hover:border-gray-300 hover:bg-gray-50 shadow-sm"
                }`}
              >
                {isActive ? <Check size={16} /> : <Hash size={16} className="text-gray-400" />} {tag}
              </button>
            );
          })}
        </div>
      </div>

      {/* Results */}
      <div className="flex-1 overflow-y-auto pb-8 pr-2 scrollbar-hide">
        <div className="flex items-center justify-between mb-6">
           <h2 className="text-xl font-bold text-gray-900">
             Results
           </h2>
           <span className="text-sm font-semibold text-gray-500 bg-gray-100 px-3 py-1 rounded-lg">{filteredNotes.length} found</span>
        </div>
        
        {filteredNotes.length > 0 ? (
          <div className="space-y-4">
            {filteredNotes.map(note => <NoteResult key={note.id} note={note} />)}
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center py-24 text-center bg-white rounded-[32px] border border-dashed border-gray-200">
            <div className="w-20 h-20 bg-gray-50 rounded-[24px] flex items-center justify-center mb-6">
              <SearchIcon size={32} className="text-gray-300" />
            </div>
            <h3 className="text-2xl font-bold text-gray-900 mb-2">No matches found</h3>
            <p className="text-gray-500 font-medium text-lg max-w-md mx-auto">
              We couldn't find any notes matching your criteria. Try adjusting your search or filters.
            </p>
            {(searchQuery || activeFilters.length > 0) && (
              <button 
                onClick={() => { setSearchQuery(""); setActiveFilters([]); }}
                className="mt-8 px-8 py-3.5 bg-gray-900 text-white rounded-2xl font-bold hover:bg-gray-800 transition-colors shadow-lg active:scale-95"
              >
                Clear all filters
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
