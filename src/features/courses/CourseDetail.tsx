import React, { useCallback, useEffect, useMemo, useState } from "react";
import { useParams, useNavigate } from "react-router";
import {
  ArrowLeft, Plus, Folder, FileText, Trash2, Edit2, X, FolderPlus, Search, ArrowUpDown, Brush
} from "lucide-react";
import { useAuth } from "../auth/AuthContext";
import { useNotes } from "../notes/NotesContext";
import { getCleanPreview } from "../../lib/utils";
import { supabase } from "../../lib/supabaseClient";
import {
  addNoteToCourseFolder,
  createCourseFolder,
  deleteCourseFolder,
  fetchFoldersForCourse,
  removeNoteFromCourseFolder,
  renameCourseFolder,
  type CourseFolder,
} from "../../lib/courseFolders";
import { migrateLegacyCourseStorage } from "../../lib/courseStorageMigration";

type CourseNote = {
  id: string;
  title: string;
  content: string;
  updatedAt?: string;
};

const EMPTY_COURSE = {
  code: "…",
  title: "Loading…",
  subtitle: "",
};

export function CourseDetail() {
  const navigate = useNavigate();
  const { courseId } = useParams();
  const { user } = useAuth();
  const { notes: allNotes, addNoteForCourse, assignNoteToCourse } = useNotes();

  const [courseData, setCourseData] = useState(EMPTY_COURSE);
  const [folders, setFolders] = useState<CourseFolder[]>([]);
  const [foldersLoading, setFoldersLoading] = useState(true);

  const [isAddFolderOpen, setIsAddFolderOpen] = useState(false);
  const [newFolderName, setNewFolderName] = useState("");
  const [draggedNote, setDraggedNote] = useState<string | null>(null);
  const [editingFolderId, setEditingFolderId] = useState<string | null>(null);
  const [editingFolderName, setEditingFolderName] = useState("");
  const [noteSearchQuery, setNoteSearchQuery] = useState("");
  const [noteSort, setNoteSort] = useState<"last-edited" | "name-asc">("last-edited");
  const [isEmptyDropZoneActive, setIsEmptyDropZoneActive] = useState(false);

  const reloadFolders = useCallback(async () => {
    if (!user?.id || !courseId) {
      setFolders([]);
      setFoldersLoading(false);
      return;
    }

    setFoldersLoading(true);
    await migrateLegacyCourseStorage(user.id, courseId);
    const { folders: next, backendAvailable } = await fetchFoldersForCourse(user.id, courseId);
    setFolders(backendAvailable ? next : []);
    setFoldersLoading(false);
  }, [courseId, user?.id]);

  useEffect(() => {
    if (!user?.id || !courseId) return;

    const loadCourse = async () => {
      const { data } = await supabase
        .from("user_courses")
        .select("id, code, title, subtitle")
        .eq("id", courseId)
        .eq("user_id", user.id)
        .maybeSingle();

      if (data) {
        setCourseData({
          code: data.code ?? "",
          title: data.title ?? "Untitled Course",
          subtitle: data.subtitle ?? "",
        });
      }
    };

    void loadCourse();
    void reloadFolders();
  }, [courseId, reloadFolders, user?.id]);

  const courseNotes = useMemo<CourseNote[]>(() => {
    if (!courseId) return [];

    return allNotes
      .filter((n) => n.course_id === courseId)
      .map((n) => ({
        id: n.id,
        title: n.title || "Untitled Note",
        content: n.content || "",
        updatedAt: n.updated_at || n.created_at,
      }));
  }, [allNotes, courseId]);

  const createFolder = async () => {
    if (!newFolderName.trim() || !user?.id || !courseId) return;

    const created = await createCourseFolder(user.id, courseId, newFolderName);
    if (created) {
      setFolders((prev) => [...prev, created]);
    }
    setNewFolderName("");
    setIsAddFolderOpen(false);
  };

  const deleteFolder = async (folderId: string) => {
    const ok = await deleteCourseFolder(folderId);
    if (ok) {
      setFolders((prev) => prev.filter((f) => f.id !== folderId));
    }
  };

  const updateFolderName = async (folderId: string) => {
    if (!editingFolderName.trim()) return;
    const ok = await renameCourseFolder(folderId, editingFolderName);
    if (ok) {
      setFolders((prev) =>
        prev.map((f) => (f.id === folderId ? { ...f, name: editingFolderName.trim() } : f)),
      );
    }
    setEditingFolderId(null);
    setEditingFolderName("");
  };

  const addNoteToFolder = async (folderId: string, noteId: string) => {
    if (!courseId) return;

    if (user?.id) {
      const note = allNotes.find((n) => n.id === noteId);
      if (note && note.course_id !== courseId) {
        await assignNoteToCourse(noteId, courseId);
      }
    }

    const ok = await addNoteToCourseFolder(folderId, noteId);
    if (ok) {
      setFolders((prev) =>
        prev.map((f) => {
          if (f.id !== folderId || f.noteIds.includes(noteId)) return f;
          return { ...f, noteIds: [...f.noteIds, noteId] };
        }),
      );
    }
    setDraggedNote(null);
  };

  const removeNoteFromFolder = async (folderId: string, noteId: string) => {
    const ok = await removeNoteFromCourseFolder(folderId, noteId);
    if (ok) {
      setFolders((prev) =>
        prev.map((f) =>
          f.id === folderId ? { ...f, noteIds: f.noteIds.filter((id) => id !== noteId) } : f,
        ),
      );
    }
  };

  const assignedNoteIds = useMemo(() => {
    const ids = new Set<string>();
    for (const folder of folders) {
      for (const noteId of folder.noteIds) ids.add(noteId);
    }
    return ids;
  }, [folders]);

  const unassignedNotes = courseNotes.filter((note) => !assignedNoteIds.has(note.id));

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

  const getNoteTimestamp = (note: CourseNote) => {
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
    <div className="min-h-screen" style={{ background: "#FAFAF8", fontFamily: "'DM Sans', sans-serif" }}>
      {/* Header */}
      <header className="sticky top-0 z-40 border-b" style={{ background: "#FFFFFF", borderColor: "#EBEBEB" }}>
        <div className="max-w-7xl mx-auto px-4 md:px-8 py-6">
          <div className="flex items-start justify-between mb-4">
            <button
              type="button"
              onClick={() => navigate(-1)}
              className="flex items-center gap-2 px-3 py-2 rounded-xl transition-colors"
              style={{ color: "#6B7280" }}
            >
              <ArrowLeft className="w-5 h-5" />
              Back
            </button>
            <button
              type="button"
              onClick={() => courseId && addNoteForCourse(courseId).then(noteId => navigate(`/home/editor/${noteId}`))}
              className="flex items-center gap-2 px-4 py-2 text-white font-semibold rounded-xl transition-colors"
              style={{ background: "#4059FF" }}
            >
              <Plus className="w-5 h-5" />
              New Note
            </button>
          </div>
          <div>
            <div className="text-xs font-bold tracking-wider mb-2 uppercase" style={{ color: "#9CA3AF" }}>{courseData.code}</div>
            <h1 className="text-4xl mb-2" style={{ fontFamily: "'DM Serif Display', serif", color: "#0E1117" }}>{courseData.title}</h1>
            <p style={{ color: "#6B7280" }}>{courseData.subtitle}</p>
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
                  <form onSubmit={(e) => { e.preventDefault(); void createFolder(); }} className="flex flex-col gap-4">
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
            {foldersLoading ? (
              <div className="text-center py-16 text-slate-500">Loading folders…</div>
            ) : folders.length === 0 ? (
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
                  const folderNotes = courseNotes.filter(n => folder.noteIds.includes(n.id));
                  return (
                    <div
                      key={folder.id}
                      onDragOver={(e) => e.preventDefault()}
                      onDrop={() => draggedNote && void addNoteToFolder(folder.id, draggedNote)}
                      className="bg-white rounded-2xl border-2 border-slate-200 p-6 hover:border-blue-300 hover:shadow-lg transition-all"
                    >
                      <div className="flex items-start justify-between mb-4">
                        {editingFolderId === folder.id ? (
                          <input
                            type="text"
                            value={editingFolderName}
                            onChange={(e) => setEditingFolderName(e.target.value)}
                            onBlur={() => void updateFolderName(folder.id)}
                            onKeyDown={(e) => e.key === 'Enter' && void updateFolderName(folder.id)}
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
                            onClick={() => void deleteFolder(folder.id)}
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
                                  void removeNoteFromFolder(folder.id, note.id);
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
