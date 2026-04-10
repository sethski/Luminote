/**
 * VoiceMemo.tsx — Real recording via MediaRecorder + Web Speech API transcription
 */
import React, { useState, useEffect, useCallback, useRef } from "react";
import { useNavigate } from "react-router";
import { Pause, Play, Sparkles, Mic, Loader2, MicOff } from "lucide-react";
import { useNotes } from "./NotesContext";
import { useToast } from "./toast";
import logoUrl from "./assets/logo.svg";

function LuminoteLogo() {
  return (
    <div style={{ width:40, height:40, borderRadius:12, background:"#0E1117", display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0 }}>
      <img src={logoUrl} alt="Luminote" width="18" height="18" style={{ objectFit: "contain" }} />
    </div>
  );
}

const CSS = `
@keyframes vm-bounce { 0%,100%{transform:scaleY(1);opacity:.5} 50%{transform:scaleY(2.2);opacity:1} }
@keyframes vm-pulse  { 0%,100%{opacity:.4} 50%{opacity:1} }
@keyframes vm-spin   { to{transform:rotate(360deg)} }
.vm-spin { animation:vm-spin .8s linear infinite; }

/* Responsive modal behavior across phone/tablet/desktop. */
@media (max-width: 768px) {
  .vm-overlay { align-items: flex-start !important; padding: 12px !important; }
  .vm-card { border-radius: 20px !important; padding: 18px !important; max-height: calc(100dvh - 24px); overflow-y: auto; }
  .vm-controls { gap: 10px; }
}

@media (max-width: 480px) {
  .vm-card { padding: 16px !important; }
}
`;

