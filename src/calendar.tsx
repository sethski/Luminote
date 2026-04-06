import React, { useState, useMemo } from "react";
import { ArrowLeft, FileText, ChevronLeft, ChevronRight, Clock } from "lucide-react";
import { useNavigate } from "react-router";
import {
  format, startOfMonth, endOfMonth, eachDayOfInterval,
  isSameDay, isToday, addMonths, subMonths,
  startOfWeek, endOfWeek,
} from "date-fns";
import { useNotes } from "./NotesContext";

const CSS = `
@import url('https://fonts.googleapis.com/css2?family=DM+Serif+Display:ital@0;1&family=Outfit:wght@400;500;600;700&display=swap');
.cal-root  { font-family:'Outfit',sans-serif; }
.cal-serif { font-family:'DM Serif Display',serif; }
@keyframes cal-up { from{opacity:0;transform:translateY(10px)} to{opacity:1;transform:none} }
.cal-a1{animation:cal-up .4s ease both .05s}
.cal-a2{animation:cal-up .4s ease both .15s}
.cal-day { transition:background .15s; border-radius:10px; cursor:pointer; }
.cal-day:hover { background:#F3F4F6; }
.cal-note-pill {
  font-size:9px; font-weight:600;
  background:#EFF3FF; color:#6366F1;
  border-radius:4px; padding:1px 4px;
  overflow:hidden; text-overflow:ellipsis;
  white-space:nowrap; width:100%;
  text-align:left; display:block;
  margin-top:1px;
}
.cal-reminder-pill {
  font-size:9px; font-weight:600;
  background:#FFFBEB; color:#D97706;
  border-radius:4px; padding:1px 4px;
  overflow:hidden; text-overflow:ellipsis;
  white-space:nowrap; width:100%;
  text-align:left; display:block;
  margin-top:1px;
}
.cal-note-pill.selected { background:rgba(255,255,255,.2); color:white; }
.cal-reminder-pill.selected { background:rgba(255,255,255,.15); color:rgba(255,255,200,.9); }
.cal-item-btn { transition:all .2s; }
.cal-item-btn:hover { transform:translateY(-1px); box-shadow:0 4px 12px rgba(0,0,0,.08); }
`;

