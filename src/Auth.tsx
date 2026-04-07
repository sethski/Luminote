/**
 * Auth.tsx — Luminote Authentication
 * Supabase Google OAuth + Email/Password
 */
import React, { useState } from "react";
import { useNavigate, useLocation } from "react-router";
import { useForm } from "react-hook-form";
import { Mail, Lock, ArrowRight, User, Eye, EyeOff, ArrowLeft, BookOpen, AlertCircle, Loader2 } from "lucide-react";
import { useAuth } from "./AuthContext";
import { useToast } from "./toast";

const AUTH_CSS = `
@import url('https://fonts.googleapis.com/css2?family=Bricolage+Grotesque:opsz,wght@12..96,400;12..96,600;12..96,700&family=Outfit:wght@400;500;600;700&display=swap');
.auth-root { font-family:'Outfit',sans-serif; }
.auth-serif { font-family:'Bricolage Grotesque',sans-serif; }
@keyframes auth-up { from{opacity:0;transform:translateY(18px)} to{opacity:1;transform:none} }
@keyframes auth-shake { 0%,100%{transform:translateX(0)} 20%,60%{transform:translateX(-6px)} 40%,80%{transform:translateX(6px)} }
@keyframes spin { to{transform:rotate(360deg)} }
.auth-card { animation:auth-up .5s cubic-bezier(.22,1,.36,1) both .05s; }
.auth-shake { animation:auth-shake .4s ease; }
.spin { animation:spin .8s linear infinite; }
.auth-input {
  width:100%; padding:12px 42px; border-radius:12px;
  border:1.5px solid var(--border); background:var(--bg-main);
  font-size:14px; font-family:'Outfit',sans-serif; color:var(--text-primary);
  outline:none; transition:border-color .2s, box-shadow .2s, background .2s, color .2s;
}
.auth-input::placeholder { color:var(--text-secondary); }
.auth-input:focus { border-color:var(--accent); background:var(--bg-card); box-shadow:0 0 0 4px rgba(99,102,241,.1); }
.auth-input-err { border-color:#F43F5E!important; background:rgba(244, 63, 94, 0.1)!important; }
.auth-input-pr { padding-right:42px!important; }
.g-btn {
  width:100%; display:flex; align-items:center; justify-content:center; gap:10px;
  padding:13px; border:1.5px solid var(--border); border-radius:12px; background:var(--bg-card);
  font-family:'Outfit',sans-serif; font-size:14px; font-weight:600; color:var(--text-primary);
  cursor:pointer; transition:background .15s,border-color .15s,transform .1s, color .15s;
}
.g-btn:hover { background:var(--bg-main); border-color:var(--border); transform:translateY(-1px); }
.g-btn:disabled { opacity:.6; cursor:not-allowed; }
.p-btn {
  width:100%; display:flex; align-items:center; justify-content:center; gap:8px;
  padding:13px; background:var(--accent); color:white; border:none; border-radius:12px;
  font-family:'Outfit',sans-serif; font-size:15px; font-weight:600; cursor:pointer;
  box-shadow:0 4px 16px rgba(0,0,0,.2);
  transition:background .2s,transform .15s,box-shadow .2s;
}
.p-btn:hover:not(:disabled) { opacity:0.9; transform:translateY(-1px); box-shadow:0 8px 24px rgba(0,0,0,.25); }
.p-btn:disabled { opacity:.6; cursor:not-allowed; }
`;

function GIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24">
      <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
      <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
      <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
      <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
    </svg>
  );
}

function FieldErr({ msg }: { msg?: string }) {
  if (!msg) return null;
  return (
    <div style={{ display:"flex", alignItems:"center", gap:5, marginTop:5, marginLeft:2 }}>
      <AlertCircle size={12} color="#F43F5E" />
      <p style={{ color:"#F43F5E", fontSize:12, fontWeight:500 }}>{msg}</p>
    </div>
  );
}

