import { test } from 'node:test';
import assert from 'node:assert/strict';
import { checkMessage } from '../src/contactGuard.ts';
import { computeFees, contactUnlockAt, familyCancellationShare } from '../src/pricing.ts';
import { bayesianRating, rankingScore, level, type Review } from '../src/ranking.ts';

test('mensagens normais passam', () => {
  for (const t of [
    'A Helena dorme às 20h e o Pedro adora histórias.',
    'Chego às 18h30, tudo bem?',
    'São 2 crianças, de 1 e 4 anos.',
    'Pode trazer 3 livros?'
  ]) {
    const r = checkMessage(t);
    assert.equal(r.flagged, false, t + ' -> ' + r.reasons.join(','));
    assert.equal(r.masked, t);
  }
});

test('telefone é bloqueado e mascarado', () => {
  const r = checkMessage('me liga no (11) 98765-4321');
  assert.equal(r.flagged, true);
  assert.ok(!r.masked.includes('98765'));
});

test('número por extenso é bloqueado', () => {
  const r = checkMessage('onze nove oito sete seis cinco quatro três');
  assert.equal(r.flagged, true);
  assert.equal(r.masked, '••• oculto •••');
});

test('número quebrado em várias mensagens', () => {
  const r = checkMessage('4321', ['meu final é 11 9876', 'e depois']);
  assert.equal(r.flagged, true);
});

test('@ de rede social, e-mail, link e palavras-chave', () => {
  assert.equal(checkMessage('me segue @julianaprado').flagged, true);
  assert.equal(checkMessage('ju.prado@gmail.com').flagged, true);
  assert.equal(checkMessage('olha www.meusite.com.br').flagged, true);
  assert.equal(checkMessage('me chama no zap').flagged, true);
  assert.equal(checkMessage('me acha no insta').flagged, true);
  assert.equal(checkMessage('manda sua chave pix').flagged, true);
});

test('taxas da primeira contratação (4h × R$ 65)', () => {
  const f = computeFees({ hourlyRateCents: 6500, hours: 4, isRehire: false, familyIsPremium: false });
  assert.equal(f.serviceCents, 26000);
  assert.equal(f.familyFeeCents, 2600);
  assert.equal(f.familyTotalCents, 28600);
  assert.equal(f.nannyFeeCents, 3120);
  assert.equal(f.nannyPayoutCents, 22880);
  assert.equal(f.platformRevenueCents, 5720);
});

test('recontratação e mãe premium', () => {
  const re = computeFees({ hourlyRateCents: 6500, hours: 4, isRehire: true, familyIsPremium: false });
  assert.equal(re.nannyFeeCents, 2080);
  assert.equal(re.familyFeeCents, 2080);
  const prem = computeFees({ hourlyRateCents: 6500, hours: 4, isRehire: false, familyIsPremium: true });
  assert.equal(prem.familyFeeCents, 1300);
});

test('cancelamento e liberação de contato', () => {
  assert.equal(familyCancellationShare(72), 0);
  assert.equal(familyCancellationShare(30), 0.5);
  assert.equal(familyCancellationShare(5), 1);
  const start = new Date('2026-11-15T22:00:00Z');
  assert.equal(contactUnlockAt(start, null), null);
  assert.equal(contactUnlockAt(start, new Date('2026-11-06T12:00:00Z'))!.toISOString(), '2026-11-13T22:00:00.000Z');
  const late = new Date('2026-11-15T10:00:00Z');
  assert.equal(contactUnlockAt(start, late)!.toISOString(), late.toISOString());
});

const now = new Date('2026-11-06T00:00:00Z');
const five = { care: 5, punctuality: 5, communication: 5, posture: 5, presentation: 5 };
const mk = (n: number, r: typeof five, fam = (i: number) => 'f' + i): Review[] =>
  Array.from({ length: n }, (_, i) => ({ ratings: r, createdAt: new Date(now.getTime() - i * 86400000 * 10), familyId: fam(i) }));

test('nova babá com um único 5 não passa a veterana', () => {
  const nova = bayesianRating(mk(1, five), 4.7, now);
  const vet = bayesianRating(mk(40, { care: 5, punctuality: 5, communication: 5, posture: 4.5, presentation: 4.5 }), 4.7, now);
  assert.ok(vet > nova, `veterana ${vet} deveria ser > nova ${nova}`);
});

test('a mesma família não infla a nota', () => {
  const sameFamily = bayesianRating(mk(20, five, () => 'f1'), 4.7, now);
  const manyFamilies = bayesianRating(mk(20, five), 4.7, now);
  assert.ok(manyFamilies > sameFamily);
});

test('pontuação de ranking fica entre 0 e 100 e níveis', () => {
  const s = rankingScore({
    reviews: mk(30, five), platformMean: 4.7, rehireRate: 0.4, responseRate12h: 0.95, cancellations: 0,
    lateCancellations: 0, bookings: 30, hasMentorshipSeal: true, verifiedCourses: 2, checkedReferences: 2,
    profileCompleteness: 1, now
  });
  assert.ok(s > 80 && s <= 100, String(s));
  assert.equal(level({ rating: 4.9, reviewCount: 2, bookings12m: 2, cancelRate: 0, rehireRate: 0, responseRate: 1, incidents: 0, hasMentorshipSeal: true }), 'nova');
  assert.equal(level({ rating: 4.9, reviewCount: 30, bookings12m: 30, cancelRate: 0, rehireRate: 0.4, responseRate: 0.95, incidents: 0, hasMentorshipSeal: true }), 'elite');
  assert.equal(level({ rating: 4.9, reviewCount: 30, bookings12m: 30, cancelRate: 0, rehireRate: 0.4, responseRate: 0.95, incidents: 0, hasMentorshipSeal: false }), 'ouro');
});

test('cópia do bloqueio de contato nas funções está igual ao original', async () => {
  const fs = await import('node:fs');
  const orig = fs.readFileSync(new URL('../src/contactGuard.ts', import.meta.url), 'utf8');
  const copy = fs.readFileSync(new URL('../../../supabase/functions/_shared/contactGuard.ts', import.meta.url), 'utf8');
  assert.ok(copy.endsWith(orig), 'rode npm run sync em packages/shared');
});
