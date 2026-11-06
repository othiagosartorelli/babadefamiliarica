-- Babá de Família Rica · esquema inicial
-- Regras de privacidade ficam no banco (Row Level Security), não só no app.

create extension if not exists pgcrypto;

-- ========== Tipos ==========
create type public.user_role as enum ('mae', 'baba', 'admin');
create type public.verification_kind as enum ('identidade', 'antecedentes', 'endereco', 'curso', 'referencia');
create type public.verification_status as enum ('pendente', 'aprovado', 'reprovado', 'em_revisao', 'expirado');
create type public.booking_status as enum ('proposta', 'aceita', 'recusada', 'expirada', 'paga', 'em_andamento', 'concluida', 'cancelada', 'disputa');
create type public.seal_source as enum ('manual', 'greenn', 'importacao');
create type public.moderation_action as enum ('aviso', 'suspensao', 'banimento', 'mensagem_oculta', 'avaliacao_removida');
create type public.appeal_status as enum ('aberto', 'mantido', 'revertido');
create type public.nanny_level as enum ('nova', 'prata', 'ouro', 'elite');

-- ========== Perfis ==========
create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  role public.user_role not null,
  first_name text not null,
  full_name text not null,
  city text,
  state text,
  neighborhood text,
  terms_accepted_at timestamptz,
  confidentiality_accepted_at timestamptz,
  suspended_until timestamptz,
  banned_at timestamptz,
  created_at timestamptz not null default now()
);

-- Contato direto: só aparece para a outra parte depois do pagamento e do prazo de cancelamento.
create table public.profile_contacts (
  user_id uuid primary key references public.profiles (id) on delete cascade,
  phone text,
  whatsapp text
);

create table public.mothers (
  id uuid primary key references public.profiles (id) on delete cascade,
  children jsonb not null default '[]'::jsonb, -- [{ "age_years": 1 }]
  premium_until timestamptz
);

create table public.nannies (
  id uuid primary key references public.profiles (id) on delete cascade,
  birth_date date,
  bio text,
  photo_path text,
  video_path text,
  years_experience int,
  age_ranges text[] not null default '{}',     -- recem-nascido, bebe, crianca, escolar
  specialties text[] not null default '{}',    -- gemeos, necessidades-especiais, noturna, viagem...
  languages jsonb not null default '[]'::jsonb, -- [{ "idioma": "inglês", "nivel": "fluente" }]
  modalities text[] not null default '{}',     -- avulso (MVP); fixo depois
  has_cnh boolean not null default false,
  has_car boolean not null default false,
  swims boolean not null default false,
  accepts_pets boolean not null default false,
  non_smoker boolean not null default true,
  has_passport boolean not null default false,
  travel_available boolean not null default false,
  hourly_rate_cents int check (hourly_rate_cents > 0),
  daily_rate_cents int,
  overnight_rate_cents int,
  extra_child_cents int not null default 0,
  service_radius_km int not null default 10,
  approx_lat numeric(8,5),
  approx_lng numeric(8,5),
  is_published boolean not null default false,
  is_sample boolean not null default false,     -- perfis de exemplo vistos pela mãe sem premium
  rating numeric(3,2),
  review_count int not null default 0,
  rehire_rate numeric(4,3) not null default 0,
  response_rate numeric(4,3) not null default 0,
  ranking_score numeric(5,1) not null default 0,
  level public.nanny_level not null default 'nova',
  created_at timestamptz not null default now()
);

-- Dados que nunca aparecem para mães (o @ só serve à verificação e ao ranking interno).
create table public.nanny_private (
  nanny_id uuid primary key references public.nannies (id) on delete cascade,
  social_handles jsonb not null default '{}'::jsonb,
  cpf_hash text unique,
  email_lower text
);

-- ========== Selo dourado (Mentoria Babá de Família Rica) ==========
create table public.mentorship_seals (
  nanny_id uuid primary key references public.nannies (id) on delete cascade,
  source public.seal_source not null,
  active boolean not null default true,
  granted_at timestamptz not null default now(),
  revoked_at timestamptz,
  greenn_sale_id text
);

