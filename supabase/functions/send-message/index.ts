// Envia mensagem no chat aplicando o bloqueio de contato.
// Regra: antes da liberação do contato, telefone, @, e-mail, link e Pix são ocultados.
// Penalidade automática (sem revisão humana no dia a dia):
//   1ª e 2ª ocorrência em 30 dias → aviso; 3ª → suspensão de 7 dias; 5ª → banimento.
//   A pessoa pode pedir revisão uma vez (tabela appeals), que cai no painel da Ana.
import { adminClient, userClient, json, preflight } from '../_shared/admin.ts';
import { checkMessage } from '../_shared/contactGuard.ts';

Deno.serve(async (req) => {
  const pf = preflight(req);
  if (pf) return pf;
  if (req.method !== 'POST') return json({ error: 'método não permitido' }, 405);

  const { data: auth } = await userClient(req).auth.getUser();
  const user = auth?.user;
  if (!user) return json({ error: 'não autenticado' }, 401);

  const { conversationId, body } = await req.json().catch(() => ({}));
  if (!conversationId || typeof body !== 'string' || !body.trim() || body.length > 2000) {
    return json({ error: 'mensagem inválida' }, 400);
  }

  const db = adminClient();
  const { data: profile } = await db.from('profiles').select('id, banned_at, suspended_until').eq('id', user.id).single();
  if (!profile || profile.banned_at) return json({ error: 'conta bloqueada' }, 403);
  if (profile.suspended_until && new Date(profile.suspended_until) > new Date()) {
    return json({ error: 'conta suspensa', until: profile.suspended_until }, 403);
  }

  const { data: conv } = await db.from('conversations').select('id, mother_id, nanny_id').eq('id', conversationId).single();
  if (!conv || (conv.mother_id !== user.id && conv.nanny_id !== user.id)) return json({ error: 'conversa não encontrada' }, 404);
  const other = conv.mother_id === user.id ? conv.nanny_id : conv.mother_id;

  // Contato já liberado? (pagamento confirmado e fim do prazo de cancelamento)
  const { data: unlocked } = await db
    .from('bookings')
    .select('id')
    .eq('mother_id', conv.mother_id)
    .eq('nanny_id', conv.nanny_id)
    .in('status', ['paga', 'em_andamento', 'concluida'])
    .lte('contact_unlock_at', new Date().toISOString())
    .limit(1);
  const contactOpen = (unlocked?.length ?? 0) > 0;

  const { data: recent } = await db
    .from('messages')
    .select('body')
    .eq('conversation_id', conversationId)
    .eq('sender_id', user.id)
    .order('created_at', { ascending: false })
    .limit(4);

  const result = contactOpen ? { flagged: false, reasons: [], masked: body } : checkMessage(body, (recent ?? []).map((m) => m.body).reverse());

  const { data: msg, error } = await db
    .from('messages')
    .insert({ conversation_id: conversationId, sender_id: user.id, body: result.masked, flagged: result.flagged })
    .select('id, body, flagged, created_at')
    .single();
  if (error) return json({ error: 'falha ao enviar' }, 500);

  let action: string | null = null;
  if (result.flagged) {
    const since = new Date(Date.now() - 30 * 24 * 3600 * 1000).toISOString();
    const { count } = await db
      .from('moderation_events')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', user.id)
      .eq('action', 'mensagem_oculta')
      .gte('created_at', since);
    const n = (count ?? 0) + 1;

    await db.from('moderation_events').insert({
      user_id: user.id, action: 'mensagem_oculta', reason: result.reasons.join(', '), message_id: msg.id,
      ai_summary: `Tentativa de contato fora do app (${result.reasons.join(', ')}). Ocorrência ${n} em 30 dias.`
    });

    if (n >= 5) {
      action = 'banimento';
      await db.from('profiles').update({ banned_at: new Date().toISOString() }).eq('id', user.id);
    } else if (n >= 3) {
      action = 'suspensao';
      await db.from('profiles').update({ suspended_until: new Date(Date.now() + 7 * 24 * 3600 * 1000).toISOString() }).eq('id', user.id);
    } else {
      action = 'aviso';
    }
    if (action !== 'aviso') {
      await db.from('moderation_events').insert({
        user_id: user.id, action, reason: `${n} tentativas de contato fora do app em 30 dias`,
        ai_summary: `Penalidade automática: ${action}. Conversa com ${other}.`
      });
    }
  }

  return json({ message: msg, warning: result.flagged ? 'contato-oculto' : null, action });
});
