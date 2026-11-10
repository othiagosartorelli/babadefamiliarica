-- Fluxo da contratação avulsa, nota/ranking automáticos e verificação por envio de documentos.
-- Todas as mudanças de status passam por funções (security definer) que conferem quem pode fazer o quê.

-- ========== Configurações ==========
create table public.app_settings (
  key text primary key,
  value jsonb not null
);
alter table public.app_settings enable row level security;
create policy app_settings_read on public.app_settings for select to authenticated using (true);
create policy app_settings_admin on public.app_settings for all to authenticated using (public.is_admin()) with check (public.is_admin());
grant select, insert, update, delete on public.app_settings to authenticated, service_role;
-- Enquanto não há sistema de pagamento contratado, o pagamento é simulado (nada é cobrado).
insert into public.app_settings (key, value) values
  ('pagamento_de_teste', 'true'::jsonb),
  ('taxas', '{"baba_1a":0.12,"baba_recontratacao":0.08,"familia_1a":0.10,"familia_recontratacao":0.08,"familia_premium":0.05,"urgencia":0.05}'::jsonb)
on conflict (key) do nothing;

alter table public.bookings add column if not exists nanny_cancel_share_cents int not null default 0;
alter table public.bookings add column if not exists family_refund_cents int not null default 0;

-- ========== Auxiliares ==========
create or replace function public.assert_active_user() returns void
language plpgsql stable security definer set search_path = public as $$
declare p record;
begin
  select * into p from profiles where id = auth.uid();
  if not found then raise exception 'Complete seu cadastro primeiro'; end if;
  if p.banned_at is not null then raise exception 'Conta bloqueada'; end if;
  if p.suspended_until is not null and p.suspended_until > now() then
    raise exception 'Conta suspensa até %', to_char(p.suspended_until at time zone 'America/Sao_Paulo', 'DD/MM HH24:MI');
  end if;
end $$;

create or replace function public.setting_num(p_key text, p_field text) returns numeric
language sql stable security definer set search_path = public as $$
  select (value ->> p_field)::numeric from app_settings where key = p_key;
$$;

-- ========== Proposta (mãe) ==========
create or replace function public.create_proposal(
  p_nanny uuid, p_starts timestamptz, p_ends timestamptz, p_children int, p_ages int[],
  p_area text, p_address text, p_notes text default null
) returns uuid
language plpgsql security definer set search_path = public as $$
declare
  v_id uuid;
  v_rate int;
  v_hours numeric;
  v_service int;
  v_rehire boolean;
  v_premium boolean;
  v_fam_rate numeric;
  v_nanny_rate numeric;
  v_urgent int := 0;
begin
  perform assert_active_user();
  if not exists (select 1 from mothers where id = auth.uid()) then raise exception 'Só mães enviam propostas'; end if;
  select hourly_rate_cents into v_rate from nannies where id = p_nanny and is_published;
  if v_rate is null then raise exception 'Babá indisponível'; end if;
  if p_starts <= now() + interval '1 hour' then raise exception 'Escolha um horário com pelo menos 1 hora de antecedência'; end if;
  if p_ends <= p_starts or p_ends > p_starts + interval '24 hours' then raise exception 'Horário inválido (máximo de 24 horas)'; end if;
  if p_children < 1 or p_children > 6 then raise exception 'Número de crianças inválido'; end if;
  if coalesce(trim(p_address), '') = '' or coalesce(trim(p_area), '') = '' then raise exception 'Informe bairro e endereço'; end if;
  if exists (select 1 from bookings where nanny_id = p_nanny and status in ('aceita','paga','em_andamento')
             and tstzrange(starts_at, ends_at) && tstzrange(p_starts, p_ends)) then
    raise exception 'A babá já tem um atendimento nesse horário';
  end if;

  v_hours := extract(epoch from (p_ends - p_starts)) / 3600.0;
  v_service := round(v_rate * v_hours);
  v_rehire := exists (select 1 from bookings where mother_id = auth.uid() and nanny_id = p_nanny and status = 'concluida');
  v_premium := exists (select 1 from mothers where id = auth.uid() and premium_until > now());
  v_fam_rate := case when v_rehire then setting_num('taxas','familia_recontratacao') else setting_num('taxas','familia_1a') end;
  if v_premium then v_fam_rate := least(v_fam_rate, setting_num('taxas','familia_premium')); end if;
  v_nanny_rate := case when v_rehire then setting_num('taxas','baba_recontratacao') else setting_num('taxas','baba_1a') end;
  if p_starts < now() + interval '24 hours' then v_urgent := round(v_service * setting_num('taxas','urgencia')); end if;

  insert into bookings (mother_id, nanny_id, starts_at, ends_at, children_count, children_ages, area_label, hourly_rate_cents,
    is_rehire, service_cents, family_fee_cents, urgent_fee_cents, nanny_fee_cents, status, accept_deadline)
  values (auth.uid(), p_nanny, p_starts, p_ends, p_children, coalesce(p_ages, '{}'), trim(p_area), v_rate,
    v_rehire, v_service, round(v_service * v_fam_rate), v_urgent, round(v_service * v_nanny_rate), 'proposta',
    least(p_starts - interval '30 minutes', now() + interval '12 hours'))
  returning id into v_id;
  insert into booking_private (booking_id, full_address, notes) values (v_id, trim(p_address), nullif(trim(coalesce(p_notes, '')), ''));
  insert into conversations (mother_id, nanny_id) values (auth.uid(), p_nanny) on conflict do nothing;
  return v_id;