-- Compras da Greenn de quem ainda não tem conta: vinculadas no cadastro por CPF ou e-mail.
create table public.pending_mentorships (
  id uuid primary key default gen_random_uuid(),
  email_lower text,
  cpf_hash text,
  greenn_sale_id text unique not null,
  created_at timestamptz not null default now(),
  linked_to uuid references public.nannies (id)
);

create table public.greenn_events (
  id uuid primary key default gen_random_uuid(),
  event_key text unique not null, -- idempotência (id da venda + tipo de evento)
  event_type text not null,
  payload jsonb not null,
  processed_at timestamptz,
  created_at timestamptz not null default now()
);

-- ========== Verificação ==========
create table public.verifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  kind public.verification_kind not null,
  status public.verification_status not null default 'pendente',
  provider text,
  provider_ref text,
  summary text,              -- só o resultado; nunca a certidão ou a selfie
  verified_at timestamptz,
  expires_at timestamptz,
  consent_at timestamptz not null,
  created_at timestamptz not null default now()
);
create index on public.verifications (user_id, kind);

-- ========== Favoritas ==========
create table public.favorites (
  mother_id uuid references public.mothers (id) on delete cascade,
  nanny_id uuid references public.nannies (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (mother_id, nanny_id)
);

-- ========== Contratações ==========
create table public.bookings (
  id uuid primary key default gen_random_uuid(),
  mother_id uuid not null references public.mothers (id),
  nanny_id uuid not null references public.nannies (id),
  starts_at timestamptz not null,
  ends_at timestamptz not null check (ends_at > starts_at),
  children_count int not null check (children_count > 0),
  children_ages int[] not null default '{}',
  area_label text not null,          -- "Jardins, São Paulo" (o endereço completo fica em booking_private)
  hourly_rate_cents int not null,
  is_rehire boolean not null default false,
  service_cents int not null,
  family_fee_cents int not null,
  urgent_fee_cents int not null default 0,
  nanny_fee_cents int not null,
  status public.booking_status not null default 'proposta',
  accept_deadline timestamptz not null,
  accepted_at timestamptz,
  paid_at timestamptz,
  contact_unlock_at timestamptz,
  payment_provider_ref text,
  check_in_at timestamptz,
  check_in_lat numeric(8,5),
  check_in_lng numeric(8,5),
  check_out_at timestamptz,
  complaint_deadline timestamptz,
  payout_at timestamptz,
  cancelled_by uuid,
  cancelled_at timestamptz,
  created_at timestamptz not null default now()
);
create index on public.bookings (nanny_id, starts_at);
create index on public.bookings (mother_id, starts_at);

create table public.booking_private (
  booking_id uuid primary key references public.bookings (id) on delete cascade,
  full_address text not null,
  notes text
);

-- ========== Chat ==========
create table public.conversations (
  id uuid primary key default gen_random_uuid(),
  mother_id uuid not null references public.mothers (id),
  nanny_id uuid not null references public.nannies (id),
  created_at timestamptz not null default now(),
  unique (mother_id, nanny_id)
);

-- Mensagens só entram pela função send-message, que aplica o bloqueio de contato.
create table public.messages (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references public.conversations (id) on delete cascade,
  sender_id uuid not null references public.profiles (id),
  body text not null,            -- já mascarado
  flagged boolean not null default false,
  created_at timestamptz not null default now()
);
create index on public.messages (conversation_id, created_at);

-- ========== Avaliações (mão dupla, revelação simultânea) ==========
create table public.nanny_reviews (
  id uuid primary key default gen_random_uuid(),
  booking_id uuid unique not null references public.bookings (id),
  mother_id uuid not null references public.mothers (id),
  nanny_id uuid not null references public.nannies (id),
  care smallint not null check (care between 1 and 5),
  punctuality smallint not null check (punctuality between 1 and 5),
  communication smallint not null check (communication between 1 and 5),
  posture smallint not null check (posture between 1 and 5),
  presentation smallint not null check (presentation between 1 and 5),
  comment text not null check (char_length(trim(comment)) >= 40),
  nanny_reply text,
  published_at timestamptz,
  removed_at timestamptz,
  created_at timestamptz not null default now()
);

create table public.review_private_notes (
  review_id uuid primary key references public.nanny_reviews (id) on delete cascade,
  note text not null
);

create table public.family_reviews (
  id uuid primary key default gen_random_uuid(),
  booking_id uuid unique not null references public.bookings (id),
  nanny_id uuid not null references public.nannies (id),
  mother_id uuid not null references public.mothers (id),
  rating smallint not null check (rating between 1 and 5),
  tags text[] not null default '{}', -- pagamento-em-dia, respeita-horarios, casa-organizada...
  published_at timestamptz,
  created_at timestamptz not null default now()
);

-- ========== Moderação pela IA e recursos ==========
create table public.moderation_events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id),
  action public.moderation_action not null,
  reason text not null,
  ai_summary text,
  message_id uuid references public.messages (id),
  review_id uuid references public.nanny_reviews (id),
  created_at timestamptz not null default now()
);

