"use client";

import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from "react";
import type { User } from "@supabase/supabase-js";
import { getSupabase } from "@/lib/supabase";
import { friendlyError } from "@/lib/format";
import type { Profile } from "@/lib/types";

type Status = "loading" | "signedOut" | "error" | "notAdmin" | "admin";

type AuthState = {
  status: Status;
  user: User | null;
  profile: Profile | null;
  error: string | null;
};

type AuthContextValue = AuthState & {
  signIn: (email: string, password: string) => Promise<string | null>;
  signOut: () => Promise<void>;
  retry: () => void;
};

const AuthContext = createContext<AuthContextValue | null>(null);

async function loadProfile(user: User): Promise<AuthState> {
  const { data, error } = await getSupabase()
    .from("profiles")
    .select("id, role, first_name, full_name, city, state, neighborhood, suspended_until, banned_at, created_at")
    .eq("id", user.id)
    .maybeSingle();
  if (error) return { status: "error", user, profile: null, error: friendlyError(error) };
  const profile = (data as Profile | null) ?? null;
  if (!profile || profile.role !== "admin") return { status: "notAdmin", user, profile, error: null };
  return { status: "admin", user, profile, error: null };
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<AuthState>({ status: "loading", user: null, profile: null, error: null });
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    const supabase = getSupabase();
    let alive = true;
    let currentUserId: string | null | undefined;

    const apply = (user: User | null) => {
      if (!alive) return;
      if (!user) {
        currentUserId = null;
        setState({ status: "signedOut", user: null, profile: null, error: null });
        return;
      }
      if (currentUserId === user.id) return; // renovação de token: nada muda
      currentUserId = user.id;
      loadProfile(user).then((s) => {
        if (alive) setState(s);
      });
    };

    supabase.auth.getSession().then(({ data }) => apply(data.session?.user ?? null));

    // Não chamar o banco dentro do callback (pode travar o cliente): agenda para depois.
    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
      setTimeout(() => apply(session?.user ?? null), 0);
    });

    return () => {
      alive = false;
      sub.subscription.unsubscribe();
    };
  }, [attempt]);

  const signIn = useCallback(async (email: string, password: string) => {
    const { error } = await getSupabase().auth.signInWithPassword({ email: email.trim(), password });
    return error ? friendlyError(error) : null;
  }, []);

  const signOut = useCallback(async () => {
    await getSupabase().auth.signOut();
    setState({ status: "signedOut", user: null, profile: null, error: null });
  }, []);

  const retry = useCallback(() => {
    setState((s) => ({ ...s, status: "loading", error: null }));
    setAttempt((a) => a + 1);
  }, []);

  return <AuthContext.Provider value={{ ...state, signIn, signOut, retry }}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth precisa estar dentro de AuthProvider");
  return ctx;
}
