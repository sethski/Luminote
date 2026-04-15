import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router";
import {
  BarChart3,
  BookOpenCheck,
  CalendarDays,
  Check,
  ChevronDown,
  ChevronUp,
  Clock,
  Clock3,
  FileText,
  FolderOpen,
  Pause,
  Paperclip,
  Play,
  Plus,
  PencilLine,
  RotateCcw,
  Sparkles,
  Trash2,
  Trophy,
  X,
} from "lucide-react";
import {
  CartesianGrid,
  Bar,
  BarChart,
  Line,
  LineChart,
  ResponsiveContainer,
  XAxis,
  YAxis,
  Tooltip as RechartsTooltip,
} from "recharts";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "./alert-dialog";
import { supabase, StudyPlan } from "./supabaseClient";
import { useAuth } from "./AuthContext";
import { useTimer } from "./TimerContext";
import { useNotes } from "./NotesContext";
import { useToast } from "./toast";
import {
  addDays,
  addMonths,
  eachDayOfInterval,
  eachMonthOfInterval,
  eachWeekOfInterval,
  differenceInCalendarDays,
  endOfMonth,
  endOfYear,
  format,
  isToday,
  parseISO,
  startOfMonth,
  startOfToday,
  startOfWeek,
  startOfYear,
  subDays,
  subMonths,
  subWeeks,
  subYears,
} from "date-fns";
import { Tooltip, TooltipContent, TooltipTrigger } from "./tooltip";

type TaskStatus = "all" | "todo" | "in_progress" | "done";
type Priority = "low" | "medium" | "high";
type SuggestionQuality = "optimal" | "available";

type Subtask = {
  id: string;
  title: string;
  done: boolean;
};

type AttachmentPreview = {
  id: string;
  name: string;
  url: string;
  isImage: boolean;
};

type TaskMeta = {
  expanded: boolean;
  progress: number;
  subtasks: Subtask[];
  attachments: AttachmentPreview[];
};

type SmartSlot = {
  id: string;
  dayLabel: string;
  dayDate: string;
  timeLabel: string;
  quality: SuggestionQuality;
  taskId: string | null;
};

type StudyWidgetTab = "today" | "week" | "month" | "year";

type StudySource = "pomodoro" | "manual" | "active";

type StudyLogEntry = {
  id: string;
  minutes: number;
  timestamp: string;
  source: StudySource;
};

const STUDY_HISTORY_KEY_PREFIX = "luminote-studyplanner-history-";
const DEFAULT_DAILY_STUDY_GOAL_HOURS = 12;

function getStudyHistoryKey(userId: string) {
  return `${STUDY_HISTORY_KEY_PREFIX}${userId}`;
}

function minutesToHours(minutes: number) {
  return Number((minutes / 60).toFixed(1));
}

function formatStudyHours(hours: number) {
  return `${Number.isInteger(hours) ? hours.toFixed(0) : hours.toFixed(1)}h`;
}

function safeParseStudyHistory(rawValue: string | null): StudyLogEntry[] {
  if (!rawValue) return [];

  try {
    const parsed = JSON.parse(rawValue);
    if (!Array.isArray(parsed)) return [];

    return parsed.filter((entry) => {
      return (
        entry &&
        typeof entry === "object" &&
        typeof entry.id === "string" &&
        typeof entry.minutes === "number" &&
        typeof entry.timestamp === "string" &&
        (entry.source === "pomodoro" || entry.source === "manual" || entry.source === "active")
      );
    });
  } catch {
    return [];
  }
}

function sumStudyMinutesInRange(entries: StudyLogEntry[], start: Date, end: Date) {
  const startTime = start.getTime();
  const endTime = end.getTime();

  return entries.reduce((total, entry) => {
    const entryTime = parseISO(entry.timestamp).getTime();
    if (entryTime < startTime || entryTime > endTime) return total;
    return total + entry.minutes;
  }, 0);
}

function sumStudyMinutesForDay(entries: StudyLogEntry[], day: Date) {
  const dayKey = format(day, "yyyy-MM-dd");
  return entries.reduce((total, entry) => {
    if (format(parseISO(entry.timestamp), "yyyy-MM-dd") !== dayKey) return total;
    return total + entry.minutes;
  }, 0);
}

const CSS = `
@import url('https://fonts.googleapis.com/css2?family=Outfit:wght@400;500;600&family=JetBrains+Mono:wght@500;600&display=swap');

.sp-shell {
  --sp-bg: #f4f7fb;
  --sp-surface: #ffffff;
  --sp-surface-soft: #f8fafc;
  --sp-ink-strong: #0f172a;
  --sp-ink-mid: #334155;
  --sp-ink-soft: #64748b;
  --sp-border: rgba(148, 163, 184, 0.24);
  --sp-primary: #2563eb;
  --sp-success: #16a34a;
  --sp-warning: #d97706;
  --sp-danger: #dc2626;
  --sp-radius-lg: 20px;
  --sp-radius-md: 14px;
  --sp-shadow-sm: 0 1px 2px rgba(15, 23, 42, 0.12);
  --sp-shadow-md: 0 4px 6px rgba(15, 23, 42, 0.14);
  --sp-shadow-lg: 0 10px 15px rgba(15, 23, 42, 0.18);
  font-family: "Outfit", sans-serif;
  min-height: 100dvh;
  color: var(--sp-ink-strong);
  background:
    radial-gradient(circle at 12% 12%, rgba(37, 99, 235, 0.08), transparent 34%),
    radial-gradient(circle at 88% 10%, rgba(22, 163, 74, 0.08), transparent 32%),
    linear-gradient(180deg, #f7faff 0%, #f3f6fb 100%);
}

.sp-card {
  background: var(--sp-surface);
  border: 1px solid var(--sp-border);
  border-radius: var(--sp-radius-lg);
  box-shadow: var(--sp-shadow-sm);
  transition: box-shadow 240ms ease, transform 240ms ease, border-color 240ms ease;
}

.sp-card:hover {
  transform: translateY(-2px);
  box-shadow: var(--sp-shadow-md);
}

.sp-heading-xl { font-size: clamp(28px, 2vw, 32px); font-weight: 600; line-height: 1.2; }
.sp-heading-lg { font-size: clamp(20px, 1.7vw, 24px); font-weight: 600; line-height: 1.3; }
.sp-body { font-size: 15px; line-height: 1.55; color: var(--sp-ink-mid); }
.sp-muted { color: var(--sp-ink-soft); }

.sp-btn {
  height: 40px;
  border-radius: 12px;
  border: 1px solid transparent;
  padding: 0 14px;
  font-size: 14px;
  font-weight: 500;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  transition: transform 220ms ease, filter 220ms ease, box-shadow 220ms ease, background-color 220ms ease;
}

.sp-btn:active { transform: translateY(1px) scale(0.985); }
.sp-btn-primary { background: #1d4ed8; color: #f1f5f9; box-shadow: 0 8px 18px rgba(29, 78, 216, 0.28); }
.sp-btn-primary:hover { filter: brightness(1.03); box-shadow: 0 12px 24px rgba(29, 78, 216, 0.32); }
.sp-btn-subtle { background: #f8fafc; color: #1e293b; border-color: var(--sp-border); }
.sp-btn-subtle:hover { background: #eef2f8; }

.sp-input,
.sp-select,
.sp-textarea {
  width: 100%;
  border-radius: 12px;
  border: 1px solid var(--sp-border);
  background: #ffffff;
  color: #0f172a;
  font-size: 14px;
  padding: 10px 12px;
  transition: border-color 220ms ease, box-shadow 220ms ease;
}

.sp-textarea { min-height: 72px; resize: vertical; }

.sp-input:focus,
.sp-select:focus,
.sp-textarea:focus,
.sp-focusable:focus-visible,
.sp-btn:focus-visible {
  outline: none;
  border-color: rgba(37, 99, 235, 0.7);
  box-shadow: 0 0 0 3px rgba(37, 99, 235, 0.2);
}

.sp-badge {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border-radius: 999px;
  padding: 4px 10px;
  font-size: 11px;
  font-weight: 600;
  letter-spacing: 0.03em;
}

.sp-slide {
  overflow: hidden;
  max-height: 0;
  opacity: 0;
  transition: max-height 260ms ease, opacity 260ms ease;
}

.sp-slide.open {
  max-height: 1200px;
  opacity: 1;
}

.sp-progress-track {
  width: 100%;
  height: 8px;
  border-radius: 999px;
  background: #e2e8f0;
  overflow: hidden;
}

.sp-progress-fill {
  height: 100%;
  border-radius: 999px;
  background: linear-gradient(90deg, #2563eb 0%, #0ea5e9 52%, #22c55e 100%);
  transition: width 260ms ease;
}

.sp-skeleton {
  border-radius: 14px;
  background: linear-gradient(90deg, #e2e8f0 20%, #f1f5f9 48%, #e2e8f0 80%);
  background-size: 240% 100%;
  animation: sp-shimmer 1.5s ease-in-out infinite;
}

@keyframes sp-shimmer {
  from { background-position: 0% 0; }
  to { background-position: 200% 0; }
}

.sp-overlay {
  position: fixed;
  inset: 0;
  background: rgba(15, 23, 42, 0.5);
  backdrop-filter: blur(4px);
  z-index: 70;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 16px;
}

.sp-modal {
  width: min(1180px, calc(100vw - 24px));
  max-height: calc(100dvh - 24px);
  overflow: hidden;
  border-radius: 20px;
  border: 1px solid rgba(148, 163, 184, 0.3);
  background: #ffffff;
  box-shadow: 0 22px 48px rgba(15, 23, 42, 0.28);
  display: flex;
  flex-direction: column;
}

.sp-pulse {
  animation: sp-pulse-ring 1.6s ease-in-out infinite;
}

@keyframes sp-pulse-ring {
  0%, 100% { filter: drop-shadow(0 0 0 rgba(14, 165, 233, 0.1)); }
  50% { filter: drop-shadow(0 0 14px rgba(14, 165, 233, 0.35)); }
}

@media (max-width: 768px) {
  .sp-shell .sp-btn,
  .sp-shell .sp-input,
  .sp-shell .sp-select,
  .sp-shell .sp-textarea { min-height: 44px; }
  .sp-shell .sp-modal { width: calc(100vw - 16px); }
}

.sp-analytics-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 12px;
}

.sp-analytics-tile {
  border: 1px solid rgba(148, 163, 184, 0.26);
  border-radius: 14px;
  background: #ffffff;
  padding: 12px;
}

.sp-clickable-study {
  cursor: pointer;
  position: relative;
  border-color: rgba(37, 99, 235, 0.32);
  box-shadow: 0 0 0 1px rgba(37, 99, 235, 0.08);
  transition: transform 220ms ease, box-shadow 220ms ease, border-color 220ms ease;
}

.sp-clickable-study:hover,
.sp-clickable-study:focus-visible {
  transform: translateY(-2px);
  box-shadow: 0 12px 28px rgba(37, 99, 235, 0.16);
  border-color: rgba(37, 99, 235, 0.45);
}

.sp-clickable-study::after {
  content: "";
  position: absolute;
  inset: -1px;
  border-radius: 14px;
  border: 1px solid rgba(14, 165, 233, 0.32);
  pointer-events: none;
  animation: sp-attention 1.8s ease-in-out infinite;
}

.sp-click-hint {
  font-size: 10px;
  font-weight: 700;
  letter-spacing: 0.07em;
  text-transform: uppercase;
  color: #2563eb;
}

@keyframes sp-attention {
  0%,
  100% {
    opacity: 0.55;
  }
  50% {
    opacity: 1;
  }
}

.sp-mini-label {
  font-size: 11px;
  letter-spacing: 0.03em;
  text-transform: uppercase;
  color: #64748b;
  font-weight: 600;
}

@media (max-width: 1024px) {
  .sp-analytics-grid {
    grid-template-columns: 1fr;
  }
}
`;

