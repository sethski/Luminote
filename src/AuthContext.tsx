import React, {
  createContext, useContext, useState,
  useEffect, useCallback, useRef, ReactNode,
} from "react";
import { User, Session } from "@supabase/supabase-js";
import {
  supabase,
  Profile,
  UserSettings,
  AUTH_STORAGE_KEY,
  LEGACY_AUTH_STORAGE_KEYS,
} from "./supabaseClient";

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
  deleteAccount:    () => Promise<void>;
};

const AuthContext = createContext<AuthContextType | null>(null);

const PINNED_USER_ID_KEY = "luminote-pinned-user-id";
const LOGIN_INTENT_KEY = "luminote-login-intent";

const DEFAULT_THEME_SETTINGS = {
  theme: "light" as const,
  font_family: "outfit",
  font_size: 16,
  paper_default: "paper-plain",
  notifications_enabled: true,
};

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user,      setUser]      = useState<User | null>(null);
  const [session,   setSession]   = useState<Session | null>(null);
  const [profile,   setProfile]   = useState<Profile | null>(null);
  const [settings,  setSettings]  = useState<UserSettings | null>(null);
  const [loading,   setLoading]   = useState(true);
  const [bootError, setBootError] = useState<string | null>(null);
  const activeUserIdRef = useRef<string | null>(null);
  const allowUserSwitchRef = useRef(false);

  const stripAuthParamsFromUrl = useCallback(() => {
    try {
      const authParamKeys = [
        "code",
        "access_token",
        "refresh_token",
        "expires_in",
        "expires_at",
        "token_type",
        "provider_token",
        "provider_refresh_token",
        "type",
      ];

      const url = new URL(window.location.href);
      let changed = false;

      for (const key of authParamKeys) {
        if (url.searchParams.has(key)) {
          url.searchParams.delete(key);
          changed = true;
        }
      }

      if (url.hash) {
        const rawHash = url.hash.startsWith("#") ? url.hash.slice(1) : url.hash;
        const hashParams = new URLSearchParams(rawHash);
        for (const key of authParamKeys) {
          if (hashParams.has(key)) {
            hashParams.delete(key);
            changed = true;
          }
        }
        const nextHash = hashParams.toString();
        url.hash = nextHash ? `#${nextHash}` : "";
      }

      if (changed) {
        window.history.replaceState({}, document.title, `${url.pathname}${url.search}${url.hash}`);
      }
    } catch {
      // no-op
    }
  }, []);

  const hasAuthParamsInUrl = useCallback(() => {
    try {
      const keys = [
        "code",
        "access_token",
        "refresh_token",
        "expires_in",
        "expires_at",
        "token_type",
        "provider_token",
        "provider_refresh_token",
        "type",
      ];

      const url = new URL(window.location.href);
      for (const key of keys) {
        if (url.searchParams.has(key)) return true;
      }

      if (url.hash) {
        const rawHash = url.hash.startsWith("#") ? url.hash.slice(1) : url.hash;
        const hashParams = new URLSearchParams(rawHash);
        for (const key of keys) {
          if (hashParams.has(key)) return true;
        }
      }

      return false;
    } catch {
      return false;
    }
  }, []);

  const clearAuthStorage = useCallback(() => {
    const keys = [AUTH_STORAGE_KEY, ...LEGACY_AUTH_STORAGE_KEYS];
    for (const key of keys) {
      localStorage.removeItem(key);
      sessionStorage.removeItem(key);
    }
  }, []);

  const getPinnedUserId = useCallback(() => {
    return localStorage.getItem(PINNED_USER_ID_KEY);
  }, []);

  const setPinnedUserId = useCallback((userId: string) => {
    localStorage.setItem(PINNED_USER_ID_KEY, userId);
  }, []);

  const clearPinnedUserId = useCallback(() => {
    localStorage.removeItem(PINNED_USER_ID_KEY);
  }, []);

  const getLoginIntent = useCallback(() => {
    return localStorage.getItem(LOGIN_INTENT_KEY);
  }, []);

  const setLoginIntent = useCallback((intent: "google" | "email" | "signup") => {
    localStorage.setItem(LOGIN_INTENT_KEY, intent);
  }, []);

  const clearLoginIntent = useCallback(() => {
    localStorage.removeItem(LOGIN_INTENT_KEY);
  }, []);

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
        setProfile(null);
      }

      if (sett) {
        setSettings(sett as UserSettings);
      } else {
        setSettings({
          user_id: userId,
          ...DEFAULT_THEME_SETTINGS,
          updated_at: new Date().toISOString(),
        } as UserSettings);
      }
    } catch (err) {
      console.error("[AuthDebug] fetchUserData failed:", err);
    }
  }, []);

  /* ── Bootstrap session ──────────────────────────── */
  useEffect(() => {
    let mounted = true;
    let bootstrapFinished = false;

    // Safety net: end loading only when we're not in the middle of OAuth code exchange.
    const safetyNet = setTimeout(() => {
      if (!mounted) return;
      const waitingForOAuthExchange = !!getLoginIntent() && hasAuthParamsInUrl();
      if (!waitingForOAuthExchange) setLoading(false);
    }, 15000);

    const bootstrap = async () => {
      try {
        // 1. Check current session
        const { data: { session: s }, error } = await supabase.auth.getSession();
        if (error) throw error;
        
        if (!mounted) return;
        
        if (s) {
          const pinnedUserId = getPinnedUserId();
          const loginIntent = getLoginIntent();
          const isUnexpectedPinnedUser = !!pinnedUserId && pinnedUserId !== s.user.id;
          const isUntrustedRestoredSession = !pinnedUserId && !loginIntent;

          if (isUnexpectedPinnedUser) {
            console.warn(
              `[AuthDebug] Bootstrap session user (${s.user.id}) did not match pinned user (${pinnedUserId}). Clearing local session.`
            );
            activeUserIdRef.current = null;
            clearAuthStorage();
            try {
              await supabase.auth.signOut({ scope: "local" });
            } catch (err) {
              console.error("[AuthDebug] local signOut after pinned mismatch failed:", err);
            }
            setSession(null);
            setUser(null);
            setProfile(null);
            setSettings(null);
            setBootError("Detected an unexpected saved account. Please sign in to your main account again.");
            return;
          }

          if (isUntrustedRestoredSession) {
            console.warn(
              `[AuthDebug] Ignoring untrusted restored session for user (${s.user.id}) without login intent.`
            );
            activeUserIdRef.current = null;
            clearAuthStorage();
            try {
              await supabase.auth.signOut({ scope: "local" });
            } catch (err) {
              console.error("[AuthDebug] local signOut after untrusted bootstrap session failed:", err);
            }
            setSession(null);
            setUser(null);
            setProfile(null);
            setSettings(null);
            setBootError("Please sign in to your main account.");
            return;
          }

          console.log(`[AuthDebug] Session found in bootstrap: ${s.user.email} (${s.user.id})`);
          activeUserIdRef.current = s.user.id;
          if (!pinnedUserId) setPinnedUserId(s.user.id);
          clearLoginIntent();
          setSession(s);
          setUser(s.user);
          void fetchUserData(s.user.id);
        } else {
          console.log("[AuthDebug] No session found in bootstrap.");
          activeUserIdRef.current = null;
        }
      } catch (err) {
        console.error("Auth bootstrap failed:", err);
        setBootError((err as Error).message);
      } finally {
        if (mounted) {
          bootstrapFinished = true;

          const waitingForOAuthExchange =
            !activeUserIdRef.current &&
            !!getLoginIntent() &&
            hasAuthParamsInUrl();

          if (!waitingForOAuthExchange) {
            setLoading(false);
          }

          clearTimeout(safetyNet);

          if (!waitingForOAuthExchange) {
            stripAuthParamsFromUrl();
          }
        }
      }
    };

    // subscribe to changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, s) => {
        if (!mounted) return;
        console.log(`[AuthDebug] Auth state change [${event}]: ${s?.user?.email ?? "no-user"}`);

        const currentUserId = activeUserIdRef.current;
        const incomingUserId = s?.user?.id ?? null;
        const unexpectedSwitch =
          !!currentUserId &&
          !!incomingUserId &&
          currentUserId !== incomingUserId &&
          !allowUserSwitchRef.current;

        if (unexpectedSwitch) {
          console.warn(
            `[AuthDebug] Ignoring unexpected account switch from ${currentUserId} to ${incomingUserId}.`
          );
          return;
        }

        const pinnedUserId = getPinnedUserId();
        const loginIntent = getLoginIntent();
        const waitingForOAuthExchange =
          !incomingUserId &&
          loginIntent === "google" &&
          hasAuthParamsInUrl();
        const pinnedMismatch = !!pinnedUserId && !!incomingUserId && pinnedUserId !== incomingUserId;
        const untrustedIncomingSession = !pinnedUserId && !!incomingUserId && !loginIntent && !allowUserSwitchRef.current;

        if (pinnedMismatch && !allowUserSwitchRef.current) {
          console.warn(
            `[AuthDebug] Incoming auth user (${incomingUserId}) did not match pinned user (${pinnedUserId}). Clearing local session.`
          );
          activeUserIdRef.current = null;
          clearAuthStorage();
          try {
            await supabase.auth.signOut({ scope: "local" });
          } catch (err) {
            console.error("[AuthDebug] local signOut after auth event pinned mismatch failed:", err);
          }
          setSession(null);
          setUser(null);
          setProfile(null);
          setSettings(null);
          setBootError("Detected an unexpected saved account. Please sign in to your main account again.");
          setLoading(false);
          return;
        }

        if (untrustedIncomingSession) {
          console.warn(
            `[AuthDebug] Ignoring untrusted incoming session for user (${incomingUserId}) without login intent.`
          );
          activeUserIdRef.current = null;
          clearAuthStorage();
          try {
            await supabase.auth.signOut({ scope: "local" });
          } catch (err) {
            console.error("[AuthDebug] local signOut after untrusted incoming session failed:", err);
          }
          setSession(null);
          setUser(null);
          setProfile(null);
          setSettings(null);
          setBootError("Please sign in to your main account.");
          setLoading(false);
          return;
        }
        
        // Update user state immediately
        activeUserIdRef.current = incomingUserId;
        setSession(s);
        setUser(s?.user ?? null);

        if (incomingUserId) {
          if (!pinnedUserId || allowUserSwitchRef.current || !!loginIntent) {
            setPinnedUserId(incomingUserId);
          }
          clearLoginIntent();
          setBootError(null);
        } else {
          if (!waitingForOAuthExchange) {
            clearPinnedUserId();
            clearLoginIntent();
          }
        }

        if (s?.user) {
          void fetchUserData(s.user.id);
        } else {
          setProfile(null);
          setSettings(null);
        }

        // Only release the "loading" lock once bootstrap is complete or we have a user
        if ((bootstrapFinished || s?.user) && !waitingForOAuthExchange) {
          setLoading(false);
        } else if (waitingForOAuthExchange) {
          setLoading(true);
        }

        allowUserSwitchRef.current = false;

        if (!waitingForOAuthExchange) {
          stripAuthParamsFromUrl();
        }
      }
    );

    bootstrap();

    return () => {
      mounted = false;
      subscription.unsubscribe();
      clearTimeout(safetyNet);
    };
  }, [
    clearAuthStorage,
    clearLoginIntent,
    clearPinnedUserId,
    fetchUserData,
    getLoginIntent,
    getPinnedUserId,
    hasAuthParamsInUrl,
    setLoginIntent,
    setPinnedUserId,
    stripAuthParamsFromUrl,
  ]);


  /* ── Apply theme + font globally ────────────────── */
  useEffect(() => {
    const theme = (settings?.theme ?? "light") as "light" | "ash" | "obsidian";
    const fontSize = settings?.font_size ?? DEFAULT_THEME_SETTINGS.font_size;
    const root = document.documentElement;
    
    // Apply theme via data-attribute for consistency
    root.setAttribute("data-theme", theme);
    
    // Apply font size
    document.body.style.fontSize = `${fontSize}px`;
  }, [settings?.theme, settings?.font_size]);

  /* ── Auth actions ───────────────────────────────── */
  const signInWithGoogle = async () => {
    console.log("[AuthDebug] Initiating Google Sign-In...");

    // Ensure no stale local session can override the account selected in OAuth.
    activeUserIdRef.current = null;
    clearPinnedUserId();
    setLoginIntent("google");
    clearAuthStorage();
    try {
      await supabase.auth.signOut({ scope: "local" });
    } catch (err) {
      console.warn("[AuthDebug] local signOut before Google Sign-In failed:", err);
    }

    allowUserSwitchRef.current = true;
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: `${window.location.origin}/login`,
        queryParams: {
          access_type: "offline",
          prompt: "select_account",
        },
      },
    });
    if (error) {
      allowUserSwitchRef.current = false;
      clearLoginIntent();
      throw error;
    }
  };

  const signInWithEmail = async (email: string, password: string) => {
    console.log(`[AuthDebug] Initiating Email Sign-In for: ${email}...`);

    // Clear local auth artifacts so email sign-in always starts clean.
    activeUserIdRef.current = null;
    clearPinnedUserId();
    setLoginIntent("email");
    clearAuthStorage();
    try {
      await supabase.auth.signOut({ scope: "local" });
    } catch (err) {
      console.warn("[AuthDebug] local signOut before Email Sign-In failed:", err);
    }

    allowUserSwitchRef.current = true;
    try {
      const { data, error } = await supabase.auth.signInWithPassword({ email, password });

      if (error) throw error;
      if (data.session) {
        activeUserIdRef.current = data.session.user.id;
        setPinnedUserId(data.session.user.id);
        clearLoginIntent();
        setSession(data.session);
        setUser(data.session.user);
        void fetchUserData(data.session.user.id);
      }
    } catch (error) {
      allowUserSwitchRef.current = false;
      clearLoginIntent();
      throw error;
    }
  };

  const signUpWithEmail = async (email: string, password: string, name: string) => {
    setLoginIntent("signup");
    allowUserSwitchRef.current = true;
    try {
      const { error } = await supabase.auth.signUp({
        email,
        password,
        options: { data: { full_name: name } },
      });
      if (error) throw error;
    } finally {
      allowUserSwitchRef.current = false;
      clearLoginIntent();
    }
  };

  const signOut = async () => {
    console.log("[AuthDebug] Nuclear sign-out initiated...");
    allowUserSwitchRef.current = true;
    // 1. Clear local state immediately for instant UI feedback
    activeUserIdRef.current = null;
    clearPinnedUserId();
    clearLoginIntent();
    setUser(null);
    setSession(null);
    setProfile(null);
    setSettings(null);
    clearAuthStorage();

    // 2. Attempt server signout (don't wait/block on success)
    try {
      await supabase.auth.signOut({ scope: "global" });
    } catch (err) {
      console.error("[AuthDebug] server signOut error:", err);
    }

    // 3. Force full redirect to landing (clears all React state/listeners)
    console.log("[AuthDebug] Local state wiped. Jumping to /landing...");
    window.location.href = "/landing";
  };

  const updateSettings = async (updates: Partial<UserSettings>) => {
    if (!user) return;
    const previousSettings = settings;
    const optimistic = {
      user_id: user.id,
      ...(settings ?? { ...DEFAULT_THEME_SETTINGS, updated_at: new Date().toISOString() }),
      ...updates,
      updated_at: new Date().toISOString(),
    } as UserSettings;
    setSettings(optimistic);
    const { error } = await (supabase
      .from("user_settings") as any)
      .upsert({ user_id: user.id, ...updates, updated_at: new Date().toISOString() });
    if (error) {
      if (previousSettings) {
        setSettings(previousSettings);
      } else {
        setSettings({
          user_id: user.id,
          ...DEFAULT_THEME_SETTINGS,
          updated_at: new Date().toISOString(),
        } as UserSettings);
      }
      throw error;
    }
  };

  const refreshProfile = async () => {
    if (user) await fetchUserData(user.id);
  };

  const resetAuthCache = () => {
    activeUserIdRef.current = null;
    clearPinnedUserId();
    clearLoginIntent();
    setUser(null);
    setSession(null);
    setProfile(null);
    setSettings(null);
    clearAuthStorage();
    window.location.reload();
  };

  const deleteAccount = async () => {
    if (!user) return;
    console.log("[AuthDebug] Account deletion initiated for user:", user.id);
    const { error } = await supabase.from("profiles").delete().eq("id", user.id);
    if (error) throw error;
    
    // Nuclear sign out to clean up the rest
    await signOut();
  };


  return (
    <AuthContext.Provider value={{
      user, session, profile, settings, loading,
      bootError,
      signInWithGoogle, signInWithEmail, signUpWithEmail,
      signOut, updateSettings, refreshProfile, resetAuthCache,
      deleteAccount,
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