create table public.appeals (
  id uuid primary key default gen_random_uuid(),
  moderation_event_id uuid unique not null references public.moderation_events (id), -- um recurso por decisão
  user_id uuid not null references public.profiles (id),
  claim text not null,
  status public.appeal_status not null default 'aberto',
  decided_by uuid references public.profiles (id),
  decided_at timestamptz,
  created_at timestamptz not null default now()
);

-- ========== Conteúdos da Ana ==========
create table public.contents (
  id uuid primary key default gen_random_uuid(),
  audience text not null check (audience in ('maes', 'babas', 'mentoria')),
  category text,
  title text not null,
  video_path text,
  duration_seconds int,
  sort_order int not null default 0,
  published boolean not null default false,
  created_at timestamptz not null default now()
);

-- ========== Funções auxiliares ==========
create or replace function public.is_admin() returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from profiles where id = auth.uid() and role = 'admin');
$$;

create or replace function public.is_premium() returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from mothers where id = auth.uid() and premium_until > now());
$$;

create or replace function public.has_mentorship() returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from mentorship_seals where nanny_id = auth.uid() and active);
$$;

-- Existe conversa ou contratação entre o usuário atual e outra pessoa?
create or replace function public.is_connected(other uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from conversations c
    where (c.mother_id = auth.uid() and c.nanny_id = other) or (c.nanny_id = auth.uid() and c.mother_id = other)
  ) or exists (
    select 1 from bookings b
    where (b.mother_id = auth.uid() and b.nanny_id = other) or (b.nanny_id = auth.uid() and b.mother_id = other)
  );
$$;

-- Contato liberado: pagamento confirmado e prazo de cancelamento grátis encerrado.
create or replace function public.contact_unlocked(other uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from bookings b
    where ((b.mother_id = auth.uid() and b.nanny_id = other) or (b.nanny_id = auth.uid() and b.mother_id = other))
      and b.status in ('paga', 'em_andamento', 'concluida')
      and b.contact_unlock_at is not null and b.contact_unlock_at <= now()
  );
$$;

-- ========== Row Level Security ==========
alter table public.profiles enable row level security;
alter table public.profile_contacts enable row level security;
alter table public.mothers enable row level security;
alter table public.nannies enable row level security;
alter table public.nanny_private enable row level security;
alter table public.mentorship_seals enable row level security;
alter table public.pending_mentorships enable row level security;
alter table public.greenn_events enable row level security;
alter table public.verifications enable row level security;
alter table public.favorites enable row level security;
alter table public.bookings enable row level security;
alter table public.booking_private enable row level security;
alter table public.conversations enable row level security;
alter table public.messages enable row level security;
alter table public.nanny_reviews enable row level security;
alter table public.review_private_notes enable row level security;
alter table public.family_reviews enable row level security;
alter table public.moderation_events enable row level security;
alter table public.appeals enable row level security;
alter table public.contents enable row level security;