const PRIORITY_STYLE: Record<Priority, { badge: string; border: string }> = {
  low: { badge: "#16a34a", border: "rgba(22,163,74,0.38)" },
  medium: { badge: "#d97706", border: "rgba(217,119,6,0.38)" },
  high: { badge: "#dc2626", border: "rgba(220,38,38,0.44)" },
};

const STATUS_LABEL: Record<Exclude<TaskStatus, "all">, string> = {
  todo: "To Do",
  in_progress: "In Progress",
  done: "Done",
};

const EMPTY_FORM = {
  title: "",
  subject: "",
  due_date: "",
  priority: "medium" as Priority,
  notes: "",
};

function toMinutes(totalSeconds: number) {
  const m = Math.floor(totalSeconds / 60)
    .toString()
    .padStart(2, "0");
  const s = Math.floor(totalSeconds % 60)
    .toString()
    .padStart(2, "0");
  return `${m}:${s}`;
}

function formatReminderDate(scheduledAt: string): { date: string; time: string; isToday: boolean; isPast: boolean } {
  const reminder = parseISO(scheduledAt);
  const now = new Date();
  const today = startOfToday();
  const reminderDate = startOfToday();
  
  return {
    date: format(reminder, "MMM d"),
    time: format(reminder, "h:mm a"),
    isToday: differenceInCalendarDays(reminder, today) === 0,
    isPast: reminder < now,
  };
}

function createInitialSlots(plans: StudyPlan[]): SmartSlot[] {
  const base = startOfToday();
  const times = ["08:00", "10:30", "14:00", "17:30", "20:00"];

  const sorted = [...plans]
    .filter((p) => p.status !== "done")
    .sort((a, b) => {
      const da = a.due_date ? parseISO(a.due_date).getTime() : Number.MAX_SAFE_INTEGER;
      const db = b.due_date ? parseISO(b.due_date).getTime() : Number.MAX_SAFE_INTEGER;
      const pa = a.priority === "high" ? 0 : a.priority === "medium" ? 1 : 2;
      const pb = b.priority === "high" ? 0 : b.priority === "medium" ? 1 : 2;
      return da - db || pa - pb;
    });

  const slots: SmartSlot[] = [];
  let index = 0;

  for (let day = 0; day < 7; day += 1) {
    const date = addDays(base, day);
    for (let i = 0; i < times.length; i += 1) {
      const quality: SuggestionQuality = i <= 2 ? "optimal" : "available";
      slots.push({
        id: `${format(date, "yyyy-MM-dd")}-${times[i]}`,
        dayLabel: format(date, "EEE"),
        dayDate: format(date, "MMM d"),
        timeLabel: times[i],
        quality,
        taskId: sorted[index]?.id ?? null,
      });
      if (index < sorted.length) index += 1;
    }
  }

  return slots;
}

function cleanupAttachmentUrls(meta: Record<string, TaskMeta>) {
  Object.values(meta).forEach((entry) => {
    entry.attachments.forEach((a) => URL.revokeObjectURL(a.url));
  });
}

function MiniRing({
  label,
  value,
  unit,
  percent,
  tone,
}: {
  label: string;
  value: number;
  unit: string;
  percent: number;
  tone: "good" | "warning";
}) {
  const radius = 26;
  const circumference = 2 * Math.PI * radius;
  const clamped = Math.max(0, Math.min(100, percent));
  const offset = circumference - (clamped / 100) * circumference;
  const color = tone === "good" ? "#16a34a" : "#dc2626";

  return (
    <div className="rounded-xl border border-slate-200/70 bg-slate-50 px-2 py-2">
      <div className="mb-1 text-[11px] font-medium text-slate-600">{label}</div>
      <div className="flex items-center gap-2">
        <svg width="64" height="64" viewBox="0 0 64 64" role="img" aria-label={`${label} progress`}>
          <circle cx="32" cy="32" r={radius} fill="none" stroke="#e2e8f0" strokeWidth="6" />
          <circle
            cx="32"
            cy="32"
            r={radius}
            fill="none"
            stroke={color}
            strokeWidth="6"
            strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={offset}
            transform="rotate(-90 32 32)"
          />
        </svg>
        <div>
          <div className="text-xl font-semibold text-slate-900">
            {value}
            {unit}
          </div>
          <div className="text-xs text-slate-500">{clamped}%</div>
        </div>
      </div>
    </div>
  );
}

function QuickStatRow({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <div className="rounded-lg border border-slate-200/70 bg-slate-50 px-2 py-2">
      <div className="mb-1 flex items-center justify-between text-xs text-slate-600">
        <span>{label}</span>
        <span className="font-medium" style={{ color }}>
          {value}
        </span>
      </div>
      <div className="h-1.5 rounded-full bg-slate-200">
        <div className="h-full rounded-full" style={{ width: `${Math.min(100, value * 20)}%`, background: color }} />
      </div>
    </div>
  );
}

function ConnectedPomodoroTimer({ plan }: { plan: StudyPlan }) {
  const { state, toggleTimer, resetTimer } = useTimer();
  
  const mins = Math.floor(state.timeLeft / 60).toString().padStart(2, "0");
  const secs = (state.timeLeft % 60).toString().padStart(2, "0");
  
  const isFocusing = state.running && state.mode === "focus";

  return (
    <div className="flex items-center justify-between rounded-xl border border-slate-200/60 bg-white p-2.5 px-4 shadow-sm mt-3">
      <div className="flex items-center gap-3">
        <div className={`flex h-9 w-9 items-center justify-center rounded-full transition-colors ${
          isFocusing ? "bg-red-100 text-red-600 animate-pulse" : "bg-slate-100 text-slate-500"
        }`}>
          <Clock size={16} />
        </div>
        <div>
          <div className="text-lg font-bold tracking-tight text-slate-800 leading-none font-mono">
            {mins}:{secs}
          </div>
          <div className="text-[10px] font-medium uppercase tracking-wider text-slate-500 mt-1">
            {state.mode === "focus" ? "Focusing" : "Break"} • {plan.subject || "General"}
          </div>
        </div>
      </div>
      
      <div className="flex items-center gap-3">
        <div className="hidden sm:flex items-center gap-1.5 text-xs font-semibold text-slate-600 mr-2">
          <span className="text-sm">🍅</span>
          <span>{state.sessionsCompleted}/4</span>
        </div>
        <div className="flex gap-1.5">
          <button
            type="button"
            onClick={toggleTimer}
            className={`flex h-8 w-8 items-center justify-center rounded-full transition-colors ${
              state.running 
                ? "bg-red-50 hover:bg-red-100 text-red-600" 
                : "bg-blue-50 text-blue-600 hover:bg-blue-100"
            }`}
            title={state.running ? "Pause" : "Start"}
          >
            {state.running ? <Pause size={14} className="fill-current" /> : <Play size={14} className="fill-current ml-0.5" />}
          </button>
          <button
            type="button"
            onClick={resetTimer}
            className="flex h-8 w-8 items-center justify-center rounded-full bg-slate-100 text-slate-600 hover:bg-slate-200 transition-colors"
            title="Reset"
          >
            <RotateCcw size={14} />
          </button>
        </div>
      </div>
    </div>
  );
}

