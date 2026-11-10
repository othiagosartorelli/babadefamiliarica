import { getSupabase } from "./supabase";
import { one } from "./types";

export type BookingStatus =
  | "proposta"
  | "aceita"
  | "recusada"
  | "expirada"
  | "paga"
  | "em_andamento"
  | "concluida"
  | "cancelada"
  | "disputa";

export const STATUS_LABEL: Record<BookingStatus, string> = {
  proposta: "Proposta enviada",
  aceita: "Aceita, aguardando pagamento",
  recusada: "Recusada",
  expirada: "Expirada",
  paga: "Paga",
  em_andamento: "Em andamento",
  concluida: "Concluída",
  cancelada: "Cancelada",
  disputa: "Em disputa",
};

export const STATUS_ORDER: BookingStatus[] = [
  "proposta",
  "aceita",
  "paga",
  "em_andamento",
  "concluida",
  "disputa",
  "cancelada",
  "recusada",
  "expirada",
];

export type Booking = {
  id: string;
  starts_at: string;
  ends_at: string;
  status: BookingStatus;
  area_label: string;
  service_cents: number;
  family_fee_cents: number;
  urgent_fee_cents: number;
  nanny_fee_cents: number;
  nanny_cancel_share_cents: number;
  family_refund_cents: number;
  payment_provider_ref: string | null;
  paid_at: string | null;
  payout_at: string | null;
  cancelled_at: string | null;
  created_at: string;
  mother_first_name: string | null;
  nanny_name: string | null;
};

/** Total que a família paga: serviço + taxa da família + taxa de urgência. */
export const familyTotal = (b: Booking) => b.service_cents + b.family_fee_cents + b.urgent_fee_cents;
/** O que a babá recebe numa contratação concluída: serviço menos a taxa da babá. */
export const nannyNet = (b: Booking) => b.service_cents - b.nanny_fee_cents;
export const isTestPayment = (b: Booking) => !!b.payment_provider_ref?.startsWith("teste-");

type Named = { profiles: unknown } | null;
function nameFrom(rel: unknown, field: "first_name" | "full_name"): string | null {
  const parent = one(rel as Named | Named[]);
  const p = one((parent?.profiles ?? null) as Record<string, string> | Record<string, string>[] | null);
  return p?.[field] ?? null;
}

export async function loadBookings(): Promise<Booking[]> {
  const { data, error } = await getSupabase()
    .from("bookings")
    .select(
      "id, starts_at, ends_at, status, area_label, service_cents, family_fee_cents, urgent_fee_cents, nanny_fee_cents, nanny_cancel_share_cents, family_refund_cents, payment_provider_ref, paid_at, payout_at, cancelled_at, created_at, mothers(profiles(first_name)), nannies(profiles(full_name))",
    )
    .order("starts_at", { ascending: false })
    .limit(5000);
  if (error) throw error;
  return ((data ?? []) as unknown as (Record<string, unknown> & { mothers: unknown; nannies: unknown })[]).map(
    ({ mothers, nannies, ...b }) => ({
      ...(b as unknown as Omit<Booking, "mother_first_name" | "nanny_name">),
      nanny_cancel_share_cents: Number(b.nanny_cancel_share_cents ?? 0),
      family_refund_cents: Number(b.family_refund_cents ?? 0),
      mother_first_name: nameFrom(mothers, "first_name"),
      nanny_name: nameFrom(nannies, "full_name"),
    }),
  );
}