end $$;

-- ========== Resposta (babá) ==========
create or replace function public.respond_proposal(p_booking uuid, p_accept boolean) returns void
language plpgsql security definer set search_path = public as $$
declare b record;
begin
  perform assert_active_user();
  select * into b from bookings where id = p_booking for update;
  if not found or b.nanny_id <> auth.uid() then raise exception 'Proposta não encontrada'; end if;
  if b.status <> 'proposta' then raise exception 'Esta proposta já foi respondida'; end if;
  if now() > b.accept_deadline then
    update bookings set status = 'expirada' where id = p_booking;
    raise exception 'O prazo para responder terminou';
  end if;
  if p_accept and exists (select 1 from bookings where nanny_id = b.nanny_id and id <> b.id and status in ('aceita','paga','em_andamento')
             and tstzrange(starts_at, ends_at) && tstzrange(b.starts_at, b.ends_at)) then
    raise exception 'Você já tem um atendimento nesse horário';
  end if;
  update bookings set status = case when p_accept then 'aceita'::booking_status else 'recusada'::booking_status end,
    accepted_at = case when p_accept then now() end
  where id = p_booking;
end $$;

-- ========== Pagamento ==========
-- Libera o contato no fim do prazo de cancelamento grátis (48h antes) ou na hora, se pago dentro dele.
create or replace function public.mark_booking_paid(p_booking uuid, p_provider_ref text) returns void
language plpgsql security definer set search_path = public as $$
declare b record;
begin
  select * into b from bookings where id = p_booking for update;
  if b.status <> 'aceita' then raise exception 'Esta contratação não está aguardando pagamento'; end if;
  update bookings set status = 'paga', paid_at = now(), payment_provider_ref = p_provider_ref,
    contact_unlock_at = greatest(now(), b.starts_at - interval '48 hours')
  where id = p_booking;
end $$;
revoke all on function public.mark_booking_paid(uuid, text) from public, anon, authenticated;

-- Fase de testes: a mãe "paga" sem cobrança real. Desligar quando o sistema de pagamento entrar.
create or replace function public.pay_booking_test(p_booking uuid) returns void
language plpgsql security definer set search_path = public as $$
declare b record;
begin
  perform assert_active_user();
  if coalesce((select value from app_settings where key = 'pagamento_de_teste'), 'false'::jsonb) <> 'true'::jsonb then
    raise exception 'Pagamento de teste desligado';
  end if;
  select * into b from bookings where id = p_booking;
  if not found or b.mother_id <> auth.uid() then raise exception 'Contratação não encontrada'; end if;
  perform mark_booking_paid(p_booking, 'teste-' || p_booking::text);
end $$;

-- ========== Atendimento (babá) ==========
create or replace function public.check_in(p_booking uuid, p_lat numeric default null, p_lng numeric default null) returns void
language plpgsql security definer set search_path = public as $$
declare b record;
begin
  perform assert_active_user();
  select * into b from bookings where id = p_booking for update;
  if not found or b.nanny_id <> auth.uid() then raise exception 'Atendimento não encontrado'; end if;
  if b.status <> 'paga' then raise exception 'Este atendimento não está confirmado'; end if;
  if now() < b.starts_at - interval '2 hours' or now() > b.ends_at then raise exception 'A entrada só pode ser registrada perto do horário combinado'; end if;
  update bookings set status = 'em_andamento', check_in_at = now(), check_in_lat = p_lat, check_in_lng = p_lng where id = p_booking;
end $$;

