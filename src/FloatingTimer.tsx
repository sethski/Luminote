import React, { useEffect, useRef, useState } from "react";
import { Play, Pause, RotateCcw, ChevronDown, X } from "lucide-react";
import { useTimer } from "./TimerContext";

const TIMER_POSITION_KEY = "luminote-timer-position";

interface Position {
  x: number;
  y: number;
}

export function FloatingTimer() {
  const { state, startTimer, pauseTimer, resetTimer, toggleMinimized, closeTimer } = useTimer();
  const [position, setPosition] = useState<Position>({ x: 20, y: 20 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const timerRef = useRef<HTMLDivElement>(null);

  // Load position from localStorage
  useEffect(() => {
    const stored = localStorage.getItem(TIMER_POSITION_KEY);
    if (stored) {
      try {
        setPosition(JSON.parse(stored));
      } catch {
        // Use default position
      }
    }
  }, []);

  // Save position to localStorage
  useEffect(() => {
    localStorage.setItem(TIMER_POSITION_KEY, JSON.stringify(position));
  }, [position]);

  // Handle dragging
  const handleMouseDown = (e: React.MouseEvent) => {
    if (!timerRef.current) return;
    
    // Don't drag if clicking on a button
    if ((e.target as HTMLElement).closest("button")) return;

    setIsDragging(true);
    const rect = timerRef.current.getBoundingClientRect();
    setDragOffset({
      x: e.clientX - rect.left,
      y: e.clientY - rect.top,
    });
  };

  useEffect(() => {
    if (!isDragging) return;

    const handleMouseMove = (e: MouseEvent) => {
      if (!timerRef.current) return;

      const vw = window.innerWidth;
      const vh = window.innerHeight;
      const width = timerRef.current.offsetWidth;
      const height = timerRef.current.offsetHeight;

      let newX = e.clientX - dragOffset.x;
      let newY = e.clientY - dragOffset.y;

      // Constrain within viewport
      newX = Math.max(0, Math.min(newX, vw - width));
      newY = Math.max(0, Math.min(newY, vh - height));

      setPosition({ x: newX, y: newY });
    };

    const handleMouseUp = () => {
      setIsDragging(false);
    };

    document.addEventListener("mousemove", handleMouseMove);
    document.addEventListener("mouseup", handleMouseUp);

    return () => {
      document.removeEventListener("mousemove", handleMouseMove);
      document.removeEventListener("mouseup", handleMouseUp);
    };
  }, [isDragging, dragOffset]);

  if (!state.visible) return null;

  const minutes = Math.floor(state.remainingSeconds / 60);
  const seconds = state.remainingSeconds % 60;
  const timeDisplay = `${minutes}:${seconds.toString().padStart(2, "0")}`;

  // Expanded view dimensions
  if (!state.minimized) {
    return (
      <div
        ref={timerRef}
        onMouseDown={handleMouseDown}
        className="fixed z-40 w-32 p-4 rounded-2xl border border-slate-200 bg-white shadow-lg transition-none"
        style={{
          left: `${position.x}px`,
          top: `${position.y}px`,
          cursor: isDragging ? "grabbing" : "grab",
        }}
      >
        <div className="text-center">
          {/* Circular progress indicator */}
          <div className="mb-3 flex justify-center">
            <div className="relative h-20 w-20 rounded-full border-4 border-slate-200 flex items-center justify-center">
              <div
                className="absolute h-20 w-20 rounded-full"
                style={{
                  background: state.mode === "focus" 
                    ? "conic-gradient(#2563eb 0deg, #2563eb " +
                      ((state.remainingSeconds / (state.preset.focusMinutes * 60)) * 360) + 
                      "deg, #e2e8f0 0deg)"
                    : "conic-gradient(#10b981 0deg, #10b981 " +
                      ((state.remainingSeconds / (state.preset.breakMinutes * 60)) * 360) + 
                      "deg, #e2e8f0 0deg)",
                  borderRadius: "100%",
                }}
              />
              <div className="relative flex flex-col items-center justify-center">
                <span className="text-2xl font-bold text-slate-900">{timeDisplay}</span>
                <span className="text-xs text-slate-500">
                  {state.mode === "focus" ? "Focus" : "Break"}
                </span>
              </div>
            </div>
          </div>

          {/* Labels  */}
          <div className="mb-3 text-xs text-slate-500">
            <span className="font-medium">{state.preset.label}</span>
            <span className="mx-1">•</span>
            <span>{state.sessionsCompleted} session{state.sessionsCompleted === 1 ? "" : "s"}</span>
          </div>

          {/* Buttons */}
          <div className="space-y-2">
            <div className="flex gap-2">
              <button
                type="button"
                onClick={state.running ? pauseTimer : startTimer}
                className="flex-1 rounded-lg bg-blue-600 text-white py-2 transition hover:bg-blue-700 active:scale-95 flex items-center justify-center"
              >
                {state.running ? <Pause size={16} /> : <Play size={16} />}
              </button>
              <button
                type="button"
                onClick={resetTimer}
                className="flex-1 rounded-lg border border-slate-300 text-slate-700 py-2 transition hover:bg-slate-50 active:scale-95 flex items-center justify-center"
              >
                <RotateCcw size={16} />
              </button>
            </div>
            <button
              type="button"
              onClick={toggleMinimized}
              className="w-full rounded-lg border border-slate-300 text-slate-700 py-1.5 text-xs font-medium transition hover:bg-slate-50 active:scale-95 flex items-center justify-center gap-1"
            >
              <ChevronDown size={14} /> Minimize
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Minimized view - pill with time and close button
  return (
    <div
      ref={timerRef}
      onMouseDown={handleMouseDown}
      className="fixed z-40 h-10 flex items-center gap-2 px-3 rounded-full border border-slate-200 bg-white shadow-lg transition-none"
      style={{
        left: `${position.x}px`,
        top: `${position.y}px`,
        cursor: isDragging ? "grabbing" : "grab",
        width: "auto",
      }}
    >
      <span className="text-sm font-semibold text-slate-900">{timeDisplay}</span>
      <button
        type="button"
        onClick={state.running ? pauseTimer : startTimer}
        className="p-1 rounded hover:bg-slate-100 text-slate-600 transition active:scale-95"
        title={state.running ? "Pause" : "Start"}
      >
        {state.running ? <Pause size={14} /> : <Play size={14} />}
      </button>
      <button
        type="button"
        onClick={closeTimer}
        className="p-1 rounded hover:bg-red-50 text-slate-600 hover:text-red-600 transition active:scale-95"
        title="Close"
      >
        <X size={14} />
      </button>
    </div>
  );
}
