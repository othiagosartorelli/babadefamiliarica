// Recebe eventos da Greenn e liga ou desliga o selo dourado.
// Configure na Greenn a URL: https://<projeto>.supabase.co/functions/v1/greenn-webhook?token=<GREENN_WEBHOOK_TOKEN>
// ATENÇÃO: o formato exato do payload da Greenn ainda precisa ser confirmado com um webhook de teste.
// Os campos abaixo são lidos de forma tolerante (vários nomes possíveis) e o payload bruto fica salvo.
import { adminClient, cpfHash, json, safeEqual } from '../_shared/admin.ts';

type AnyObj = Record<string, unknown>;

function pick(obj: AnyObj, paths: string[]): string | undefined {
  for (const p of paths) {
    const v = p.split('.').reduce<unknown>((o, k) => (o && typeof o === 'object' ? (o as AnyObj)[k] : undefined), obj);
    if (v !== undefined && v !== null && String(v) !== '') return String(v);
  }
  return undefined;
}

const PAID = ['paid', 'approved', 'sale_paid', 'venda_paga', 'pago', 'aprovado'];
const REVOKE = ['refunded', 'chargedback', 'chargeback', 'refund', 'reembolsado', 'reembolso', 'canceled', 'cancelled'];

Deno.serve(async (req) => {
  if (req.method !== 'POST') return json({ error: 'método não permitido' }, 405);
  const expected = Deno.env.get('GREENN_WEBHOOK_TOKEN') ?? '';
  const got = new URL(req.url).searchParams.get('token') ?? req.headers.get('x-greenn-token') ?? '';
  if (!expected || !safeEqual(got, expected)) return json({ error: 'não autorizado' }, 401);

  const payload = (await req.json().catch(() => null)) as AnyObj | null;
  if (!payload) return json({ error: 'payload inválido' }, 400);

  const saleId = pick(payload, ['sale.id', 'sale_id', 'data.sale.id', 'data.id', 'id']);
  const rawStatus = (pick(payload, ['type', 'event', 'status', 'sale.status', 'data.status', 'currentStatus']) ?? '').toLowerCase();
  const productId = pick(payload, ['product.id', 'product_id', 'sale.product.id', 'data.product.id']);
  const email = pick(payload, ['client.email', 'customer.email', 'buyer.email', 'data.client.email', 'email'])?.trim().toLowerCase();
  const cpf = pick(payload, ['client.cpf', 'client.document', 'customer.document', 'buyer.cpf', 'data.client.cpf', 'cpf']);
  if (!saleId) return json({ error: 'venda sem id' }, 400);

  const db = adminClient();
  const eventKey = `${saleId}:${rawStatus}`;
  const { error: dupErr } = await db.from('greenn_events').insert({ event_key: eventKey, event_type: rawStatus, payload });
  if (dupErr) {
    if (dupErr.code === '23505') return json({ ok: true, duplicate: true }); // já processado
    console.error('greenn_events insert', dupErr);
    return json({ error: 'falha ao registrar evento' }, 500); // a Greenn tenta de novo
  }

  const mentoriaProduct = Deno.env.get('GREENN_MENTORIA_PRODUCT_ID');
  if (mentoriaProduct && productId && productId !== mentoriaProduct) {
    await db.from('greenn_events').update({ processed_at: new Date().toISOString() }).eq('event_key', eventKey);
    return json({ ok: true, ignored: 'outro produto' });
  }

  const hash = cpf ? await cpfHash(cpf) : null;
  let nannyId: string | null = null;
  if (hash) {
    const { data } = await db.from('nanny_private').select('nanny_id').eq('cpf_hash', hash).maybeSingle();
    nannyId = data?.nanny_id ?? null;
  }
  if (!nannyId && email) {
    const { data } = await db.from('nanny_private').select('nanny_id').eq('email_lower', email).maybeSingle();
    nannyId = data?.nanny_id ?? null;
  }

  const notPaid = /(unpaid|nao_paga|not_paid|waiting|aguardando|refused|recusad|pending|pendente)/.test(rawStatus);
  const isPaid = !notPaid && PAID.some((s) => rawStatus.includes(s));
  const isRevoke = REVOKE.some((s) => rawStatus.includes(s));

  if (isPaid) {
    if (nannyId) {
      await db.from('mentorship_seals').upsert({
        nanny_id: nannyId, source: 'greenn', active: true, granted_at: new Date().toISOString(), revoked_at: null, greenn_sale_id: saleId
      });
    } else {
      await db.from('pending_mentorships').upsert({ greenn_sale_id: saleId, email_lower: email ?? null, cpf_hash: hash }, { onConflict: 'greenn_sale_id' });
    }
  } else if (isRevoke) {
    await db.from('mentorship_seals').update({ active: false, revoked_at: new Date().toISOString() }).eq('greenn_sale_id', saleId);
    await db.from('pending_mentorships').delete().eq('greenn_sale_id', saleId);
  }

  await db.from('greenn_events').update({ processed_at: new Date().toISOString() }).eq('event_key', eventKey);
  return json({ ok: true, seal: isPaid ? (nannyId ? 'ativado' : 'pendente-de-cadastro') : isRevoke ? 'retirado' : 'sem-mudanca' });
});