function Shell({ children }: { children: React.ReactNode }) {
  const navigate = useNavigate();
  return (
    <div className="auth-root" style={{ minHeight:"100vh", display:"flex", alignItems:"center", justifyContent:"center", padding:16, position:"relative", overflow:"hidden", background:"var(--bg-main)", color:"var(--text-primary)", transition:"background-color 300ms ease-in-out, color 300ms ease-in-out" }}>
      <style>{AUTH_CSS}</style>
      <div aria-hidden style={{ position:"absolute", top:"-8%", right:"-5%", width:340, height:340, borderRadius:"50%", background:"rgba(99,102,241,.06)", pointerEvents:"none" }} />
      <div aria-hidden style={{ position:"absolute", bottom:"-10%", left:"-8%", width:420, height:420, borderRadius:"50%", background:"rgba(14,17,23,.04)", pointerEvents:"none" }} />
      <button type="button" onClick={() => navigate("/landing")}
        style={{ position:"absolute", top:20, left:20, display:"flex", alignItems:"center", gap:6, fontSize:13, color:"var(--text-secondary)", background:"none", border:"none", cursor:"pointer", fontFamily:"'Outfit',sans-serif", fontWeight:500, zIndex:10 }}>
        <ArrowLeft size={14} /> Back
      </button>
      {children}
    </div>
  );
}

export function Auth() {
  const [mode, setMode] = useState<"login"|"signup">("login");
  const { user, loading, bootError, resetAuthCache } = useAuth();
  const navigate = useNavigate();

  React.useEffect(() => {
    if (!loading && user) {
      navigate("/", { replace: true });
    }
  }, [user, loading, navigate]);

  return mode === "login"
    ? <LoginView  onSwitch={() => setMode("signup")} bootError={bootError} resetAuthCache={resetAuthCache} />
    : <SignUpView onSwitch={() => setMode("login")}  bootError={bootError} resetAuthCache={resetAuthCache} />;
}

type LoginData = { email:string; password:string };

