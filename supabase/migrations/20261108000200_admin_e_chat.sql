-- Painel da Ana: a administradora pode aprovar babás, dar premium de teste e ver tudo.
create policy nannies_admin_update on public.nannies for update to authenticated
  using (public.is_admin()) with check (public.is_admin());
create policy mothers_admin_update on public.mothers for update to authenticated
  using (public.is_admin()) with check (public.is_admin());
create policy profiles_admin_update on public.profiles for update to authenticated
  using (public.is_admin()) with check (public.is_admin());
create policy verifications_admin on public.verifications for all to authenticated
  using (public.is_admin()) with check (public.is_admin());
create policy moderation_admin_insert on public.moderation_events for insert to authenticated
  with check (public.is_admin());
create policy nanny_reviews_admin on public.nanny_reviews for update to authenticated
  using (public.is_admin()) with check (public.is_admin());

-- A babá cadastra os próprios dados privados (CPF em hash, e-mail) no cadastro.
-- (nanny_private_self já cobre insert/update do próprio registro.)

-- Chat em tempo real: novas mensagens chegam na hora (a RLS de messages continua valendo).
do $$
begin
  if exists (select 1 from pg_publication where pubname = 'supabase_realtime') then
    alter publication supabase_realtime add table public.messages;
  end if;
end $$;

-- Lista de conversas com nome e última mensagem, respeitando a RLS de quem consulta.
create or replace view public.conversation_list with (security_invoker = true) as
  select c.id, c.mother_id, c.nanny_id, c.created_at,
         pm.first_name as mother_first_name, pn.first_name as nanny_first_name, pn.full_name as nanny_full_name,
         n.photo_path as nanny_photo_path,
         (select m.body from public.messages m where m.conversation_id = c.id order by m.created_at desc limit 1) as last_body,
         (select m.created_at from public.messages m where m.conversation_id = c.id order by m.created_at desc limit 1) as last_at
  from public.conversations c
  left join public.profiles pm on pm.id = c.mother_id
  left join public.profiles pn on pn.id = c.nanny_id
  left join public.nannies n on n.id = c.nanny_id;
grant select on public.conversation_list to authenticated;

-- Selo visível junto com o perfil (só se ativo).
create or replace view public.nanny_seal_status with (security_invoker = true) as
  select nanny_id, active, granted_at from public.mentorship_seals where active;
grant select on public.nanny_seal_status to authenticated;
