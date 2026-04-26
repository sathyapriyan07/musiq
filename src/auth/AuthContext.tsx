import { createContext, useContext, useEffect, useMemo, useState } from "react";
import type { Session, User } from "@supabase/supabase-js";
import { supabase } from "../lib/supabaseClient";

type Profile = {
  id: string;
  display_name: string | null;
  is_admin: boolean;
};

type AuthState = {
  session: Session | null;
  user: User | null;
  profile: Profile | null;
  isAdmin: boolean;
  isLoading: boolean;
  profileAccessDenied: boolean;
  profileError: string | null;
  refreshProfile: () => Promise<void>;
  signOut: () => Promise<void>;
};

const AuthContext = createContext<AuthState | null>(null);

async function fetchProfile(userId: string): Promise<{
  profile: Profile | null;
  accessDenied: boolean;
  errorMessage: string | null;
}> {
  const { data, error, status } = await supabase
    .from("profiles")
    .select("id, display_name, is_admin")
    .eq("id", userId)
    .maybeSingle();

  if (error) {
    const accessDenied = status === 403;
    return { profile: null, accessDenied, errorMessage: error.message };
  }

  return { profile: data ?? null, accessDenied: false, errorMessage: null };
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [profileAccessDenied, setProfileAccessDenied] = useState(false);
  const [profileError, setProfileError] = useState<string | null>(null);

  async function refreshProfile() {
    const userId = session?.user?.id;
    if (!userId) {
      setProfile(null);
      setProfileAccessDenied(false);
      setProfileError(null);
      return;
    }
    const loaded = await fetchProfile(userId);
    setProfile(loaded.profile);
    setProfileAccessDenied(loaded.accessDenied);
    setProfileError(loaded.errorMessage);
  }

  useEffect(() => {
    let isMounted = true;

    async function init() {
      setIsLoading(true);
      const { data } = await supabase.auth.getSession();
      if (!isMounted) return;
      setSession(data.session ?? null);

      if (data.session?.user?.id) {
        const loaded = await fetchProfile(data.session.user.id);
        if (!isMounted) return;
        setProfile(loaded.profile);
        setProfileAccessDenied(loaded.accessDenied);
        setProfileError(loaded.errorMessage);
      } else {
        setProfile(null);
        setProfileAccessDenied(false);
        setProfileError(null);
      }

      setIsLoading(false);
    }

    void init();

    const { data: sub } = supabase.auth.onAuthStateChange((_event, next) => {
      setSession(next);
      if (!next?.user?.id) {
        setProfile(null);
        setProfileAccessDenied(false);
        setProfileError(null);
        setIsLoading(false);
        return;
      }
      setIsLoading(true);
      void fetchProfile(next.user.id).then((loaded) => {
        if (!isMounted) return;
        setProfile(loaded.profile);
        setProfileAccessDenied(loaded.accessDenied);
        setProfileError(loaded.errorMessage);
        setIsLoading(false);
      });
    });

    return () => {
      isMounted = false;
      sub.subscription.unsubscribe();
    };
  }, []);

  useEffect(() => {
    if (!session?.user?.id) return;
    if (profileAccessDenied) return;

    let timer: number | undefined;

    const onFocus = () => {
      void refreshProfile();
    };

    window.addEventListener("focus", onFocus);
    document.addEventListener("visibilitychange", onFocus);

    // Lightweight polling so role flips (e.g., making a user admin) reflect without re-login.
    timer = window.setInterval(() => {
      void refreshProfile();
    }, 15_000);

    return () => {
      window.removeEventListener("focus", onFocus);
      document.removeEventListener("visibilitychange", onFocus);
      if (timer) window.clearInterval(timer);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session?.user?.id, profileAccessDenied]);

  const value: AuthState = useMemo(() => {
    return {
      session,
      user: session?.user ?? null,
      profile,
      isAdmin: Boolean(profile?.is_admin),
      isLoading,
      profileAccessDenied,
      profileError,
      refreshProfile: async () => {
        await refreshProfile();
      },
      signOut: async () => {
        await supabase.auth.signOut();
      },
    };
  }, [isLoading, profile, profileAccessDenied, profileError, session]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