function LoginView({ onSwitch, bootError, resetAuthCache }: { onSwitch:()=>void; bootError:string|null; resetAuthCache:()=>void }) {
  const navigate = useNavigate();
  const location = useLocation();
  const { signInWithGoogle, signInWithEmail } = useAuth();
  const toast = useToast();
  const [showPw, setShowPw] = useState(false);
  const [busy, setBusy] = useState<"email"|"google"|null>(null);
  const [errMsg, setErrMsg] = useState("");
  const [shake, setShake] = useState(false);
  const { register, handleSubmit, formState:{errors} } = useForm<LoginData>({ mode:"onTouched" });

  const onEmail = async (d: LoginData) => {
    setErrMsg(""); setBusy("email");
    try {
      await signInWithEmail(d.email, d.password);
      navigate((location.state as any)?.from?.pathname ?? "/", { replace:true });
    } catch(e:any) {
      const msg = e?.message?.includes("Invalid") ? "Incorrect email or password." : (e?.message ?? "Sign in failed.");
      setErrMsg(msg); setShake(true); setTimeout(() => setShake(false), 400);
    } finally { setBusy(null); }
  };

  const onGoogle = async () => {
    setBusy("google");
    try { await signInWithGoogle(); }
    catch(e:any) { toast.error(e?.message ?? "Google sign-in failed."); setBusy(null); }
  };

  return (
    <Shell>
      <div className={`auth-card ${shake ? "auth-shake" : ""}`}
        style={{ width:"100%", maxWidth:420, background:"var(--bg-card)", borderRadius:24, border:"1px solid var(--border)", padding:32, boxShadow:"0 16px 48px rgba(0,0,0,.08)", transition:"background-color 300ms ease-in-out, border-color 300ms ease-in-out" }}>

        <div style={{ display:"flex", justifyContent:"center", marginBottom:20 }}>
          <div style={{ width:52, height:52, borderRadius:16, background:"var(--text-primary)", display:"flex", alignItems:"center", justifyContent:"center" }}>
            <BookOpen size={22} color="white" />
          </div>
        </div>
        <h1 className="auth-serif" style={{ fontSize:"1.75rem", textAlign:"center", color:"var(--text-primary)", marginBottom:4, fontWeight:600 }}>Welcome back</h1>
        <p style={{ textAlign:"center", color:"var(--text-secondary)", fontSize:14, marginBottom:24 }}>Sign in to Luminote</p>

        <button type="button" className="g-btn" onClick={onGoogle} disabled={!!busy}>
          {busy==="google" ? <Loader2 size={16} className="spin" /> : <GIcon />}
          {busy==="google" ? "Connecting…" : "Continue with Google"}
        </button>

        <div style={{ display:"flex", alignItems:"center", gap:12, margin:"14px 0" }}>
          <div style={{ flex:1, height:1, background:"var(--border)" }} />
          <span style={{ fontSize:11, color:"var(--text-secondary)", fontWeight:700, letterSpacing:".05em" }}>OR</span>
          <div style={{ flex:1, height:1, background:"var(--border)" }} />
        </div>

        {(errMsg || bootError) && (
          <div style={{ display:"flex", alignItems:"center", gap:8, background:"rgba(244, 63, 94, 0.1)", border:"1px solid rgba(244, 63, 94, 0.3)", borderRadius:10, padding:"10px 12px", marginBottom:12, transition:"background-color 300ms ease-in-out, border-color 300ms ease-in-out" }}>
            <AlertCircle size={14} color="#F43F5E" />
            <div style={{ display:"flex", flexDirection:"column", gap:4 }}>
              {errMsg && <p style={{ fontSize:13, color:"#BE123C", fontWeight:500 }}>{errMsg}</p>}
              {bootError && <p style={{ fontSize:12, color:"#BE123C", fontWeight:500 }}>Auth issue: {bootError}</p>}
              <button type="button" onClick={resetAuthCache} style={{ alignSelf:"flex-start", fontSize:11, color:"var(--accent)", fontWeight:700, background:"none", border:"none", cursor:"pointer" }}>
                Reset auth cache & reload
              </button>
            </div>
          </div>
        )}

        <form onSubmit={handleSubmit(onEmail)} noValidate style={{ display:"flex", flexDirection:"column", gap:14 }}>
          <div>
            <label style={{ display:"block", fontSize:13, fontWeight:600, color:"var(--text-primary)", marginBottom:6 }}>Email</label>
            <div style={{ position:"relative" }}>
              <Mail size={15} color="var(--text-secondary)" style={{ position:"absolute", left:14, top:"50%", transform:"translateY(-50%)", pointerEvents:"none" }} />
              <input className={`auth-input ${errors.email ? "auth-input-err" : ""}`} type="email" placeholder="you@example.com"
                autoComplete="email" {...register("email", { required:"Email required", pattern:{value:/^[^\s@]+@[^\s@]+\.[^\s@]+$/,message:"Invalid email"} })} />
            </div>
            <FieldErr msg={errors.email?.message} />
          </div>

          <div>
            <div style={{ display:"flex", justifyContent:"space-between", marginBottom:6 }}>
              <label style={{ fontSize:13, fontWeight:600, color:"var(--text-primary)" }}>Password</label>
              <button type="button" style={{ fontSize:12, color:"var(--accent)", background:"none", border:"none", cursor:"pointer", fontFamily:"inherit", fontWeight:600 }}>Forgot?</button>
            </div>
            <div style={{ position:"relative" }}>
              <Lock size={15} color="var(--text-secondary)" style={{ position:"absolute", left:14, top:"50%", transform:"translateY(-50%)", pointerEvents:"none" }} />
              <input className={`auth-input auth-input-pr ${errors.password ? "auth-input-err" : ""}`}
                type={showPw?"text":"password"} placeholder="••••••••" autoComplete="current-password"
                {...register("password", { required:"Password required", minLength:{value:6,message:"Min 6 chars"} })} />
              <button type="button" onClick={() => setShowPw(v => !v)}
                style={{ position:"absolute", right:13, top:"50%", transform:"translateY(-50%)", color:"var(--text-secondary)", background:"none", border:"none", cursor:"pointer" }}>
                {showPw ? <EyeOff size={15} /> : <Eye size={15} />}
              </button>
            </div>
            <FieldErr msg={errors.password?.message} />
          </div>

          <button type="submit" className="p-btn" disabled={!!busy}>
            {busy==="email" ? <Loader2 size={16} className="spin" /> : <><span>Sign In</span><ArrowRight size={15} /></>}
          </button>
        </form>

        <div style={{ marginTop:24, textAlign:"center" }}>
          <p style={{ fontSize:13, color:"var(--text-secondary)" }}>
            No account?{" "}
            <button type="button" onClick={onSwitch}
              style={{ color:"var(--accent)", fontWeight:700, background:"none", border:"none", cursor:"pointer", fontFamily:"inherit" }}>Sign up</button>
          </p>
          <button type="button" onClick={resetAuthCache}
            style={{ marginTop:14, fontSize:11, color:"var(--text-secondary)", background:"none", border:"none", cursor:"pointer", fontWeight:500, opacity:0.6 }}>
            Not seeing your data? Reset cache
          </button>
        </div>
      </div>
    </Shell>
  );
}

type SignUpData = { name:string; email:string; password:string; confirm:string };

