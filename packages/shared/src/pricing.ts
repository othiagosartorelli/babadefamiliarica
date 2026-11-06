// Taxas da plataforma (em centavos para evitar erro de arredondamento).
// Valores aprovados na pesquisa: avulso 1ª contratação 12% babá + 10% família;
// recontratação 8% + 8%; mãe premium paga 5% de taxa de serviço.

export type FeeInput = {
  hourlyRateCents: number;
  hours: number;
  isRehire: boolean;
  familyIsPremium: boolean;
  isUrgent?: boolean; // menos de 24h
};

export type FeeBreakdown = {
  serviceCents: number;
  familyFeeCents: number;
  urgentFeeCents: number;
  familyTotalCents: number;
  nannyFeeCents: number;
  nannyPayoutCents: number;
  platformRevenueCents: number;
  familyFeeRate: number;
  nannyFeeRate: number;
};

export const RATES = {
  nannyFirst: 0.12,
  nannyRehire: 0.08,
  familyFirst: 0.10,
  familyRehire: 0.08,
  familyPremium: 0.05,
  urgent: 0.05
};

const round = (n: number) => Math.round(n);

export function computeFees(i: FeeInput): FeeBreakdown {
  if (i.hourlyRateCents <= 0 || i.hours <= 0) throw new Error('Valor e horas precisam ser positivos');
  const serviceCents = round(i.hourlyRateCents * i.hours);
  const familyBase = i.isRehire ? RATES.familyRehire : RATES.familyFirst;
  const familyFeeRate = i.familyIsPremium ? Math.min(familyBase, RATES.familyPremium) : familyBase;
  const nannyFeeRate = i.isRehire ? RATES.nannyRehire : RATES.nannyFirst;
  const familyFeeCents = round(serviceCents * familyFeeRate);
  const urgentFeeCents = i.isUrgent ? round(serviceCents * RATES.urgent) : 0;
  const nannyFeeCents = round(serviceCents * nannyFeeRate);
  return {
    serviceCents,
    familyFeeCents,
    urgentFeeCents,
    familyTotalCents: serviceCents + familyFeeCents + urgentFeeCents,
    nannyFeeCents,
    nannyPayoutCents: serviceCents - nannyFeeCents,
    platformRevenueCents: familyFeeCents + urgentFeeCents + nannyFeeCents,
    familyFeeRate,
    nannyFeeRate
  };
}

// Política de cancelamento (avulso): quanto vai para a babá quando a família cancela.
export function familyCancellationShare(hoursBeforeStart: number): number {
  if (hoursBeforeStart >= 48) return 0;
  if (hoursBeforeStart >= 24) return 0.5;
  return 1;
}

// O contato direto é liberado quando acaba o prazo de cancelamento grátis (48h antes),
// ou na hora, se a contratação foi feita dentro desse prazo. Sempre exige pagamento confirmado.
export function contactUnlockAt(startsAt: Date, paidAt: Date | null): Date | null {
  if (!paidAt) return null;
  const freeWindowEnd = new Date(startsAt.getTime() - 48 * 3600 * 1000);
  return paidAt > freeWindowEnd ? paidAt : freeWindowEnd;
}

export function formatBRL(cents: number): string {
  return (cents / 100).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}