create or replace function public.check_out(p_booking uuid) returns void
language plpgsql security definer set search_path = public as $$
declare b record;
begin
  perform assert_active_user();
  select * into b from bookings where id = p_booking for update;
  if not found or b.nanny_id <> auth.uid() then raise exception 'Atendimento não encontrado'; end if;
  if b.status <> 'em_andamento' then raise exception 'Registre a entrada primeiro'; end if;
  -- 48h para a família reclamar; depois, repasse à babá (até 2 dias úteis).
  update bookings set status = 'concluida', check_out_at = now(), complaint_deadline = now() + interval '48 hours',
    payout_at = now() + interval '4 days'
  where id = p_booking;
end $$;

-- ========== Cancelamento ==========
create or replace function public.cancel_booking(p_booking uuid) returns jsonb
language plpgsql security definer set search_path = public as $$
declare
  b record;
  v_hours numeric;
  v_share numeric := 0;
  v_total int;
begin
  select * into b from bookings where id = p_booking for update;
  if not found or (b.mother_id <> auth.uid() and b.nanny_id <> auth.uid()) then raise exception 'Contratação não encontrada'; end if;
  if b.status not in ('proposta','aceita','paga') then raise exception 'Esta contratação não pode mais ser cancelada'; end if;
  v_total := b.service_cents + b.family_fee_cents + b.urgent_fee_cents;
  v_hours := extract(epoch from (b.starts_at - now())) / 3600.0;
  if b.status = 'paga' and auth.uid() = b.mother_id then
    v_share := case when v_hours >= 48 then 0 when v_hours >= 24 then 0.5 else 1 end;
  end if;
  update bookings set status = 'cancelada', cancelled_by = auth.uid(), cancelled_at = now(),
    nanny_cancel_share_cents = round(b.service_cents * v_share),
    family_refund_cents = case when b.status = 'paga' then v_total - round(b.service_cents * v_share) - case when v_share > 0 then b.family_fee_cents else 0 end else 0 end
  where id = p_booking;
  return jsonb_build_object('parte_baba', round(b.service_cents * v_share), 'reembolso', case when b.status = 'paga' then v_total - round(b.service_cents * v_share) else 0 end);
end $$;

-- ========== Nota, nível e ranking automáticos ==========
-- Média bayesiana (8 avaliações "neutras" um pouco abaixo da média da plataforma), pesos por critério,
-- meia-vida de 12 meses e no máximo 2,0 de peso por família. Espelha packages/shared/src/ranking.ts.
create or replace function public.recompute_nanny_stats(p_nanny uuid) returns void
language plpgsql security definer set search_path = public as $$
declare
  v_mean numeric;
  v_sw numeric;
  v_swr numeric;
  v_rating numeric;
  v_count int;
  v_done int;
  v_done12 int;
  v_rehire numeric;
  v_cancels int;
  v_late int;
  v_seal boolean;
  v_level nanny_level;
  v_score numeric;
begin
  select coalesce(avg(care*0.3 + punctuality*0.2 + communication*0.2 + posture*0.15 + presentation*0.15), 4.7)
    into v_mean from nanny_reviews where published_at is not null and removed_at is null;
  with r as (
    select mother_id, (care*0.3 + punctuality*0.2 + communication*0.2 + posture*0.15 + presentation*0.15) as score,
           power(0.5, extract(epoch from (now() - created_at)) / 86400.0 / 365.0) as w,
           row_number() over (partition by mother_id order by created_at desc) as rn
    from nanny_reviews where nanny_id = p_nanny and published_at is not null and removed_at is null
  ), capped as (
    select score, least(w, greatest(0, 2 - coalesce(sum(w) over (partition by mother_id order by rn rows between unbounded preceding and 1 preceding), 0))) as w from r
  )
  select coalesce(sum(w), 0), coalesce(sum(w * score), 0), (select count(*) from r) into v_sw, v_swr, v_count from capped;
  v_rating := (8 * (v_mean - 0.2) + v_swr) / (8 + v_sw);

  select count(*) filter (where status = 'concluida'),
         count(*) filter (where status = 'concluida' and check_out_at > now() - interval '12 months'),
         count(*) filter (where status = 'cancelada' and cancelled_by = p_nanny),
         count(*) filter (where status = 'cancelada' and cancelled_by = p_nanny and cancelled_at > starts_at - interval '48 hours')
    into v_done, v_done12, v_cancels, v_late from bookings where nanny_id = p_nanny;
  select case when count(distinct mother_id) = 0 then 0
              else (count(distinct mother_id) filter (where n > 1))::numeric / count(distinct mother_id) end
    into v_rehire from (select mother_id, count(*) n from bookings where nanny_id = p_nanny and status = 'concluida' group by mother_id) x;
  v_seal := exists (select 1 from mentorship_seals where nanny_id = p_nanny and active);

  v_level := case
    when v_count < 3 then 'nova'
    when v_rating >= 4.85 and v_done12 >= 25 and v_rehire >= 0.3 and v_seal
         and not exists (select 1 from moderation_events where user_id = p_nanny and action in ('suspensao','banimento') and created_at > now() - interval '12 months') then 'elite'
    when v_rating >= 4.7 and v_done12 >= 10 and (v_done = 0 or (v_cancels::numeric / greatest(v_done + v_cancels, 1)) < 0.02) then 'ouro'
    else 'prata' end;

  v_score := 50 * greatest(0, least(1, (v_rating - 1) / 4))
    + 10 * (1 - exp(-v_sw / 15))
    + 12 * v_rehire
    + 8 * 0.5
    + 10 * greatest(0, 1 - (v_cancels + v_late)::numeric / greatest(v_done + v_cancels, 1))
    + least(6, case when v_seal then 3 else 0 end
              + least(2, (select count(*) from verifications where user_id = p_nanny and kind = 'curso' and status = 'aprovado'))
              + least(1, (select count(*) from verifications where user_id = p_nanny and kind = 'referencia' and status = 'aprovado')))
    + 4 * ((case when (select photo_path from nannies where id = p_nanny) is not null then 1 else 0 end)
         + (case when coalesce((select bio from nannies where id = p_nanny), '') <> '' then 1 else 0 end)
         + (case when (select video_path from nannies where id = p_nanny) is not null then 1 else 0 end)
         + (case when (select years_experience from nannies where id = p_nanny) is not null then 1 else 0 end)) / 4.0;

  update nannies set
    rating = case when v_count > 0 then round(v_rating, 2) end,
    review_count = v_count,
    rehire_rate = round(v_rehire, 3),
    level = v_level,
    ranking_score = round(v_score, 1)
  where id = p_nanny;
