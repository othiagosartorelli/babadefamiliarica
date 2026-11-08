// Leitura dos dados reais do banco, já no formato dos cards do app.
import { supabase, signedUrl } from './supabase';
import type { NannyCard } from '@/data/sample';

export type LiveNanny = Omit<NannyCard, 'photo'> & { photo?: number; photoUri?: string | null; isSample: boolean; live: true };

const KIND_LABEL: Record<string, string> = {
  identidade: 'Identidade e prova de vida',
  antecedentes: 'Antecedentes criminais',
  endereco: 'Comprovante de residência',
  curso: 'Curso comprovado',
  referencia: 'Referências de famílias'
};

function age(birth: string | null): number {
  if (!birth) return 0;
  const b = new Date(birth);
  const n = new Date();
  let a = n.getFullYear() - b.getFullYear();
  if (n.getMonth() < b.getMonth() || (n.getMonth() === b.getMonth() && n.getDate() < b.getDate())) a--;
  return a;
}

function monthYear(d: string) {
  return new Date(d).toLocaleDateString('pt-BR', { month: 'short', year: 'numeric' });
}

type Row = {
  id: string; birth_date: string | null; bio: string | null; photo_path: string | null; years_experience: number | null;
  specialties: string[]; hourly_rate_cents: number | null; rating: number | null; review_count: number; rehire_rate: number;
  is_sample: boolean; profiles: { full_name: string; first_name: string; city: string | null; neighborhood: string | null } | null;
};

export async function fetchNannies(ids?: string[]): Promise<LiveNanny[]> {
  let q = supabase
    .from('nannies')
    .select('id, birth_date, bio, photo_path, years_experience, specialties, hourly_rate_cents, rating, review_count, rehire_rate, is_sample, profiles!nannies_id_fkey(full_name, first_name, city, neighborhood)')
    .eq('is_published', true)
    .order('ranking_score', { ascending: false });
  if (ids) q = q.in('id', ids);
  const { data, error } = await q;
  if (error || !data) return [];
  const rows = data as unknown as Row[];
  const idList = rows.map((r) => r.id);
  const [{ data: seals }, { data: badges }] = await Promise.all([
    supabase.from('nanny_seal_status').select('nanny_id, granted_at').in('nanny_id', idList),
    supabase.from('nanny_verification_badges').select('nanny_id, kind, verified_at').in('nanny_id', idList)
  ]);
  return Promise.all(rows.map(async (r) => {
    const seal = seals?.find((s) => s.nanny_id === r.id);
    const checks = (badges ?? []).filter((b) => b.nanny_id === r.id).map((b) => ({ label: KIND_LABEL[b.kind] ?? b.kind, date: b.verified_at ? monthYear(b.verified_at) : '' }));
    const place = [r.profiles?.neighborhood, r.profiles?.city].filter(Boolean).join(' · ');
    return {
      id: r.id,
      name: r.profiles?.full_name ?? 'Babá',
      age: age(r.birth_date),
      place: place || 'Brasil',
      rating: r.rating !== null ? Number(r.rating) : null,
      reviews: r.review_count,
      rehired: 0,
      hasSeal: !!seal,
      sealSince: seal ? new Date(seal.granted_at).toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' }) : undefined,
      verified: checks.some((c) => c.label === KIND_LABEL.identidade),
      line: [r.years_experience ? `${r.years_experience} anos de experiência` : null, r.specialties?.[0]].filter(Boolean).join(' · '),
      bio: r.bio ?? '',
      tags: r.specialties ?? [],
      hourlyRateCents: r.hourly_rate_cents ?? 0,
      photoUri: await signedUrl(r.photo_path),
      checks,
      criteria: [],
      isSample: r.is_sample,
      live: true as const
    };
  }));
}

export async function fetchFavoriteIds(): Promise<string[]> {
  const { data } = await supabase.from('favorites').select('nanny_id');
  return (data ?? []).map((f) => f.nanny_id);
}

export async function setFavorite(motherId: string, nannyId: string, on: boolean) {
  if (on) await supabase.from('favorites').insert({ mother_id: motherId, nanny_id: nannyId });
  else await supabase.from('favorites').delete().eq('mother_id', motherId).eq('nanny_id', nannyId);
}

// Abre (ou cria) a conversa da mãe com uma babá.
export async function openConversation(motherId: string, nannyId: string): Promise<string | null> {
  const { data: found } = await supabase.from('conversations').select('id').eq('mother_id', motherId).eq('nanny_id', nannyId).maybeSingle();
  if (found) return found.id;
  const { data, error } = await supabase.from('conversations').insert({ mother_id: motherId, nanny_id: nannyId }).select('id').single();
  return error ? null : data.id;
}

export type ConversationItem = {
  id: string; mother_id: string; nanny_id: string; mother_first_name: string | null; nanny_first_name: string | null;
  nanny_full_name: string | null; nanny_photo_path: string | null; last_body: string | null; last_at: string | null;
};

export async function fetchConversations(): Promise<ConversationItem[]> {
  const { data } = await supabase.from('conversation_list').select('*').order('last_at', { ascending: false, nullsFirst: false });
  return (data as ConversationItem[]) ?? [];
}
