import React, { createContext, useContext, useEffect, useState, useRef, useCallback } from "react";

export type TimerMode = "focus" | "break";

export interface PomodoroPreset {
  label: string;
  focusMinutes: number;
  breakMinutes: number;
}

export interface TimerState {
  running: boolean;
  mode: TimerMode;
  remainingSeconds: number;
  activeFocusSeconds: number;
  sessionsCompleted: number;
  preset: PomodoroPreset;
  minimized: boolean;
  visible: boolean;
}

export const PRESETS: PomodoroPreset[] = [
  { label: "25 / 5", focusMinutes: 25, breakMinutes: 5 },
  { label: "50 / 10", focusMinutes: 50, breakMinutes: 10 },
  { label: "90 / 20", focusMinutes: 90, breakMinutes: 20 },
];

const DEFAULT_PRESET = PRESETS[0];

const DEFAULT_TIMER_STATE: TimerState = {
  running: false,
  mode: "focus",
  remainingSeconds: DEFAULT_PRESET.focusMinutes * 60,
  activeFocusSeconds: 0,
  sessionsCompleted: 0,
  preset: DEFAULT_PRESET,
  minimized: false,
  visible: true,
};

interface TimerContextType {
  state: TimerState;
  startTimer: () => void;
  pauseTimer: () => void;
  resetTimer: () => void;
  toggleMinimized: () => void;
  closeTimer: () => void;
  changePreset: (preset: PomodoroPreset) => void;
  updateTimerState: (updates: Partial<TimerState>) => void;
  onSessionComplete?: () => void;
}

const TimerContext = createContext<TimerContextType | undefined>(undefined);

const TIMER_SYNC_KEY_PREFIX = "luminote-timer-sync-";

function getTimerSyncKey(userId: string | undefined) {
  return userId ? `${TIMER_SYNC_KEY_PREFIX}${userId}` : "luminote-timer-sync-guest";
}

export function TimerProvider({
  children,
  userId,
  onSessionComplete,
}: {
  children: React.ReactNode;
  userId?: string;
  onSessionComplete?: () => void;
}) {
  const [state, setState] = useState<TimerState>(DEFAULT_TIMER_STATE);
  const intervalRef = useRef<number | null>(null);
  const onSessionCompleteRef = useRef<(() => void) | undefined>(onSessionComplete);

  // Update callback when it changes
  useEffect(() => {
    onSessionCompleteRef.current = onSessionComplete;
  }, [onSessionComplete]);

  // Load state from localStorage on mount
  useEffect(() => {
    const key = getTimerSyncKey(userId);
    const stored = localStorage.getItem(key);
    if (stored) {
      try {
        const parsed = JSON.parse(stored);
        setState((prev) => ({ ...prev, ...parsed }));
      } catch {
        // Silently fail on invalid storage
      }
    }
  }, [userId]);

  // Save state to localStorage whenever it changes
  useEffect(() => {
    const key = getTimerSyncKey(userId);
    localStorage.setItem(key, JSON.stringify(state));
  }, [state, userId]);

  // Timer tick effect
  useEffect(() => {
    if (!state.running) {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
      return;
    }

    intervalRef.current = window.setInterval(() => {
      setState((prev) => {
        const newRemaining = prev.remainingSeconds - 1;
        const activeFocus =
          prev.mode === "focus" ? Math.max(0, prev.activeFocusSeconds + 1) : prev.activeFocusSeconds;

        if (newRemaining <= 0) {
          // Session complete
          if (prev.mode === "focus") {
            // Switch to break
            onSessionCompleteRef.current?.();
            return {
              ...prev,
              mode: "break",
              remainingSeconds: prev.preset.breakMinutes * 60,
              sessionsCompleted: prev.sessionsCompleted + 1,
              activeFocusSeconds: activeFocus,
            };
          } else {
            // Switch back to focus
            return {
              ...prev,
              mode: "focus",
              remainingSeconds: prev.preset.focusMinutes * 60,
              activeFocusSeconds: activeFocus,
            };
          }
        }

        return {
          ...prev,
          remainingSeconds: newRemaining,
          activeFocusSeconds: activeFocus,
        };
      });
    }, 1000);

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, [state.running]);

  const startTimer = useCallback(() => {
    setState((prev) => ({ ...prev, running: true }));
  }, []);

  const pauseTimer = useCallback(() => {
    setState((prev) => ({ ...prev, running: false }));
  }, []);

  const resetTimer = useCallback(() => {
    setState((prev) => ({
      ...prev,
      running: false,
      mode: "focus",
      remainingSeconds: prev.preset.focusMinutes * 60,
      activeFocusSeconds: 0,
      sessionsCompleted: 0,
    }));
  }, []);

  const toggleMinimized = useCallback(() => {
    setState((prev) => ({ ...prev, minimized: !prev.minimized }));
  }, []);

  const closeTimer = useCallback(() => {
    setState((prev) => ({
      ...prev,
      running: false,
      visible: false,
      minimized: false,
    }));
  }, []);

  const changePreset = useCallback((preset: PomodoroPreset) => {
    setState((prev) => ({
      ...prev,
      preset,
      running: false,
      remainingSeconds: preset.focusMinutes * 60,
      activeFocusSeconds: 0,
      sessionsCompleted: 0,
    }));
  }, []);

  const updateTimerState = useCallback((updates: Partial<TimerState>) => {
    setState((prev) => ({ ...prev, ...updates }));
  }, []);

  const value: TimerContextType = {
    state,
    startTimer,
    pauseTimer,
    resetTimer,
    toggleMinimized,
    closeTimer,
    changePreset,
    updateTimerState,
    onSessionComplete: onSessionCompleteRef.current,
  };

  // Expose onSessionComplete setter
  useEffect(() => {
    onSessionCompleteRef.current = value.onSessionComplete;
  }, [value.onSessionComplete]);

  return <TimerContext.Provider value={value}>{children}</TimerContext.Provider>;
}

export function useTimer() {
  const context = useContext(TimerContext);
  if (!context) {
    throw new Error("useTimer must be used within a TimerProvider");
  }
  return context;
}

export function useTimerState() {
  const context = useContext(TimerContext);
  if (!context) {
    throw new Error("useTimerState must be used within a TimerProvider");
  }
  return context.state;
}
