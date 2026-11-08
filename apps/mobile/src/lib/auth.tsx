// Sessão, perfil e papel (mãe, babá ou admin) de quem está usando o app.
import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import type { Session } from '@supabase/supabase-js';
import { supabase } from './supabase';

export type Role = 'mae' | 'baba' | 'admin';
export type Profile = {
  id: string;
  role: Role;
  first_name: string;
  full_name: string;
  city: string | null;
  neighborhood: string | null;
  suspended_until: string | null;
  banned_at: string | null;
};

type AuthState = {
  ready: boolean;
  profileReady: boolean;
  session: Session | null;
  profile: Profile | null;
  premiumUntil: string | null;
  isPremium: boolean;
  refresh: () => Promise<void>;
  signOut: () => Promise<void>;
};

const Ctx = createContext<AuthState | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [ready, setReady] = useState(false);
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [premiumUntil, setPremiumUntil] = useState<string | null>(null);
  const [loadedFor, setLoadedFor] = useState<string | null>(null);

  const load = useCallback(async (s: Session | null) => {
    if (!s) {
      setProfile(null);
      setPremiumUntil(null);
      setLoadedFor(null);
      return;
    }
    const { data: p } = await supabase
      .from('profiles')
      .select('id, role, first_name, full_name, city, neighborhood, suspended_until, banned_at')
      .eq('id', s.user.id)
      .maybeSingle();
    setProfile((p as Profile) ?? null);
    if (p?.role === 'mae') {
      const { data: m } = await supabase.from('mothers').select('premium_until').eq('id', s.user.id).maybeSingle();
      setPremiumUntil(m?.premium_until ?? null);
    } else {
      setPremiumUntil(null);
    }
    setLoadedFor(s.user.id);
  }, []);

  useEffect(() => {
    supabase.auth.getSession().then(async ({ data }) => {
      setSession(data.session);
      await load(data.session);
      setReady(true);
    });
    // Não chamar o Supabase dentro do aviso de mudança de sessão: isso trava outras consultas.
    const { data: sub } = supabase.auth.onAuthStateChange((_e, s) => {
      setSession(s);
      setTimeout(() => { load(s); }, 0);
    });
    return () => sub.subscription.unsubscribe();
  }, [load]);

  const value = useMemo<AuthState>(() => ({
    ready,
    profileReady: !session || loadedFor === session.user.id,
    session,
    profile,
    premiumUntil,
    isPremium: !!premiumUntil && new Date(premiumUntil) > new Date(),
    refresh: () => load(session),
    signOut: async () => {
      await supabase.auth.signOut();
    }
  }), [ready, session, profile, premiumUntil, loadedFor, load]);

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useAuth() {
  const v = useContext(Ctx);
  if (!v) throw new Error('useAuth fora do AuthProvider');
  return v;
}

export function homeFor(role: Role | undefined) {
  return role === 'baba' ? '/baba-area/propostas' : '/mae/buscar';
}