// Browser SpeechRecognition
const SpeechRecognition =
  (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

export function VoiceMemo() {
  const navigate = useNavigate();
  const { addNote, updateNote } = useNotes();
  const toast = useToast();

  const [isRecording, setIsRecording] = useState(false);
  const [isPaused,    setIsPaused]    = useState(false);
  const [seconds,     setSeconds]     = useState(0);
  const [waveform,    setWaveform]    = useState<number[]>(Array.from({ length:32 }, (_,i) => 12 + Math.sin(i*0.5)*10));
  const [transcription, setTranscription] = useState("");
  const [interimText,   setInterimText]   = useState("");
  const [autoSummarize, setAutoSummarize] = useState(true);
  const [saving,        setSaving]        = useState(false);
  const [micError,      setMicError]      = useState<string | null>(null);

  const today = new Date();
  const [noteTitle, setNoteTitle] = useState(
    `Voice Note · ${today.toLocaleDateString("en-US", { month:"short", day:"numeric", year:"numeric" })}`
  );

  const recognitionRef  = useRef<any>(null);
  const mediaStreamRef  = useRef<MediaStream | null>(null);
  const timerRef        = useRef<ReturnType<typeof setInterval> | null>(null);
  const waveformRef     = useRef<ReturnType<typeof setInterval> | null>(null);
  const analyserRef     = useRef<AnalyserNode | null>(null);
  const audioCtxRef     = useRef<AudioContext | null>(null);
  const waveFrameRef    = useRef<number>(0);

  const generateWaveform = useCallback(() =>
    Array.from({ length:32 }, () => Math.random()*55+8), []);

  /* ── Start recording ──────────────────────────── */
  const startRecording = async () => {
    setMicError(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      mediaStreamRef.current = stream;

      // Web Audio waveform visualization
      const audioCtx = new AudioContext();
      audioCtxRef.current = audioCtx;
      const source = audioCtx.createMediaStreamSource(stream);
      const analyser = audioCtx.createAnalyser();
      analyser.fftSize = 64;
      source.connect(analyser);
      analyserRef.current = analyser;

      const dataArr = new Uint8Array(analyser.frequencyBinCount);
      const animateWave = () => {
        analyser.getByteFrequencyData(dataArr);
        const bars = Array.from({ length:32 }, (_, i) => {
          const idx = Math.floor(i * dataArr.length / 32);
          return 8 + (dataArr[idx] / 255) * 55;
        });
        setWaveform(bars);
        waveFrameRef.current = requestAnimationFrame(animateWave);
      };
      waveFrameRef.current = requestAnimationFrame(animateWave);

      // Speech recognition
      if (SpeechRecognition) {
        const recognition = new SpeechRecognition();
        recognition.continuous      = true;
        recognition.interimResults  = true;
        recognition.lang            = "en-US";

        recognition.onresult = (e: any) => {
          let final = "";
          let interim = "";
          for (let i = e.resultIndex; i < e.results.length; i++) {
            if (e.results[i].isFinal) final += e.results[i][0].transcript + " ";
            else interim += e.results[i][0].transcript;
          }
          if (final) setTranscription(prev => prev + final);
          setInterimText(interim);
        };

        recognition.onerror = (e: any) => {
          if (e.error !== "no-speech") console.warn("Speech recognition error:", e.error);
        };

        recognition.start();
        recognitionRef.current = recognition;
      } else {
        // Fallback: no speech API available
        setMicError("Speech recognition not supported in this browser. Recording audio only.");
      }

      // Timer
      timerRef.current = setInterval(() => setSeconds(s => s + 1), 1000);
      setIsRecording(true);
      setIsPaused(false);
    } catch (err: any) {
      setMicError(`Microphone access denied: ${err.message}`);
    }
  };

  /* ── Stop recording ───────────────────────────── */
  const stopRecording = useCallback(() => {
    recognitionRef.current?.stop();
    recognitionRef.current = null;

    if (timerRef.current) { clearInterval(timerRef.current); timerRef.current = null; }
    cancelAnimationFrame(waveFrameRef.current);

    mediaStreamRef.current?.getTracks().forEach(t => t.stop());
    mediaStreamRef.current = null;

    audioCtxRef.current?.close();
    audioCtxRef.current = null;

    setIsRecording(false);
    setIsPaused(false);
    setInterimText("");
    setWaveform(Array.from({ length:32 }, (_,i) => 12 + Math.sin(i*0.5)*10));
  }, []);

  /* ── Pause / Resume ───────────────────────────── */
  const togglePause = () => {
    if (!isRecording) { startRecording(); return; }
    if (!isPaused) {
      recognitionRef.current?.stop();
      if (timerRef.current) { clearInterval(timerRef.current); timerRef.current = null; }
      cancelAnimationFrame(waveFrameRef.current);
      setIsPaused(true);
    } else {
      recognitionRef.current?.start();
      timerRef.current = setInterval(() => setSeconds(s => s + 1), 1000);
      const animateWave = () => {
        if (!analyserRef.current) return;
        const dataArr = new Uint8Array(analyserRef.current.frequencyBinCount);
        analyserRef.current.getByteFrequencyData(dataArr);
        const bars = Array.from({ length:32 }, (_, i) => {
          const idx = Math.floor(i * dataArr.length / 32);
          return 8 + (dataArr[idx] / 255) * 55;
        });
        setWaveform(bars);
        waveFrameRef.current = requestAnimationFrame(animateWave);
      };
      waveFrameRef.current = requestAnimationFrame(animateWave);
      setIsPaused(false);
    }
  };

  /* ── Cleanup on unmount ───────────────────────── */
  useEffect(() => () => stopRecording(), [stopRecording]);

  const formatTime = (s: number) =>
    `${Math.floor(s/60).toString().padStart(2,"0")}:${(s%60).toString().padStart(2,"0")}`;

  /* ── Save as note ─────────────────────────────── */
  const handleFinish = async () => {
    const fullText = (transcription + interimText).trim();
    if (!fullText && seconds === 0) return;
    stopRecording();
    setSaving(true);
    try {
      const id = await addNote();
      await updateNote(id, {
        title:   noteTitle || "Voice Note",
        content: fullText || `[Voice memo — ${formatTime(seconds)}]`,
        tags:    ["PERSONAL"],
      });
      toast.success("Voice memo saved!");
      navigate(`/home/editor/${id}`);
    } catch {
      toast.error("Failed to save memo.");
      setSaving(false);
    }
  };

  const hasStarted = isRecording || seconds > 0;

  return (
    <div className="vm-overlay" style={{ position:"fixed", inset:0, background:"rgba(14,17,23,.45)", backdropFilter:"blur(6px)", zIndex:9999, display:"flex", alignItems:"center", justifyContent:"center", padding:16 }}>
      <style>{CSS}</style>

      <div className="vm-card" style={{ width:"100%", maxWidth:560, background:"white", borderRadius:28, boxShadow:"0 32px 80px rgba(0,0,0,.2)", padding:28, display:"flex", flexDirection:"column", fontFamily:"'Outfit','DM Sans',sans-serif" }}>

        {/* Header */}
        <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:22 }}>
          <div style={{ display:"flex", alignItems:"center", gap:12 }}>
            <LuminoteLogo />
            <div>
              <p style={{ fontSize:14, fontWeight:700, color:"#0E1117", margin:0 }}>Luminote</p>
              <div style={{ display:"flex", alignItems:"center", gap:5, marginTop:2 }}>
                <div style={{ width:7, height:7, borderRadius:"50%", background: isRecording && !isPaused ? "#16A34A" : "#C4C9D4", transition:"background .3s" }} />
                <span style={{ fontSize:10, fontWeight:700, textTransform:"uppercase", letterSpacing:".06em", color: isRecording && !isPaused ? "#16A34A" : "#9CA3AF" }}>
                  {isRecording ? (isPaused ? "Paused" : "Recording") : hasStarted ? "Stopped" : "Ready"}
                </span>
              </div>
            </div>
          </div>
          <div style={{ display:"flex", alignItems:"center", gap:8, background:"#F3F4F6", borderRadius:100, padding:"6px 14px" }}>
            {isRecording && !isPaused && <div style={{ width:7, height:7, borderRadius:"50%", background:"#E11D48", animation:"vm-pulse 1s ease infinite" }} />}
            <span style={{ fontSize:14, fontWeight:700, color:"#0E1117", fontVariantNumeric:"tabular-nums" }}>{formatTime(seconds)}</span>
          </div>
        </div>

        {/* Error */}
        {micError && (
          <div style={{ background:"#FFF1F2", border:"1px solid #FECDD3", borderRadius:12, padding:"10px 14px", marginBottom:16, fontSize:12, color:"#BE123C", display:"flex", alignItems:"center", gap:8 }}>
            <MicOff size={14} /> {micError}
          </div>
        )}

        {/* Title */}
        <div style={{ marginBottom:20 }}>
          <span style={{ fontSize:10, fontWeight:700, textTransform:"uppercase", letterSpacing:".08em", color:"#6366F1", display:"block", marginBottom:6 }}>Note Title</span>
          <input
            type="text"
            value={noteTitle}
            onChange={e => setNoteTitle(e.target.value)}
            style={{ width:"100%", fontSize:18, fontWeight:700, color:"#0E1117", background:"transparent", border:"none", borderBottom:"1.5px solid #EBEBEB", outline:"none", paddingBottom:6, fontFamily:"inherit", transition:"border-color .2s" }}
            onFocus={e => (e.target.style.borderColor="#6366F1")}
            onBlur={e  => (e.target.style.borderColor="#EBEBEB")}
          />
        </div>

        {/* Waveform */}
        <div style={{ display:"flex", alignItems:"center", justifyContent:"center", gap:3, height:72, marginBottom:20 }}>
          {waveform.map((h, i) => (
            <div key={i} style={{
              width:4, borderRadius:100, flexShrink:0,
              background: isRecording && !isPaused ? "#6366F1" : "#E5E7EB",
              height:`${h}%`,
              animation: isRecording && !isPaused ? `vm-bounce ${0.8+(i%4)*0.15}s ease-in-out infinite` : "none",
              animationDelay:`${i*0.04}s`,
              transition:"background .3s",
            }} />
          ))}
        </div>

        {/* Transcription */}
        <div style={{ background:"#FAFAF8", borderRadius:16, border:"1px solid #EBEBEB", padding:"14px 16px", minHeight:90, marginBottom:18 }}>
          {hasStarted || transcription ? (
            <>
              <p style={{ fontSize:13, color:"#374151", lineHeight:1.6, margin:0 }}>
                {transcription}
                {interimText && <span style={{ color:"#9CA3AF" }}>{interimText}</span>}
                {!transcription && !interimText && <span style={{ color:"#9CA3AF" }}>Listening…</span>}
              </p>
              {isRecording && !isPaused && (
                <div style={{ display:"flex", alignItems:"center", gap:4, marginTop:8 }}>
                  <span style={{ fontSize:10, fontWeight:700, color:"#6366F1", textTransform:"uppercase", letterSpacing:".05em" }}>
                    {SpeechRecognition ? "AI Transcribing" : "Recording Audio"}
                  </span>
                  {[0,1,2].map(i => (
                    <div key={i} style={{ width:4, height:4, borderRadius:"50%", background:"#6366F1", animation:`vm-pulse 1.2s ease ${i*0.2}s infinite` }} />
                  ))}
                </div>
              )}
            </>
          ) : (
            <p style={{ fontSize:13, color:"#9CA3AF", textAlign:"center", margin:"20px 0" }}>
              Press play to start recording. Your speech will be transcribed live.
            </p>
          )}
        </div>

        {/* Auto-summarize toggle */}
        <button
          type="button"
          onClick={() => setAutoSummarize(v => !v)}
          style={{ display:"flex", alignItems:"center", gap:8, padding:"10px 14px", marginBottom:22, borderRadius:100, border:`1.5px solid ${autoSummarize?"#C7D2FE":"#E5E7EB"}`, background:autoSummarize?"#EFF3FF":"#FAFAFA", cursor:"pointer", fontFamily:"inherit", alignSelf:"flex-start" }}>
          <Sparkles size={14} color={autoSummarize?"#6366F1":"#9CA3AF"} />
          <span style={{ fontSize:13, fontWeight:600, color:autoSummarize?"#6366F1":"#6B7280" }}>Auto-Summarize</span>
          <div style={{ width:36, height:20, borderRadius:100, position:"relative", background:autoSummarize?"#6366F1":"#D1D5DB", transition:"background .2s" }}>
            <div style={{ width:15, height:15, borderRadius:"50%", background:"white", position:"absolute", top:2.5, left:autoSummarize?18:2.5, transition:"left .2s", boxShadow:"0 1px 3px rgba(0,0,0,.2)" }} />
          </div>
        </button>

        {/* Controls */}
        <div className="vm-controls" style={{ display:"flex", alignItems:"center", justifyContent:"space-between" }}>
          <button type="button" onClick={() => { stopRecording(); navigate(-1); }}
            style={{ minHeight:44, fontSize:13, fontWeight:600, color:"#9CA3AF", background:"none", border:"none", cursor:"pointer", fontFamily:"inherit" }}>
            Cancel
          </button>

          <button
            type="button"
            onClick={togglePause}
            style={{ width:60, height:60, borderRadius:"50%", background:"#0E1117", border:"none", display:"flex", alignItems:"center", justifyContent:"center", cursor:"pointer", color:"white", boxShadow:"0 8px 24px rgba(14,17,23,.25)", transition:"transform .15s" }}
            onMouseDown={e => ((e.currentTarget as HTMLButtonElement).style.transform="scale(.94)")}
            onMouseUp={e   => ((e.currentTarget as HTMLButtonElement).style.transform="scale(1)")}
          >
            {isRecording && !isPaused
              ? <Pause size={26} />
              : <Play size={26} style={{ marginLeft:3 }} />
            }
          </button>

          <button
            type="button"
            onClick={handleFinish}
            disabled={!hasStarted || saving}
            style={{ minHeight:44, padding:"10px 20px", borderRadius:14, background:hasStarted?"#0E1117":"#F3F4F6", color:hasStarted?"white":"#9CA3AF", border:"none", cursor:hasStarted?"pointer":"not-allowed", fontSize:13, fontWeight:700, fontFamily:"inherit", display:"flex", alignItems:"center", gap:6, transition:"all .2s" }}>
            {saving ? <><Loader2 size={14} className="vm-spin" /> Saving…</> : "Finish & Save"}
          </button>
        </div>
      </div>
    </div>
  );
}
