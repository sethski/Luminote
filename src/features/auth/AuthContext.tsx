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
} from "../../lib/supabaseClient";
import { safeAppPath } from "../../lib/utils";

type AuthContextType = {
  user:             User | null;
  session:          Session | null;
  profile:          Profile | null;
  settings:         UserSettings | null;
  loading:          boolean;
  bootError:        string | null;
  signInWithGoogle: (returnTo?: string) => Promise<void>;
  signInWithEmail:  (email: string, password: string) => Promise<void>;
  signUpWithEmail:  (email: string, password: string, name: string) => Promise<void>;
  signOut:          () => Promise<void>;
  updateProfile:    (updates: Partial<Profile>) => Promise<void>;
  updateSettings:   (updates: Partial<UserSettings>) => Promise<void>;
  refreshProfile:   () => Promise<void>;
  resetAuthCache:   () => void;
  deleteAccount:    () => Promise<void>;
};

const AuthContext = createContext<AuthContextType | null>(null);

const PINNED_USER_ID_KEY = "luminote-pinned-user-id";
const LOGIN_INTENT_KEY = "luminote-login-intent";
export const OAUTH_RETURN_TO_KEY = "luminote-oauth-return-to";

const DEFAULT_THEME_SETTINGS = {
  theme: "light" as const,
  font_family: "outfit",
  font_size: 16,
  paper_default: "paper-plain",
  notifications_enabled: true,
  daily_study_goal_hours: 12,
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

  // Keep all auth redirects on the active app origin so localhost port mismatches do not break OAuth.
  const getAuthRedirectUrl = useCallback(() => `${window.location.origin}/auth/callback`, []);

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

  const setOAuthReturnTo = useCallback((returnTo: string) => {
    localStorage.setItem(OAUTH_RETURN_TO_KEY, safeAppPath(returnTo));
  }, []);

  const clearOAuthReturnTo = useCallback(() => {
    localStorage.removeItem(OAUTH_RETURN_TO_KEY);
  }, []);

  /* ── Fetch profile + settings ───────────────────── */
  const fetchUserData = useCallback(async (userId: string) => {
    try {
      const [profRes, settRes] = await Promise.all([
        supabase.from("profiles").select("*").eq("id", userId).single(),
        supabase.from("user_settings").select("*").eq("user_id", userId).single(),
      ]);

      const prof = profRes.data as Profile | null;
      const profErr = profRes.error;
      const sett = settRes.data as UserSettings | null;
      const settErr = settRes.error;

      if (profErr && profErr.code !== "PGRST116") {
        console.error("Profile fetch failed:", profErr.message);
      }
      if (settErr && settErr.code !== "PGRST116") {
        console.error("Settings fetch failed:", settErr.message);
      }

      if (prof) {
        setProfile(prof);
      } else {
        setProfile(null);
      }

      if (sett) {
        setSettings(sett);
      } else {
        setSettings({
          user_id: userId,
          ...DEFAULT_THEME_SETTINGS,
          updated_at: new Date().toISOString(),
        } as UserSettings);
      }
    } catch (err) {
      console.error("fetchUserData failed:", err instanceof Error ? err.message : err);
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

          activeUserIdRef.current = s.user.id;
          if (!pinnedUserId || allowUserSwitchRef.current) setPinnedUserId(s.user.id);
          clearLoginIntent();
          clearOAuthReturnTo();
          setSession(s);
          setUser(s.user);
          void fetchUserData(s.user.id);
        } else {
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
      async (_event, s) => {
        if (!mounted) return;

        const currentUserId = activeUserIdRef.current;
        const incomingUserId = s?.user?.id ?? null;

        const pinnedUserId = getPinnedUserId();
        const loginIntent = getLoginIntent();
        const waitingForOAuthExchange =
          !incomingUserId &&
          loginIntent === "google" &&
          hasAuthParamsInUrl();
        
        // Update user state immediately
        activeUserIdRef.current = incomingUserId;
        setSession(s);
        setUser(s?.user ?? null);

        if (incomingUserId) {
          if (!pinnedUserId || allowUserSwitchRef.current || !!loginIntent) {
            setPinnedUserId(incomingUserId);
          }
          clearLoginIntent();
          clearOAuthReturnTo();
          setBootError(null);
        } else {
          if (!waitingForOAuthExchange) {
            clearPinnedUserId();
            clearLoginIntent();
            clearOAuthReturnTo();
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
  const signInWithGoogle = async (returnTo = "/home") => {
    activeUserIdRef.current = null;
    clearPinnedUserId();
    setOAuthReturnTo(returnTo);
    setLoginIntent("google");
    clearAuthStorage();
    try {
      await supabase.auth.signOut({ scope: "local" });
    } catch {
      // ignore local sign-out errors before OAuth
    }

    allowUserSwitchRef.current = true;
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: getAuthRedirectUrl(),
        queryParams: {
          access_type: "offline",
          prompt: "select_account",
        },
      },
    });
    if (error) {
      allowUserSwitchRef.current = false;
      clearLoginIntent();
      clearOAuthReturnTo();
      throw error;
    }
  };

  const signInWithEmail = async (email: string, password: string) => {
    activeUserIdRef.current = null;
    clearPinnedUserId();
    clearOAuthReturnTo();
    setLoginIntent("email");
    clearAuthStorage();
    try {
      await supabase.auth.signOut({ scope: "local" });
    } catch {
      // ignore
    }

    allowUserSwitchRef.current = true;
    try {
      const { data, error } = await supabase.auth.signInWithPassword({ email, password });

      if (error) throw error;
      if (data.session) {
        activeUserIdRef.current = data.session.user.id;
        setPinnedUserId(data.session.user.id);
        clearLoginIntent();
        setLoading(false);
        setSession(data.session);
        setUser(data.session.user);
        void fetchUserData(data.session.user.id);
      }
    } catch (error) {
      allowUserSwitchRef.current = false;
      clearLoginIntent();
      clearOAuthReturnTo();
      throw error;
    }
  };

  const signUpWithEmail = async (email: string, password: string, name: string) => {
    clearOAuthReturnTo();
    setLoginIntent("signup");
    allowUserSwitchRef.current = true;
    try {
      const { error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: { full_name: name },
          emailRedirectTo: getAuthRedirectUrl(),
        },
      });
      if (error) throw error;
    } finally {
      allowUserSwitchRef.current = false;
      clearLoginIntent();
    }
  };

  const signOut = async () => {
    allowUserSwitchRef.current = true;
    // 1. Clear local state immediately for instant UI feedback
    activeUserIdRef.current = null;
    clearPinnedUserId();
    clearLoginIntent();
    clearOAuthReturnTo();
    setUser(null);
    setSession(null);
    setProfile(null);
    setSettings(null);
    clearAuthStorage();

    // 2. Attempt server signout (don't wait/block on success)
    try {
      await supabase.auth.signOut({ scope: "global" });
    } catch (err) {
      console.error("server signOut error:", err instanceof Error ? err.message : err);
    }

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

  const updateProfile = async (updates: Partial<Profile>) => {
    if (!user) return;

    const previousProfile = profile;
    const optimisticProfile = {
      ...(profile ?? {}),
      ...updates,
    } as Profile;

    setProfile(optimisticProfile);

    const { error } = await supabase
      .from("profiles")
      .upsert({
        id: user.id,
        ...updates,
      }, {
        onConflict: 'id',
      })
      .select()
      .single();

    if (error) {
      console.error("Profile update failed:", error.message);
      if (previousProfile) {
        setProfile(previousProfile);
      } else {
        setProfile(null);
      }
      throw error;
    }

    await fetchUserData(user.id);
  };

  const refreshProfile = async () => {
    if (user) await fetchUserData(user.id);
  };

  const resetAuthCache = () => {
    activeUserIdRef.current = null;
    clearPinnedUserId();
    clearLoginIntent();
    clearOAuthReturnTo();
    setUser(null);
    setSession(null);
    setProfile(null);
    setSettings(null);
    clearAuthStorage();
    window.location.reload();
  };

  const deleteAccount = async () => {
    if (!user) return;
    const { data: sessionData } = await supabase.auth.getSession();
    const accessToken = sessionData.session?.access_token;
    if (!accessToken) throw new Error("Not authenticated");

    const response = await fetch("/api/delete-account", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${accessToken}`,
      },
      body: JSON.stringify({ userId: user.id }),
    });

    const payload = await response.json().catch(() => ({}));
    if (!response.ok) {
      throw new Error(typeof payload.error === "string" ? payload.error : "Account deletion failed");
    }

    await signOut();
  };


  return (
    <AuthContext.Provider value={{
      user, session, profile, settings, loading,
      bootError,
      signInWithGoogle, signInWithEmail, signUpWithEmail,
      signOut, updateProfile, updateSettings, refreshProfile, resetAuthCache,
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
