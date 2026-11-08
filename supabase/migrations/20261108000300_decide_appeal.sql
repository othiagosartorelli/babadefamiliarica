-- Decisão de pedido de revisão em um passo só (tudo ou nada), usada pelo painel da Ana.
-- Reverter: desfaz o efeito da decisão automática quando ainda é possível.
create or replace function public.decide_appeal(p_appeal_id uuid, p_status public.appeal_status)
returns void
language plpgsql security definer set search_path = public as $$
declare
  a record;
  e record;
begin
  if not public.is_admin() then
    raise exception 'Somente a administradora pode decidir pedidos de revisão';
  end if;
  if p_status not in ('mantido', 'revertido') then
    raise exception 'Decisão inválida';
  end if;
  select * into a from appeals where id = p_appeal_id for update;
  if not found then raise exception 'Pedido não encontrado'; end if;
  if a.status <> 'aberto' then raise exception 'Este pedido já foi decidido'; end if;
  select * into e from moderation_events where id = a.moderation_event_id;

  if p_status = 'revertido' then
    if e.action = 'suspensao' then
      -- Só tira a suspensão se não houver outra suspensão mais recente.
      if not exists (select 1 from moderation_events x where x.user_id = e.user_id and x.action = 'suspensao' and x.created_at > e.created_at) then
        update profiles set suspended_until = null where id = e.user_id;
      end if;
    elsif e.action = 'banimento' then
      update profiles set banned_at = null where id = e.user_id;
    elsif e.action = 'avaliacao_removida' and e.review_id is not null then
      update nanny_reviews set removed_at = null where id = e.review_id;
    end if;
    -- 'mensagem_oculta': o texto original não é guardado (privacidade), então a mensagem continua oculta;
    -- a reversão tira a ocorrência da contagem de penalidades.
    if e.action = 'mensagem_oculta' then
      update moderation_events set reason = reason || ' (revertido)' where id = e.id;
    end if;
  end if;

  update appeals set status = p_status, decided_by = auth.uid(), decided_at = now() where id = p_appeal_id;
end $$;

revoke all on function public.decide_appeal(uuid, public.appeal_status) from public, anon;
grant execute on function public.decide_appeal(uuid, public.appeal_status) to authenticated;