export function StudyPlanner() {
  const navigate = useNavigate();
  const { user, settings, updateSettings } = useAuth();
  const { state: timerState } = useTimer();
  const { reminders, toggleReminder, removeReminder } = useNotes();
  const toast = useToast();

  const [plans, setPlans] = useState<StudyPlan[]>([]);
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [filter, setFilter] = useState<TaskStatus>("all");
  const [taskMeta, setTaskMeta] = useState<Record<string, TaskMeta>>({});
  const [smartModalOpen, setSmartModalOpen] = useState(false);
  const [smartLoading, setSmartLoading] = useState(false);
  const [smartSlots, setSmartSlots] = useState<SmartSlot[]>([]);
  const [dragTaskId, setDragTaskId] = useState<string | null>(null);
  const [pendingDeleteId, setPendingDeleteId] = useState<string | null>(null);

  const [showMonthlyTrend, setShowMonthlyTrend] = useState(false);
  const [studyWidgetExpanded, setStudyWidgetExpanded] = useState(false);
  const [studyWidgetTab, setStudyWidgetTab] = useState<StudyWidgetTab>("today");
  const [studyHistory, setStudyHistory] = useState<StudyLogEntry[]>([]);
  const [goalEditing, setGoalEditing] = useState(false);
  const [goalDraft, setGoalDraft] = useState(String(DEFAULT_DAILY_STUDY_GOAL_HOURS));

  const filteredPlans = useMemo(
    () => plans.filter((plan) => (filter === "all" ? true : plan.status === filter)),
    [plans, filter],
  );

  const statusCounts = useMemo(
    () => ({
      todo: plans.filter((p) => p.status === "todo").length,
      in_progress: plans.filter((p) => p.status === "in_progress").length,
      done: plans.filter((p) => p.status === "done").length,
    }),
    [plans],
  );

  useEffect(() => {
    setGoalDraft(String(settings?.daily_study_goal_hours ?? DEFAULT_DAILY_STUDY_GOAL_HOURS));
  }, [settings?.daily_study_goal_hours]);

  useEffect(() => {
    if (!user) {
      setStudyHistory([]);
      return;
    }

    const key = getStudyHistoryKey(user.id);
    setStudyHistory(safeParseStudyHistory(localStorage.getItem(key)));
  }, [user?.id]);

  useEffect(() => {
    if (!user) return;

    const key = getStudyHistoryKey(user.id);
    localStorage.setItem(key, JSON.stringify(studyHistory));
  }, [studyHistory, user?.id]);

  // Track session completions and save to study history
  const previousSessionCountRef = useRef(timerState.sessionsCompleted);
  const previousModeRef = useRef<typeof timerState.mode>(timerState.mode);

  useEffect(() => {
    if (!user || timerState.sessionsCompleted <= previousSessionCountRef.current) {
      previousSessionCountRef.current = timerState.sessionsCompleted;
      previousModeRef.current = timerState.mode;
      return;
    }

    // A session just completed
    previousSessionCountRef.current = timerState.sessionsCompleted;
    
    if (timerState.activeFocusSeconds > 0) {
      const minutes = Math.round(timerState.activeFocusSeconds / 60);
      const newEntry: StudyLogEntry = {
        id: `session-${Date.now()}`,
        minutes,
        timestamp: new Date().toISOString(),
        source: "pomodoro",
      };

      setStudyHistory((prev) => [...prev, newEntry]);

      // Show completion toast with animated message
      const message = timerState.mode === "break" 
        ? `✓ Focus session complete! ${minutes} min logged. Break time!`
        : `✓ ${minutes} min added to today's study time!`;
      
      toast.success(message, {
        duration: 4000,
        description: `Total sessions today: ${timerState.sessionsCompleted}`,
      } as any);
    }

    previousModeRef.current = timerState.mode;
  }, [timerState.sessionsCompleted, timerState.activeFocusSeconds, user?.id]);

  // Show notification when break ends and focus mode starts again
  useEffect(() => {
    if (previousModeRef.current === "break" && timerState.mode === "focus" && timerState.running) {
      toast.success("🎯 Break over! Ready to focus?", {
        duration: 3000,
        description: "Let's get back to it!",
      } as any);
    }
    previousModeRef.current = timerState.mode;
  }, [timerState.mode, timerState.running]);

  useEffect(() => {
    if (!user) return;

    const key = `luminote-studyplanner-meta-${user.id}`;
    try {
      const parsed = JSON.parse(localStorage.getItem(key) || "{}");
      if (parsed && typeof parsed === "object") {
        setTaskMeta(parsed);
      }
    } catch {
      setTaskMeta({});
    }
  }, [user?.id]);

  useEffect(() => {
    if (!user) return;
    const key = `luminote-studyplanner-meta-${user.id}`;
    const serializable = JSON.stringify(taskMeta);
    localStorage.setItem(key, serializable);

    return () => {
      cleanupAttachmentUrls(taskMeta);
    };
  }, [taskMeta, user?.id]);

  const loadPlans = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    setErrorMessage(null);

    const { data, error } = await supabase
      .from("study_plans")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false });

    if (error) {
      setErrorMessage("Unable to load your planner right now. Please try again.");
      setLoading(false);
      return;
    }

    const nextPlans = (data || []) as StudyPlan[];
    setPlans(nextPlans);
    setLoading(false);

    setTaskMeta((prev) => {
      const next: Record<string, TaskMeta> = { ...prev };
      nextPlans.forEach((plan) => {
        if (!next[plan.id]) {
          next[plan.id] = {
            expanded: false,
            progress: plan.status === "done" ? 100 : plan.status === "in_progress" ? 45 : 15,
            subtasks: [],
            attachments: [],
          };
        }
      });
      return next;
    });
  }, [user?.id]);

  useEffect(() => {
    void loadPlans();
  }, [loadPlans]);

  const { startTimer, pauseTimer } = useTimer();

  const requestPomodoroAction = useCallback((type: string) => {
    switch (type) {
      case "toggle":
        timerState.running ? pauseTimer() : startTimer();
        break;
      case "open-start":
        startTimer();
        break;
    }
  }, [timerState.running, startTimer, pauseTimer]);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null;
      const isTypingTarget =
        !!target &&
        (target.tagName === "INPUT" ||
          target.tagName === "TEXTAREA" ||
          target.isContentEditable);

      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        navigate("/home/search");
      }

      if (event.code === "Space" && !isTypingTarget) {
        event.preventDefault();
        requestPomodoroAction("toggle");
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [navigate, requestPomodoroAction]);

  const saveStudyGoal = async () => {
    const parsedGoal = Number(goalDraft);
    if (!Number.isFinite(parsedGoal) || parsedGoal <= 0) {
      toast.error("Enter a valid daily goal.");
      return;
    }

    try {
      await updateSettings({ daily_study_goal_hours: Math.min(24, Math.max(1, parsedGoal)) });
      setGoalEditing(false);
      toast.success("Daily study goal saved.");
    } catch {
      toast.error("We could not save your goal right now.");
    }
  };

  const updatePlanField = async (
    id: string,
    patch: Partial<Pick<StudyPlan, "status" | "due_date" | "priority" | "title" | "notes">>,
  ) => {
    const { error } = await (supabase.from("study_plans") as any).update(patch).eq("id", id);
    if (error) {
      toast.error("We could not save that change.");
      return false;
    }

    setPlans((prev) => prev.map((plan) => (plan.id === id ? { ...plan, ...patch } : plan)));
    return true;
  };

  const addTask = async () => {
    if (!user) return;
    if (!form.title.trim()) {
      toast.error("Task title is required.");
      return;
    }

    setSaving(true);
    const payload = {
      user_id: user.id,
      title: form.title.trim(),
      subject: form.subject.trim(),
      due_date: form.due_date || null,
      priority: form.priority,
      status: "todo" as const,
      notes: form.notes.trim(),
    };

    const { data, error } = await ((supabase.from("study_plans") as any)
      .insert(payload)
      .select("*")
      .single() as any);

    setSaving(false);

    if (error || !data) {
      toast.error("Could not create task. Please retry.");
      return;
    }

    setPlans((prev) => [data as StudyPlan, ...prev]);
    setTaskMeta((prev) => ({
      ...prev,
      [data.id]: { expanded: false, progress: 10, subtasks: [], attachments: [] },
    }));
    setForm(EMPTY_FORM);
    toast.success("Task created.");
  };

  const deleteTask = async (id: string) => {
    const { error } = await supabase.from("study_plans").delete().eq("id", id);
    if (error) {
      toast.error("Delete failed. Please retry.");
      return;
    }

    setPlans((prev) => prev.filter((plan) => plan.id !== id));
    setTaskMeta((prev) => {
      const next = { ...prev };
      delete next[id];
      return next;
    });
    setPendingDeleteId(null);
    toast.info("Task removed.");
  };

  const toggleSubtask = (planId: string, subtaskId: string) => {
    setTaskMeta((prev) => {
      const current = prev[planId];
      if (!current) return prev;
      const nextSubtasks = current.subtasks.map((s) =>
        s.id === subtaskId ? { ...s, done: !s.done } : s,
      );
      return {
        ...prev,
        [planId]: {
          ...current,
          subtasks: nextSubtasks,
          progress:
            nextSubtasks.length === 0
              ? current.progress
              : Math.round(
                  (nextSubtasks.filter((s) => s.done).length / nextSubtasks.length) * 100,
                ),
        },
      };
    });
  };

  const addSubtask = (planId: string, title: string) => {
    const trimmed = title.trim();
    if (!trimmed) return;

    setTaskMeta((prev) => {
      const current = prev[planId] || {
        expanded: true,
        progress: 10,
        subtasks: [],
        attachments: [],
      };
      return {
        ...prev,
        [planId]: {
          ...current,
          subtasks: [...current.subtasks, { id: crypto.randomUUID(), title: trimmed, done: false }],
          expanded: true,
        },
      };
    });
  };

  const addAttachments = (planId: string, files: FileList | null) => {
    if (!files || files.length === 0) return;

    const previews: AttachmentPreview[] = [];
    Array.from(files)
      .slice(0, 6)
      .forEach((file) => {
        previews.push({
          id: crypto.randomUUID(),
          name: file.name,
          url: URL.createObjectURL(file),
          isImage: file.type.startsWith("image/"),
        });
      });

    setTaskMeta((prev) => {
      const current = prev[planId] || {
        expanded: true,
        progress: 10,
        subtasks: [],
        attachments: [],
      };
      return {
        ...prev,
        [planId]: {
          ...current,
          attachments: [...current.attachments, ...previews].slice(0, 8),
          expanded: true,
        },
      };
    });
  };

  const openSmartSchedule = () => {
    setSmartModalOpen(true);
    setSmartLoading(true);
    const generated = createInitialSlots(plans);

    window.setTimeout(() => {
      setSmartSlots(generated);
      setSmartLoading(false);
    }, 500);
  };

  const assignedTaskIds = useMemo(
    () => new Set(smartSlots.map((slot) => slot.taskId).filter(Boolean) as string[]),
    [smartSlots],
  );

  const unscheduledPlans = useMemo(
    () => plans.filter((plan) => !assignedTaskIds.has(plan.id) && plan.status !== "done"),
    [plans, assignedTaskIds],
  );

  const slotColumns = useMemo(() => {
    const grouped: Record<string, SmartSlot[]> = {};
    smartSlots.forEach((slot) => {
      if (!grouped[slot.dayLabel]) grouped[slot.dayLabel] = [];
      grouped[slot.dayLabel].push(slot);
    });
    return grouped;
  }, [smartSlots]);

  const completionRate = useMemo(() => {
    if (plans.length === 0) return 0;
    return Math.round((statusCounts.done / plans.length) * 100);
  }, [plans.length, statusCounts.done]);

  const openTaskCount = statusCounts.todo + statusCounts.in_progress;

  const studyGoalHours = settings?.daily_study_goal_hours ?? DEFAULT_DAILY_STUDY_GOAL_HOURS;
  const activeSessionMinutes = timerState.running && timerState.mode === "focus"
    ? timerState.activeFocusSeconds / 60
    : 0;

  const studyEntries = useMemo(() => {
    const activeEntry = activeSessionMinutes > 0
      ? [
          {
            id: "active-session",
            minutes: activeSessionMinutes,
            timestamp: new Date().toISOString(),
            source: "active" as const,
          },
        ]
      : [];

    return [...studyHistory, ...activeEntry];
  }, [activeSessionMinutes, studyHistory]);

  const studyToday = useMemo(() => {
    const today = startOfToday();
    const todayKey = format(today, "yyyy-MM-dd");
    const entriesToday = studyEntries.filter((entry) => format(parseISO(entry.timestamp), "yyyy-MM-dd") === todayKey);
    const totalMinutes = entriesToday.reduce((total, entry) => total + entry.minutes, 0);
    const todayHours = minutesToHours(totalMinutes);
    const goalProgress = studyGoalHours > 0 ? Math.min(100, Math.round((todayHours / studyGoalHours) * 100)) : 0;

    const chartData = Array.from({ length: 24 }).map((_, hour) => {
      const hourMinutes = entriesToday.reduce((total, entry) => {
        if (parseISO(entry.timestamp).getHours() !== hour) return total;
        return total + entry.minutes;
      }, 0);

      return {
        hour: `${hour.toString().padStart(2, "0")}:00`,
        hours: minutesToHours(hourMinutes),
      };
    });

    const yesterday = subDays(today, 1);
    const comparison = minutesToHours(totalMinutes - sumStudyMinutesForDay(studyEntries, yesterday));

    return {
      todayHours,
      goalProgress,
      chartData,
      comparison,
      comparisonLabel: comparison >= 0 ? `+${comparison.toFixed(1)}h vs yesterday` : `${comparison.toFixed(1)}h vs yesterday`,
    };
  }, [studyEntries, studyGoalHours]);

  const studyWeek = useMemo(() => {
    const today = startOfToday();
    const weekStart = startOfWeek(today, { weekStartsOn: 1 });
    const days = eachDayOfInterval({ start: weekStart, end: today });
    const daysElapsed = Math.max(1, days.length);
    const totalMinutes = sumStudyMinutesInRange(studyEntries, weekStart, today);
    const totalHours = minutesToHours(totalMinutes);
    const goalHours = studyGoalHours * daysElapsed;
    const goalProgress = goalHours > 0 ? Math.min(100, Math.round((totalHours / goalHours) * 100)) : 0;

    const chartData = days.map((day) => ({
      day: format(day, "EEE"),
      hours: minutesToHours(sumStudyMinutesForDay(studyEntries, day)),
    }));

    const previousStart = subDays(weekStart, daysElapsed);
    const previousEnd = subDays(weekStart, 1);
    const previousHours = minutesToHours(sumStudyMinutesInRange(studyEntries, previousStart, previousEnd));

    return {
      totalHours,
      goalHours,
      goalProgress,
      chartData,
      comparison: totalHours - previousHours,
      comparisonLabel: `${totalHours - previousHours >= 0 ? "+" : ""}${(totalHours - previousHours).toFixed(1)}h vs previous period`,
      breakdownLabel: "Daily breakdown",
    };
  }, [studyEntries, studyGoalHours]);

  const studyMonth = useMemo(() => {
    const today = startOfToday();
    const monthStart = startOfMonth(today);
    const monthDays = eachDayOfInterval({ start: monthStart, end: today });
    const daysElapsed = Math.max(1, monthDays.length);
    const totalMinutes = sumStudyMinutesInRange(studyEntries, monthStart, today);
    const totalHours = minutesToHours(totalMinutes);
    const goalHours = studyGoalHours * daysElapsed;
    const goalProgress = goalHours > 0 ? Math.min(100, Math.round((totalHours / goalHours) * 100)) : 0;

    const chartData = eachWeekOfInterval({ start: monthStart, end: today }, { weekStartsOn: 1 }).map((weekStart) => {
      const weekEnd = new Date(Math.min(addDays(weekStart, 6).getTime(), today.getTime()));
      return {
        week: format(weekStart, "MMM d"),
        hours: minutesToHours(sumStudyMinutesInRange(studyEntries, weekStart, weekEnd)),
      };
    });

    const previousStart = subMonths(monthStart, 1);
    const previousEnd = subDays(monthStart, 1);
    const previousHours = minutesToHours(sumStudyMinutesInRange(studyEntries, previousStart, previousEnd));

    return {
      totalHours,
      goalHours,
      goalProgress,
      chartData,
      comparison: totalHours - previousHours,
      comparisonLabel: `${totalHours - previousHours >= 0 ? "+" : ""}${(totalHours - previousHours).toFixed(1)}h vs previous month`,
      breakdownLabel: "Weekly breakdown",
    };
  }, [studyEntries, studyGoalHours]);

  const studyYear = useMemo(() => {
    const today = startOfToday();
    const yearStart = startOfYear(today);
    const yearMonths = eachMonthOfInterval({ start: yearStart, end: today });
    const daysElapsed = Math.max(1, differenceInCalendarDays(today, yearStart) + 1);
    const totalMinutes = sumStudyMinutesInRange(studyEntries, yearStart, today);
    const totalHours = minutesToHours(totalMinutes);
    const goalHours = studyGoalHours * daysElapsed;
    const goalProgress = goalHours > 0 ? Math.min(100, Math.round((totalHours / goalHours) * 100)) : 0;

    const chartData = yearMonths.map((monthStart) => {
      const monthEnd = new Date(Math.min(endOfMonth(monthStart).getTime(), today.getTime()));
      return {
        month: format(monthStart, "MMM"),
        hours: minutesToHours(sumStudyMinutesInRange(studyEntries, monthStart, monthEnd)),
      };
    });

    const previousStart = subYears(yearStart, 1);
    const previousEnd = subDays(yearStart, 1);
    const previousHours = minutesToHours(sumStudyMinutesInRange(studyEntries, previousStart, previousEnd));

    return {
      totalHours,
      goalHours,
      goalProgress,
      chartData,
      comparison: totalHours - previousHours,
      comparisonLabel: `${totalHours - previousHours >= 0 ? "+" : ""}${(totalHours - previousHours).toFixed(1)}h vs previous year`,
      breakdownLabel: "Monthly breakdown",
    };
  }, [studyEntries, studyGoalHours]);

  const weeklyData = studyWeek.chartData;
  const studyTimeThisWeek = studyWeek.totalHours;
  const weeklyGoalHours = studyWeek.goalHours;
  const weeklyGoalProgress = studyWeek.goalProgress;
  const activeProjectsProgress = plans.length === 0 ? 0 : Math.round((openTaskCount / plans.length) * 100);

  const tasksMessage =
    plans.length === 0
      ? "Start your first task!"
      : completionRate === 0
        ? "You are set up. Finish one small task to kick off."
        : completionRate < 60
          ? "Solid progress. Keep checking off tasks."
          : "Excellent pace. You are on track.";

  const monthlyTrend = useMemo(() => {
    return studyYear.chartData.slice(-6).map((point, index) => {
      const estimatedMonthlyGoal = Math.max(1, studyGoalHours * 30);
      const productivity = Math.min(100, Math.round((point.hours / estimatedMonthlyGoal) * 100));
      return {
        month: point.month,
        productivity: productivity === 0 ? 35 + index * 6 : productivity,
      };
    });
  }, [studyGoalHours, studyYear.chartData]);

  const studySections: Array<{ id: StudyWidgetTab; label: string }> = [
    { id: "today", label: "Today" },
    { id: "week", label: "This Week" },
    { id: "month", label: "This Month" },
    { id: "year", label: "This Year" },
  ];

  const activeStudyPeriod =
    studyWidgetTab === "today"
      ? {
          title: "Today",
          totalHours: studyToday.todayHours,
          goalHours: studyGoalHours,
          goalProgress: studyToday.goalProgress,
          chartData: studyToday.chartData,
          comparisonLabel: studyToday.comparisonLabel,
          breakdownLabel: "Hourly activity",
          chartType: "line" as const,
          chartKey: "hour",
        }
      : studyWidgetTab === "week"
        ? {
            title: "This Week",
            totalHours: studyWeek.totalHours,
            goalHours: studyWeek.goalHours,
            goalProgress: studyWeek.goalProgress,
            chartData: studyWeek.chartData,
            comparisonLabel: studyWeek.comparisonLabel,
            breakdownLabel: studyWeek.breakdownLabel,
            chartType: "bar" as const,
            chartKey: "day",
          }
        : studyWidgetTab === "month"
          ? {
              title: "This Month",
              totalHours: studyMonth.totalHours,
              goalHours: studyMonth.goalHours,
              goalProgress: studyMonth.goalProgress,
              chartData: studyMonth.chartData,
              comparisonLabel: studyMonth.comparisonLabel,
              breakdownLabel: studyMonth.breakdownLabel,
              chartType: "bar" as const,
              chartKey: "week",
            }
          : {
              title: "This Year",
              totalHours: studyYear.totalHours,
              goalHours: studyYear.goalHours,
              goalProgress: studyYear.goalProgress,
              chartData: studyYear.chartData,
              comparisonLabel: studyYear.comparisonLabel,
              breakdownLabel: studyYear.breakdownLabel,
              chartType: "bar" as const,
              chartKey: "month",
            };

  const studyTone =
    studyToday.goalProgress >= 100 ? "good" : studyToday.goalProgress >= 60 ? "warning" : "danger";

  const studyMessage =
    studyToday.todayHours === 0
      ? "No study hours yet - get going!"
      : studyToday.goalProgress >= 100
        ? "Great job! You hit today's goal."
        : studyToday.goalProgress >= 60
          ? "Almost at your goal - keep it up!"
          : "Keep it up. One more focus block helps.";

  const timerStatusLabel =
    timerState.running && timerState.mode === "focus"
      ? "Pomodoro active"
      : timerState.running
        ? "Break running"
        : "Ready to study";

  return (
    <div className="sp-shell">
      <style>{CSS}</style>

      <main className="mx-auto grid w-full max-w-[1520px] grid-cols-1 gap-4 px-4 pb-8 sm:px-6 lg:grid-cols-3 lg:gap-6 lg:px-8">
        <section className="lg:col-span-2">
          <div className="sp-card p-4 sm:p-6">
            <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
              <div>
                <h2 className="sp-heading-lg">Tasks</h2>
                <p className="sp-body sp-muted">Simple task cards with subtasks, files, due dates, and progress.</p>
              </div>
              <button type="button" className="sp-btn sp-btn-primary" onClick={openSmartSchedule}>
                <Sparkles size={15} /> Smart Schedule
              </button>
            </div>

            <div className="mb-4 grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-4">
              {(["all", "todo", "in_progress", "done"] as TaskStatus[]).map((status) => {
                const active = filter === status;
                const value =
                  status === "all"
                    ? plans.length
                    : status === "todo"
                      ? statusCounts.todo
                      : status === "in_progress"
                        ? statusCounts.in_progress
                        : statusCounts.done;

                return (
                  <button
                    key={status}
                    type="button"
                    className="sp-focusable rounded-xl border px-3 py-2 text-left transition-all duration-200"
                    onClick={() => setFilter(status)}
                    style={{
                      borderColor: active ? "rgba(37, 99, 235, 0.5)" : "var(--sp-border)",
                      background: active ? "rgba(37, 99, 235, 0.08)" : "#ffffff",
                    }}
                  >
                    <div className="text-xs uppercase tracking-wide text-slate-500">
                      {status === "all" ? "All" : STATUS_LABEL[status]}
                    </div>
                    <div className="text-xl font-semibold text-slate-900">{value}</div>
                  </button>
                );
              })}
            </div>

            <div className="mb-4 rounded-xl border border-slate-200/60 bg-slate-50/50 p-3 shadow-sm">
              <div className="grid grid-cols-1 gap-2 md:grid-cols-12 md:items-start">
                <input
                  className="sp-input md:col-span-3 text-sm py-1.5"
                  value={form.title}
                  onChange={(e) => setForm((prev) => ({ ...prev, title: e.target.value }))}
                  placeholder="Task title"
                />
                <input
                  className="sp-input md:col-span-2 text-sm py-1.5"
                  value={form.subject}
                  onChange={(e) => setForm((prev) => ({ ...prev, subject: e.target.value }))}
                  placeholder="Subject"
                />
                <input
                  className="sp-input md:col-span-2 text-sm py-1.5"
                  type="date"
                  value={form.due_date}
                  onChange={(e) => setForm((prev) => ({ ...prev, due_date: e.target.value }))}
                />
                <select
                  className="sp-select md:col-span-2 text-sm py-1.5"
                  value={form.priority}
                  onChange={(e) => setForm((prev) => ({ ...prev, priority: e.target.value as Priority }))}
                >
                  <option value="low">Low Priority</option>
                  <option value="medium">Medium Priority</option>
                  <option value="high">High Priority</option>
                </select>
                <div className="md:col-span-3">
                  <button type="button" disabled={saving} className="sp-btn sp-btn-primary w-full py-1.5 flex justify-center text-sm" onClick={addTask}>
                    <Plus size={14} /> {saving ? "..." : "Add Task"}
                  </button>
                </div>
              </div>
              <input
                className="sp-input w-full mt-2 text-sm py-1.5 bg-transparent border-dashed"
                value={form.notes}
                onChange={(e) => setForm((prev) => ({ ...prev, notes: e.target.value }))}
                placeholder="Add notes (optional)..."
              />
            </div>

            {errorMessage && (
              <div className="mb-4 rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
                {errorMessage}
              </div>
            )}

            <div className="mt-4 flex items-center justify-between text-xs text-slate-500 mb-2">
              <span className="font-medium text-slate-700">Your Tasks</span>
              {filteredPlans.length > 1 && <span>Scroll for {filteredPlans.length - 1} more</span>}
            </div>

            <div 
              className="max-h-[460px] overflow-y-auto pr-2 pb-16 flex flex-col gap-4" 
              style={{ scrollSnapType: "y mandatory", scrollBehavior: "smooth" }}
            >
              {loading ? (
                <div className="space-y-4">
                  <div className="sp-skeleton h-20" />
                  <div className="sp-skeleton h-20" />
                  <div className="sp-skeleton h-20" />
                </div>
              ) : filteredPlans.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-slate-300/60 bg-slate-50 p-8 text-center">
                  <FolderOpen size={34} className="mx-auto mb-3 text-slate-400" />
                  <h3 className="mb-1 text-lg font-semibold text-slate-900">No tasks in this view</h3>
                  <p className="text-sm text-slate-500">Add your first task above, or adjust filters to see more items.</p>
                </div>
              ) : (
                <>
                  {filteredPlans.map((plan) => {
                  const meta = taskMeta[plan.id] || {
                    expanded: false,
                    progress: plan.status === "done" ? 100 : 25,
                    subtasks: [],
                    attachments: [],
                  };
                  const priorityStyle = PRIORITY_STYLE[plan.priority];
                  const due = plan.due_date ? parseISO(plan.due_date) : null;
                  const daysLeft = due ? differenceInCalendarDays(due, new Date()) : null;

                  return (
                    <div 
                      key={plan.id} 
                      className="shrink-0 w-full" 
                      style={{ scrollSnapAlign: "start", scrollMarginTop: "0.5rem" }}
                    >
                      <article
                        className="sp-card p-3 sm:p-4 mb-2 shadow-sm transition-shadow focus-within:ring-2 focus-within:ring-blue-500/50"
                        style={{ borderColor: priorityStyle.border }}
                      >
                      <div className="flex flex-wrap items-start justify-between gap-2">
                        <div className="min-w-0">
                          <div className="mb-1 flex flex-wrap items-center gap-2">
                            <h3 className="truncate text-[17px] font-semibold text-slate-900">{plan.title}</h3>
                            <span className="sp-badge" style={{ background: `${priorityStyle.badge}1a`, color: priorityStyle.badge }}>
                              {plan.priority.toUpperCase()}
                            </span>
                            <span className="sp-badge bg-slate-100 text-slate-600">
                              {STATUS_LABEL[plan.status]}
                            </span>
                          </div>
                          <p className="text-sm text-slate-500">{plan.subject || "General"}</p>
                        </div>

                        <div className="flex items-center gap-1">
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <button
                                type="button"
                                className="sp-btn sp-btn-subtle"
                                onClick={async () => {
                                  const next =
                                    plan.status === "todo"
                                      ? "in_progress"
                                      : plan.status === "in_progress"
                                        ? "done"
                                        : "todo";
                                  const ok = await updatePlanField(plan.id, { status: next });
                                  if (ok) toast.success(`Task moved to ${STATUS_LABEL[next]}.`);
                                }}
                                aria-label="Cycle status"
                              >
                                <Check size={15} />
                              </button>
                            </TooltipTrigger>
                            <TooltipContent sideOffset={6}>Cycle status</TooltipContent>
                          </Tooltip>

                          <Tooltip>
                            <TooltipTrigger asChild>
                              <button
                                type="button"
                                className="sp-btn sp-btn-subtle"
                                onClick={() => setPendingDeleteId(plan.id)}
                                aria-label="Delete task"
                              >
                                <Trash2 size={15} />
                              </button>
                            </TooltipTrigger>
                            <TooltipContent sideOffset={6}>Delete task</TooltipContent>
                          </Tooltip>
                        </div>
                      </div>

                      <div className="mt-3 grid grid-cols-1 gap-2 md:grid-cols-2">
                        <label className="text-xs font-medium text-slate-500">
                          Due Date
                          <input
                            className="sp-input mt-1"
                            type="date"
                            value={plan.due_date ?? ""}
                            onChange={async (e) => {
                              const nextDate = e.target.value || null;
                              const ok = await updatePlanField(plan.id, { due_date: nextDate });
                              if (ok) toast.success("Due date updated.");
                            }}
                          />
                        </label>

                        <label className="text-xs font-medium text-slate-500">
                          Priority
                          <select
                            className="sp-select mt-1"
                            value={plan.priority}
                            onChange={async (e) => {
                              const nextPriority = e.target.value as Priority;
                              const ok = await updatePlanField(plan.id, { priority: nextPriority });
                              if (ok) toast.success("Priority updated.");
                            }}
                          >
                            <option value="low">Low</option>
                            <option value="medium">Medium</option>
                            <option value="high">High</option>
                          </select>
                        </label>
                      </div>

                      <div className="mt-3 flex flex-wrap items-center gap-2 text-xs text-slate-500">
                        <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2 py-1">
                          <CalendarDays size={12} />
                          {due ? format(due, "MMM d, yyyy") : "No due date"}
                        </span>
                        {daysLeft !== null && (
                          <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2 py-1">
                            <Clock3 size={12} />
                            {daysLeft >= 0 ? `${daysLeft} day${daysLeft === 1 ? "" : "s"} left` : `${Math.abs(daysLeft)} day${Math.abs(daysLeft) === 1 ? "" : "s"} overdue`}
                          </span>
                        )}
                        {isToday(due ?? new Date("1900-01-01")) && (
                          <span className="inline-flex items-center gap-1 rounded-full bg-blue-100 px-2 py-1 text-blue-700">Due today</span>
                        )}
                      </div>

                      <div className="mt-3">
                        <div className="mb-1 flex items-center justify-between text-xs text-slate-500">
                          <span>Long-term progress</span>
                          <span>{meta.progress}%</span>
                        </div>
                        <div className="sp-progress-track">
                          <div className="sp-progress-fill" style={{ width: `${meta.progress}%` }} />
                        </div>
                        <input
                          type="range"
                          min={0}
                          max={100}
                          value={meta.progress}
                          onChange={(e) => {
                            const value = Number(e.target.value);
                            setTaskMeta((prev) => ({
                              ...prev,
                              [plan.id]: { ...meta, progress: value },
                            }));
                          }}
                          className="mt-2 w-full"
                        />
                      </div>

                      <button
                        type="button"
                        onClick={() =>
                          setTaskMeta((prev) => ({
                            ...prev,
                            [plan.id]: { ...meta, expanded: !meta.expanded },
                          }))
                        }
                        className="mt-3 inline-flex items-center gap-1 text-sm font-medium text-blue-700"
                      >
                        {meta.expanded ? <ChevronUp size={15} /> : <ChevronDown size={15} />}
                        {meta.expanded ? "Hide details" : "Expand details"}
                      </button>

                      <div className={`sp-slide ${meta.expanded ? "open" : ""}`}>
                        <div className="mt-3 grid grid-cols-1 gap-4 lg:grid-cols-2">
                          <div>
                            <div className="mb-2 flex items-center justify-between">
                              <h4 className="text-sm font-semibold text-slate-800">Subtasks</h4>
                              <span className="text-xs text-slate-500">{meta.subtasks.filter((s) => s.done).length}/{meta.subtasks.length}</span>
                            </div>
                            <div className="space-y-2">
                              {meta.subtasks.map((subtask) => (
                                <label key={subtask.id} className="flex items-center gap-2 rounded-lg border border-slate-200/70 bg-slate-50 px-2 py-2 text-sm">
                                  <input
                                    type="checkbox"
                                    checked={subtask.done}
                                    onChange={() => toggleSubtask(plan.id, subtask.id)}
                                  />
                                  <span className={subtask.done ? "text-slate-400 line-through" : "text-slate-700"}>
                                    {subtask.title}
                                  </span>
                                </label>
                              ))}
                              {meta.subtasks.length === 0 && (
                                <div className="rounded-lg border border-dashed border-slate-300 bg-slate-50 px-2 py-3 text-center text-xs text-slate-500">
                                  No subtasks yet.
                                </div>
                              )}
                            </div>
                            <SubtaskComposer onAdd={(title) => addSubtask(plan.id, title)} />
                          </div>

                          <div>
                            <div className="mb-2 flex items-center gap-2">
                              <Paperclip size={14} className="text-slate-500" />
                              <h4 className="text-sm font-semibold text-slate-800">Attachments</h4>
                            </div>
                            <label className="mb-2 inline-flex cursor-pointer items-center gap-2 rounded-lg border border-slate-300 bg-slate-50 px-3 py-2 text-sm text-slate-700 transition hover:bg-slate-100">
                              <Plus size={14} /> Add files
                              <input
                                className="hidden"
                                type="file"
                                multiple
                                onChange={(e) => addAttachments(plan.id, e.target.files)}
                              />
                            </label>
                            <div className="grid grid-cols-2 gap-2">
                              {meta.attachments.length === 0 ? (
                                <div className="col-span-2 rounded-lg border border-dashed border-slate-300 bg-slate-50 px-2 py-3 text-center text-xs text-slate-500">
                                  No files attached.
                                </div>
                              ) : (
                                meta.attachments.map((attachment) => (
                                  <div key={attachment.id} className="overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm">
                                    {attachment.isImage ? (
                                      <img src={attachment.url} alt={attachment.name} className="h-20 w-full object-cover" />
                                    ) : (
                                      <div className="flex h-20 items-center justify-center bg-slate-100 text-slate-500">
                                        <FileText size={20} />
                                      </div>
                                    )}
                                    <div className="truncate px-2 py-1 text-[11px] text-slate-600" title={attachment.name}>
                                      {attachment.name}
                                    </div>
                                  </div>
                                ))
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                    </article>
                    <ConnectedPomodoroTimer plan={plan} />
                  </div>
                  );
                  })}
                </>
              )}
            </div>
          </div>
        </section>

        <aside className="space-y-4 lg:space-y-6">
          <section className="sp-card p-4 sm:p-5">
            <div className="mb-3 flex items-center justify-between">
              <h2 className="sp-heading-lg">Analytics</h2>
              <span className="text-xs text-slate-500">Quick Snapshot</span>
            </div>

            <div className="sp-analytics-grid">
              <article
                className="sp-analytics-tile sp-clickable-study"
                role="button"
                tabIndex={0}
                aria-label="Open study time tracker"
                onClick={() => setStudyWidgetExpanded(true)}
                onKeyDown={(event) => {
                  if (event.key === "Enter" || event.key === " ") {
                    event.preventDefault();
                    setStudyWidgetExpanded(true);
                  }
                }}
              >
                <div className="mb-2 flex items-center justify-between">
                  <div className="flex items-center gap-2 text-slate-800">
                    <Clock3 size={15} className="text-blue-600" />
                    <span className="sp-mini-label">Study Time Today</span>
                  </div>
                  <span className="text-sm font-semibold text-slate-900">{studyToday.todayHours.toFixed(1)}h</span>
                </div>
                <div className="mb-2 h-[64px] rounded-lg border border-slate-200/70 bg-slate-50 p-1">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={studyToday.chartData} margin={{ top: 4, right: 6, bottom: 2, left: 0 }}>
                      <Line
                        type="monotone"
                        dataKey="hours"
                        stroke="#2563eb"
                        strokeWidth={2.4}
                        dot={false}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
                <div className="mb-2 flex items-center justify-between text-xs text-slate-500">
                  <span>Goal progress</span>
                  <span>{studyToday.goalProgress}% of {formatStudyHours(studyGoalHours)}</span>
                </div>
                <div className="sp-progress-track mb-2">
                  <div className="sp-progress-fill" style={{ width: `${studyToday.goalProgress}%` }} />
                </div>
                <p className="text-xs" style={{ color: studyToday.todayHours === 0 ? "#dc2626" : "#16a34a" }}>{studyMessage}</p>
                <div className="mt-2 flex items-center justify-between">
                  <span className="sp-click-hint">Tap To Open Tracker</span>
                  <ChevronDown size={14} className="text-blue-600" />
                </div>
              </article>

              <article className="sp-analytics-tile">
                <div className="mb-3 flex items-center gap-2 text-slate-800">
                  <BookOpenCheck size={15} className="text-emerald-600" />
                  <span className="sp-mini-label">Current Projects + Tasks Finished</span>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <MiniRing
                    label="Current Projects"
                    value={openTaskCount}
                    unit=""
                    percent={activeProjectsProgress}
                    tone={openTaskCount === 0 ? "warning" : "good"}
                  />
                  <MiniRing
                    label="Tasks Finished"
                    value={completionRate}
                    unit="%"
                    percent={completionRate}
                    tone={completionRate >= 60 ? "good" : "warning"}
                  />
                </div>
                <p className="mt-2 text-xs" style={{ color: completionRate >= 60 ? "#16a34a" : "#dc2626" }}>{tasksMessage}</p>
              </article>

              <article className="sp-analytics-tile">
                <div className="mb-2 flex items-center gap-2 text-slate-800">
                  <Trophy size={15} className="text-amber-600" />
                  <span className="sp-mini-label">Task Breakdown</span>
                </div>
                <div className="space-y-2">
                  <QuickStatRow label="To Do" value={statusCounts.todo} color="#64748b" />
                  <QuickStatRow label="In Progress" value={statusCounts.in_progress} color="#2563eb" />
                  <QuickStatRow label="Done" value={statusCounts.done} color="#16a34a" />
                </div>
                <p className="mt-2 text-xs text-slate-500">Focus on moving one task from To Do to Done today.</p>
              </article>

              <article className="sp-analytics-tile">
                <div className="mb-2 flex items-center justify-between">
                  <div className="flex items-center gap-2 text-slate-800">
                    <BarChart3 size={15} className="text-slate-600" />
                    <span className="sp-mini-label">Monthly Trend</span>
                  </div>
                  <button
                    type="button"
                    className="text-xs font-medium text-blue-700"
                    onClick={() => setShowMonthlyTrend((prev) => !prev)}
                  >
                    {showMonthlyTrend ? "Hide" : "Show"}
                  </button>
                </div>

                {showMonthlyTrend ? (
                  <div className="h-[110px] rounded-lg border border-slate-200/70 bg-slate-50 p-1">
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={monthlyTrend} margin={{ left: -18, right: 8, top: 8, bottom: 0 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                        <XAxis dataKey="month" tick={{ fill: "#64748b", fontSize: 10 }} axisLine={false} tickLine={false} />
                        <YAxis tick={{ fill: "#64748b", fontSize: 10 }} axisLine={false} tickLine={false} width={24} domain={[0, 100]} />
                        <Line type="monotone" dataKey="productivity" stroke="#0ea5e9" strokeWidth={2.2} dot={false} />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                ) : (
                  <p className="rounded-lg border border-dashed border-slate-300 bg-slate-50 px-3 py-4 text-xs text-slate-500">
                    Hidden to keep this dashboard compact. Tap Show when you want a 6-month view.
                  </p>
                )}
              </article>
            </div>
          </section>

          {/* Upcoming Reminders Section */}
          <section className="sp-card p-4 sm:p-5">
            <div className="mb-3 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <h2 className="sp-heading-lg">Upcoming Reminders</h2>
              </div>
              <a href="/home/calendar" className="text-sm font-medium text-blue-700 hover:text-blue-800">
                View all
              </a>
            </div>

            {reminders.length === 0 ? (
              <div className="rounded-lg border border-dashed border-slate-300 bg-slate-50 px-4 py-8 text-center">
                <Clock size={28} className="mx-auto mb-2 text-slate-400" />
                <p className="text-sm text-slate-500">No upcoming reminders</p>
              </div>
            ) : (
              <div className="space-y-2">
                {reminders
                  .filter(r => !r.is_completed && new Date(r.scheduled_at) > new Date())
                  .sort((a, b) => new Date(a.scheduled_at).getTime() - new Date(b.scheduled_at).getTime())
                  .slice(0, 5)
                  .map(reminder => {
                    const { date, time, isToday } = formatReminderDate(reminder.scheduled_at);
                    return (
                      <div
                        key={reminder.id}
                        className="flex items-start justify-between rounded-lg border border-slate-200/70 bg-slate-50 p-3 hover:bg-slate-100/50 transition"
                      >
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-slate-900 text-sm truncate">{reminder.title}</p>
                          <div className="flex items-center gap-1 mt-1 text-xs text-slate-500">
                            <CalendarDays size={12} />
                            <span>{isToday ? "Today" : date} · {time}</span>
                          </div>
                        </div>
                        <div className="flex items-center gap-1 ml-2 flex-shrink-0">
                          <button
                            type="button"
                            onClick={() => toggleReminder(reminder.id)}
                            className="p-1 hover:bg-slate-200 rounded transition"
                            aria-label="Complete reminder"
                          >
                            <Check size={14} className="text-green-600" />
                          </button>
                          <button
                            type="button"
                            onClick={() => removeReminder(reminder.id)}
                            className="p-1 hover:bg-red-100 rounded transition"
                            aria-label="Delete reminder"
                          >
                            <X size={14} className="text-red-600" />
                          </button>
                        </div>
                      </div>
                    );
                  })}
              </div>
            )}
          </section>

        </aside>
      </main>

      {studyWidgetExpanded && (
        <div className="sp-overlay" role="dialog" aria-modal="true" aria-label="Study time tracker">
          <div className="sp-modal" style={{ width: "min(1040px, calc(100vw - 24px))" }}>
            <header className="flex items-center justify-between border-b border-slate-200/70 px-4 py-3 sm:px-6">
              <div>
                <h3 className="text-xl font-semibold text-slate-900">Study Time Tracker</h3>
                <p className="text-sm text-slate-500">Track your progress across today, week, month, and year.</p>
              </div>
              <button
                type="button"
                className="sp-btn sp-btn-subtle"
                onClick={() => {
                  setStudyWidgetExpanded(false);
                  setGoalEditing(false);
                }}
                aria-label="Close study tracker"
              >
                <X size={16} />
              </button>
            </header>

            <div className="grid flex-1 grid-cols-1 gap-4 overflow-auto p-4 sm:p-6 lg:grid-cols-[minmax(0,320px)_1fr]">
              <section className="rounded-2xl border border-slate-200/70 bg-slate-50 p-4">
                <div className="mb-2 flex items-center gap-2">
                  <Clock3 size={16} className="text-blue-600" />
                  <span className="sp-mini-label">Study Time Today</span>
                  <span className="sp-badge bg-slate-100 text-slate-700">{timerStatusLabel}</span>
                </div>
                <div className="text-4xl font-semibold tracking-tight text-slate-950">{studyToday.todayHours.toFixed(1)}h</div>
                <div className="mt-1 text-sm text-slate-500">of {formatStudyHours(studyGoalHours)} today</div>

                <div className="mt-3 flex flex-wrap items-center gap-2">
                  <span className="sp-badge bg-slate-100 text-slate-700">{studyToday.goalProgress}% of {formatStudyHours(studyGoalHours)}</span>
                  <span className="sp-badge bg-slate-100 text-slate-700">{timerState.sessionsCompleted} session{timerState.sessionsCompleted === 1 ? "" : "s"}</span>
                  <span className="sp-badge bg-slate-100 text-slate-700">Active {activeSessionMinutes > 0 ? formatStudyHours(minutesToHours(activeSessionMinutes)) : "0h"}</span>
                </div>

                <div className="mt-3 rounded-xl border border-slate-200 bg-white p-3">
                  <div className="mb-2 flex items-center justify-between text-xs text-slate-500">
                    <span>{studyMessage}</span>
                    <span>{studyToday.goalProgress}%</span>
                  </div>
                  <div className="sp-progress-track">
                    <div className="sp-progress-fill" style={{ width: `${Math.min(100, studyToday.goalProgress)}%` }} />
                  </div>
                </div>

                <div className="mt-3 flex items-center gap-2">
                  <button
                    type="button"
                    className="sp-btn sp-btn-subtle"
                    onClick={() => setGoalEditing((prev) => !prev)}
                  >
                    <PencilLine size={14} /> {goalEditing ? "Close Goal" : "Edit Goal"}
                  </button>
                  <button type="button" className="sp-btn sp-btn-primary" onClick={() => requestPomodoroAction("open-start")}>
                    <Play size={14} /> Start Pomodoro
                  </button>
                </div>

                {goalEditing && (
                  <div className="mt-3 grid gap-2 rounded-xl border border-slate-200 bg-white p-3 sm:grid-cols-[minmax(0,1fr)_auto_auto]">
                    <input
                      className="sp-input"
                      type="number"
                      min="1"
                      max="24"
                      step="0.5"
                      value={goalDraft}
                      onChange={(event) => setGoalDraft(event.target.value)}
                      placeholder="12"
                    />
                    <button type="button" className="sp-btn sp-btn-primary" onClick={saveStudyGoal}>Save</button>
                    <button
                      type="button"
                      className="sp-btn sp-btn-subtle"
                      onClick={() => {
                        setGoalDraft(String(studyGoalHours));
                        setGoalEditing(false);
                      }}
                    >
                      Cancel
                    </button>
                  </div>
                )}
              </section>

              <section className="rounded-2xl border border-slate-200/70 bg-white p-4">
                <div className="mb-3 flex flex-wrap gap-2">
                  {studySections.map((section) => {
                    const isActive = studyWidgetTab === section.id;
                    return (
                      <button
                        key={section.id}
                        type="button"
                        className="sp-btn sp-btn-subtle"
                        onClick={() => setStudyWidgetTab(section.id)}
                        style={{
                          background: isActive ? "rgba(37, 99, 235, 0.1)" : undefined,
                          borderColor: isActive ? "rgba(37, 99, 235, 0.3)" : undefined,
                          color: isActive ? "#1d4ed8" : undefined,
                        }}
                      >
                        {section.label}
                      </button>
                    );
                  })}
                </div>

                <div className="mb-3 rounded-xl border border-slate-200 bg-slate-50 p-3">
                  <div className="text-sm font-semibold text-slate-900">{activeStudyPeriod.title}</div>
                  <div className="mt-1 text-xs text-slate-500">{activeStudyPeriod.totalHours.toFixed(1)}h • {activeStudyPeriod.goalProgress}% of {formatStudyHours(activeStudyPeriod.goalHours)}</div>
                  <div className="mt-2 sp-progress-track">
                    <div className="sp-progress-fill" style={{ width: `${Math.min(100, activeStudyPeriod.goalProgress)}%` }} />
                  </div>
                  <div className="mt-2 text-xs text-slate-500">{activeStudyPeriod.comparisonLabel}</div>
                </div>

                <div className="h-[280px] rounded-xl border border-slate-200 bg-slate-50 p-1">
                  <ResponsiveContainer width="100%" height="100%">
                    {activeStudyPeriod.chartType === "line" ? (
                      <LineChart data={activeStudyPeriod.chartData} margin={{ top: 8, right: 12, left: 0, bottom: 0 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                        <XAxis dataKey={activeStudyPeriod.chartKey} tick={{ fill: "#64748b", fontSize: 10 }} axisLine={false} tickLine={false} />
                        <YAxis tick={{ fill: "#64748b", fontSize: 10 }} axisLine={false} tickLine={false} width={28} allowDecimals />
                        <Line type="monotone" dataKey="hours" stroke="#2563eb" strokeWidth={2.4} dot={false} />
                      </LineChart>
                    ) : (
                      <BarChart data={activeStudyPeriod.chartData} margin={{ top: 8, right: 12, left: 0, bottom: 0 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                        <XAxis dataKey={activeStudyPeriod.chartKey} tick={{ fill: "#64748b", fontSize: 10 }} axisLine={false} tickLine={false} />
                        <YAxis tick={{ fill: "#64748b", fontSize: 10 }} axisLine={false} tickLine={false} width={28} allowDecimals />
                        <Bar dataKey="hours" fill="#0ea5e9" radius={[8, 8, 0, 0]} />
                      </BarChart>
                    )}
                  </ResponsiveContainer>
                </div>
              </section>
            </div>
          </div>
        </div>
      )}

      <AlertDialog open={!!pendingDeleteId} onOpenChange={(open) => !open && setPendingDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this task?</AlertDialogTitle>
            <AlertDialogDescription>
              This action removes the task and related local checklist/attachment metadata from this planner view.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (pendingDeleteId) void deleteTask(pendingDeleteId);
              }}
              className="bg-red-600 text-white hover:bg-red-700"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {smartModalOpen && (
        <div className="sp-overlay" role="dialog" aria-modal="true" aria-label="Smart scheduling panel">
          <div className="sp-modal">
            <header className="flex items-center justify-between border-b border-slate-200/70 px-4 py-3 sm:px-6">
              <div>
                <h3 className="text-xl font-semibold text-slate-900">Smart Study Schedule</h3>
                <p className="text-sm text-slate-500">Drag your tasks into suggested study slots for the week.</p>
              </div>
              <button
                type="button"
                className="sp-btn sp-btn-subtle"
                onClick={() => setSmartModalOpen(false)}
                aria-label="Close schedule modal"
              >
                <X size={16} />
              </button>
            </header>

            <div className="grid flex-1 grid-cols-1 gap-3 overflow-auto p-3 sm:grid-cols-[280px_1fr] sm:p-4">
              <section className="rounded-xl border border-slate-200/70 bg-slate-50 p-3">
                <div className="mb-2 flex items-center justify-between">
                  <h4 className="text-sm font-semibold text-slate-800">Unscheduled Tasks</h4>
                  <span className="text-xs text-slate-500">{unscheduledPlans.length}</span>
                </div>

                {smartLoading ? (
                  <div className="space-y-2">
                    <div className="sp-skeleton h-14" />
                    <div className="sp-skeleton h-14" />
                    <div className="sp-skeleton h-14" />
                  </div>
                ) : unscheduledPlans.length === 0 ? (
                  <div className="rounded-lg border border-dashed border-slate-300 bg-white p-4 text-center text-xs text-slate-500">
                    Great job. All current tasks are scheduled.
                  </div>
                ) : (
                  <div className="space-y-2">
                    {unscheduledPlans.map((plan) => (
                      <div
                        key={plan.id}
                        draggable
                        onDragStart={() => setDragTaskId(plan.id)}
                        className="cursor-grab rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 shadow-sm transition hover:-translate-y-[1px] hover:shadow-md"
                      >
                        <div className="font-medium text-slate-900">{plan.title}</div>
                        <div className="text-xs text-slate-500">{plan.subject || "General"}</div>
                      </div>
                    ))}
                  </div>
                )}

                <div className="mt-3 rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs text-slate-600">
                  <div className="mb-1 font-medium text-slate-700">Legend</div>
                  <div className="flex items-center gap-2"><span className="h-2 w-2 rounded-full bg-green-500" /> Optimal slot</div>
                  <div className="flex items-center gap-2"><span className="h-2 w-2 rounded-full bg-amber-400" /> Available slot</div>
                </div>
              </section>

              <section className="overflow-x-auto rounded-xl border border-slate-200/70 bg-white p-3">
                {smartLoading ? (
                  <div className="grid min-w-[760px] grid-cols-7 gap-2">
                    {Array.from({ length: 7 }).map((_, day) => (
                      <div key={day} className="space-y-2">
                        <div className="sp-skeleton h-8" />
                        <div className="sp-skeleton h-14" />
                        <div className="sp-skeleton h-14" />
                        <div className="sp-skeleton h-14" />
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="grid min-w-[720px] grid-cols-7 gap-2">
                    {Object.entries(slotColumns).map(([day, slots]) => (
                      <div key={day} className="rounded-lg border border-slate-200/60 bg-slate-50 p-2">
                        <div className="mb-2 border-b border-slate-200 pb-1 text-center text-xs font-semibold uppercase tracking-wide text-slate-600">
                          {day}
                          <div className="text-[11px] font-medium normal-case text-slate-500">{slots[0]?.dayDate}</div>
                        </div>
                        <div className="space-y-2">
                          {slots.map((slot) => {
                            const task = plans.find((plan) => plan.id === slot.taskId);
                            return (
                              <div
                                key={slot.id}
                                onDragOver={(e) => e.preventDefault()}
                                onDrop={() => {
                                  if (!dragTaskId) return;
                                  setSmartSlots((prev) =>
                                    prev.map((entry) => {
                                      if (entry.taskId === dragTaskId) return { ...entry, taskId: null };
                                      if (entry.id === slot.id) return { ...entry, taskId: dragTaskId };
                                      return entry;
                                    }),
                                  );
                                  setDragTaskId(null);
                                }}
                                className="min-h-[66px] rounded-md border p-2 transition-colors"
                                style={{
                                  borderColor: slot.quality === "optimal" ? "rgba(22,163,74,.35)" : "rgba(245,158,11,.35)",
                                  background: slot.quality === "optimal" ? "rgba(22,163,74,.07)" : "rgba(245,158,11,.08)",
                                }}
                              >
                                <div className="mb-1 text-[11px] font-semibold text-slate-600">{slot.timeLabel}</div>
                                {task ? (
                                  <div className="rounded-md border border-slate-200 bg-white px-2 py-1 text-xs text-slate-700 shadow-sm">
                                    <div className="font-medium text-slate-900">{task.title}</div>
                                    <div className="text-slate-500">{task.subject || "General"}</div>
                                  </div>
                                ) : (
                                  <div className="text-[11px] text-slate-500">Drop task here</div>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </section>
            </div>

            <footer className="flex flex-wrap items-center justify-between border-t border-slate-200/70 px-4 py-3 sm:px-6">
              <p className="text-xs text-slate-500">Green slots are best focus times. Yellow slots are backup options.</p>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  className="sp-btn sp-btn-subtle"
                  onClick={() => setSmartSlots(createInitialSlots(plans))}
                >
                  <RotateCcw size={14} /> Regenerate
                </button>
                <button
                  type="button"
                  className="sp-btn sp-btn-primary"
                  onClick={() => {
                    setSmartModalOpen(false);
                    toast.success("Smart schedule updated.");
                  }}
                >
                  <Check size={14} /> Apply Schedule
                </button>
              </div>
            </footer>
          </div>
        </div>
      )}
    </div>
  );
}

function SubtaskComposer({ onAdd }: { onAdd: (title: string) => void }) {
  const [value, setValue] = useState("");

  return (
    <div className="mt-2 flex gap-2">
      <input
        className="sp-input"
        value={value}
        onChange={(e) => setValue(e.target.value)}
        placeholder="Add subtask"
      />
      <button
        type="button"
        className="sp-btn sp-btn-subtle"
        onClick={() => {
          onAdd(value);
          setValue("");
        }}
      >
        <Plus size={14} />
      </button>
    </div>
  );
}