-- Perfis: o próprio, babás publicadas, quem tem conversa/contratação, e a admin.
-- A mãe não aparece em buscas: seu perfil só é visível para babás com quem ela falou.
create policy profiles_select on public.profiles for select to authenticated using (
  id = auth.uid()
  or public.is_admin()
  or (role = 'baba' and exists (select 1 from nannies n where n.id = profiles.id and n.is_published))
  or public.is_connected(id)
);
create policy profiles_update_self on public.profiles for update to authenticated
  using (id = auth.uid()) with check (id = auth.uid() and role = (select role from profiles p where p.id = auth.uid()));
create policy profiles_insert_self on public.profiles for insert to authenticated
  with check (id = auth.uid() and role in ('mae', 'baba'));

create policy contacts_select on public.profile_contacts for select to authenticated using (
  user_id = auth.uid() or public.is_admin() or public.contact_unlocked(user_id)
);
create policy contacts_write_self on public.profile_contacts for all to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());

create policy mothers_self on public.mothers for select to authenticated using (id = auth.uid() or public.is_admin() or public.is_connected(id));
create policy mothers_insert on public.mothers for insert to authenticated with check (id = auth.uid());
create policy mothers_update on public.mothers for update to authenticated using (id = auth.uid())
  with check (id = auth.uid() and premium_until is not distinct from (select m.premium_until from mothers m where m.id = auth.uid()));

-- Busca: sem premium, a mãe vê só os perfis de exemplo.
create policy nannies_select on public.nannies for select to authenticated using (
  id = auth.uid()
  or public.is_admin()
  or (is_published and (is_sample or public.is_premium() or public.is_connected(id)))
);
create policy nannies_insert on public.nannies for insert to authenticated with check (id = auth.uid());
-- A babá edita o próprio perfil, mas não a nota, o ranking nem a publicação (feitos pelo servidor).
create policy nannies_update on public.nannies for update to authenticated using (id = auth.uid()) with check (id = auth.uid());

create policy nanny_private_self on public.nanny_private for all to authenticated
  using (nanny_id = auth.uid() or public.is_admin()) with check (nanny_id = auth.uid() or public.is_admin());

create policy seals_select on public.mentorship_seals for select to authenticated using (true);
create policy seals_admin on public.mentorship_seals for all to authenticated using (public.is_admin()) with check (public.is_admin());

create policy pending_admin on public.pending_mentorships for all to authenticated using (public.is_admin()) with check (public.is_admin());
create policy greenn_admin on public.greenn_events for select to authenticated using (public.is_admin());

create policy verifications_select on public.verifications for select to authenticated using (user_id = auth.uid() or public.is_admin());
-- Mães veem só o resumo (aprovado + data) pelo view nanny_verification_badges, não esta tabela.

create policy favorites_self on public.favorites for all to authenticated
  using (mother_id = auth.uid()) with check (mother_id = auth.uid());

create policy bookings_select on public.bookings for select to authenticated using (
  mother_id = auth.uid() or nanny_id = auth.uid() or public.is_admin()
);
create policy bookings_insert on public.bookings for insert to authenticated with check (
  mother_id = auth.uid() and status = 'proposta' and paid_at is null
);
-- Mudanças de status passam por funções no servidor (aceite, pagamento, check-in, cancelamento).

-- Endereço completo: a mãe sempre; a babá só a partir de 12h antes do início, com pagamento confirmado.
create policy booking_private_select on public.booking_private for select to authenticated using (
  public.is_admin()
  or exists (select 1 from bookings b where b.id = booking_id and b.mother_id = auth.uid())
  or exists (
    select 1 from bookings b where b.id = booking_id and b.nanny_id = auth.uid()
      and b.status in ('paga', 'em_andamento') and now() >= b.starts_at - interval '12 hours'
  )
);
create policy booking_private_insert on public.booking_private for insert to authenticated with check (
  exists (select 1 from bookings b where b.id = booking_id and b.mother_id = auth.uid())
);

