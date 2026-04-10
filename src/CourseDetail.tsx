import React, { useEffect, useMemo, useState } from "react";
import { useParams, useNavigate } from "react-router";
import {
  ArrowLeft, Plus, Folder, FileText, Trash2, Edit2, X, FolderPlus, Search, ArrowUpDown, Brush
} from "lucide-react";
import { useAuth } from "./AuthContext";
import { useNotes } from "./NotesContext";
import { getCleanPreview } from "./utils";
import { supabase } from "./supabaseClient";

interface Note {
  id: string;
  title: string;
  content: string;
  updatedAt?: string;
}

interface Folder {
  id: string;
  name: string;
  notes: string[]; // Array of note IDs
  createdAt: Date;
}

export function CourseDetail() {
  const navigate = useNavigate();
  const { courseId } = useParams();
  const { user } = useAuth();
  const { notes: allNotes, addNoteForCourse } = useNotes();
  const noteCourseStorageKey = user ? `luminote-note-course-map-${user.id}` : "luminote-note-course-map-guest";
  
  // Get course from localStorage or passed state
  const [courseData, setCourseData] = useState<any>(() => {
    const saved = localStorage.getItem(`course-${courseId}`);
    return saved ? JSON.parse(saved) : {
      code: "CS101",
      title: "Computer Science 101",
      subtitle: "Introduction to CS"
    };
  });

  const [folders, setFolders] = useState<Folder[]>(() => {
    const saved = localStorage.getItem(`folders-${courseId}`);
    return saved ? JSON.parse(saved) : [];
  });

  const [notes, setNotes] = useState<Note[]>(() => {
    const saved = localStorage.getItem(`notes-${courseId}`);
    return saved ? JSON.parse(saved) : [];
  });

  const [isAddFolderOpen, setIsAddFolderOpen] = useState(false);
  const [newFolderName, setNewFolderName] = useState("");
  const [draggedNote, setDraggedNote] = useState<string | null>(null);
  const [editingFolderId, setEditingFolderId] = useState<string | null>(null);
  const [editingFolderName, setEditingFolderName] = useState("");
  const [noteSearchQuery, setNoteSearchQuery] = useState("");
  const [noteSort, setNoteSort] = useState<"last-edited" | "name-asc">("last-edited");
  const [isEmptyDropZoneActive, setIsEmptyDropZoneActive] = useState(false);

  useEffect(() => {
    if (!user?.id || !courseId) return;

    const loadCourse = async () => {
      const { data } = await supabase
        .from("user_courses")
        .select("id, code, title, subtitle")
        .eq("id", courseId)
        .eq("user_id", user.id)
        .maybeSingle();

      if (!data) return;

      setCourseData((prev: any) => ({
        ...prev,
        ...(data as any),
      }));
      localStorage.setItem(`course-${courseId}`, JSON.stringify(data));
    };

    void loadCourse();
  }, [courseId, user?.id]);

  const backendLinkedNotes = useMemo<Note[]>(() => {
    if (!courseId) return [];

    return allNotes
      .filter((n) => n.course_id === courseId)
      .map((n) => ({
        id: n.id,
        title: n.title || "Untitled Note",
        content: n.content || "",
        updatedAt: (n as any).updated_at || (n as any).created_at,
      }));
  }, [allNotes, courseId]);

  const locallyMappedNotes = useMemo<Note[]>(() => {
    if (!courseId) return [];

    try {
      const raw = localStorage.getItem(noteCourseStorageKey);
      const mapping = raw ? JSON.parse(raw) : {};
      if (!mapping || typeof mapping !== "object") return [];

      return allNotes
        .filter((n) => typeof (mapping as any)[n.id] === "string" && (mapping as any)[n.id] === courseId)
        .map((n) => ({
          id: n.id,
          title: n.title || "Untitled Note",
          content: n.content || "",
          updatedAt: (n as any).updated_at || (n as any).created_at,
        }));
    } catch {
      return [];
    }
  }, [allNotes, courseId, noteCourseStorageKey]);

  const mergedNotes = useMemo<Note[]>(() => {
    const byId = new Map<string, Note>();

    for (const item of backendLinkedNotes) {
      byId.set(item.id, item);
    }
    for (const item of locallyMappedNotes) {
      if (!byId.has(item.id)) byId.set(item.id, item);
    }
    for (const item of notes) {
      if (!byId.has(item.id)) byId.set(item.id, item);
    }

    return Array.from(byId.values());
  }, [backendLinkedNotes, locallyMappedNotes, notes]);

  // Save to localStorage
  const saveFolders = (newFolders: Folder[]) => {
    setFolders(newFolders);
    localStorage.setItem(`folders-${courseId}`, JSON.stringify(newFolders));
  };

  const saveNotes = (newNotes: Note[]) => {
    setNotes(newNotes);
    localStorage.setItem(`notes-${courseId}`, JSON.stringify(newNotes));
  };

  const createFolder = () => {
    if (!newFolderName.trim()) return;
    const newFolder: Folder = {
      id: Date.now().toString(),
      name: newFolderName.trim(),
      notes: [],
      createdAt: new Date()
    };
    saveFolders([...folders, newFolder]);
    setNewFolderName("");
    setIsAddFolderOpen(false);
  };

  const deleteFolder = (folderId: string) => {
    saveFolders(folders.filter(f => f.id !== folderId));
  };

  const updateFolderName = (folderId: string) => {
    if (!editingFolderName.trim()) return;
    saveFolders(folders.map(f => f.id === folderId ? {...f, name: editingFolderName.trim()} : f));
    setEditingFolderId(null);
    setEditingFolderName("");
  };

  const addNoteToFolder = (folderId: string, noteId: string) => {
    saveFolders(folders.map(f => {
      if (f.id === folderId && !f.notes.includes(noteId)) {
        return {...f, notes: [...f.notes, noteId]};
      }
      return f;
    }));
    setDraggedNote(null);
  };

  const removeNoteFromFolder = (folderId: string, noteId: string) => {
    saveFolders(folders.map(f => f.id === folderId ? {...f, notes: f.notes.filter(n => n !== noteId)} : f));
  };

  const unassignedNotes = mergedNotes.filter(note => !folders.some(f => f.notes.includes(note.id)));

  const visibleUnassignedNotes = useMemo(() => {
    const query = noteSearchQuery.trim().toLowerCase();

    const filtered = unassignedNotes.filter((note) => {
      if (!query) return true;
      return note.title.toLowerCase().includes(query) || note.content.toLowerCase().includes(query);
    });

    return [...filtered].sort((a, b) => {
      if (noteSort === "name-asc") {
        return a.title.localeCompare(b.title);
      }

      const aDate = a.updatedAt ? new Date(a.updatedAt).getTime() : 0;
      const bDate = b.updatedAt ? new Date(b.updatedAt).getTime() : 0;
      return bDate - aDate;
    });
  }, [unassignedNotes, noteSearchQuery, noteSort]);

  const getNoteTimestamp = (note: Note) => {
    if (!note.updatedAt) return "Last edited: Unknown";

    const edited = new Date(note.updatedAt);
    if (Number.isNaN(edited.getTime())) return "Last edited: Unknown";

    return `Last edited: ${edited.toLocaleDateString(undefined, {
      month: "short",
      day: "numeric",
      year: "numeric",
    })}`;
  };

  const getNotePreviewLabel = (content: string) => {
    if (!content?.trim()) return "Empty note";
    if (content.includes("LUMINOTE_DRAW")) return "Drawing note";
    return "Text note";
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100">
      {/* Header */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 md:px-8 py-6">
          <div className="flex items-start justify-between mb-4">
            <button
              onClick={() => navigate(-1)}
              className="flex items-center gap-2 px-3 py-2 text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
            >
              <ArrowLeft className="w-5 h-5" />
              Back
            </button>
            <button
              onClick={() => courseId && addNoteForCourse(courseId).then(noteId => navigate(`/home/editor/${noteId}`))}
              className="flex items-center gap-2 px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white font-semibold rounded-lg transition-colors"
            >
              <Plus className="w-5 h-5" />
              New Note
            </button>
          </div>
          <div>
            <div className="text-xs font-bold text-slate-400 tracking-wider mb-2 uppercase">{courseData.code}</div>
            <h1 className="text-4xl font-bold text-slate-900 mb-2">{courseData.title}</h1>
            <p className="text-slate-600">{courseData.subtitle}</p>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 md:px-8 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          
          {/* Unassigned Notes - Left Column */}
          <div className="lg:col-span-1">
            <div className="bg-white rounded-2xl border border-slate-200 p-6 sticky top-24">
              <h2 className="text-lg font-bold text-slate-800 mb-4 flex items-center gap-2">
                <FileText className="w-5 h-5 text-amber-500" />
                Unassigned Notes
              </h2>

              <div className="space-y-3 mb-4">
                <div className="relative">
                  <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                  <input
                    type="text"
                    value={noteSearchQuery}
                    onChange={(e) => setNoteSearchQuery(e.target.value)}
                    placeholder="Search notes"
                    className="w-full h-9 pl-9 pr-3 rounded-lg border border-slate-200 bg-slate-50 text-sm text-slate-700 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-200 focus:border-blue-300"
                  />
                </div>

                <div className="relative">
                  <ArrowUpDown className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                  <select
                    value={noteSort}
                    onChange={(e) => setNoteSort(e.target.value as "last-edited" | "name-asc")}
                    className="w-full h-9 pl-9 pr-3 rounded-lg border border-slate-200 bg-slate-50 text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-200 focus:border-blue-300 appearance-none"
                  >
                    <option value="last-edited">Sort: Last Edited</option>
                    <option value="name-asc">Sort: Name A-Z</option>
                  </select>
                </div>
              </div>
              
              {visibleUnassignedNotes.length === 0 ? (
                <div className="text-center py-8">
                  <div className="w-10 h-10 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-3">
                    <FileText className="w-5 h-5 text-slate-300" />
                  </div>
                  <p className="text-sm text-slate-500">
                    {unassignedNotes.length === 0 ? "No unassigned notes" : "No notes match your search"}
                  </p>
                </div>
              ) : (
                <div className="space-y-3 max-h-[62vh] overflow-y-auto pr-1">
                  {visibleUnassignedNotes.map(note => (
                    <div
                      key={note.id}
                      draggable
                      onDragStart={(e) => {
                        setDraggedNote(note.id);
                        e.dataTransfer.effectAllowed = "move";
                      }}
                      onDragEnd={() => {
                        setDraggedNote(null);
                        setIsEmptyDropZoneActive(false);
                      }}
                      className={`p-3 rounded-xl border cursor-move transition-all bg-white shadow-sm ${
                        draggedNote === note.id
                          ? "border-blue-300 ring-2 ring-blue-100 opacity-70"
                          : "border-slate-200 hover:border-blue-200 hover:shadow-md"
                      }`}
                    >
                      <p className="text-sm font-semibold text-slate-800 truncate">{note.title}</p>

                      <div className="mt-2 h-20 rounded-lg border border-slate-200 bg-gradient-to-br from-slate-100 to-slate-200/70 flex items-center justify-center text-slate-500">
                        <div className="text-center">
                          <Brush className="w-5 h-5 mx-auto mb-1 text-slate-400" />
                          <p className="text-[11px] font-medium uppercase tracking-wide">{getNotePreviewLabel(note.content)}</p>
                        </div>
                      </div>

                      <p className="text-xs text-slate-500 mt-2">{getNoteTimestamp(note)}</p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Folders - Right Columns */}
          <div className="lg:col-span-2">
            {/* Add Folder Button */}
            <button
              onClick={() => setIsAddFolderOpen(true)}
              className="w-full mb-6 px-6 py-4 bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white font-bold rounded-xl shadow-md shadow-blue-500/20 transition-all flex items-center justify-center gap-2 group"
            >
              <FolderPlus className="w-5 h-5 group-hover:scale-110 transition-transform" />
              Make a Folder
            </button>

            {/* Add Folder Modal */}
            {isAddFolderOpen && (
              <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/20 backdrop-blur-sm p-4">
                <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-6 animate-in fade-in zoom-in-95 duration-200">
                  <div className="flex items-center justify-between mb-6">
                    <h3 className="text-xl font-bold text-slate-800">Create New Folder</h3>
                    <button onClick={() => setIsAddFolderOpen(false)} className="text-slate-400 hover:text-slate-600 p-1 bg-slate-50 hover:bg-slate-100 rounded-full">
                      <X className="w-5 h-5" />
                    </button>
                  </div>
                  <form onSubmit={(e) => { e.preventDefault(); createFolder(); }} className="flex flex-col gap-4">
                    <div>
                      <label className="block text-xs font-bold text-slate-500 tracking-wide mb-1.5 uppercase">Folder Name</label>
                      <input
                        type="text"
                        placeholder="e.g. Chapter 1 Notes"
                        value={newFolderName}
                        onChange={(e) => setNewFolderName(e.target.value)}
                        className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all placeholder:text-slate-400"
                        autoFocus
                        required
                      />
                    </div>
                    <button
                      type="submit"
                      className="w-full py-3 bg-blue-500 hover:bg-blue-600 text-white font-bold rounded-xl shadow-md shadow-blue-500/20 transition-all flex items-center justify-center gap-2"
                    >
                      <FolderPlus className="w-4 h-4" />
                      Create Folder
                    </button>
                  </form>
                </div>
              </div>
            )}

            {/* Folders Grid */}
            {folders.length === 0 ? (
              <div
                onDragOver={(e) => {
                  e.preventDefault();
                  if (draggedNote) setIsEmptyDropZoneActive(true);
                }}
                onDragLeave={() => setIsEmptyDropZoneActive(false)}
                onDrop={() => {
                  setIsEmptyDropZoneActive(false);
                  setDraggedNote(null);
                }}
                className={`flex flex-col items-center justify-center py-16 rounded-2xl border-2 border-dashed transition-all ${
                  isEmptyDropZoneActive
                    ? "bg-blue-50 border-blue-400 shadow-lg shadow-blue-200/50"
                    : "bg-white border-slate-300"
                }`}
              >
                <div className={`w-16 h-16 rounded-full flex items-center justify-center mb-4 transition-colors ${isEmptyDropZoneActive ? "bg-blue-100" : "bg-slate-100"}`}>
                  <Folder className={`w-8 h-8 ${isEmptyDropZoneActive ? "text-blue-600" : "text-slate-400"}`} />
                </div>
                <h3 className="text-xl font-bold text-slate-800 mb-2">No folders yet</h3>
                <p className="text-slate-500 text-center max-w-md mb-6 px-4">
                  {isEmptyDropZoneActive
                    ? "Release to drop this note in your workspace, then create a folder to organize it."
                    : "Drag notes from the left into this drop zone, or create your first folder to organize your course content."}
                </p>
                <div className="flex flex-wrap items-center justify-center gap-3">
                  <button
                    onClick={() => setIsAddFolderOpen(true)}
                    className="px-5 py-2.5 bg-blue-500 hover:bg-blue-600 text-white font-bold rounded-lg transition-colors flex items-center gap-2"
                  >
                    <Plus className="w-4 h-4" />
                    Create Folder
                  </button>
                  <button
                    type="button"
                    className="px-5 py-2.5 bg-blue-50 hover:bg-blue-100 text-blue-600 font-semibold rounded-lg transition-colors"
                  >
                    Drop notes here
                  </button>
                </div>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {folders.map(folder => {
                  const folderNotes = mergedNotes.filter(n => folder.notes.includes(n.id));
                  return (
                    <div
                      key={folder.id}
                      onDragOver={(e) => e.preventDefault()}
                      onDrop={() => draggedNote && addNoteToFolder(folder.id, draggedNote)}
                      className="bg-white rounded-2xl border-2 border-slate-200 p-6 hover:border-blue-300 hover:shadow-lg transition-all"
                    >
                      <div className="flex items-start justify-between mb-4">
                        {editingFolderId === folder.id ? (
                          <input
                            type="text"
                            value={editingFolderName}
                            onChange={(e) => setEditingFolderName(e.target.value)}
                            onBlur={() => updateFolderName(folder.id)}
                            onKeyDown={(e) => e.key === 'Enter' && updateFolderName(folder.id)}
                            className="flex-1 px-3 py-2 bg-blue-50 border border-blue-300 rounded-lg text-sm font-bold text-slate-800 outline-none focus:ring-2 focus:ring-blue-500/20"
                            autoFocus
                          />
                        ) : (
                          <div className="flex items-center gap-2 flex-1">
                            <Folder className="w-5 h-5 text-blue-500 flex-shrink-0" />
                            <h3 className="text-lg font-bold text-slate-800">{folder.name}</h3>
                          </div>
                        )}
                        <div className="flex gap-1">
                          <button
                            onClick={() => { setEditingFolderId(folder.id); setEditingFolderName(folder.name); }}
                            className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                          >
                            <Edit2 className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => deleteFolder(folder.id)}
                            className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>

                      {/* Notes in Folder */}
                      {folderNotes.length === 0 ? (
                        <div className="text-center py-8 border-2 border-dashed border-slate-200 rounded-lg">
                          <FileText className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                          <p className="text-sm text-slate-400">Drag notes here</p>
                        </div>
                      ) : (
                        <div className="space-y-2">
                          {folderNotes.map(note => (
                            <div
                              key={note.id}
                              onClick={() => navigate(`/home/editor/${note.id}`)}
                              className="p-3 bg-blue-50 border border-blue-200 rounded-lg flex items-start justify-between group hover:bg-blue-100 transition-colors cursor-pointer"
                            >
                              <div className="flex-1 min-w-0">
                                <p className="text-sm font-semibold text-slate-800 truncate">{note.title}</p>
                                <p className="text-xs text-slate-600 truncate mt-0.5">{getCleanPreview(note.content, 40)}</p>
                              </div>
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  removeNoteFromFolder(folder.id, note.id);
                                }}
                                className="ml-2 p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded opacity-0 group-hover:opacity-100 transition-all flex-shrink-0"
                              >
                                <X className="w-4 h-4" />
                              </button>
                            </div>
                          ))}
                        </div>
                      )}
                      <div className="mt-4 text-xs text-slate-400 font-medium">
                        {folderNotes.length} {folderNotes.length === 1 ? 'note' : 'notes'}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
