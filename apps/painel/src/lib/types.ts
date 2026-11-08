export type Role = "mae" | "baba" | "admin";

export type Profile = {
  id: string;
  role: Role;
  first_name: string;
  full_name: string;
  city: string | null;
  state: string | null;
  neighborhood: string | null;
  suspended_until: string | null;
  banned_at: string | null;
  created_at: string;
};

export type SealSource = "manual" | "greenn" | "importacao";

export type ModerationAction = "aviso" | "suspensao" | "banimento" | "mensagem_oculta" | "avaliacao_removida";

export type Audience = "maes" | "babas" | "mentoria";

export type Content = {
  id: string;
  audience: Audience;
  category: string | null;
  title: string;
  video_path: string | null;
  duration_seconds: number | null;
  sort_order: number;
  published: boolean;
  created_at: string;
};

/** O PostgREST devolve relação 1–1 como objeto, mas às vezes como lista: aceita os dois. */
export function one<T>(v: T | T[] | null | undefined): T | null {
  if (v == null) return null;
  return Array.isArray(v) ? (v[0] ?? null) : v;
}
