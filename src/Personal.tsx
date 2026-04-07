/**
 * Personal.tsx — Reimagined AI Study Hub 
 * - Lumi chatbot (conversational AI assistant)
 * - Courses list and AI-prioritized Tasks
 */
import React, { useState, useRef, useEffect } from "react";
import { useNavigate } from "react-router";
import { supabase } from "./supabaseClient";
import { useAuth } from "./AuthContext";
import { useToast } from "./toast";
import {
  Calendar, Code, BookOpen, Sigma,
  LayoutGrid, Sparkles, Send, GraduationCap, GripVertical, Check, BotMessageSquare, FileText, ArrowUp, Plus, X, Trash2, Clock3
} from "lucide-react";

type PersonalCourse = {
  id: string;
  code: string;
  title: string;
  subtitle: string;
  notesCount: number;
  deadlineText: string;
  statusText: string;
  days?: string[];
  time?: string;
  notes?: string;
};

export function Personal() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const toast = useToast();
  const [messages, setMessages] = useState<{role: "user"|"assistant", content: string}[]>([
    { role: "assistant", content: "Hi! I'm Lumi, your AI study assistant. Ready to organize your tasks or summarize some notes?" },
  ]);
  const [input, setInput] = useState("");
  const chatEndRef = useRef<HTMLDivElement>(null);

  const [isAddCourseOpen, setIsAddCourseOpen] = useState(false);
  const [newCourse, setNewCourse] = useState({
    code: "",
    title: "",
    subtitle: "",
    days: [] as string[],
    timeHour: "",
    timeMinute: "00",
    timePeriod: "AM" as "AM" | "PM",
  });
  const [isSavingCourse, setIsSavingCourse] = useState(false);
  const [courses, setCourses] = useState<PersonalCourse[]>([]);
  const [courseDeleteTarget, setCourseDeleteTarget] = useState<PersonalCourse | null>(null);
  const [currentCourseSlide, setCurrentCourseSlide] = useState(0);
  const [isBackendAvailable, setIsBackendAvailable] = useState(true);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  useEffect(() => {
    let cancelled = false;

    const loadCourses = async () => {
      if (!user) {
        setCourses(readCachedCourses());
        return;
      }

        {courseDeleteTarget && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/40 backdrop-blur-md p-4">
            <div className="w-full max-w-lg overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-2xl">
              <div className="bg-gradient-to-r from-rose-50 to-orange-50 px-6 py-5 border-b border-rose-100">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <div className="inline-flex items-center gap-2 rounded-full bg-white px-3 py-1 text-xs font-bold uppercase tracking-wide text-rose-600 shadow-sm ring-1 ring-rose-100">
                      <Trash2 className="w-3.5 h-3.5" />
                      Delete course
                    </div>
                    <h3 className="mt-3 text-2xl font-bold text-slate-900">Remove {courseDeleteTarget.title}?</h3>
                    <p className="mt-2 text-sm text-slate-600">
                      You can delete only the course, or delete the course and its saved notes/folders.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setCourseDeleteTarget(null)}
                    className="rounded-full p-2 text-slate-400 hover:bg-white hover:text-slate-600 transition-colors"
                    aria-label="Close warning dialog"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>
              </div>

              <div className="px-6 py-5">
                <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                  <div className="flex items-center gap-2 text-sm font-semibold text-slate-800">
                    <FileText className="w-4 h-4 text-slate-500" />
                    Notes safety
                  </div>
                  <p className="mt-2 text-sm text-slate-600">
                    Deleting the course alone keeps notes, folders, and course data stored for later.
                    If you choose the full delete, those saved notes will be removed too.
                  </p>
                </div>
              </div>

              <div className="flex flex-col gap-3 px-6 pb-6 md:flex-row md:justify-end">
                <button
                  type="button"
                  onClick={() => setCourseDeleteTarget(null)}
                  className="rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-700 hover:bg-slate-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={() => deleteCourse(courseDeleteTarget, false)}
                  className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm font-semibold text-amber-800 hover:bg-amber-100 transition-colors"
                >
                  Delete course only
                </button>
                <button
                  type="button"
                  onClick={() => deleteCourse(courseDeleteTarget, true)}
                  className="rounded-xl bg-rose-600 px-4 py-3 text-sm font-semibold text-white hover:bg-rose-700 transition-colors"
                >
                  Delete course and notes
                </button>
              </div>
            </div>
          </div>
        )}

      const { data, error } = await supabase
        .from("user_courses")
        .select("id, code, title, subtitle, schedule_days, schedule_time, notes, created_at")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });

      if (error) {
        console.error("Failed to load courses:", error.message);
        setIsBackendAvailable(false);
        setCourses(readCachedCourses());
        return;
      }

      setIsBackendAvailable(true);

      if (!cancelled) {
        const mapped: PersonalCourse[] = (data ?? []).map((row: any) => ({
          id: row.id,
          code: row.code,
          title: row.title,
          subtitle: row.subtitle || "No subtitle provided",
          notesCount: 0,
          deadlineText: "No deadlines",
          statusText: "Active",
          days: row.schedule_days || [],
          time: row.schedule_time || "",
          notes: row.notes || "",
        }));
        if (mapped.length > 0) {
          setCourses(mapped);
          writeCachedCourses(mapped);
        } else {
          setCourses(readCachedCourses());
        }
      }
    };

    void loadCourses();

    return () => {
      cancelled = true;
    };
  }, [user]);

  const sendChat = () => {
    if (!input.trim()) return;
    setMessages(prev => [...prev, { role: "user", content: input }]);
    setTimeout(() => {
      setMessages(prev => [...prev, { role: "assistant", content: "I'll help you with that right away!" }]);
    }, 600);
    setInput("");
  };

  const [tasks, setTasks] = useState<{ id: number; title: string; subtext: string; status: string; color: string; completed: boolean; date?: string; time?: string }[]>([]);
  const [isAddTaskOpen, setIsAddTaskOpen] = useState(false);
  const [newTaskTitle, setNewTaskTitle] = useState("");
  const [newTaskStatus, setNewTaskStatus] = useState("TODAY");
  const [newTaskSubtext, setNewTaskSubtext] = useState("");
  const [newTaskDate, setNewTaskDate] = useState("");
  const [newTaskHours, setNewTaskHours] = useState("");
  const [newTaskMinutes, setNewTaskMinutes] = useState("00");
  const [newTaskPeriod, setNewTaskPeriod] = useState<"AM" | "PM">("AM");

  const statusOptions = [
    { label: "TODAY", color: "text-amber-600 bg-amber-50" },
    { label: "URGENT", color: "text-red-600 bg-red-50" },
    { label: "UPCOMING", color: "text-purple-600 bg-purple-50" }
  ];

  const coursesStorageKey = user ? `luminote-personal-courses-${user.id}` : "luminote-personal-courses-guest";

  const hourOptions = Array.from({ length: 12 }, (_, index) => String(index + 1).padStart(2, "0"));
  const minuteOptions = ["00", "05", "10", "15", "20", "25", "30", "35", "40", "45", "50", "55"];

  const formatCourseTime = () => {
    if (!newCourse.timeHour) return "";
    return `${newCourse.timeHour}:${newCourse.timeMinute} ${newCourse.timePeriod}`;
  };

  const readCachedCourses = (): PersonalCourse[] => {
    try {
      const raw = localStorage.getItem(coursesStorageKey);
      if (!raw) return [];
      const parsed = JSON.parse(raw);
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  };

  const writeCachedCourses = (nextCourses: PersonalCourse[]) => {
    localStorage.setItem(coursesStorageKey, JSON.stringify(nextCourses));
  };

  const removeCourseFromAllCaches = (courseId: string) => {
    const cachePrefix = "luminote-personal-courses-";
    for (let index = 0; index < localStorage.length; index += 1) {
      const key = localStorage.key(index);
      if (!key || !key.startsWith(cachePrefix)) continue;

      try {
        const parsed = JSON.parse(localStorage.getItem(key) || "[]");
        if (!Array.isArray(parsed)) continue;
        const next = parsed.filter((course: any) => course?.id !== courseId);
        localStorage.setItem(key, JSON.stringify(next));
      } catch {
        // Ignore malformed cache entries
      }
    }
  };

  // Helper function to check if a task is past due
  const isPastDue = (task: typeof tasks[0]): boolean => {
    if (!task.date) return false;
    
    const today = new Date();
    const taskDate = new Date(task.date);
    
    // Set task date to end of day for comparison
    taskDate.setHours(23, 59, 59, 999);
    
    // If time is specified, use that instead
    if (task.time) {
      const [hours, minutes] = task.time.split(':');
      taskDate.setHours(parseInt(hours), parseInt(minutes), 0, 0);
    }
    
    return today > taskDate;
  };

  // Get the display status for a task
  const getTaskStatus = (task: typeof tasks[0]): { label: string; color: string } => {
    if (!task.completed && isPastDue(task)) {
      return { label: "MISSING", color: "text-red-600 bg-red-50" };
    }
    return { label: task.status, color: task.color };
  };

  const handleAddTask = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTaskTitle.trim()) return;
    const selectedStatus = statusOptions.find(s => s.label === newTaskStatus);
    const taskTime = newTaskDate && newTaskHours ? `${newTaskHours}:${newTaskMinutes} ${newTaskPeriod}` : "";
    setTasks(prev => [...prev, {
      id: Date.now(),
      title: newTaskTitle.trim(),
      subtext: newTaskSubtext.trim() || "User Added",
      status: newTaskStatus,
      color: selectedStatus?.color || "text-blue-600 bg-blue-50",
      completed: false,
      date: newTaskDate,
      time: taskTime
    }]);
    setNewTaskTitle("");
    setNewTaskSubtext("");
    setNewTaskStatus("TODAY");
    setNewTaskDate("");
    setNewTaskHours("");
    setNewTaskMinutes("00");
    setNewTaskPeriod("AM");
    setIsAddTaskOpen(false);
  };

  const toggleTask = (id: number) => {
    setTasks(prev => {
      const updatedTasks: typeof prev = [];

      for (const task of prev) {
        if (task.id !== id) {
          updatedTasks.push(task);
          continue;
        }

        const toggledTask = { ...task, completed: !task.completed };
        if (toggledTask.completed && isPastDue(toggledTask)) {
          continue;
        }
        updatedTasks.push(toggledTask);
      }

      return updatedTasks;
    });
  };

  const deleteTask = (id: number) => {
    setTasks(prev => prev.filter(t => t.id !== id));
  };

  const handleAddCourse = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCourse.code || !newCourse.title) {
      toast.error("Course code and title are required.");
      return;
    }

    const scheduleTime = formatCourseTime();
    const optimisticCourse: PersonalCourse = {
      id: crypto.randomUUID(),
      code: newCourse.code.toUpperCase(),
      title: newCourse.title,
      subtitle: newCourse.subtitle || "No subtitle provided",
      notesCount: 0,
      deadlineText: "No deadlines",
      statusText: "Active",
      days: newCourse.days,
      time: scheduleTime,
      notes: "",
    };

    setIsSavingCourse(true);

    setCourses(prev => {
      const nextCourses = [optimisticCourse, ...prev];
      writeCachedCourses(nextCourses);
      return nextCourses;
    });

    if (!user) {
      toast.info("Saved on this device only. Sign in to sync courses to Supabase.");
      setIsSavingCourse(false);
      setNewCourse({ code: "", title: "", subtitle: "", days: [], timeHour: "", timeMinute: "00", timePeriod: "AM" });
      setIsAddCourseOpen(false);
      return;
    }

    if (!isBackendAvailable) {
      toast.success("Course saved locally.");
      setIsSavingCourse(false);
      setNewCourse({ code: "", title: "", subtitle: "", days: [], timeHour: "", timeMinute: "00", timePeriod: "AM" });
      setIsAddCourseOpen(false);
      return;
    }

    const payload = {
      user_id: user.id,
      code: optimisticCourse.code,
      title: optimisticCourse.title,
      subtitle: optimisticCourse.subtitle || null,
      schedule_days: optimisticCourse.days,
      schedule_time: optimisticCourse.time || null,
      notes: "",
    };

    const { data, error } = await (supabase as any)
      .from("user_courses")
      .insert(payload)
      .select("id, code, title, subtitle, schedule_days, schedule_time, notes")
      .single();

    if (error) {
      console.error("Failed to save course:", error.message);
      setIsBackendAvailable(false);
      toast.info("Saved locally for now. Connect the Supabase table to sync courses to your account.");
      setIsSavingCourse(false);
      setNewCourse({ code: "", title: "", subtitle: "", days: [], timeHour: "", timeMinute: "00", timePeriod: "AM" });
      setIsAddCourseOpen(false);
      return;
    }

    const savedCourse: PersonalCourse = {
      id: data.id,
      code: data.code,
      title: data.title,
      subtitle: data.subtitle || "No subtitle provided",
      notesCount: 0,
      deadlineText: "No deadlines",
      statusText: "Active",
      days: data.schedule_days || [],
      time: data.schedule_time || "",
      notes: data.notes || "",
    };

    setCourses(prev => {
      const nextCourses = prev.map(course => course.id === optimisticCourse.id ? savedCourse : course);
      writeCachedCourses(nextCourses);
      return nextCourses;
    });

    toast.success("Course saved.");
    setIsSavingCourse(false);
    setNewCourse({ code: "", title: "", subtitle: "", days: [], timeHour: "", timeMinute: "00", timePeriod: "AM" });
    setIsAddCourseOpen(false);
  };

  const deleteCourse = async (course: PersonalCourse, deleteNotes: boolean) => {
    const nextCourses = courses.filter(item => item.id !== course.id);
    setCourses(nextCourses);
    writeCachedCourses(nextCourses);
    removeCourseFromAllCaches(course.id);

    if (deleteNotes) {
      localStorage.removeItem(`course-${course.id}`);
      localStorage.removeItem(`folders-${course.id}`);
      localStorage.removeItem(`notes-${course.id}`);
    }

    setCourseDeleteTarget(null);

    if (!user || !isBackendAvailable) {
      toast.success(deleteNotes ? "Course and notes deleted." : "Course deleted. Notes were kept.");
      return;
    }

    const { error } = await (supabase as any)
      .from("user_courses")
      .delete()
      .eq("id", course.id)
      .eq("user_id", user.id);

    if (error) {
      console.error("Failed to delete course:", error.message);
      setIsBackendAvailable(false);
      toast.info("Removed locally. Supabase deletion did not complete.");
      return;
    }

    toast.success(deleteNotes ? "Course and notes deleted." : "Course deleted. Notes were kept.");
  };

  return (
    <div className="h-full overflow-y-auto font-outfit flex items-center justify-center" style={{ backgroundColor: "var(--bg-main)", color: "var(--text-primary)" }}>
      <div className="max-w-[1200px] w-full p-4 md:p-8">
        
        {/* Header */}
        <header className="flex flex-col md:flex-row md:items-end justify-between gap-4 mb-6 pt-2">
          <div>
            <h1 className="text-3xl font-bold font-serif tracking-tight text-slate-900 mb-1">Personal Hub</h1>
            <p className="text-sm text-slate-500 font-medium tracking-wide">Manage your academic journey and campus life.</p>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <button className="flex items-center justify-center gap-2 px-3 py-2 bg-white border border-slate-200 text-slate-600 text-sm font-semibold rounded-lg shadow-sm hover:bg-slate-50 transition-colors w-full md:w-auto">
              <Calendar className="w-4 h-4 text-slate-400" />
              Fall Semester 2024
            </button>
            <button 
              onClick={() => setIsAddCourseOpen(true)}
              className="flex items-center justify-center gap-2 px-3 py-2 bg-blue-500 hover:bg-blue-600 text-white text-sm font-semibold rounded-xl shadow-md shadow-blue-500/20 transition-colors w-full md:w-auto"
            >
              <Plus className="w-4 h-4" strokeWidth={3} />
              New Schedule
            </button>
          </div>
        </header>

        {isAddCourseOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/20 backdrop-blur-sm p-4">
            <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-6 animate-in fade-in zoom-in-95 duration-200">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-xl font-bold text-slate-800">Add New Course</h3>
                <button onClick={() => setIsAddCourseOpen(false)} className="text-slate-400 hover:text-slate-600 transition-colors p-1 bg-slate-50 hover:bg-slate-100 rounded-full">
                  <X className="w-5 h-5" />
                </button>
              </div>
              <form onSubmit={handleAddCourse} className="flex flex-col gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-500 tracking-wide mb-1.5 uppercase">Course Code</label>
                  <input type="text" placeholder="e.g. CS-101" value={newCourse.code} onChange={e => setNewCourse({...newCourse, code: e.target.value})} className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all placeholder:text-slate-400" autoFocus required />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-500 tracking-wide mb-1.5 uppercase">Course Title</label>
                  <input type="text" placeholder="e.g. Intro to Computer Science" value={newCourse.title} onChange={e => setNewCourse({...newCourse, title: e.target.value})} className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all placeholder:text-slate-400" required />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-500 tracking-wide mb-1.5 uppercase">Subtitle (Optional)</label>
                  <input type="text" placeholder="e.g. Algorithms & Logic" value={newCourse.subtitle} onChange={e => setNewCourse({...newCourse, subtitle: e.target.value})} className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all placeholder:text-slate-400" />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-500 tracking-wide mb-2.5 uppercase">Schedule (Optional)</label>
                  <div className="grid grid-cols-4 gap-2 mb-3">
                    {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map(day => (
                      <button
                        key={day}
                        type="button"
                        onClick={() => setNewCourse(prev => ({
                          ...prev,
                          days: prev.days.includes(day) ? prev.days.filter(d => d !== day) : [...prev.days, day]
                        }))}
                        className={`px-2 py-1.5 rounded-lg text-xs font-bold transition-all ${
                          newCourse.days.includes(day)
                            ? 'bg-blue-500 text-white'
                            : 'bg-slate-50 text-slate-600 border border-slate-200 hover:bg-slate-100'
                        }`}
                      >
                        {day}
                      </button>
                    ))}
                  </div>
                  <div className="rounded-2xl border border-slate-200 bg-slate-50 p-3">
                    <div className="flex items-center gap-2 mb-3 text-xs font-bold uppercase tracking-wide text-slate-500">
                      <Clock3 className="w-4 h-4" />
                      Time
                    </div>
                    <div className="grid grid-cols-3 gap-2">
                      <div>
                        <label className="block text-[10px] font-bold text-slate-400 tracking-wide mb-1 uppercase">Hour</label>
                        <select
                          value={newCourse.timeHour}
                          onChange={(e) => setNewCourse(prev => ({ ...prev, timeHour: e.target.value }))}
                          className="w-full px-3 py-2.5 bg-white border border-slate-200 rounded-xl text-sm font-semibold text-slate-700 outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                        >
                          <option value="">--</option>
                          {hourOptions.map(hour => <option key={hour} value={hour}>{hour}</option>)}
                        </select>
                      </div>
                      <div>
                        <label className="block text-[10px] font-bold text-slate-400 tracking-wide mb-1 uppercase">Minute</label>
                        <select
                          value={newCourse.timeMinute}
                          onChange={(e) => setNewCourse(prev => ({ ...prev, timeMinute: e.target.value }))}
                          className="w-full px-3 py-2.5 bg-white border border-slate-200 rounded-xl text-sm font-semibold text-slate-700 outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                        >
                          {minuteOptions.map(minute => <option key={minute} value={minute}>{minute}</option>)}
                        </select>
                      </div>
                      <div>
                        <label className="block text-[10px] font-bold text-slate-400 tracking-wide mb-1 uppercase">AM/PM</label>
                        <div className="grid grid-cols-2 gap-1 rounded-xl bg-white p-1 border border-slate-200">
                          {(["AM", "PM"] as const).map(period => (
                            <button
                              key={period}
                              type="button"
                              onClick={() => setNewCourse(prev => ({ ...prev, timePeriod: period }))}
                              className={`rounded-lg py-2 text-xs font-bold transition-all ${newCourse.timePeriod === period ? "bg-blue-500 text-white shadow-sm" : "text-slate-500 hover:bg-slate-100"}`}
                            >
                              {period}
                            </button>
                          ))}
                        </div>
                      </div>
                    </div>
                    <div className="mt-3 text-xs text-slate-500 flex items-center justify-between">
                      <span>Preview</span>
                      <span className="font-semibold text-slate-700">{formatCourseTime() || "No time set"}</span>
                    </div>
                  </div>
                </div>
                {!user && (
                  <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
                    Sign in to save courses to your account.
                  </div>
                )}
                <button type="submit" disabled={isSavingCourse} className="w-full mt-2 py-3 bg-blue-500 hover:bg-blue-600 disabled:opacity-60 disabled:cursor-not-allowed text-white font-bold rounded-xl shadow-md shadow-blue-500/20 transition-all flex items-center justify-center gap-2">
                  <Plus className="w-4 h-4" />
                  {isSavingCourse ? "Saving..." : "Add Course"}
                </button>
              </form>
            </div>
          </div>
        )}

        <main className="grid gap-6">
        
        {/* Courses Section */}
        <section>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-bold text-slate-800 flex items-center gap-2">
              <GraduationCap className="w-6 h-6 text-blue-500" strokeWidth={2.5} />
              My Courses
            </h2>
          </div>



          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {courses.length === 0 ? (
              <div className="md:col-span-3 flex flex-col items-center justify-center p-12 bg-white rounded-2xl border-2 border-dashed border-slate-200 text-center">
                <div className="w-14 h-14 bg-slate-50 text-slate-400 rounded-full flex items-center justify-center mb-4">
                  <BookOpen className="w-6 h-6" />
                </div>
                <h3 className="text-lg font-bold text-slate-800 mb-1">No courses organized yet</h3>
                <p className="text-sm text-slate-500 max-w-sm mb-6">Create a new schedule to start organizing notes, tracking deadlines, and managing your coursework seamlessly.</p>
                <button onClick={() => setIsAddCourseOpen(true)} className="flex items-center justify-center gap-2 px-5 py-2.5 bg-blue-500 hover:bg-blue-600 text-white text-sm font-bold rounded-xl shadow-sm shadow-blue-500/20 transition-colors">
                  <Plus className="w-4 h-4" strokeWidth={3} />
                  Add First Course
                </button>
              </div>
            ) : (
              courses.slice(currentCourseSlide * 3, (currentCourseSlide + 1) * 3).map(course => (
                <div
                  key={course.id}
                  onClick={() => {
                    localStorage.setItem(`course-${course.id}`, JSON.stringify(course));
                    navigate(`/home/personal/course/${course.id}`);
                  }}
                  className="bg-white rounded-2xl p-4 border border-slate-200/60 shadow-sm hover:shadow-md transition-shadow relative cursor-pointer hover:border-blue-300 group"
                >
                  <div className="flex justify-between items-start mb-4">
                    <div className="w-10 h-10 bg-slate-50 text-slate-500 rounded-xl flex items-center justify-center">
                      <BookOpen className="w-5 h-5" />
                    </div>
                    <div className="flex flex-col items-end gap-1">
                      <span className="text-[10px] font-bold text-slate-400 tracking-wider">{course.code}</span>
                      <div className="flex items-center gap-2">
                        <span className="px-2 py-0.5 rounded-md bg-slate-100 text-slate-600 text-xs font-bold w-fit">Active</span>
                        <button
                          type="button"
                          onClick={(event) => {
                            event.stopPropagation();
                            setCourseDeleteTarget(course);
                          }}
                          className="inline-flex items-center justify-center w-8 h-8 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50 opacity-70 group-hover:opacity-100 transition-all"
                          aria-label={`Delete ${course.title}`}
                          title="Delete course"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  </div>
                  <h3 className="text-lg font-bold text-slate-800 mb-0.5">{course.title}</h3>
                  <p className="text-slate-500 text-xs font-medium mb-3">{course.subtitle}</p>
                  
                  {(course.days && course.days.length > 0) && (
                    <div className="mb-4 pb-4 border-b border-slate-100">
                      <div className="text-[9px] font-bold tracking-wider text-slate-400 mb-1.5">SCHEDULE</div>
                      <div className="flex flex-wrap gap-1 mb-2">
                        {course.days.map(day => (
                          <span key={day} className="px-2 py-0.5 bg-blue-50 text-blue-600 text-xs font-bold rounded-md">
                            {day}
                          </span>
                        ))}
                      </div>
                      {course.time && <div className="text-xs text-slate-600 font-medium">⏰ {course.time}</div>}
                    </div>
                  )}
                  
                  <div className="flex items-center justify-between border-t border-slate-100 pt-3">
                    <div>
                      <div className="text-[9px] font-bold tracking-wider text-slate-400 mb-0.5">TOTAL NOTES</div>
                      <div className="text-sm font-semibold text-slate-700">0 Files</div>
                    </div>
                    <div className="text-right">
                      <div className="text-[9px] font-bold tracking-wider text-slate-400 mb-0.5">NEXT DEADLINE</div>
                      <div className="text-sm font-semibold text-slate-500">None yet</div>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>

          {courses.length > 0 && (
            <div className="flex justify-between items-center mt-4">
              <button
                type="button"
                onClick={() => setCurrentCourseSlide(prev => Math.max(0, prev - 1))}
                disabled={currentCourseSlide === 0}
                className="px-6 py-2.5 bg-slate-200 hover:bg-slate-300 disabled:opacity-50 disabled:cursor-not-allowed text-slate-700 font-semibold rounded-lg transition-colors"
              >
                Back
              </button>
              <span className="text-sm font-semibold text-slate-600">
                {currentCourseSlide + 1} / {Math.ceil(courses.length / 3)}
              </span>
              <button
                type="button"
                onClick={() => setCurrentCourseSlide(prev => prev + 1)}
                disabled={(currentCourseSlide + 1) * 3 >= courses.length}
                className="px-6 py-2.5 bg-blue-500 hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed text-white font-semibold rounded-lg shadow-sm shadow-blue-500/20 transition-colors"
              >
                Next
              </button>
            </div>
          )}
        </section>

        {/* Lower Grid: Tasks & Chat */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 mt-2">
          
          {/* Tasks Column */}
          <div className="lg:col-span-7 xl:col-span-7 flex flex-col h-[320px]">
            <div className="flex items-center gap-3 mb-4">
              <div className="flex items-center gap-2">
                <span className="text-blue-500 font-black text-xl">!</span>
                <h2 className="text-lg font-bold text-slate-800">My Schedule & Tasks</h2>
              </div>
            </div>

            {/* Tasks List */}
            <div className="flex flex-col gap-3 overflow-y-auto pr-2 scrollbar-thin scrollbar-thumb-slate-200 flex-1">
              {tasks.length === 0 ? (
                <div className="flex-1 flex items-center justify-center text-sm font-medium text-slate-400 border-2 border-dashed border-slate-200 rounded-xl">
                  No tasks added yet. Create one below!
                </div>
              ) : (
                tasks.map((task) => (
                  <div key={task.id} 
                    className={`bg-white rounded-xl p-4 border border-slate-200/60 shadow-sm flex items-center gap-3 hover:shadow-md transition-all group ${task.completed ? 'opacity-50' : ''}`}
                  >
                    <div className="text-slate-300 cursor-grab hover:text-slate-400">
                      <GripVertical className="w-4 h-4" />
                    </div>
                    
                    {/* Checkbox */}
                    <div 
                      onClick={() => toggleTask(task.id)}
                      className={`w-5 h-5 rounded-md border-2 flex items-center justify-center flex-shrink-0 cursor-pointer transition-colors ${
                        task.completed 
                          ? 'bg-blue-500 border-blue-500' 
                          : 'border-slate-200 group-hover:border-blue-400'
                      }`}
                    >
                      {task.completed && <Check className="w-3.5 h-3.5 text-white" strokeWidth={3} />}
                    </div>
                    
                    <div className="flex-1 overflow-hidden">
                      <h4 className={`text-sm font-bold text-slate-800 mb-0.5 truncate ${task.completed ? 'line-through text-slate-500' : ''}`}>
                        {task.title}
                      </h4>
                      <p className="text-[11px] text-slate-500 font-medium truncate">{task.subtext}</p>
                      {(task.date || task.time) && (
                        <div className="text-[10px] text-slate-400 font-medium mt-1">
                          {task.date && <span>{task.date}</span>}
                          {task.date && task.time && <span> • </span>}
                          {task.time && <span>{task.time}</span>}
                        </div>
                      )}
                    </div>
                    
                    <span className={`px-2.5 py-1 rounded-md text-[9px] font-black tracking-wider ${getTaskStatus(task).color}`}>
                      {getTaskStatus(task).label}
                    </span>

                    <button
                      onClick={() => deleteTask(task.id)}
                      className="text-slate-300 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-all p-1.5 hover:bg-red-50 rounded-lg"
                      title="Delete task"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                ))
              )}
            </div>
            
            {/* Add Task Button */}
            <button
              onClick={() => setIsAddTaskOpen(true)}
              className="mt-4 w-full px-4 py-3 bg-blue-50 hover:bg-blue-100 text-blue-600 font-semibold rounded-xl border border-blue-200 transition-all flex items-center justify-center gap-2 shadow-sm hover:shadow-md"
            >
              <Plus className="w-5 h-5" strokeWidth={2.5} />
              Add New Task
            </button>

            {/* Add Task Modal */}
            {isAddTaskOpen && (
              <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/20 backdrop-blur-sm p-4">
                <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-6 animate-in fade-in zoom-in-95 duration-200">
                  <div className="flex items-center justify-between mb-6">
                    <h3 className="text-xl font-bold text-slate-800">Add New Task</h3>
                    <button onClick={() => setIsAddTaskOpen(false)} className="text-slate-400 hover:text-slate-600 transition-colors p-1 bg-slate-50 hover:bg-slate-100 rounded-full">
                      <X className="w-5 h-5" />
                    </button>
                  </div>
                  <form onSubmit={handleAddTask} className="flex flex-col gap-4">
                    <div>
                      <label className="block text-xs font-bold text-slate-500 tracking-wide mb-1.5 uppercase">Task Title</label>
                      <input
                        type="text"
                        placeholder="e.g. Complete Math homework"
                        value={newTaskTitle}
                        onChange={(e) => setNewTaskTitle(e.target.value)}
                        className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all placeholder:text-slate-400"
                        autoFocus
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-slate-500 tracking-wide mb-1.5 uppercase">Description (Optional)</label>
                      <input
                        type="text"
                        placeholder="e.g. Chapters 5-7"
                        value={newTaskSubtext}
                        onChange={(e) => setNewTaskSubtext(e.target.value)}
                        className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all placeholder:text-slate-400"
                      />
                    </div>
                    <div className="space-y-3">
                      <div>
                        <label className="block text-xs font-bold text-slate-500 tracking-wide mb-1.5 uppercase">Date (Optional)</label>
                        <div className="relative group">
                          <div className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-blue-500 transition-colors pointer-events-none z-0">
                            <Calendar className="w-4 h-4" />
                          </div>
                          <input
                            type="date"
                            value={newTaskDate}
                            onChange={(e) => setNewTaskDate(e.target.value)}
                            className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium appearance-none group-focus-within:bg-blue-50 group-focus-within:border-blue-400 focus:ring-0 focus:outline-none transition-all cursor-pointer hover:bg-slate-100"
                          />
                        </div>
                      </div>
                      <div>
                        <label className="block text-xs font-bold text-slate-500 tracking-wide mb-2.5 uppercase flex items-center gap-2">
                          <Clock3 className="w-4 h-4" />
                          Time (Optional)
                        </label>
                        <div className="space-y-3">
                          <div className="grid grid-cols-3 gap-2">
                            <div>
                              <div className="text-[10px] font-bold text-slate-400 tracking-wider mb-1.5 uppercase">Hour</div>
                              <select
                                value={newTaskHours}
                                onChange={(e) => setNewTaskHours(e.target.value)}
                                className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold text-center focus:bg-blue-50 focus:border-blue-400 focus:ring-0 focus:outline-none transition-all cursor-pointer hover:bg-slate-100"
                              >
                                <option value="">--</option>
                                {Array.from({ length: 12 }, (_, i) => {
                                  const hour = String(i + 1).padStart(2, "0");
                                  return <option key={hour} value={hour}>{hour}</option>;
                                })}
                              </select>
                            </div>
                            <div>
                              <div className="text-[10px] font-bold text-slate-400 tracking-wider mb-1.5 uppercase">Minute</div>
                              <select
                                value={newTaskMinutes}
                                onChange={(e) => setNewTaskMinutes(e.target.value)}
                                className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold text-center focus:bg-blue-50 focus:border-blue-400 focus:ring-0 focus:outline-none transition-all cursor-pointer hover:bg-slate-100"
                              >
                                {Array.from({ length: 60 }, (_, i) => {
                                  const minute = String(i).padStart(2, "0");
                                  return <option key={minute} value={minute}>{minute}</option>;
                                })}
                              </select>
                            </div>
                            <div>
                              <div className="text-[10px] font-bold text-slate-400 tracking-wider mb-1.5 uppercase">AM/PM</div>
                              <div className="flex gap-1">
                                <button
                                  type="button"
                                  onClick={() => setNewTaskPeriod("AM")}
                                  className={`flex-1 py-2.5 rounded-lg text-xs font-bold transition-all ${
                                    newTaskPeriod === "AM"
                                      ? "bg-blue-500 text-white shadow-sm shadow-blue-500/20"
                                      : "bg-slate-50 text-slate-600 border border-slate-200 hover:bg-slate-100"
                                  }`}
                                >
                                  AM
                                </button>
                                <button
                                  type="button"
                                  onClick={() => setNewTaskPeriod("PM")}
                                  className={`flex-1 py-2.5 rounded-lg text-xs font-bold transition-all ${
                                    newTaskPeriod === "PM"
                                      ? "bg-blue-500 text-white shadow-sm shadow-blue-500/20"
                                      : "bg-slate-50 text-slate-600 border border-slate-200 hover:bg-slate-100"
                                  }`}
                                >
                                  PM
                                </button>
                              </div>
                            </div>
                          </div>
                          <div className="bg-slate-50 border border-slate-200 rounded-lg px-3 py-2.5 flex items-center justify-between">
                            <span className="text-xs font-medium text-slate-500">Preview</span>
                            <span className="text-sm font-semibold text-slate-700">
                              {newTaskHours ? `${newTaskHours}:${newTaskMinutes} ${newTaskPeriod}` : "No time set"}
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-slate-500 tracking-wide mb-2.5 uppercase">Priority</label>
                      <div className="grid grid-cols-2 gap-2">
                        {statusOptions.map(option => (
                          <button
                            key={option.label}
                            type="button"
                            onClick={() => setNewTaskStatus(option.label)}
                            className={`px-3 py-2 rounded-lg text-xs font-bold tracking-wider transition-all ${
                              newTaskStatus === option.label
                                ? `${option.color} ring-2 ring-offset-2 ring-current`
                                : 'bg-slate-50 text-slate-600 border border-slate-200 hover:bg-slate-100'
                            }`}
                          >
                            {option.label}
                          </button>
                        ))}
                      </div>
                    </div>
                    <button
                      type="submit"
                      disabled={!newTaskTitle.trim()}
                      className="w-full mt-2 py-3 bg-blue-500 hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold rounded-xl shadow-md shadow-blue-500/20 transition-all flex items-center justify-center gap-2"
                    >
                      <Plus className="w-4 h-4" />
                      Add Task
                    </button>
                  </form>
                </div>
              </div>
            )}
          </div>

          {/* Chat Column */}
          <div className="lg:col-span-5 xl:col-span-5">
            <div className="flex items-center gap-2 mb-4">
              <BotMessageSquare className="w-5 h-5 text-blue-500" strokeWidth={2.5} />
              <h2 className="text-lg font-bold text-slate-800">Lumi AI</h2>
            </div>

            <div className="bg-white rounded-[1.5rem] border border-slate-200/60 shadow-lg shadow-slate-200/40 p-3 h-[320px] flex flex-col relative overflow-hidden">
              
              {/* Chat Messages */}
              <div className="flex-1 overflow-y-auto p-2 scrollbar-thin scrollbar-thumb-slate-200 scrollbar-track-transparent">
                <div className="flex flex-col gap-5 pb-6">
                  {messages.map((m, idx) => (
                    <div key={idx} className={`flex items-start gap-3 ${m.role === 'assistant' ? '' : 'flex-row-reverse'}`}>
                      {m.role === 'assistant' ? (
                        <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center flex-shrink-0 text-blue-500 mt-1">
                          <Sparkles className="w-4 h-4" />
                        </div>
                      ) : (
                        <div className="w-8 h-8 rounded-full bg-[#fcf2d9] flex-shrink-0 overflow-hidden mt-1 border border-slate-100">
                          {/* Dummy user avatar - assuming alex */}
                          <img src="https://api.dicebear.com/7.x/notionists/svg?seed=Alex&backgroundColor=fcf2d9" alt="Alex" className="w-full h-full object-cover" />
                        </div>
                      )}
                      
                      <div className={`px-5 py-3.5 max-w-[85%] text-sm font-medium leading-relaxed ${
                        m.role === 'assistant' 
                          ? 'bg-slate-50 text-slate-700 rounded-2xl rounded-tl-sm' 
                          : 'bg-blue-500 text-white rounded-2xl rounded-tr-sm shadow-sm shadow-blue-500/20'
                      }`}>
                        {m.content}
                      </div>
                    </div>
                  ))}
                  <div ref={chatEndRef} />
                </div>
              </div>

              {/* Action Chips */}
              <div className="flex items-center gap-2 overflow-x-auto pb-4 drop-shadow-sm px-2 scrollbar-none">
                <button className="flex items-center gap-2 px-3 py-1.5 bg-white border border-slate-200 rounded-full text-xs font-semibold text-slate-600 whitespace-nowrap hover:bg-slate-50">
                  <FileText className="w-3.5 h-3.5" />
                  Summarize Notes
                </button>
                <button className="flex items-center justify-center px-3 py-1.5 bg-white border border-slate-200 rounded-full text-xs font-semibold text-slate-600 whitespace-nowrap hover:bg-slate-50">
                  Schedule for today
                </button>
                <button className="flex items-center gap-2 px-3 py-1.5 bg-white border border-slate-200 rounded-full text-xs font-semibold text-slate-600 whitespace-nowrap hover:bg-slate-50">
                  <BotMessageSquare className="w-3.5 h-3.5" />
                  Quiz Me
                </button>
              </div>

              {/* Input Area */}
              <div className="relative mt-auto">
                <input 
                  type="text" 
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && sendChat()}
                  placeholder="Ask Lumi anything..."
                  className="w-full bg-slate-50 border border-slate-200 rounded-2xl py-3.5 pl-5 pr-12 text-sm font-medium text-slate-700 outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all placeholder:text-slate-400"
                />
                <button 
                  onClick={sendChat}
                  disabled={!input.trim()}
                  className="absolute right-2 top-1/2 -translate-y-1/2 w-8 h-8 bg-blue-500 hover:bg-blue-600 disabled:opacity-50 text-white rounded-full flex items-center justify-center transition-colors shadow-sm focus:outline-none"
                >
                  <ArrowUp className="w-4 h-4" strokeWidth={3} />
                </button>
              </div>
            </div>
          </div>

        </div>
      </main>
      </div>
    </div>
  );
}

function PlusIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M5 12h14"></path>
      <path d="M12 5v14"></path>
    </svg>
  );
}
