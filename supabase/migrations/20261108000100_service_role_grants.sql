-- As funções de servidor usam a service_role, que também precisa de permissão explícita
-- quando as tabelas não são expostas automaticamente.
grant usage on schema public to service_role;
grant select, insert, update, delete on all tables in schema public to service_role;
grant execute on all functions in schema public to service_role;
alter default privileges in schema public grant select, insert, update, delete on tables to service_role;

-- Usuários logados não precisam destes poderes (ex.: TRUNCATE apaga a tabela inteira).
revoke truncate, references, trigger on all tables in schema public from authenticated;