create policy conversations_select on public.conversations for select to authenticated using (
  mother_id = auth.uid() or nanny_id = auth.uid() or public.is_admin()
);
create policy conversations_insert on public.conversations for insert to authenticated with check (mother_id = auth.uid());

create policy messages_select on public.messages for select to authenticated using (
  public.is_admin() or exists (
    select 1 from conversations c where c.id = conversation_id and (c.mother_id = auth.uid() or c.nanny_id = auth.uid())
  )
);
-- Sem política de insert: só a função send-message (service role) grava mensagens.

-- Avaliação da babá: pública depois de publicada; cada um vê a própria.
create policy nanny_reviews_select on public.nanny_reviews for select to authenticated using (
  (published_at is not null and removed_at is null) or mother_id = auth.uid() or public.is_admin()
);
create policy nanny_reviews_insert on public.nanny_reviews for insert to authenticated with check (
  mother_id = auth.uid() and published_at is null and exists (
    select 1 from bookings b where b.id = booking_id and b.mother_id = auth.uid() and b.nanny_id = nanny_reviews.nanny_id and b.status = 'concluida'
  )
);
create policy nanny_reviews_reply on public.nanny_reviews for update to authenticated using (nanny_id = auth.uid()) with check (nanny_id = auth.uid());

create policy private_notes_insert on public.review_private_notes for insert to authenticated with check (
  exists (select 1 from nanny_reviews r where r.id = review_id and r.mother_id = auth.uid())
);
create policy private_notes_admin on public.review_private_notes for select to authenticated using (public.is_admin());

-- Avaliação da família: a mãe NUNCA vê. Só a babá autora e babás com conversa ou proposta dessa mãe.
create policy family_reviews_select on public.family_reviews for select to authenticated using (
  nanny_id = auth.uid()
  or public.is_admin()
  or (published_at is not null and exists (
    select 1 from nannies me where me.id = auth.uid()
  ) and public.is_connected(mother_id))
);
create policy family_reviews_insert on public.family_reviews for insert to authenticated with check (
  nanny_id = auth.uid() and published_at is null and exists (
    select 1 from bookings b where b.id = booking_id and b.nanny_id = auth.uid() and b.mother_id = family_reviews.mother_id and b.status = 'concluida'
  )
);

create policy moderation_select on public.moderation_events for select to authenticated using (user_id = auth.uid() or public.is_admin());

create policy appeals_select on public.appeals for select to authenticated using (user_id = auth.uid() or public.is_admin());
create policy appeals_insert on public.appeals for insert to authenticated with check (
  user_id = auth.uid() and status = 'aberto'
  and exists (select 1 from moderation_events e where e.id = moderation_event_id and e.user_id = auth.uid())
);
create policy appeals_decide on public.appeals for update to authenticated using (public.is_admin()) with check (public.is_admin());

create policy contents_select on public.contents for select to authenticated using (
  public.is_admin()
  or (published and (
    (audience = 'maes' and exists (select 1 from mothers where id = auth.uid()))
    or (audience = 'babas' and exists (select 1 from nannies where id = auth.uid()))
    or (audience = 'mentoria' and public.has_mentorship())
  ))
);
create policy contents_admin on public.contents for all to authenticated using (public.is_admin()) with check (public.is_admin());

-- ========== Colunas que só o servidor muda ==========
-- RLS filtra linhas, não colunas: estes gatilhos impedem que a babá mude a própria nota
-- ou a publicação, e que alguém edite a avaliação além da resposta.
create or replace function public.protect_nanny_columns() returns trigger
language plpgsql as $$
begin
  if current_user in ('authenticated', 'anon') and not public.is_admin() then
    new.rating := old.rating;
    new.review_count := old.review_count;
    new.rehire_rate := old.rehire_rate;
    new.response_rate := old.response_rate;
    new.ranking_score := old.ranking_score;
    new.level := old.level;
    new.is_published := old.is_published;
    new.is_sample := old.is_sample;
  end if;
  return new;
