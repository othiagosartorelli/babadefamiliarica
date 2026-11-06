-- Testes das regras de privacidade. Rode depois do stub e das migrações.
\set ON_ERROR_STOP on
grant usage on schema public to authenticated;
grant select, insert, update, delete on all tables in schema public to authenticated;
grant execute on all functions in schema public to authenticated;

-- Dados: Ana (admin), Carolina (mãe sem premium), Marina (mãe premium), Juliana (babá real), Bia (babá exemplo)
insert into auth.users values
  ('00000000-0000-0000-0000-00000000000a'), ('00000000-0000-0000-0000-0000000000c1'),
  ('00000000-0000-0000-0000-0000000000c2'), ('00000000-0000-0000-0000-0000000000b1'),
  ('00000000-0000-0000-0000-0000000000b2');
insert into public.profiles (id, role, first_name, full_name) values
  ('00000000-0000-0000-0000-00000000000a', 'admin', 'Ana', 'Ana Maldonado'),
  ('00000000-0000-0000-0000-0000000000c1', 'mae', 'Carolina', 'Carolina Teste'),
  ('00000000-0000-0000-0000-0000000000c2', 'mae', 'Marina', 'Marina Teste'),
  ('00000000-0000-0000-0000-0000000000b1', 'baba', 'Juliana', 'Juliana Prado'),
  ('00000000-0000-0000-0000-0000000000b2', 'baba', 'Bia', 'Beatriz Lemos');
insert into public.mothers (id, premium_until) values
  ('00000000-0000-0000-0000-0000000000c1', null),
  ('00000000-0000-0000-0000-0000000000c2', now() + interval '1 year');
insert into public.nannies (id, is_published, is_sample, hourly_rate_cents) values
  ('00000000-0000-0000-0000-0000000000b1', true, false, 6500),
  ('00000000-0000-0000-0000-0000000000b2', true, true, 5500);
insert into public.nanny_private (nanny_id, social_handles) values ('00000000-0000-0000-0000-0000000000b1', '{"instagram":"@juliana"}');
insert into public.profile_contacts values ('00000000-0000-0000-0000-0000000000b1', '11999990000', '11999990000');

create function pg_temp.as_user(uid text) returns void language plpgsql as $$
begin
  perform set_config('request.jwt.claim.sub', uid, true);
  execute 'set local role authenticated';
end $$;

create function pg_temp.expect(label text, actual bigint, expected bigint) returns void language plpgsql as $$
begin
  if actual is distinct from expected then raise exception 'FALHOU: % (esperado %, veio %)', label, expected, actual; end if;
  raise notice 'ok: %', label;
end $$;

-- 1. Mãe sem premium vê só a babá de exemplo
begin;
select pg_temp.as_user('00000000-0000-0000-0000-0000000000c1');
select pg_temp.expect('sem premium vê 1 babá (exemplo)', (select count(*) from nannies), 1);
select pg_temp.expect('mãe não vê o @ da babá', (select count(*) from nanny_private), 0);
select pg_temp.expect('mãe não vê telefone antes de contratar', (select count(*) from profile_contacts), 0);
rollback;

-- 2. Mãe premium vê todas
begin;
select pg_temp.as_user('00000000-0000-0000-0000-0000000000c2');
select pg_temp.expect('premium vê 2 babás', (select count(*) from nannies), 2);
select pg_temp.expect('premium não se vê como outra mãe', (select count(*) from profiles where role = 'mae'), 1);
rollback;

-- 3. Mãe não consegue se dar premium
begin;
select pg_temp.as_user('00000000-0000-0000-0000-0000000000c1');
do $$ begin
  begin
    update mothers set premium_until = now() + interval '10 years' where id = '00000000-0000-0000-0000-0000000000c1';
    raise exception 'FALHOU: mãe conseguiu se dar premium';
  exception when insufficient_privilege or check_violation then raise notice 'ok: mãe não se dá premium';
  end;
end $$;
rollback;

-- 4. Babá não consegue mudar a própria nota
begin;
select pg_temp.as_user('00000000-0000-0000-0000-0000000000b1');
update nannies set rating = 5, ranking_score = 100, bio = 'nova bio' where id = '00000000-0000-0000-0000-0000000000b1';
select pg_temp.expect('nota protegida', (select count(*) from nannies where id = '00000000-0000-0000-0000-0000000000b1' and rating is null and bio = 'nova bio'), 1);
rollback;

-- 5. Contratação paga e contato liberado
insert into public.bookings (id, mother_id, nanny_id, starts_at, ends_at, children_count, area_label, hourly_rate_cents,
  service_cents, family_fee_cents, nanny_fee_cents, status, accept_deadline, paid_at, contact_unlock_at, check_out_at)
values ('00000000-0000-0000-0000-0000000000d1', '00000000-0000-0000-0000-0000000000c1', '00000000-0000-0000-0000-0000000000b1',
  now() - interval '3 hours', now() - interval '1 hour', 2, 'Jardins, São Paulo', 6500, 13000, 1300, 1560, 'concluida',
  now() - interval '5 days', now() - interval '4 days', now() - interval '3 days', now() - interval '1 hour');
