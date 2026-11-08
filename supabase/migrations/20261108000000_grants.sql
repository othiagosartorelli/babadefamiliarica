-- O projeto foi criado com "Automatically expose new tables" desligado.
-- Por isso as permissões são dadas aqui, de forma explícita:
-- só usuários logados acessam as tabelas, e sempre filtrados pelas regras de privacidade (RLS).
-- Visitantes não logados (anon) não leem nada.
grant usage on schema public to authenticated;
grant select, insert, update, delete on all tables in schema public to authenticated;
grant select on public.nanny_verification_badges to authenticated;
revoke all on all tables in schema public from anon;
grant execute on all functions in schema public to authenticated;
