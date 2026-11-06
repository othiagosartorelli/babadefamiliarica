// Nota exibida e pontuação de ranking das babás (0 a 100).
// Pesos iniciais da pesquisa; calibrar com dados reais.

export type Review = {
  ratings: { care: number; punctuality: number; communication: number; posture: number; presentation: number };
  createdAt: Date;
  familyId: string;
  raterSeverity?: number; // fator 0.5–1 para quem avalia sempre muito abaixo da média
};

export const CRITERIA_WEIGHTS = { care: 0.3, punctuality: 0.2, communication: 0.2, posture: 0.15, presentation: 0.15 };

export function reviewScore(r: Review['ratings']): number {
  return (
    r.care * CRITERIA_WEIGHTS.care +
    r.punctuality * CRITERIA_WEIGHTS.punctuality +
    r.communication * CRITERIA_WEIGHTS.communication +
    r.posture * CRITERIA_WEIGHTS.posture +
    r.presentation * CRITERIA_WEIGHTS.presentation
  );
}

const DAY = 24 * 3600 * 1000;

// Peso por idade: meia-vida de 12 meses. Cada família soma no máximo 2,0 de peso.
export function weightedReviews(reviews: Review[], now: Date): { w: number; r: number }[] {
  const perFamily: Record<string, number> = {};
  const sorted = [...reviews].sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
  const out: { w: number; r: number }[] = [];
  for (const rv of sorted) {
    const ageDays = Math.max(0, (now.getTime() - rv.createdAt.getTime()) / DAY);
    let w = Math.pow(0.5, ageDays / 365) * (rv.raterSeverity ?? 1);
    const used = perFamily[rv.familyId] ?? 0;
    w = Math.max(0, Math.min(w, 2 - used));
    perFamily[rv.familyId] = used + w;
    if (w > 0) out.push({ w, r: reviewScore(rv.ratings) });
  }
  return out;
}

export function bayesianRating(reviews: Review[], platformMean: number, now = new Date(), C = 8): number {
  const m = platformMean - 0.2;
  const wr = weightedReviews(reviews, now);
  const sw = wr.reduce((s, x) => s + x.w, 0);
  const swr = wr.reduce((s, x) => s + x.w * x.r, 0);
  return (C * m + swr) / (C + sw);
}

export type RankingInput = {
  reviews: Review[];
  platformMean: number;
  rehireRate: number; // 0–1, já suavizada
  responseRate12h: number; // 0–1
  cancellations: number;
  lateCancellations: number; // < 48h, contam em dobro
  bookings: number;
  hasMentorshipSeal: boolean;
  verifiedCourses: number;
  checkedReferences: number;
  profileCompleteness: number; // 0–1
  now?: Date;
};

export function rankingScore(i: RankingInput): number {
  const now = i.now ?? new Date();
  const R = bayesianRating(i.reviews, i.platformMean, now);
  const n = weightedReviews(i.reviews, now).reduce((s, x) => s + x.w, 0);
  const quality = 50 * Math.max(0, Math.min(1, (R - 1) / 4));
  const volume = 10 * (1 - Math.exp(-n / 15));
  const rehire = 12 * clamp01(i.rehireRate);
  const response = 8 * clamp01(i.responseRate12h);
  const cancelPenalty = i.bookings > 0 ? (i.cancellations + i.lateCancellations) / i.bookings : 0;
  const reliability = 10 * clamp01(1 - cancelPenalty);
  const seals = Math.min(6, (i.hasMentorshipSeal ? 3 : 0) + Math.min(2, i.verifiedCourses) + Math.min(1, i.checkedReferences));
  const profile = 4 * clamp01(i.profileCompleteness);
  return Math.round((quality + volume + rehire + response + reliability + seals + profile) * 10) / 10;
}

export type Level = 'nova' | 'prata' | 'ouro' | 'elite';

export function level(i: { rating: number; reviewCount: number; bookings12m: number; cancelRate: number; rehireRate: number; responseRate: number; incidents: number; hasMentorshipSeal: boolean }): Level {
  if (i.reviewCount < 3) return 'nova';
  if (i.rating >= 4.85 && i.bookings12m >= 25 && i.rehireRate >= 0.3 && i.responseRate >= 0.9 && i.incidents === 0 && i.hasMentorshipSeal) return 'elite';
  if (i.rating >= 4.7 && i.bookings12m >= 10 && i.cancelRate < 0.02) return 'ouro';
  return 'prata';
}

function clamp01(x: number) {
  return Math.max(0, Math.min(1, x));
}
