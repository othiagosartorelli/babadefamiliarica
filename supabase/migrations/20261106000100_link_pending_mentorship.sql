-- Quem comprou a mentoria na Greenn antes de ter conta ganha o selo ao se cadastrar
-- com o mesmo CPF ou e-mail.
create or replace function public.link_pending_mentorship() returns trigger
language plpgsql security definer set search_path = public as $$
declare
  p record;
begin
  select * into p from pending_mentorships
   where linked_to is null
     and ((new.cpf_hash is not null and cpf_hash = new.cpf_hash)
       or (new.email_lower is not null and email_lower = new.email_lower))
   order by created_at desc
   limit 1;
  if found then
    insert into mentorship_seals (nanny_id, source, active, greenn_sale_id)
    values (new.nanny_id, 'greenn', true, p.greenn_sale_id)
    on conflict (nanny_id) do update set active = true, revoked_at = null, source = 'greenn', greenn_sale_id = excluded.greenn_sale_id;
    update pending_mentorships set linked_to = new.nanny_id where id = p.id;
  end if;
  return new;
end $$;

create trigger nanny_private_link_mentorship
  after insert or update of cpf_hash, email_lower on public.nanny_private
  for each row execute function public.link_pending_mentorship();
