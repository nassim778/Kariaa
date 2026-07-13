"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import type { AuthChangeEvent, Session, User } from "@supabase/supabase-js";
import { getBrowserSupabase, isSupabaseConfigured } from "@/lib/supabaseClient";
import { isProfileAdmin, Profile } from "@/lib/profile";

interface AuthContextValue {
  user: User | null;
  session: Session | null;
  profile: Profile | null;
  isAdmin: boolean;
  loading: boolean;
  configured: boolean;
  /** True after clicking an email password-recovery link until password is updated. */
  passwordRecovery: boolean;
  clearPasswordRecovery: () => void;
  signOut: () => Promise<void>;
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue>({
  user: null,
  session: null,
  profile: null,
  isAdmin: false,
  loading: true,
  configured: false,
  passwordRecovery: false,
  clearPasswordRecovery: () => {},
  signOut: async () => {},
  refreshProfile: async () => {},
});

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [passwordRecovery, setPasswordRecovery] = useState(false);

  const refreshProfile = useCallback(async () => {
    const supabase = getBrowserSupabase();
    const uid = session?.user?.id;
    if (!supabase || !uid) {
      setProfile(null);
      return;
    }
    const { data } = await supabase
      .from("profiles")
      .select("id, email, is_admin, created_at")
      .eq("id", uid)
      .maybeSingle();
    setProfile((data as Profile) ?? null);
  }, [session?.user?.id]);

  useEffect(() => {
    const supabase = getBrowserSupabase();
    if (!supabase) {
      setLoading(false);
      return;
    }
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      setLoading(false);
      if (
        typeof window !== "undefined" &&
        new URLSearchParams(window.location.search).get("recovery") === "1"
      ) {
        setPasswordRecovery(true);
      }
    });
    const { data: sub } = supabase.auth.onAuthStateChange(
      (event: AuthChangeEvent, s) => {
        if (event === "PASSWORD_RECOVERY") {
          setPasswordRecovery(true);
        }
        if (event === "SIGNED_OUT") {
          setPasswordRecovery(false);
        }
        setSession(s);
      },
    );
    return () => sub.subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (loading) return;
    refreshProfile();
  }, [loading, refreshProfile]);

  const clearPasswordRecovery = useCallback(() => {
    setPasswordRecovery(false);
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({
      user: session?.user ?? null,
      session,
      profile,
      isAdmin: isProfileAdmin(profile),
      loading,
      configured: isSupabaseConfigured,
      passwordRecovery,
      clearPasswordRecovery,
      signOut: async () => {
        await getBrowserSupabase()?.auth.signOut();
        setProfile(null);
        setPasswordRecovery(false);
      },
      refreshProfile,
    }),
    [session, profile, loading, passwordRecovery, clearPasswordRecovery, refreshProfile],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  return useContext(AuthContext);
}
