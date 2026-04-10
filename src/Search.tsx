import React, { useState, useMemo } from "react";
import { Link } from "react-router";
import { Search as SearchIcon, Filter, X, Hash, MoreVertical, FileText, Calendar as CalendarIcon, Pin, Star, Check } from "lucide-react";
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
    <Link to={`/home/editor/${note.id}`} className="group flex flex-col gap-4 rounded-3xl border border-gray-100 bg-white p-4 shadow-[0_4px_24px_rgba(0,0,0,0.02)] transition-all duration-300 hover:-translate-y-1 hover:shadow-[0_8px_32px_rgba(0,0,0,0.06)] sm:flex-row sm:items-start sm:gap-5 sm:p-5">
      <div className="flex h-14 w-14 flex-shrink-0 items-center justify-center rounded-2xl bg-gray-50 text-gray-400 transition-colors group-hover:bg-blue-50 group-hover:text-blue-500">
        <FileText size={24} />
      </div>
      <div className="flex-1 min-w-0 py-1">
        <div className="mb-2 flex flex-wrap items-start justify-between gap-2 sm:gap-4">
           <h3 className="font-bold text-gray-900 text-lg truncate">{note.title || "Untitled Note"}</h3>
           <div className="flex items-center gap-3 shrink-0">
             <span className="text-xs font-semibold text-gray-400">{format(new Date(note.updatedAt), "MMM d")}</span>
             <button className="min-h-11 text-gray-300 transition-colors hover:text-gray-900">
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
    <div className="mx-auto flex h-full w-full max-w-[1100px] flex-col p-4 sm:p-6 lg:p-8 min-[1440px]:max-w-[1320px] min-[1440px]:p-10">
      {/* Header */}
      <header className="mb-6 sm:mb-8">
        <h1 className="mb-2 text-3xl font-bold tracking-tight text-gray-900 sm:mb-3 sm:text-4xl">Search & Filter</h1>
        <p className="text-base font-medium text-gray-500 sm:text-lg">Find what you need across all your workspace.</p>
      </header>

      {/* Search Input */}
      <div className="group relative mb-6 sm:mb-8">
        <div className="relative flex items-center rounded-[20px] border border-gray-200 bg-white shadow-[0_8px_32px_rgba(0,0,0,0.04)] transition-all focus-within:border-[var(--color-primary)]/30 focus-within:ring-4 focus-within:ring-[var(--color-primary)]/10 sm:rounded-[24px]">
          <SearchIcon className="ml-4 text-gray-400 transition-colors group-focus-within:text-[var(--color-primary)] sm:ml-6" size={22} />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search notes, tags, content..."
            className="flex-1 border-none bg-transparent px-4 py-4 text-base font-medium text-gray-900 placeholder-gray-400 outline-none sm:px-5 sm:py-5 sm:text-lg"
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
      <div className="mb-8 sm:mb-10">
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
                className={`flex min-h-11 items-center gap-2 rounded-xl border px-4 py-2.5 text-sm font-bold transition-all sm:px-5 ${
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
      <div className="scrollbar-hide flex-1 overflow-y-auto pb-8 pr-1 sm:pr-2">
        <div className="mb-5 flex flex-wrap items-center justify-between gap-2 sm:mb-6">
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
          <div className="flex flex-col items-center justify-center rounded-[24px] border border-dashed border-gray-200 bg-white px-4 py-16 text-center sm:rounded-[32px] sm:py-24">
            <div className="w-20 h-20 bg-gray-50 rounded-[24px] flex items-center justify-center mb-6">
              <SearchIcon size={32} className="text-gray-300" />
            </div>
            <h3 className="mb-2 text-xl font-bold text-gray-900 sm:text-2xl">No matches found</h3>
            <p className="mx-auto max-w-md text-base font-medium text-gray-500 sm:text-lg">
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