export function CalendarScreen() {
  const navigate  = useNavigate();
  const { notes, reminders } = useNotes();

  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState<Date | null>(new Date());

  const calDays = useMemo(() => {
    const start = startOfWeek(startOfMonth(currentMonth), { weekStartsOn: 0 });
    const end   = endOfWeek(endOfMonth(currentMonth),     { weekStartsOn: 0 });
    return eachDayOfInterval({ start, end });
  }, [currentMonth]);

  const notesOnDay = (d: Date) =>
    notes.filter(n => isSameDay(new Date(n.updated_at), d));

  const remindersOnDay = (d: Date) =>
    reminders.filter(r => isSameDay(new Date(r.date), d));

  const selectedNotes     = selectedDate ? notesOnDay(selectedDate)     : [];
  const selectedReminders = selectedDate ? remindersOnDay(selectedDate) : [];

  return (
    <div className="cal-root" style={{ minHeight:"100vh", background:"#FAFAF8" }}>
      <style>{CSS}</style>

      {/* Header */}
      <div style={{ background:"white", borderBottom:"1px solid #EBEBEB", position:"sticky", top:0, zIndex:10 }}>
        <div style={{ maxWidth:1000, margin:"0 auto", padding:"16px 20px", display:"flex", alignItems:"center", gap:12 }}>
          <button type="button" onClick={() => navigate(-1)}
            style={{ width:36, height:36, borderRadius:10, border:"1px solid #E5E7EB", background:"none", cursor:"pointer", display:"flex", alignItems:"center", justifyContent:"center", color:"#6B7280" }}>
            <ArrowLeft size={16} />
          </button>
          <div>
            <h1 className="cal-serif" style={{ fontSize:"1.4rem", color:"#0E1117", margin:0 }}>Calendar</h1>
            <p style={{ fontSize:12, color:"#9CA3AF", margin:0 }}>Note & reminder activity history</p>
          </div>
        </div>
      </div>

      <div style={{ maxWidth:1000, margin:"0 auto", padding:"24px 20px", display:"grid", gridTemplateColumns:"1.3fr 1fr", gap:20 }}>

        {/* ── Calendar Grid ─────────────────────── */}
        <div className="cal-a1" style={{ background:"white", borderRadius:20, border:"1px solid #EBEBEB", padding:20 }}>
          {/* Month nav */}
          <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:16 }}>
            <h2 className="cal-serif" style={{ fontSize:"1.2rem", color:"#0E1117", margin:0 }}>
              {format(currentMonth, "MMMM yyyy")}
            </h2>
            <div style={{ display:"flex", gap:6 }}>
              <button type="button"
                onClick={() => setCurrentMonth(subMonths(currentMonth, 1))}
                style={{ width:32, height:32, borderRadius:8, border:"1px solid #E5E7EB", background:"none", cursor:"pointer", display:"flex", alignItems:"center", justifyContent:"center", color:"#6B7280" }}>
                <ChevronLeft size={14} />
              </button>
              <button type="button"
                onClick={() => setCurrentMonth(addMonths(currentMonth, 1))}
                style={{ width:32, height:32, borderRadius:8, border:"1px solid #E5E7EB", background:"none", cursor:"pointer", display:"flex", alignItems:"center", justifyContent:"center", color:"#6B7280" }}>
                <ChevronRight size={14} />
              </button>
            </div>
          </div>

          {/* Day headers */}
          <div style={{ display:"grid", gridTemplateColumns:"repeat(7,1fr)", marginBottom:6 }}>
            {["Su","Mo","Tu","We","Th","Fr","Sa"].map(d => (
              <div key={d} style={{ textAlign:"center", fontSize:10, fontWeight:700, color:"#C4C9D4", textTransform:"uppercase", letterSpacing:".05em", padding:"4px 0" }}>{d}</div>
            ))}
          </div>

          {/* Days */}
          <div style={{ display:"grid", gridTemplateColumns:"repeat(7,1fr)", gap:2 }}>
            {calDays.map((day, i) => {
              const isCurrentMonth = day.getMonth() === currentMonth.getMonth();
              const isTodayDay     = isToday(day);
              const isSelected     = selectedDate && isSameDay(selectedDate, day);
              const dayNotes       = isCurrentMonth ? notesOnDay(day)     : [];
              const dayReminders   = isCurrentMonth ? remindersOnDay(day) : [];
              const totalActivity  = dayNotes.length + dayReminders.length;

              return (
                <button
                  key={i}
                  type="button"
                  className="cal-day"
                  onClick={() => setSelectedDate(day)}
                  style={{
                    padding:          "5px 3px 4px",
                    minHeight:        60,
                    textAlign:        "center",
                    position:         "relative",
                    background:       isSelected ? "#0E1117" : isTodayDay ? "#EFF3FF" : "transparent",
                    borderRadius:     10,
                    border:           "none",
                    cursor:           "pointer",
                    display:          "flex",
                    flexDirection:    "column",
                    alignItems:       "center",
                    gap:              1,
                  }}
                >
                  {/* Day number */}
                  <span style={{
                    fontSize:   12,
                    fontWeight: isSelected || isTodayDay ? 700 : 400,
                    color:      isSelected ? "white" : !isCurrentMonth ? "#E5E7EB" : isTodayDay ? "#6366F1" : "#374151",
                    lineHeight: "1.4",
                    flexShrink: 0,
                  }}>
                    {format(day, "d")}
                  </span>

                  {/* Activity pills */}
                  {isCurrentMonth && (
                    <div style={{ width:"100%", display:"flex", flexDirection:"column", gap:1, padding:"0 2px" }}>
                      {dayNotes.slice(0, 2).map(n => (
                        <span
                          key={n.id}
                          className={`cal-note-pill${isSelected ? " selected" : ""}`}
                          title={n.title || "Untitled"}
                        >
                          {n.title || "Untitled"}
                        </span>
                      ))}
                      {dayReminders.slice(0, 1).map(r => (
                        <span
                          key={r.id}
                          className={`cal-reminder-pill${isSelected ? " selected" : ""}`}
                          title={r.title}
                        >
                          ⏰ {r.title}
                        </span>
                      ))}
                      {totalActivity > 3 && (
                        <span style={{ fontSize:8, color: isSelected ? "rgba(255,255,255,.6)" : "#9CA3AF", fontWeight:600, textAlign:"center" }}>
                          +{totalActivity - 3} more
                        </span>
                      )}
                    </div>
                  )}
                </button>
              );
            })}
          </div>

          {/* Legend */}
          <div style={{ display:"flex", gap:16, justifyContent:"center", marginTop:12 }}>
            <span style={{ fontSize:11, color:"#9CA3AF", display:"flex", alignItems:"center", gap:4 }}>
              <span style={{ width:8, height:8, borderRadius:2, background:"#EFF3FF", border:"1px solid #6366F1", display:"inline-block" }} />
              Notes
            </span>
            <span style={{ fontSize:11, color:"#9CA3AF", display:"flex", alignItems:"center", gap:4 }}>
              <span style={{ width:8, height:8, borderRadius:2, background:"#FFFBEB", border:"1px solid #D97706", display:"inline-block" }} />
              Reminders
            </span>
          </div>
        </div>

        {/* ── Day Detail Panel ──────────────────── */}
        <div className="cal-a2" style={{ background:"white", borderRadius:20, border:"1px solid #EBEBEB", padding:20, minHeight:300, display:"flex", flexDirection:"column" }}>
          {selectedDate ? (
            <>
              <h3 className="cal-serif" style={{ fontSize:"1.1rem", color:"#0E1117", margin:"0 0 16px" }}>
                {format(selectedDate, "EEEE, MMMM do")}
              </h3>

              {selectedNotes.length === 0 && selectedReminders.length === 0 ? (
                <div style={{ flex:1, display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center" }}>
                  <FileText size={32} color="#E5E7EB" style={{ marginBottom:10 }} />
                  <p style={{ fontSize:14, color:"#9CA3AF", textAlign:"center" }}>No activity on this day.</p>
                </div>
              ) : (
                <div style={{ display:"flex", flexDirection:"column", gap:8, overflowY:"auto", flex:1 }}>

                  {/* Notes section */}
                  {selectedNotes.length > 0 && (
                    <>
                      <p style={{ fontSize:10, fontWeight:700, color:"#9CA3AF", textTransform:"uppercase", letterSpacing:".06em", margin:0 }}>
                        Notes ({selectedNotes.length})
                      </p>
                      {selectedNotes.map(note => (
                        <button
                          key={note.id}
                          type="button"
                          className="cal-item-btn"
                          onClick={() => navigate(`/home/editor/${note.id}`)}
                          style={{
                            display:       "flex",
                            flexDirection: "column",
                            gap:           6,
                            padding:       "12px 14px",
                            background:    "#FAFAF8",
                            border:        "1px solid #EBEBEB",
                            borderLeft:    "3px solid #6366F1",
                            borderRadius:  12,
                            cursor:        "pointer",
                            textAlign:     "left",
                            fontFamily:    "inherit",
                          }}
                        >
                          <div style={{ display:"flex", alignItems:"center", gap:8 }}>
                            <FileText size={13} color="#6366F1" />
                            <span style={{ fontSize:13, fontWeight:600, color:"#0E1117", flex:1, overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>
                              {note.title || "Untitled Note"}
                            </span>
                            <span style={{ fontSize:11, color:"#9CA3AF", flexShrink:0 }}>
                              {format(new Date(note.updated_at), "h:mm a")}
                            </span>
                          </div>
                          {note.content && (
                            <p style={{ fontSize:11, color:"#9CA3AF", margin:0, overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>
                              {note.content.replace(/[#*`\n]/g," ").trim().slice(0, 70)}
                            </p>
                          )}
                          {note.tags.length > 0 && (
                            <div style={{ display:"flex", gap:4 }}>
                              {note.tags.slice(0,3).map(tag => (
                                <span key={tag} style={{ fontSize:9, fontWeight:700, padding:"2px 6px", borderRadius:100, background:"#EFF3FF", color:"#6366F1" }}>{tag}</span>
                              ))}
                            </div>
                          )}
                        </button>
                      ))}
                    </>
                  )}

                  {/* Reminders section */}
                  {selectedReminders.length > 0 && (
                    <>
                      <p style={{ fontSize:10, fontWeight:700, color:"#9CA3AF", textTransform:"uppercase", letterSpacing:".06em", margin:"8px 0 0" }}>
                        Reminders ({selectedReminders.length})
                      </p>
                      {selectedReminders.map(r => (
                        <div
                          key={r.id}
                          style={{
                            display:    "flex",
                            alignItems: "center",
                            gap:        10,
                            padding:    "12px 14px",
                            background: "#FFFBEB",
                            border:     "1px solid #FDE68A",
                            borderLeft: "3px solid #D97706",
                            borderRadius: 12,
                          }}
                        >
                          <Clock size={13} color="#D97706" />
                          <div style={{ flex:1 }}>
                            <div style={{ fontSize:13, fontWeight:600, color:"#0E1117", textDecoration: r.completed ? "line-through" : "none" }}>
                              {r.title}
                            </div>
                            <div style={{ fontSize:11, color:"#D97706" }}>
                              {r.time}{r.completed ? " · Completed" : ""}
                            </div>
                          </div>
                        </div>
                      ))}
                    </>
                  )}
                </div>
              )}
            </>
          ) : (
            <div style={{ flex:1, display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center" }}>
              <FileText size={40} color="#E5E7EB" style={{ marginBottom:12 }} />
              <h3 className="cal-serif" style={{ fontSize:"1.1rem", color:"#0E1117", marginBottom:4 }}>Select a date</h3>
              <p style={{ fontSize:13, color:"#9CA3AF", textAlign:"center" }}>Click any date to see notes and reminders.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