end $$;

create or replace function public.trg_recompute_from_review() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  perform recompute_nanny_stats(new.nanny_id);
  return new;
end $$;
create trigger nanny_reviews_stats after insert or update of published_at, removed_at on public.nanny_reviews
  for each row execute function public.trg_recompute_from_review();

create or replace function public.trg_recompute_from_booking() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if new.status is distinct from old.status and new.status in ('concluida','cancelada') then
    perform recompute_nanny_stats(new.nanny_id);
  end if;
  return new;
end $$;
create trigger bookings_stats after update of status on public.bookings
  for each row execute function public.trg_recompute_from_booking();

create or replace function public.trg_recompute_from_seal() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  perform recompute_nanny_stats(new.nanny_id);
  return new;
end $$;
create trigger seals_stats after insert or update of active on public.mentorship_seals
  for each row execute function public.trg_recompute_from_seal();

-- ========== Verificação por envio de documentos ==========
-- Enquanto o provedor de verificação (CAF/unico) não é contratado, a pessoa envia os documentos
-- e a equipe confere pelo painel. Depois da análise, os arquivos são apagados (LGPD).
create policy verifications_insert_self on public.verifications for insert to authenticated with check (
  user_id = auth.uid() and status = 'pendente' and consent_at is not null and verified_at is null
);
create policy documentos_admin_read on storage.objects for select to authenticated
  using (bucket_id = 'documentos' and public.is_admin());
create policy documentos_admin_delete on storage.objects for delete to authenticated
  using (bucket_id = 'documentos' and public.is_admin());

alter table public.verifications add column if not exists document_paths text[] not null default '{}';

-- ========== Permissões das funções ==========
revoke all on function public.create_proposal(uuid, timestamptz, timestamptz, int, int[], text, text, text) from public, anon;
revoke all on function public.respond_proposal(uuid, boolean) from public, anon;
revoke all on function public.pay_booking_test(uuid) from public, anon;
revoke all on function public.check_in(uuid, numeric, numeric) from public, anon;
revoke all on function public.check_out(uuid) from public, anon;
revoke all on function public.cancel_booking(uuid) from public, anon;
revoke all on function public.recompute_nanny_stats(uuid) from public, anon, authenticated;
grant execute on function public.create_proposal(uuid, timestamptz, timestamptz, int, int[], text, text, text) to authenticated;
grant execute on function public.respond_proposal(uuid, boolean) to authenticated;
grant execute on function public.pay_booking_test(uuid) to authenticated;
grant execute on function public.check_in(uuid, numeric, numeric) to authenticated;
grant execute on function public.check_out(uuid) to authenticated;
grant execute on function public.cancel_booking(uuid) to authenticated;
grant execute on function public.mark_booking_paid(uuid, text) to service_role;