end $$;
create trigger nannies_protect before update on public.nannies for each row execute function public.protect_nanny_columns();

create or replace function public.protect_review_columns() returns trigger
language plpgsql as $$
begin
  if current_user in ('authenticated', 'anon') and not public.is_admin() then
    if (new.care, new.punctuality, new.communication, new.posture, new.presentation, new.comment, new.published_at, new.removed_at)
       is distinct from (old.care, old.punctuality, old.communication, old.posture, old.presentation, old.comment, old.published_at, old.removed_at) then
      raise exception 'Só a resposta da babá pode ser alterada';
    end if;
  end if;
  return new;
end $$;
create trigger nanny_reviews_protect before update on public.nanny_reviews for each row execute function public.protect_review_columns();

-- ========== Revelação simultânea das avaliações ==========
-- Publica as duas quando ambas existem. As que ficam sozinhas são publicadas após 14 dias
-- por um agendamento (publish_expired_reviews).
create or replace function public.reveal_reviews() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if exists (select 1 from nanny_reviews where booking_id = new.booking_id)
     and exists (select 1 from family_reviews where booking_id = new.booking_id) then
    update nanny_reviews set published_at = coalesce(published_at, now()) where booking_id = new.booking_id;
    update family_reviews set published_at = coalesce(published_at, now()) where booking_id = new.booking_id;
  end if;
  return new;
end $$;
create trigger nanny_reviews_reveal after insert on public.nanny_reviews for each row execute function public.reveal_reviews();
create trigger family_reviews_reveal after insert on public.family_reviews for each row execute function public.reveal_reviews();

create or replace function public.publish_expired_reviews() returns void
language sql security definer set search_path = public as $$
  update nanny_reviews r set published_at = now()
    from bookings b where b.id = r.booking_id and r.published_at is null and b.check_out_at < now() - interval '14 days';
  update family_reviews r set published_at = now()
    from bookings b where b.id = r.booking_id and r.published_at is null and b.check_out_at < now() - interval '14 days';
$$;

-- ========== Vitrine pública de verificação ==========
-- A mãe vê só "aprovado em <data>" por tipo, nunca o conteúdo.
create view public.nanny_verification_badges with (security_invoker = false) as
  select v.user_id as nanny_id, v.kind, max(v.verified_at) as verified_at
  from public.verifications v
  join public.nannies n on n.id = v.user_id and n.is_published
  where v.status = 'aprovado' and (v.expires_at is null or v.expires_at > now())
  group by v.user_id, v.kind;
grant select on public.nanny_verification_badges to authenticated;

-- ========== Armazenamento ==========
-- Buckets: fotos e vídeos de perfil (leitura autenticada) e documentos (privado, só servidor).
insert into storage.buckets (id, name, public) values
  ('perfis', 'perfis', false),
  ('documentos', 'documentos', false),
  ('conteudos', 'conteudos', false)
on conflict (id) do nothing;

create policy perfis_read on storage.objects for select to authenticated using (bucket_id = 'perfis');
create policy perfis_write_own on storage.objects for insert to authenticated
  with check (bucket_id = 'perfis' and (storage.foldername(name))[1] = auth.uid()::text);
create policy perfis_update_own on storage.objects for update to authenticated
  using (bucket_id = 'perfis' and (storage.foldername(name))[1] = auth.uid()::text);
create policy documentos_write_own on storage.objects for insert to authenticated
  with check (bucket_id = 'documentos' and (storage.foldername(name))[1] = auth.uid()::text);
-- documentos: sem leitura para usuários; a verificação roda no servidor e apaga após analisar.
create policy conteudos_read on storage.objects for select to authenticated using (bucket_id = 'conteudos');
create policy conteudos_admin on storage.objects for all to authenticated
  using (bucket_id = 'conteudos' and public.is_admin()) with check (bucket_id = 'conteudos' and public.is_admin());
