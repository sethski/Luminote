import React, {
  createContext, useContext, useState,
  useEffect, useCallback, useRef, ReactNode,
} from "react";
import { User, Session } from "@supabase/supabase-js";
import { supabase, Profile, UserSettings } from "./supabaseClient";

type AuthContextType = {
  user:             User | null;
  session:          Session | null;
  profile:          Profile | null;
  settings:         UserSettings | null;
  loading:          boolean;
  bootError:        string | null;
  signInWithGoogle: () => Promise<void>;
  signInWithEmail:  (email: string, password: string) => Promise<void>;
  signUpWithEmail:  (email: string, password: string, name: string) => Promise<void>;
  signOut:          () => Promise<void>;
  updateSettings:   (updates: Partial<UserSettings>) => Promise<void>;
  refreshProfile:   () => Promise<void>;
  resetAuthCache:   () => void;
};

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user,      setUser]      = useState<User | null>(null);
  const [session,   setSession]   = useState<Session | null>(null);
  const [profile,   setProfile]   = useState<Profile | null>(null);
  const [settings,  setSettings]  = useState<UserSettings | null>(null);
  const [loading,   setLoading]   = useState(true);
  const [bootError, setBootError] = useState<string | null>(null);

  /* ── Fetch profile + settings ───────────────────── */
  const fetchUserData = useCallback(async (userId: string) => {
    console.log(`[AuthDebug] Fetching user data for: ${userId}`);
    try {
      const [profRes, settRes] = await Promise.all([
        supabase.from("profiles").select("*").eq("id", userId).single(),
        supabase.from("user_settings").select("*").eq("user_id", userId).single(),
      ]);

      const prof = profRes.data as any;
      const profErr = profRes.error;
      const sett = settRes.data as any;
      const settErr = settRes.error;

      if (profErr && profErr.code !== 'PGRST116') {
        console.error("[AuthDebug] Profile fetch error:", profErr);
      }
      if (settErr && settErr.code !== 'PGRST116') {
        console.error("[AuthDebug] Settings fetch error:", settErr);
      }

      if (prof) {
        console.log(`[AuthDebug] Profile loaded: ${prof.display_name} (${prof.email})`);
        setProfile(prof as Profile);
      } else {
        console.warn("[AuthDebug] No profile found for user.");
      }

      if (sett) {
        setSettings(sett as UserSettings);
      }
    } catch (err) {
      console.error("[AuthDebug] fetchUserData failed:", err);
    }
  }, []);

  /* ── Bootstrap session ──────────────────────────── */
  useEffect(() => {
    let mounted = true;
    let bootstrapFinished = false;

    // Safety net: forcibly end loading state if Supabase hangs
    const safetyNet = setTimeout(() => {
      if (mounted) setLoading(false);
    }, 5000);

    const bootstrap = async () => {
      try {
        // 1. Check current session
        const { data: { session: s }, error } = await supabase.auth.getSession();
        if (error) throw error;
        
        if (!mounted) return;
        
        if (s) {
          console.log(`[AuthDebug] Session found in bootstrap: ${s.user.email} (${s.user.id})`);
          setSession(s);
          setUser(s.user);
          await fetchUserData(s.user.id);
        } else {
          console.log("[AuthDebug] No session found in bootstrap.");
        }
      } catch (err) {
        console.error("Auth bootstrap failed:", err);
        setBootError((err as Error).message);
      } finally {
        if (mounted) {
          bootstrapFinished = true;
          setLoading(false);
          clearTimeout(safetyNet);
        }
      }
    };

    // subscribe to changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, s) => {
        if (!mounted) return;
        console.log(`[AuthDebug] Auth state change [${event}]: ${s?.user?.email ?? "no-user"}`);
        
        // Update user state immediately
        setSession(s);
        setUser(s?.user ?? null);

        if (s?.user) {
          await fetchUserData(s.user.id);
        } else {
          setProfile(null);
          setSettings(null);
        }

        // Only release the "loading" lock once bootstrap is complete or we have a user
        if (bootstrapFinished || s?.user) {
          setLoading(false);
        }
      }
    );

    bootstrap();

    return () => {
      mounted = false;
      subscription.unsubscribe();
      clearTimeout(safetyNet);
    };
  }, [fetchUserData]);


  /* ── Apply theme + font globally ────────────────── */
  useEffect(() => {
    if (!settings) return;
    document.documentElement.setAttribute("data-theme", settings.theme);
    document.documentElement.classList.remove("dark", "sepia");
    if (settings.theme === "dark")  document.documentElement.classList.add("dark");
    if (settings.theme === "sepia") document.documentElement.classList.add("sepia");
    document.body.style.fontSize = `${settings.font_size}px`;
  }, [settings?.theme, settings?.font_size]);

  /* ── Auth actions ───────────────────────────────── */
  const signInWithGoogle = async () => {
    console.log("[AuthDebug] Initiating Google Sign-In...");
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: `${window.location.origin}/`,
        queryParams: { access_type: "offline", prompt: "consent" },
      },
    });
    if (error) throw error;
  };

  const signInWithEmail = async (email: string, password: string) => {
    console.log(`[AuthDebug] Initiating Email Sign-In for: ${email}...`);
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });

    if (error) throw error;
    if (data.session) {
      setSession(data.session);
      setUser(data.session.user);
      await fetchUserData(data.session.user.id);
    }
  };

  const signUpWithEmail = async (email: string, password: string, name: string) => {
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { full_name: name } },
    });
    if (error) throw error;
  };

  const signOut = async () => {
    await supabase.auth.signOut();
    setUser(null);
    setSession(null);
    setProfile(null);
    setSettings(null);
  };

  const updateSettings = async (updates: Partial<UserSettings>) => {
    if (!user) return;
    const optimistic = settings ? { ...settings, ...updates } : null;
    if (optimistic) setSettings(optimistic as UserSettings);
    const { error } = await (supabase
      .from("user_settings") as any)
      .upsert({ user_id: user.id, ...updates, updated_at: new Date().toISOString() });
    if (error) {
      if (settings) setSettings(settings);
      throw error;
    }
  };

  const refreshProfile = async () => {
    if (user) await fetchUserData(user.id);
  };

  const resetAuthCache = () => {
    setUser(null);
    setSession(null);
    setProfile(null);
    setSettings(null);
    localStorage.removeItem("luminote-auth-v2");
    window.location.reload();
  };


  return (
    <AuthContext.Provider value={{
      user, session, profile, settings, loading,
      bootError,
      signInWithGoogle, signInWithEmail, signUpWithEmail,
      signOut, updateSettings, refreshProfile, resetAuthCache,
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextType {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
