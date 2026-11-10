// Contratações: leitura e ações (todas as mudanças passam por funções do banco).
import { supabase } from './supabase';

export type BookingStatus = 'proposta' | 'aceita' | 'recusada' | 'expirada' | 'paga' | 'em_andamento' | 'concluida' | 'cancelada' | 'disputa';

export type Booking = {
  id: string; mother_id: string; nanny_id: string; starts_at: string; ends_at: string; children_count: number;
  children_ages: number[]; area_label: string; hourly_rate_cents: number; is_rehire: boolean; service_cents: number;
  family_fee_cents: number; urgent_fee_cents: number; nanny_fee_cents: number; status: BookingStatus; accept_deadline: string;
  paid_at: string | null; contact_unlock_at: string | null; check_in_at: string | null; check_out_at: string | null;
  payout_at: string | null; nanny_cancel_share_cents: number; family_refund_cents: number; cancelled_by: string | null;
  nanny: { full_name: string; first_name: string } | null;
  mother: { first_name: string; neighborhood: string | null } | null;
};

// A contratação liga aos cadastros de mãe/babá, que ligam ao perfil (nome).
const SELECT = '*, nanny_row:nannies!bookings_nanny_id_fkey(profile:profiles!nannies_id_fkey(full_name, first_name)), mother_row:mothers!bookings_mother_id_fkey(profile:profiles!mothers_id_fkey(first_name, neighborhood))';

type Raw = Omit<Booking, 'nanny' | 'mother'> & {
  nanny_row: { profile: Booking['nanny'] } | null;
  mother_row: { profile: Booking['mother'] } | null;
};
const flat = (r: Raw): Booking => {
  const { nanny_row, mother_row, ...rest } = r;
  return { ...rest, nanny: nanny_row?.profile ?? null, mother: mother_row?.profile ?? null };
};

export const STATUS_LABEL: Record<BookingStatus, string> = {
  proposta: 'Aguardando resposta',
  aceita: 'Aceita · aguardando pagamento',
  recusada: 'Recusada',
  expirada: 'Expirou sem resposta',
  paga: 'Confirmada',
  em_andamento: 'Em andamento',
  concluida: 'Concluída',
  cancelada: 'Cancelada',
  disputa: 'Em análise'
};

export async function listBookings(statuses?: BookingStatus[]): Promise<Booking[]> {
  let q = supabase.from('bookings').select(SELECT).order('starts_at', { ascending: true });
  if (statuses) q = q.in('status', statuses);
  const { data, error } = await q;
  if (error) console.warn('listBookings', error.message);
  return ((data as unknown as Raw[]) ?? []).map(flat);
}

export async function getBooking(id: string): Promise<Booking | null> {
  const { data } = await supabase.from('bookings').select(SELECT).eq('id', id).maybeSingle();
  return data ? flat(data as unknown as Raw) : null;
}

export async function getAddress(id: string): Promise<{ full_address: string; notes: string | null } | null> {
  const { data } = await supabase.from('booking_private').select('full_address, notes').eq('booking_id', id).maybeSingle();
  return data ?? null;
}

export async function getContact(userId: string): Promise<{ phone: string | null; whatsapp: string | null } | null> {
  const { data } = await supabase.from('profile_contacts').select('phone, whatsapp').eq('user_id', userId).maybeSingle();
  return data ?? null;
}

// Nota que outras babás deram à família (a mãe nunca vê; a regra está no banco).
export async function familyReputation(motherId: string): Promise<{ avg: number; count: number; tags: string[] } | null> {
  const { data } = await supabase.from('family_reviews').select('rating, tags').eq('mother_id', motherId).not('published_at', 'is', null);
  if (!data || data.length === 0) return null;
  const counts: Record<string, number> = {};
  data.forEach((r) => (r.tags ?? []).forEach((t: string) => { counts[t] = (counts[t] ?? 0) + 1; }));
  const tags = Object.entries(counts).sort((a, b) => b[1] - a[1]).slice(0, 3).map(([t]) => t);
  return { avg: data.reduce((s, r) => s + r.rating, 0) / data.length, count: data.length, tags };
}

export async function myReviewDone(bookingId: string, table: 'nanny_reviews' | 'family_reviews'): Promise<boolean> {
  const { data } = await supabase.from(table).select('id').eq('booking_id', bookingId).maybeSingle();
  return !!data;
}

export function errorText(e: { message?: string; code?: string } | null): string {
  // Mensagens das funções do banco (raise exception, código P0001) já vêm em português para a pessoa.
  if (e?.code === 'P0001' && e.message) return e.message;
  return 'Algo não saiu como esperado. Tente de novo em instantes.';
}

export const FAMILY_TAGS: Record<string, string> = {
  'pagamento-em-dia': 'Pagamento em dia',
  'respeita-horarios': 'Respeita horários',
  'casa-organizada': 'Casa organizada',
  'comunicacao-clara': 'Comunicação clara',
  'criancas-tranquilas': 'Crianças tranquilas',
  'respeitosa': 'Trata com respeito'
};

export function fmtDateRange(starts: string, ends: string): string {
  const s = new Date(starts);
  const e = new Date(ends);
  const day = s.toLocaleDateString('pt-BR', { weekday: 'short', day: '2-digit', month: 'short' }).replace('.', '');
  const h = (d: Date) => d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
  return `${day} · ${h(s)} às ${h(e)}`;
}