function SignUpView({ onSwitch, bootError, resetAuthCache }: { onSwitch:()=>void; bootError:string|null; resetAuthCache:()=>void }) {
  const { signUpWithEmail, signInWithGoogle } = useAuth();
  const toast = useToast();
  const [showPw, setShowPw] = useState(false);
  const [showCf, setShowCf] = useState(false);
  const [busy, setBusy] = useState<"email"|"google"|null>(null);
  const [done, setDone] = useState(false);
  const { register, handleSubmit, watch, formState:{errors} } = useForm<SignUpData>({ mode:"onTouched" });
  const pwVal = watch("password");

  const onEmail = async (d: SignUpData) => {
    setBusy("email");
    try { await signUpWithEmail(d.email, d.password, d.name); setDone(true); }
    catch(e:any) { toast.error(e?.message ?? "Sign-up failed."); }
    finally { setBusy(null); }
  };

  const onGoogle = async () => {
    setBusy("google");
    try { await signInWithGoogle(); }
    catch(e:any) { toast.error(e?.message ?? "Google sign-in failed."); setBusy(null); }
  };

  if (done) return (
    <Shell>
      <div className="auth-card" style={{ width:"100%", maxWidth:400, background:"var(--bg-card)", borderRadius:24, border:"1px solid var(--border)", padding:40, boxShadow:"0 16px 48px rgba(0,0,0,.08)", display:"flex", flexDirection:"column", alignItems:"center", textAlign:"center", transition:"background-color 300ms ease-in-out, border-color 300ms ease-in-out" }}>
        <div style={{ width:64, height:64, borderRadius:"50%", background:"rgba(16, 185, 129, 0.1)", display:"flex", alignItems:"center", justifyContent:"center", marginBottom:20 }}>
          <Mail size={28} color="#16A34A" />
        </div>
        <h2 className="auth-serif" style={{ fontSize:"1.5rem", color:"var(--text-primary)", marginBottom:8, fontWeight:600 }}>Check your email</h2>
        <p style={{ color:"var(--text-secondary)", fontSize:14, lineHeight:1.6 }}>We sent a confirmation link. Click it to activate your Luminote account.</p>
        <button type="button" onClick={onSwitch}
          style={{ marginTop:24, color:"var(--accent)", fontWeight:600, background:"none", border:"none", cursor:"pointer", fontFamily:"inherit", fontSize:14 }}>
          Back to Sign In
        </button>
      </div>
    </Shell>
  );

  return (
    <Shell>
      <div className="auth-card" style={{ width:"100%", maxWidth:420, background:"var(--bg-card)", borderRadius:24, border:"1px solid var(--border)", padding:32, boxShadow:"0 16px 48px rgba(0,0,0,.08)", transition:"background-color 300ms ease-in-out, border-color 300ms ease-in-out" }}>
        <div style={{ display:"flex", justifyContent:"center", marginBottom:20 }}>
          <div style={{ width:52, height:52, borderRadius:16, background:"var(--text-primary)", display:"flex", alignItems:"center", justifyContent:"center" }}>
            <BookOpen size={22} color="white" />
          </div>
        </div>
        <h1 className="auth-serif" style={{ fontSize:"1.75rem", textAlign:"center", color:"var(--text-primary)", marginBottom:4, fontWeight:600 }}>Create account</h1>
        <p style={{ textAlign:"center", color:"var(--text-secondary)", fontSize:14, marginBottom:18 }}>Join thousands of students</p>

        <button type="button" className="g-btn" onClick={onGoogle} disabled={!!busy}>
          {busy==="google" ? <Loader2 size={16} className="spin" /> : <GIcon />}
          {busy==="google" ? "Connecting…" : "Sign up with Google"}
        </button>

        <div style={{ display:"flex", alignItems:"center", gap:12, margin:"12px 0" }}>
          <div style={{ flex:1, height:1, background:"var(--border)" }} />
          <span style={{ fontSize:11, color:"var(--text-secondary)", fontWeight:700 }}>OR</span>
          <div style={{ flex:1, height:1, background:"var(--border)" }} />
        </div>

        {bootError && (
          <div style={{ display:"flex", alignItems:"center", gap:8, background:"rgba(244, 63, 94, 0.1)", border:"1px solid rgba(244, 63, 94, 0.3)", borderRadius:10, padding:"10px 12px", marginBottom:12, transition:"background-color 300ms ease-in-out, border-color 300ms ease-in-out" }}>
            <AlertCircle size={14} color="#F43F5E" />
            <div style={{ display:"flex", flexDirection:"column", gap:4 }}>
              <p style={{ fontSize:12, color:"#BE123C", fontWeight:500 }}>Auth issue: {bootError}</p>
              <button type="button" onClick={resetAuthCache} style={{ alignSelf:"flex-start", fontSize:11, color:"var(--accent)", fontWeight:700, background:"none", border:"none", cursor:"pointer" }}>
                Reset auth cache & reload
              </button>
            </div>
          </div>
        )}

        <form onSubmit={handleSubmit(onEmail)} noValidate style={{ display:"flex", flexDirection:"column", gap:11 }}>
          {[
            { key:"name", placeholder:"Full name", type:"text", icon:<User size={15} color="var(--text-secondary)" />, ac:"name", rules:{ required:"Name required", minLength:{value:2,message:"Min 2 chars"} } },
            { key:"email", placeholder:"Email address", type:"email", icon:<Mail size={15} color="var(--text-secondary)" />, ac:"email", rules:{ required:"Email required", pattern:{value:/^[^\s@]+@[^\s@]+\.[^\s@]+$/,message:"Invalid email"} } },
          ].map(({ key, placeholder, type, icon, ac, rules }) => (
            <div key={key}>
              <div style={{ position:"relative" }}>
                <div style={{ position:"absolute", left:14, top:"50%", transform:"translateY(-50%)", pointerEvents:"none" }}>{icon}</div>
                <input className={`auth-input ${(errors as any)[key] ? "auth-input-err" : ""}`} type={type} placeholder={placeholder}
                  autoComplete={ac} {...register(key as any, rules as any)} />
              </div>
              <FieldErr msg={(errors as any)[key]?.message} />
            </div>
          ))}

          {[
            { key:"password", placeholder:"Password (8+ chars)", show:showPw, setShow:setShowPw, ac:"new-password", rules:{ required:"Password required", minLength:{value:8,message:"Min 8 chars"} } },
            { key:"confirm", placeholder:"Confirm password", show:showCf, setShow:setShowCf, ac:"new-password", rules:{ required:"Confirm password", validate:(v:string) => v===pwVal || "Passwords don't match" } },
          ].map(({ key, placeholder, show, setShow, ac, rules }) => (
            <div key={key}>
              <div style={{ position:"relative" }}>
                <Lock size={15} color="var(--text-secondary)" style={{ position:"absolute", left:14, top:"50%", transform:"translateY(-50%)", pointerEvents:"none" }} />
                <input className={`auth-input auth-input-pr ${(errors as any)[key] ? "auth-input-err" : ""}`}
                  type={show?"text":"password"} placeholder={placeholder} autoComplete={ac}
                  {...register(key as any, rules as any)} />
                <button type="button" onClick={() => setShow((v:boolean) => !v)}
                  style={{ position:"absolute", right:13, top:"50%", transform:"translateY(-50%)", color:"var(--text-secondary)", background:"none", border:"none", cursor:"pointer" }}>
                  {show ? <EyeOff size={15} /> : <Eye size={15} />}
                </button>
              </div>
              <FieldErr msg={(errors as any)[key]?.message} />
            </div>
          ))}

          <p style={{ fontSize:11, color:"var(--text-secondary)", textAlign:"center" }}>
            By signing up you agree to our{" "}
            <button type="button" style={{ color:"var(--accent)", background:"none", border:"none", cursor:"pointer", fontSize:"inherit", fontFamily:"inherit", fontWeight:600 }}>Terms</button>
            {" "}&amp;{" "}
            <button type="button" style={{ color:"var(--accent)", background:"none", border:"none", cursor:"pointer", fontSize:"inherit", fontFamily:"inherit", fontWeight:600 }}>Privacy</button>.
          </p>

          <button type="submit" className="p-btn" disabled={!!busy}>
            {busy==="email" ? <Loader2 size={16} className="spin" /> : <><span>Create Account</span><ArrowRight size={15} /></>}
          </button>
        </form>

        <p style={{ marginTop:14, textAlign:"center", fontSize:13, color:"var(--text-secondary)" }}>
          Have an account?{" "}
          <button type="button" onClick={onSwitch}
            style={{ color:"var(--accent)", fontWeight:700, background:"none", border:"none", cursor:"pointer", fontFamily:"inherit" }}>Sign in</button>
        </p>
      </div>
    </Shell>
  );
}