insert into public.booking_private values ('00000000-0000-0000-0000-0000000000d1', 'Rua Exemplo, 100', null);

begin;
select pg_temp.as_user('00000000-0000-0000-0000-0000000000c1');
select pg_temp.expect('contato liberado após pagamento e prazo', (select count(*) from profile_contacts where user_id = '00000000-0000-0000-0000-0000000000b1'), 1);
select pg_temp.expect('mãe vê a babá contratada mesmo sem premium', (select count(*) from nannies where id = '00000000-0000-0000-0000-0000000000b1'), 1);
rollback;

begin;
select pg_temp.as_user('00000000-0000-0000-0000-0000000000c2');
select pg_temp.expect('outra mãe não vê o telefone', (select count(*) from profile_contacts), 0);
select pg_temp.expect('outra mãe não vê a contratação', (select count(*) from bookings), 0);
rollback;

-- 6. Avaliações: revelação simultânea e avaliação da família invisível para a mãe
begin;
select pg_temp.as_user('00000000-0000-0000-0000-0000000000c1');
insert into nanny_reviews (booking_id, mother_id, nanny_id, care, punctuality, communication, posture, presentation, comment)
values ('00000000-0000-0000-0000-0000000000d1', '00000000-0000-0000-0000-0000000000c1', '00000000-0000-0000-0000-0000000000b1', 5,5,5,5,5,
  'Chegou antes do horário, impecável, e as crianças adoraram muito.');
select pg_temp.as_user('00000000-0000-0000-0000-0000000000c2');
select pg_temp.expect('avaliação ainda escondida de outras mães', (select count(*) from nanny_reviews), 0);
select pg_temp.as_user('00000000-0000-0000-0000-0000000000b1');
insert into family_reviews (booking_id, nanny_id, mother_id, rating, tags)
values ('00000000-0000-0000-0000-0000000000d1', '00000000-0000-0000-0000-0000000000b1', '00000000-0000-0000-0000-0000000000c1', 5, '{pagamento-em-dia}');
select pg_temp.as_user('00000000-0000-0000-0000-0000000000c2');
select pg_temp.expect('publicada após as duas avaliações', (select count(*) from nanny_reviews), 1);
select pg_temp.as_user('00000000-0000-0000-0000-0000000000c1');
select pg_temp.expect('mãe não vê a avaliação que recebeu', (select count(*) from family_reviews), 0);
select pg_temp.as_user('00000000-0000-0000-0000-0000000000b2');
select pg_temp.expect('babá sem conversa com a mãe não vê a avaliação dela', (select count(*) from family_reviews), 0);
rollback;

-- 7. Mensagens não podem ser gravadas direto pelo app
begin;
insert into public.conversations (id, mother_id, nanny_id) values ('00000000-0000-0000-0000-0000000000e1', '00000000-0000-0000-0000-0000000000c1', '00000000-0000-0000-0000-0000000000b1');
select pg_temp.as_user('00000000-0000-0000-0000-0000000000c1');
do $$ begin
  begin
    insert into messages (conversation_id, sender_id, body) values ('00000000-0000-0000-0000-0000000000e1', '00000000-0000-0000-0000-0000000000c1', 'meu zap 11999990000');
    raise exception 'FALHOU: mensagem gravada sem passar pelo filtro';
  exception when insufficient_privilege then raise notice 'ok: mensagem só pelo servidor';
  end;
end $$;
rollback;

-- 8. Babá com conversa vê a nota que outras babás deram à mãe
begin;
insert into public.family_reviews (booking_id, nanny_id, mother_id, rating, tags, published_at)
values ('00000000-0000-0000-0000-0000000000d1', '00000000-0000-0000-0000-0000000000b1', '00000000-0000-0000-0000-0000000000c1', 5, '{}', now());
insert into public.conversations (mother_id, nanny_id) values ('00000000-0000-0000-0000-0000000000c1', '00000000-0000-0000-0000-0000000000b2');
select pg_temp.as_user('00000000-0000-0000-0000-0000000000b2');
select pg_temp.expect('babá chamada pela mãe vê a avaliação dela', (select count(*) from family_reviews), 1);
select pg_temp.expect('babá chamada vê o perfil da mãe', (select count(*) from profiles where id = '00000000-0000-0000-0000-0000000000c1'), 1);
rollback;

-- 9. Compra na Greenn antes do cadastro liga o selo ao cadastrar
begin;
insert into public.pending_mentorships (email_lower, greenn_sale_id) values ('bia@exemplo.com', 'venda-123');
insert into public.nanny_private (nanny_id, email_lower) values ('00000000-0000-0000-0000-0000000000b2', 'bia@exemplo.com');
select pg_temp.expect('selo ligado pela compra pendente', (select count(*) from mentorship_seals where nanny_id = '00000000-0000-0000-0000-0000000000b2' and active), 1);
rollback;

\echo TODOS OS TESTES PASSARAM
