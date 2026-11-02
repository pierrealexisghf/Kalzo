-- ============================================================================
-- Kalzo — version sociale (app mobile) — 100 % additif et relançable.
-- À coller dans le SQL Editor du projet NutriFlow, APRÈS 01 et 02.
-- L'ancienne app web continue de fonctionner (aucune colonne/table existante
-- n'est supprimée ni renommée ; ses droits ne sont pas réduits).
-- ============================================================================

-- 0. Contrôles préalables : on s'arrête avec un message clair si le schéma réel
--    n'est pas celui attendu (types des identifiants).
do $$
declare t text;
begin
  select data_type into t from information_schema.columns
    where table_schema = 'public' and table_name = 'consumed_meals' and column_name = 'id';
  if t is distinct from 'uuid' then
    raise exception 'consumed_meals.id doit être de type uuid (trouvé : %). Script interrompu : préviens Claude.', coalesce(t, 'colonne absente');
  end if;
  select data_type into t from information_schema.columns
    where table_schema = 'public' and table_name = 'profiles' and column_name = 'id';
  if t is distinct from 'uuid' then
    raise exception 'profiles.id doit être de type uuid (trouvé : %). Script interrompu : préviens Claude.', coalesce(t, 'colonne absente');
  end if;
end $$;

-- 1. PROFILES : pseudo, prénom affiché, fuseau, essai, préférences de notification.
alter table public.profiles add column if not exists username text;
alter table public.profiles add column if not exists username_changed_at timestamptz;
alter table public.profiles add column if not exists first_name text;
alter table public.profiles add column if not exists timezone text not null default 'Europe/Paris';
-- Essai de l'app mobile. Colonne distincte de trial_ends_at, que la version web
-- remplit avec l'essai Stripe (carte bancaire) des abonnés historiques.
alter table public.profiles add column if not exists app_trial_started_at timestamptz;
alter table public.profiles add column if not exists app_trial_ends_at timestamptz;
alter table public.profiles add column if not exists notif_friend_requests boolean not null default true;
alter table public.profiles add column if not exists notif_friend_meals boolean not null default true;
alter table public.profiles add column if not exists rc_event_at timestamptz;      -- dernier événement RevenueCat appliqué
alter table public.profiles add column if not exists plan_source text;            -- 'stripe' | 'apple'

alter table public.profiles drop constraint if exists profiles_username_format;
alter table public.profiles add constraint profiles_username_format
  check (username is null or username ~ '^[a-z0-9][a-z0-9_.]{1,18}[a-z0-9]$');
alter table public.profiles drop constraint if exists profiles_first_name_len;
alter table public.profiles add constraint profiles_first_name_len
  check (first_name is null or char_length(first_name) between 1 and 30);
alter table public.profiles drop constraint if exists profiles_timezone_len;
alter table public.profiles add constraint profiles_timezone_len
  check (char_length(timezone) between 1 and 64);

create unique index if not exists profiles_username_lower_key on public.profiles (lower(username));
create index if not exists profiles_username_prefix on public.profiles (lower(username) text_pattern_ops);

-- Les nouvelles offres doivent être acceptées par les éventuelles contraintes existantes.
do $$
declare c record;
begin
  for c in
    select conname from pg_constraint
    where conrelid = 'public.profiles'::regclass and contype = 'c'
      and (pg_get_constraintdef(oid) ilike '%plan%' and conname <> 'profiles_plan_values'
        or pg_get_constraintdef(oid) ilike '%subscription_status%' and conname <> 'profiles_status_values')
  loop
    execute format('alter table public.profiles drop constraint %I', c.conname);
  end loop;
end $$;
alter table public.profiles drop constraint if exists profiles_plan_values;
alter table public.profiles add constraint profiles_plan_values
  check (plan is null or plan in ('free', 'standard', 'vip', 'essentiel', 'plus', 'illimite')) not valid;
alter table public.profiles drop constraint if exists profiles_status_values;
alter table public.profiles add constraint profiles_status_values
  check (subscription_status is null or subscription_status in
    ('inactive', 'active', 'trialing', 'cancelling', 'past_due', 'canceled', 'expired')) not valid;

-- L'utilisateur modifie lui-même seulement ces nouvelles colonnes. Le pseudo ne passe
-- QUE par set_username() ; l'offre, l'essai et l'abonnement restent réservés au serveur.
grant insert (first_name, timezone, notif_friend_requests, notif_friend_meals) on public.profiles to authenticated;
grant update (first_name, timezone, notif_friend_requests, notif_friend_meals) on public.profiles to authenticated;

-- 2. REPAS : étoiles, partage, photos (supprimées après 30 jours).
alter table public.consumed_meals add column if not exists stars smallint;
alter table public.consumed_meals add column if not exists shared boolean not null default false;
alter table public.consumed_meals add column if not exists photo_path text;
alter table public.consumed_meals add column if not exists thumb_path text;
alter table public.consumed_meals add column if not exists photo_expires_at timestamptz;

alter table public.consumed_meals drop constraint if exists consumed_meals_stars_range;
alter table public.consumed_meals add constraint consumed_meals_stars_range check (stars between 1 and 5);
-- Un chemin de photo doit rester dans le dossier de son propriétaire.
alter table public.consumed_meals drop constraint if exists consumed_meals_photo_folder;
alter table public.consumed_meals add constraint consumed_meals_photo_folder
  check ((photo_path is null or photo_path like user_id::text || '/%')
     and (thumb_path is null or thumb_path like user_id::text || '/%'));

create or replace function public.set_photo_expiry()
returns trigger language plpgsql set search_path = public, pg_temp as $$
begin
  if new.photo_path is null and new.thumb_path is null then
    return new;
  end if;
  if tg_op = 'INSERT' or new.photo_expires_at is null
     or new.photo_path is distinct from old.photo_path then
    new.photo_expires_at := (new.consumed_at at time zone 'UTC') + interval '30 days';
  end if;
  return new;
end $$;
drop trigger if exists consumed_meals_photo_expiry on public.consumed_meals;
create trigger consumed_meals_photo_expiry
  before insert or update of photo_path, thumb_path on public.consumed_meals
  for each row execute function public.set_photo_expiry();

create index if not exists consumed_meals_user_day on public.consumed_meals (user_id, consumed_at desc);
create index if not exists consumed_meals_feed on public.consumed_meals (consumed_at desc, id desc) where shared;
create index if not exists consumed_meals_photo_expiry on public.consumed_meals (photo_expires_at)
  where photo_path is not null or thumb_path is not null;

-- L'ancienne app n'avait pas besoin de modifier un repas ; la nouvelle oui (partage, photo,
-- étoiles), sur un jeu de colonnes limité à celles-ci.
revoke update on public.consumed_meals from authenticated;
grant update (name, emoji, macros, main_ingredients, meal_type, shared, stars, photo_path, thumb_path)
  on public.consumed_meals to authenticated;
drop policy if exists meals_update_own on public.consumed_meals;
create policy meals_update_own on public.consumed_meals
  for update to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- 3. OFFRES ET QUOTAS : tout est lu dans plan_limits, rien n'est codé en dur.
create table if not exists public.plan_limits (
  plan         text primary key,
  weekly_scans int,                       -- null = illimité
  coach_access boolean not null default false,
  daily_cap    int not null default 100
);
alter table public.plan_limits enable row level security;
revoke all on public.plan_limits from anon, authenticated;
grant select on public.plan_limits to authenticated;
drop policy if exists plan_limits_read on public.plan_limits;
create policy plan_limits_read on public.plan_limits for select to authenticated using (true);

insert into public.plan_limits (plan, weekly_scans, coach_access, daily_cap) values
  ('trial',     null, true,  100),
  ('free',      5,    false, 100),
  ('essentiel', 30,   false, 100),
  ('plus',      30,   true,  100),
  ('illimite',  null, true,  100)
on conflict (plan) do nothing;

create table if not exists public.ai_weekly_usage (
  user_id    uuid not null references auth.users(id) on delete cascade,
  week_start date not null,
  scans      int  not null default 0,
  primary key (user_id, week_start)
);
alter table public.ai_weekly_usage enable row level security;
revoke all on public.ai_weekly_usage from anon, authenticated;

-- ai_usage (compteur journalier) existe déjà depuis 01 ; on s'assure qu'il est présent.
create table if not exists public.ai_usage (
  user_id uuid not null, day date not null default current_date, count int not null default 0,
  primary key (user_id, day)
);

-- Offre effective : abonnement actif > essai en cours > gratuit.
-- Les anciens abonnés Stripe gardent leur accès : standard → plus, vip → illimite.
create or replace function public._effective_plan(p_user uuid)
returns text language plpgsql stable security definer set search_path = public, pg_temp as $$
declare r record; v_plan text;
begin
  select plan, subscription_status, current_period_end, app_trial_ends_at
    into r from public.profiles where id = p_user;
  if not found then return 'free'; end if;
  v_plan := case r.plan when 'standard' then 'plus' when 'vip' then 'illimite' else r.plan end;
  -- Un abonnement actif passe avant l'essai : on voit son offre dès l'achat.
  if v_plan in ('essentiel', 'plus', 'illimite')
     and r.subscription_status in ('active', 'trialing', 'cancelling', 'past_due') then
    if not (r.subscription_status = 'cancelling' and r.current_period_end is not null
            and r.current_period_end <= now()) then
      return v_plan;
    end if;
  end if;
  if r.app_trial_ends_at is not null and r.app_trial_ends_at > now() then return 'trial'; end if;
  return 'free';
end $$;

create or replace function public._week_start(p_user uuid)
returns date language sql stable security definer set search_path = public, pg_temp as $$
  select date_trunc('week', now() at time zone coalesce(
    (select timezone from public.profiles where id = p_user), 'Europe/Paris'))::date
$$;

create or replace function public._next_reset(p_user uuid)
returns timestamptz language sql stable security definer set search_path = public, pg_temp as $$
  select ((_week_start(p_user) + 7)::timestamp) at time zone coalesce(
    (select timezone from public.profiles where id = p_user), 'Europe/Paris')
$$;

create or replace function public._ai_status(p_user uuid)
returns jsonb language plpgsql stable security definer set search_path = public, pg_temp as $$
declare v_plan text; l record; v_used int; v_ws date;
begin
  v_plan := public._effective_plan(p_user);
  select * into l from public.plan_limits where plan = v_plan;
  v_ws := public._week_start(p_user);
  select scans into v_used from public.ai_weekly_usage where user_id = p_user and week_start = v_ws;
  return jsonb_build_object(
    'plan', v_plan,
    'coach_access', coalesce(l.coach_access, false),
    'weekly_scans', l.weekly_scans,
    'remaining', case when l.weekly_scans is null then null else greatest(l.weekly_scans - coalesce(v_used, 0), 0) end,
    'resets_at', public._next_reset(p_user),
    'trial_ends_at', (select app_trial_ends_at from public.profiles where id = p_user)
  );
end $$;

-- Appelée par le client pour afficher le solde (lecture seule).
create or replace function public.my_ai_status()
returns jsonb language plpgsql stable security definer set search_path = public, pg_temp as $$
begin
  if auth.uid() is null then raise exception 'not_authenticated'; end if;
  return public._ai_status(auth.uid());
end $$;

-- Consommation ATOMIQUE, réservée au serveur (Edge Function `ai`, rôle service_role).
-- feature : 'scan' (1 scan du quota hebdomadaire) ou 'coach' (exige une offre qui l'inclut).
create or replace function public.consume_ai(p_user uuid, p_feature text)
returns jsonb language plpgsql security definer set search_path = public, pg_temp as $$
declare
  v_plan text; l record; v_ws date; v_week int; v_day int; v_status jsonb;
begin
  if p_feature not in ('scan', 'coach') then
    return jsonb_build_object('ok', false, 'reason', 'bad_feature');
  end if;
  v_plan := public._effective_plan(p_user);
  select * into l from public.plan_limits where plan = v_plan;
  if not found then
    return jsonb_build_object('ok', false, 'reason', 'subscription_required');
  end if;
  v_ws := public._week_start(p_user);

  if p_feature = 'coach' and not l.coach_access then
    v_status := public._ai_status(p_user);
    return v_status || jsonb_build_object('ok', false, 'reason', 'subscription_required');
  end if;

  if p_feature = 'scan' and l.weekly_scans is not null then
    insert into public.ai_weekly_usage (user_id, week_start, scans) values (p_user, v_ws, 1)
      on conflict (user_id, week_start) do update set scans = public.ai_weekly_usage.scans + 1
        where public.ai_weekly_usage.scans < l.weekly_scans
      returning scans into v_week;
    if v_week is null then
      v_status := public._ai_status(p_user);
      return v_status || jsonb_build_object('ok', false, 'reason', 'quota_weekly');
    end if;
  end if;

  insert into public.ai_usage (user_id, day, count) values (p_user, current_date, 1)
    on conflict (user_id, day) do update set count = public.ai_usage.count + 1
    returning count into v_day;
  if v_day > l.daily_cap then
    update public.ai_usage set count = count - 1 where user_id = p_user and day = current_date;
    if p_feature = 'scan' and l.weekly_scans is not null then
      update public.ai_weekly_usage set scans = greatest(scans - 1, 0)
        where user_id = p_user and week_start = v_ws;
    end if;
    v_status := public._ai_status(p_user);
    return v_status || jsonb_build_object('ok', false, 'reason', 'daily_cap');
  end if;

  v_status := public._ai_status(p_user);
  return v_status || jsonb_build_object('ok', true, 'week_start', v_ws, 'feature', p_feature);
end $$;

-- L'IA a échoué : on rend le scan (même semaine que celle débitée).
create or replace function public.refund_ai(p_user uuid, p_feature text, p_week_start date default null)
returns void language plpgsql security definer set search_path = public, pg_temp as $$
begin
  update public.ai_usage set count = greatest(count - 1, 0) where user_id = p_user and day = current_date;
  if p_feature = 'scan' then
    update public.ai_weekly_usage set scans = greatest(scans - 1, 0)
      where user_id = p_user and week_start = coalesce(p_week_start, public._week_start(p_user));
  end if;
end $$;

-- 4. COMPTE : création du profil si besoin, prénom, essai de 7 jours (une seule fois).
create or replace function public.ensure_account()
returns jsonb language plpgsql security definer set search_path = public, pg_temp as $$
declare
  v_uid uuid := auth.uid(); v_email text; v_meta jsonb; p record; v_active boolean;
begin
  if v_uid is null then raise exception 'not_authenticated'; end if;
  select email, raw_user_meta_data into v_email, v_meta from auth.users where id = v_uid;
  insert into public.profiles (id, email) values (v_uid, v_email) on conflict (id) do nothing;

  select * into p from public.profiles where id = v_uid;
  if p.first_name is null and nullif(trim(v_meta ->> 'first_name'), '') is not null then
    update public.profiles set first_name = left(trim(v_meta ->> 'first_name'), 30) where id = v_uid;
  end if;

  if p.app_trial_started_at is null then
    v_active := p.plan in ('standard', 'vip', 'essentiel', 'plus', 'illimite')
                and p.subscription_status in ('active', 'trialing', 'cancelling', 'past_due');
    if v_active then
      -- Abonné historique : il garde son offre, l'essai est considéré comme déjà utilisé.
      update public.profiles set app_trial_started_at = now() where id = v_uid;
    else
      update public.profiles set app_trial_started_at = now(), app_trial_ends_at = now() + interval '7 days'
        where id = v_uid;
    end if;
  end if;

  select * into p from public.profiles where id = v_uid;
  return jsonb_build_object(
    'username', p.username, 'first_name', p.first_name, 'timezone', p.timezone,
    'username_changed_at', p.username_changed_at,
    'ai', public._ai_status(v_uid)
  );
end $$;

-- 5. PSEUDO
create table if not exists public.reserved_usernames (name text primary key);
alter table public.reserved_usernames enable row level security;
revoke all on public.reserved_usernames from anon, authenticated;
insert into public.reserved_usernames (name) values
  ('admin'), ('administrator'), ('kalzo'), ('support'), ('moderator'), ('mod'), ('staff'), ('team'),
  ('help'), ('contact'), ('root'), ('system'), ('official'), ('null'), ('undefined'), ('anonymous'),
  ('api'), ('www'), ('app'), ('info'), ('legal'), ('privacy'), ('terms'), ('apple'), ('google'),
  ('supabase'), ('security'), ('billing'), ('moi'), ('me'), ('nutriflow')
on conflict do nothing;

-- Limiteur de débit simple (par utilisateur et par clé).
create table if not exists public.rate_events (
  user_id uuid not null, key text not null, at timestamptz not null default now()
);
create index if not exists rate_events_lookup on public.rate_events (user_id, key, at desc);
alter table public.rate_events enable row level security;
revoke all on public.rate_events from anon, authenticated;

create or replace function public._rate_ok(p_user uuid, p_key text, p_limit int, p_window interval)
returns boolean language plpgsql security definer set search_path = public, pg_temp as $$
declare n int;
begin
  delete from public.rate_events where user_id = p_user and key = p_key and at < now() - p_window;
  select count(*) into n from public.rate_events where user_id = p_user and key = p_key;
  if n >= p_limit then return false; end if;
  insert into public.rate_events (user_id, key) values (p_user, p_key);
  return true;
end $$;

create or replace function public._username_problem(p_username text, p_self uuid)
returns text language plpgsql stable security definer set search_path = public, pg_temp as $$
declare u text := lower(coalesce(p_username, ''));
begin
  if u !~ '^[a-z0-9][a-z0-9_.]{1,18}[a-z0-9]$' then return 'invalid_format'; end if;
  if exists (select 1 from public.reserved_usernames where name = u) then return 'reserved'; end if;
  if exists (select 1 from public.profiles where lower(username) = u and id <> p_self) then return 'taken'; end if;
  return null;
end $$;

create or replace function public.username_available(p_username text)
returns jsonb language plpgsql security definer set search_path = public, pg_temp as $$
declare v_uid uuid := auth.uid(); v_problem text;
begin
  if v_uid is null then raise exception 'not_authenticated'; end if;
  if not public._rate_ok(v_uid, 'username_check', 60, interval '1 minute') then raise exception 'rate_limited'; end if;
  v_problem := public._username_problem(p_username, v_uid);
  return jsonb_build_object('available', v_problem is null, 'reason', v_problem);
end $$;

create or replace function public.set_username(p_username text)
returns jsonb language plpgsql security definer set search_path = public, pg_temp as $$
declare v_uid uuid := auth.uid(); v_problem text; u text := lower(trim(coalesce(p_username, ''))); p record;
begin
  if v_uid is null then raise exception 'not_authenticated'; end if;
  insert into public.profiles (id) values (v_uid) on conflict (id) do nothing;
  select username, username_changed_at into p from public.profiles where id = v_uid;
  if p.username is not null and lower(p.username) = u then
    return jsonb_build_object('ok', true, 'username', p.username);
  end if;
  if p.username is not null and p.username_changed_at is not null
     and p.username_changed_at > now() - interval '30 days' then
    return jsonb_build_object('ok', false, 'reason', 'cooldown',
      'next_change_at', p.username_changed_at + interval '30 days');
  end if;
  v_problem := public._username_problem(u, v_uid);
  if v_problem is not null then return jsonb_build_object('ok', false, 'reason', v_problem); end if;
  begin
    update public.profiles set username = u, username_changed_at = now() where id = v_uid;
  exception when unique_violation then
    return jsonb_build_object('ok', false, 'reason', 'taken');
  end;
  return jsonb_build_object('ok', true, 'username', u);
end $$;

-- 6. AMIS, BLOCAGES, RÉACTIONS, COMMENTAIRES, SIGNALEMENTS
create table if not exists public.friendships (
  id           uuid primary key default gen_random_uuid(),
  requester_id uuid not null references auth.users(id) on delete cascade,
  addressee_id uuid not null references auth.users(id) on delete cascade,
  status       text not null default 'pending' check (status in ('pending', 'accepted')),
  created_at   timestamptz not null default now(),
  responded_at timestamptz,
  constraint friendships_no_self check (requester_id <> addressee_id)
);
create unique index if not exists friendships_pair_key
  on public.friendships (least(requester_id, addressee_id), greatest(requester_id, addressee_id));
create index if not exists friendships_addressee on public.friendships (addressee_id, status);
create index if not exists friendships_requester on public.friendships (requester_id, status);
alter table public.friendships enable row level security;
revoke all on public.friendships from anon, authenticated;
grant select on public.friendships to authenticated;
drop policy if exists friendships_select_own on public.friendships;
create policy friendships_select_own on public.friendships
  for select to authenticated using (auth.uid() in (requester_id, addressee_id));

create table if not exists public.blocks (
  blocker_id uuid not null references auth.users(id) on delete cascade,
  blocked_id uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (blocker_id, blocked_id),
  constraint blocks_no_self check (blocker_id <> blocked_id)
);
alter table public.blocks enable row level security;
revoke all on public.blocks from anon, authenticated;
grant select on public.blocks to authenticated;
drop policy if exists blocks_select_own on public.blocks;
create policy blocks_select_own on public.blocks for select to authenticated using (auth.uid() = blocker_id);

create table if not exists public.meal_reactions (
  meal_id    uuid not null references public.consumed_meals(id) on delete cascade,
  user_id    uuid not null references auth.users(id) on delete cascade,
  emoji      text not null check (emoji in ('🔥', '😋', '💪', '👏')),
  created_at timestamptz not null default now(),
  primary key (meal_id, user_id)
);
alter table public.meal_reactions enable row level security;
revoke all on public.meal_reactions from anon, authenticated;

create table if not exists public.meal_comments (
  id         uuid primary key default gen_random_uuid(),
  meal_id    uuid not null references public.consumed_meals(id) on delete cascade,
  user_id    uuid not null references auth.users(id) on delete cascade,
  body       text not null check (char_length(body) between 1 and 200),
  created_at timestamptz not null default now()
);
create index if not exists meal_comments_meal on public.meal_comments (meal_id, created_at);
alter table public.meal_comments enable row level security;
revoke all on public.meal_comments from anon, authenticated;

create table if not exists public.meal_hides (
  user_id uuid not null references auth.users(id) on delete cascade,
  meal_id uuid not null references public.consumed_meals(id) on delete cascade,
  primary key (user_id, meal_id)
);
alter table public.meal_hides enable row level security;
revoke all on public.meal_hides from anon, authenticated;

create table if not exists public.reports (
  id          uuid primary key default gen_random_uuid(),
  reporter_id uuid not null references auth.users(id) on delete cascade,
  meal_id     uuid references public.consumed_meals(id) on delete set null,
  comment_id  uuid references public.meal_comments(id) on delete set null,
  reported_id uuid references auth.users(id) on delete set null,
  reason      text not null check (reason in ('inappropriate', 'spam', 'harassment', 'other')),
  details     text check (details is null or char_length(details) <= 500),
  created_at  timestamptz not null default now()
);
alter table public.reports enable row level security;
revoke all on public.reports from anon, authenticated;

-- Aides internes (non appelables par le client).
create or replace function public._blocked(a uuid, b uuid)
returns boolean language sql stable security definer set search_path = public, pg_temp as $$
  select exists (select 1 from public.blocks
    where (blocker_id = a and blocked_id = b) or (blocker_id = b and blocked_id = a))
$$;

create or replace function public._friends(a uuid, b uuid)
returns boolean language sql stable security definer set search_path = public, pg_temp as $$
  select exists (select 1 from public.friendships
    where status = 'accepted'
      and ((requester_id = a and addressee_id = b) or (requester_id = b and addressee_id = a)))
$$;

create or replace function public._user_by_name(p_username text)
returns uuid language sql stable security definer set search_path = public, pg_temp as $$
  select id from public.profiles where lower(username) = lower(trim(coalesce(p_username, '')))
$$;

-- Le repas est-il visible pour ce lecteur ? (soi-même, ou partagé par un ami non bloqué)
create or replace function public._can_view_meal(p_meal uuid, p_viewer uuid)
returns boolean language sql stable security definer set search_path = public, pg_temp as $$
  select exists (
    select 1 from public.consumed_meals m
    where m.id = p_meal
      and (m.user_id = p_viewer
           or (m.shared and public._friends(m.user_id, p_viewer) and not public._blocked(m.user_id, p_viewer)))
  )
$$;

-- Nom affiché : le prénom, sinon le pseudo. Jamais l'e-mail.
create or replace function public._display_name(p public.profiles)
returns text language sql immutable as $$
  select coalesce(nullif(p.first_name, ''), p.username)
$$;

-- Recherche : 3 caractères minimum, préfixe du pseudo, 10 résultats, 30 requêtes/minute.
create or replace function public.search_users(q text)
returns table (username text, first_name text, relation text)
language plpgsql security definer set search_path = public, pg_temp as $$
declare v_uid uuid := auth.uid(); v_q text := lower(trim(coalesce(q, '')));
begin
  if v_uid is null then raise exception 'not_authenticated'; end if;
  if char_length(v_q) < 3 or char_length(v_q) > 20 then return; end if;
  if not public._rate_ok(v_uid, 'search_users', 30, interval '1 minute') then raise exception 'rate_limited'; end if;
  v_q := replace(replace(replace(v_q, '\', '\\'), '%', '\%'), '_', '\_');
  return query
    select p.username, p.first_name,
      case
        when f.id is null then 'none'
        when f.status = 'accepted' then 'friends'
        when f.requester_id = v_uid then 'pending_out'
        else 'pending_in'
      end
    from public.profiles p
    left join public.friendships f
      on (f.requester_id = v_uid and f.addressee_id = p.id) or (f.addressee_id = v_uid and f.requester_id = p.id)
    where p.username is not null and p.id <> v_uid
      and lower(p.username) like v_q || '%' escape '\'
      and not public._blocked(v_uid, p.id)
    order by (lower(p.username) = lower(trim(q))) desc, p.username
    limit 10;
end $$;

create or replace function public.friend_request_send(p_username text)
returns jsonb language plpgsql security definer set search_path = public, pg_temp as $$
declare v_uid uuid := auth.uid(); v_to uuid; f record;
begin
  if v_uid is null then raise exception 'not_authenticated'; end if;
  if not public._rate_ok(v_uid, 'friend_request', 20, interval '1 hour') then raise exception 'rate_limited'; end if;
  v_to := public._user_by_name(p_username);
  if v_to is null or v_to = v_uid or public._blocked(v_uid, v_to) then
    return jsonb_build_object('ok', false, 'reason', 'not_found');
  end if;
  select * into f from public.friendships
    where (requester_id = v_uid and addressee_id = v_to) or (requester_id = v_to and addressee_id = v_uid);
  if found then
    if f.status = 'accepted' then return jsonb_build_object('ok', true, 'status', 'friends'); end if;
    if f.requester_id = v_to then   -- l'autre avait déjà demandé : on accepte
      update public.friendships set status = 'accepted', responded_at = now() where id = f.id;
      return jsonb_build_object('ok', true, 'status', 'friends');
    end if;
    return jsonb_build_object('ok', true, 'status', 'pending_out');
  end if;
  insert into public.friendships (requester_id, addressee_id) values (v_uid, v_to);
  return jsonb_build_object('ok', true, 'status', 'pending_out');
end $$;

create or replace function public.friend_request_cancel(p_username text)
returns void language plpgsql security definer set search_path = public, pg_temp as $$
declare v_uid uuid := auth.uid(); v_to uuid := public._user_by_name(p_username);
begin
  if v_uid is null then raise exception 'not_authenticated'; end if;
  delete from public.friendships where requester_id = v_uid and addressee_id = v_to and status = 'pending';
end $$;

create or replace function public.friend_request_respond(p_username text, p_accept boolean)
returns jsonb language plpgsql security definer set search_path = public, pg_temp as $$
declare v_uid uuid := auth.uid(); v_from uuid := public._user_by_name(p_username); n int;
begin
  if v_uid is null then raise exception 'not_authenticated'; end if;
  if v_from is null or public._blocked(v_uid, v_from) then return jsonb_build_object('ok', false); end if;
  if p_accept then
    update public.friendships set status = 'accepted', responded_at = now()
      where requester_id = v_from and addressee_id = v_uid and status = 'pending';
  else
    delete from public.friendships where requester_id = v_from and addressee_id = v_uid and status = 'pending';
  end if;
  get diagnostics n = row_count;
  return jsonb_build_object('ok', n > 0);
end $$;

create or replace function public.friend_remove(p_username text)
returns void language plpgsql security definer set search_path = public, pg_temp as $$
declare v_uid uuid := auth.uid(); v_o uuid := public._user_by_name(p_username);
begin
  if v_uid is null then raise exception 'not_authenticated'; end if;
  delete from public.friendships
    where (requester_id = v_uid and addressee_id = v_o) or (requester_id = v_o and addressee_id = v_uid);
end $$;

create or replace function public.user_block(p_username text)
returns void language plpgsql security definer set search_path = public, pg_temp as $$
declare v_uid uuid := auth.uid(); v_o uuid := public._user_by_name(p_username);
begin
  if v_uid is null then raise exception 'not_authenticated'; end if;
  if v_o is null or v_o = v_uid then return; end if;
  delete from public.friendships
    where (requester_id = v_uid and addressee_id = v_o) or (requester_id = v_o and addressee_id = v_uid);
  insert into public.blocks (blocker_id, blocked_id) values (v_uid, v_o) on conflict do nothing;
end $$;

create or replace function public.user_unblock(p_username text)
returns void language plpgsql security definer set search_path = public, pg_temp as $$
declare v_uid uuid := auth.uid();
begin
  if v_uid is null then raise exception 'not_authenticated'; end if;
  delete from public.blocks where blocker_id = v_uid and blocked_id = public._user_by_name(p_username);
end $$;

-- Moyenne d'étoiles sur 7 jours et série de jours à 4 étoiles ou plus.
-- p_shared_only : pour un ami, on ne compte QUE ce qu'il a partagé.
create or replace function public._scores(p_user uuid, p_shared_only boolean)
returns jsonb language plpgsql stable security definer set search_path = public, pg_temp as $$
declare v_today date; v_avg numeric; v_start int; v_streak int;
begin
  v_today := (now() at time zone coalesce((select timezone from public.profiles where id = p_user), 'Europe/Paris'))::date;
  select round(avg(stars)::numeric, 1) into v_avg from public.consumed_meals
    where user_id = p_user and stars is not null and (not p_shared_only or shared)
      and consumed_at >= v_today - 6;
  with days as (
    select consumed_at::date d, avg(stars) a from public.consumed_meals
    where user_id = p_user and stars is not null and (not p_shared_only or shared) and consumed_at >= v_today - 40
    group by 1
  )
  select case when exists (select 1 from days where d = v_today and a >= 4) then 0 else 1 end into v_start;
  select coalesce(min(i), 41) - v_start into v_streak
    from generate_series(v_start, 40) i
    where not exists (
      select 1 from (select consumed_at::date d, avg(stars) a from public.consumed_meals
        where user_id = p_user and stars is not null and (not p_shared_only or shared)
          and consumed_at >= v_today - 40 group by 1) x
      where x.d = v_today - i and x.a >= 4);
  return jsonb_build_object('avg7', v_avg, 'streak', greatest(v_streak, 0));
end $$;

-- Écran « Mes amis » : amis, demandes reçues, demandes envoyées, bloqués.
create or replace function public.friends_overview()
returns jsonb language plpgsql stable security definer set search_path = public, pg_temp as $$
declare v_uid uuid := auth.uid(); res jsonb;
begin
  if v_uid is null then raise exception 'not_authenticated'; end if;
  select jsonb_build_object(
    'friends', coalesce((select jsonb_agg(jsonb_build_object(
        'username', p.username, 'first_name', public._display_name(p),
        'avg7', (public._scores(p.id, true) ->> 'avg7')::numeric) order by p.username)
      from public.friendships f
      join public.profiles p on p.id = case when f.requester_id = v_uid then f.addressee_id else f.requester_id end
      where f.status = 'accepted' and v_uid in (f.requester_id, f.addressee_id)
        and not public._blocked(v_uid, p.id) and p.username is not null), '[]'::jsonb),
    'incoming', coalesce((select jsonb_agg(jsonb_build_object(
        'username', p.username, 'first_name', public._display_name(p), 'at', f.created_at) order by f.created_at desc)
      from public.friendships f join public.profiles p on p.id = f.requester_id
      where f.status = 'pending' and f.addressee_id = v_uid and not public._blocked(v_uid, p.id) and p.username is not null), '[]'::jsonb),
    'outgoing', coalesce((select jsonb_agg(jsonb_build_object(
        'username', p.username, 'first_name', public._display_name(p), 'at', f.created_at) order by f.created_at desc)
      from public.friendships f join public.profiles p on p.id = f.addressee_id
      where f.status = 'pending' and f.requester_id = v_uid and not public._blocked(v_uid, p.id) and p.username is not null), '[]'::jsonb),
    'blocked', coalesce((select jsonb_agg(jsonb_build_object(
        'username', p.username, 'first_name', public._display_name(p)) order by b.created_at desc)
      from public.blocks b join public.profiles p on p.id = b.blocked_id
      where b.blocker_id = v_uid and p.username is not null), '[]'::jsonb)
  ) into res;
  return res;
end $$;

-- Mon profil (tout) ou celui d'un ami (ce qu'il a partagé uniquement).
create or replace function public.profile_summary(p_username text)
returns jsonb language plpgsql stable security definer set search_path = public, pg_temp as $$
declare v_uid uuid := auth.uid(); v_o uuid := public._user_by_name(p_username); p public.profiles; v_self boolean;
begin
  if v_uid is null then raise exception 'not_authenticated'; end if;
  v_self := v_o = v_uid;
  if v_o is null or (not v_self and (not public._friends(v_uid, v_o) or public._blocked(v_uid, v_o))) then
    return null;
  end if;
  select * into p from public.profiles where id = v_o;
  return jsonb_build_object(
    'username', p.username, 'first_name', public._display_name(p), 'self', v_self,
    'friend_count', (select count(*) from public.friendships
                     where status = 'accepted' and v_o in (requester_id, addressee_id)),
    'scores', public._scores(v_o, not v_self)
  );
end $$;

-- Repas partagés d'une personne (soi ou un ami), du plus récent au plus ancien.
create or replace function public.user_shared_meals(p_username text, p_before timestamp default null, p_limit int default 24)
returns table (id uuid, name text, emoji text, meal_type text, consumed_at timestamp, stars smallint, thumb_path text, photo_path text)
language plpgsql stable security definer set search_path = public, pg_temp as $$
declare v_uid uuid := auth.uid(); v_o uuid := public._user_by_name(p_username);
begin
  if v_uid is null then raise exception 'not_authenticated'; end if;
  if v_o is null or (v_o <> v_uid and (not public._friends(v_uid, v_o) or public._blocked(v_uid, v_o))) then return; end if;
  return query
    select m.id, m.name, m.emoji, m.meal_type, m.consumed_at, m.stars,
      case when m.photo_expires_at is null or m.photo_expires_at > now() then m.thumb_path end,
      case when m.photo_expires_at is null or m.photo_expires_at > now() then m.photo_path end
    from public.consumed_meals m
    where m.user_id = v_o and m.shared and (p_before is null or m.consumed_at < p_before)
    order by m.consumed_at desc, m.id desc
    limit least(greatest(coalesce(p_limit, 24), 1), 60);
end $$;

-- FEED : repas partagés de moi et de mes amis. JAMAIS de kcal.
create or replace function public.feed_page(p_before timestamp default null, p_before_id uuid default null, p_limit int default 20)
returns table (
  id uuid, username text, first_name text, is_me boolean, name text, emoji text, meal_type text,
  consumed_at timestamp, stars smallint, prot numeric, gluc numeric, lip numeric,
  photo_path text, thumb_path text, reactions jsonb, my_reaction text, comment_count bigint
)
language plpgsql stable security definer set search_path = public, pg_temp as $$
declare v_uid uuid := auth.uid();
begin
  if v_uid is null then raise exception 'not_authenticated'; end if;
  return query
    select m.id, p.username, public._display_name(p), m.user_id = v_uid, m.name, m.emoji, m.meal_type,
      m.consumed_at, m.stars,
      nullif(m.macros ->> 'prot', '')::numeric, nullif(m.macros ->> 'gluc', '')::numeric, nullif(m.macros ->> 'lip', '')::numeric,
      case when m.photo_expires_at is null or m.photo_expires_at > now() then m.photo_path end,
      case when m.photo_expires_at is null or m.photo_expires_at > now() then m.thumb_path end,
      coalesce((select jsonb_object_agg(r.e, r.n) from
                 (select mr.emoji as e, count(*) n from public.meal_reactions mr where mr.meal_id = m.id group by mr.emoji) r), '{}'::jsonb),
      (select mr2.emoji from public.meal_reactions mr2 where mr2.meal_id = m.id and mr2.user_id = v_uid),
      (select count(*) from public.meal_comments mc where mc.meal_id = m.id)
    from public.consumed_meals m
    join public.profiles p on p.id = m.user_id
    where m.shared
      and (m.user_id = v_uid
           or (public._friends(m.user_id, v_uid) and not public._blocked(m.user_id, v_uid)))
      and not exists (select 1 from public.meal_hides h where h.user_id = v_uid and h.meal_id = m.id)
      and (p_before is null or (m.consumed_at, m.id) < (p_before, coalesce(p_before_id, 'ffffffff-ffff-ffff-ffff-ffffffffffff'::uuid)))
    order by m.consumed_at desc, m.id desc
    limit least(greatest(coalesce(p_limit, 20), 1), 50);
end $$;

create or replace function public.meal_react(p_meal uuid, p_emoji text)
returns text language plpgsql security definer set search_path = public, pg_temp as $$
declare v_uid uuid := auth.uid(); cur text;
begin
  if v_uid is null then raise exception 'not_authenticated'; end if;
  if p_emoji not in ('🔥', '😋', '💪', '👏') or not public._can_view_meal(p_meal, v_uid) then
    raise exception 'forbidden';
  end if;
  select emoji into cur from public.meal_reactions where meal_id = p_meal and user_id = v_uid;
  if cur = p_emoji then
    delete from public.meal_reactions where meal_id = p_meal and user_id = v_uid;
    return null;
  end if;
  insert into public.meal_reactions (meal_id, user_id, emoji) values (p_meal, v_uid, p_emoji)
    on conflict (meal_id, user_id) do update set emoji = excluded.emoji, created_at = now();
  return p_emoji;
end $$;

create or replace function public.meal_comment_add(p_meal uuid, p_body text)
returns uuid language plpgsql security definer set search_path = public, pg_temp as $$
declare v_uid uuid := auth.uid(); v_body text := trim(coalesce(p_body, '')); v_id uuid;
begin
  if v_uid is null then raise exception 'not_authenticated'; end if;
  if char_length(v_body) not between 1 and 200 then raise exception 'invalid_comment'; end if;
  if not public._can_view_meal(p_meal, v_uid) then raise exception 'forbidden'; end if;
  if not public._rate_ok(v_uid, 'comment', 30, interval '1 hour') then raise exception 'rate_limited'; end if;
  insert into public.meal_comments (meal_id, user_id, body) values (p_meal, v_uid, v_body) returning id into v_id;
  return v_id;
end $$;

create or replace function public.meal_comment_delete(p_comment uuid)
returns void language plpgsql security definer set search_path = public, pg_temp as $$
declare v_uid uuid := auth.uid();
begin
  if v_uid is null then raise exception 'not_authenticated'; end if;
  delete from public.meal_comments c
    where c.id = p_comment
      and (c.user_id = v_uid or exists (select 1 from public.consumed_meals m where m.id = c.meal_id and m.user_id = v_uid));
end $$;

create or replace function public.meal_comments_list(p_meal uuid, p_limit int default 100)
returns table (id uuid, username text, first_name text, is_me boolean, body text, created_at timestamptz, can_delete boolean)
language plpgsql stable security definer set search_path = public, pg_temp as $$
declare v_uid uuid := auth.uid(); v_owner uuid;
begin
  if v_uid is null then raise exception 'not_authenticated'; end if;
  if not public._can_view_meal(p_meal, v_uid) then return; end if;
  select user_id into v_owner from public.consumed_meals where consumed_meals.id = p_meal;
  return query
    select c.id, p.username, public._display_name(p), c.user_id = v_uid, c.body, c.created_at,
           (c.user_id = v_uid or v_owner = v_uid)
    from public.meal_comments c join public.profiles p on p.id = c.user_id
    where c.meal_id = p_meal and not public._blocked(v_uid, c.user_id)
    order by c.created_at
    limit least(greatest(coalesce(p_limit, 100), 1), 200);
end $$;

create or replace function public.meal_hide(p_meal uuid)
returns void language plpgsql security definer set search_path = public, pg_temp as $$
declare v_uid uuid := auth.uid();
begin
  if v_uid is null then raise exception 'not_authenticated'; end if;
  if not public._can_view_meal(p_meal, v_uid) then return; end if;
  insert into public.meal_hides (user_id, meal_id) values (v_uid, p_meal) on conflict do nothing;
end $$;

create or replace function public.report_create(p_meal uuid, p_comment uuid, p_reason text, p_details text default null)
returns void language plpgsql security definer set search_path = public, pg_temp as $$
declare v_uid uuid := auth.uid(); v_reported uuid;
begin
  if v_uid is null then raise exception 'not_authenticated'; end if;
  if p_reason not in ('inappropriate', 'spam', 'harassment', 'other') then raise exception 'invalid_reason'; end if;
  if not public._rate_ok(v_uid, 'report', 20, interval '1 hour') then raise exception 'rate_limited'; end if;
  if p_comment is not null then
    select c.user_id, c.meal_id into v_reported, p_meal from public.meal_comments c where c.id = p_comment;
  elsif p_meal is not null then
    select user_id into v_reported from public.consumed_meals where id = p_meal;
  end if;
  if p_meal is null or v_reported is null or not public._can_view_meal(p_meal, v_uid) then return; end if;
  insert into public.reports (reporter_id, meal_id, comment_id, reported_id, reason, details)
    values (v_uid, p_meal, p_comment, v_reported, p_reason, left(p_details, 500));
  insert into public.meal_hides (user_id, meal_id) values (v_uid, p_meal) on conflict do nothing;
end $$;

-- 7. NOTIFICATIONS PUSH
create table if not exists public.push_tokens (
  token      text primary key,
  user_id    uuid not null references auth.users(id) on delete cascade,
  platform   text not null check (platform in ('ios', 'android')),
  updated_at timestamptz not null default now()
);
create index if not exists push_tokens_user on public.push_tokens (user_id);
alter table public.push_tokens enable row level security;
revoke all on public.push_tokens from anon, authenticated;

create or replace function public.register_push_token(p_token text, p_platform text)
returns void language plpgsql security definer set search_path = public, pg_temp as $$
declare v_uid uuid := auth.uid();
begin
  if v_uid is null then raise exception 'not_authenticated'; end if;
  if p_platform not in ('ios', 'android') or p_token !~ '^Expo(nent)?PushToken\[[A-Za-z0-9_-]+\]$' then
    raise exception 'invalid_token';
  end if;
  insert into public.push_tokens (token, user_id, platform) values (p_token, v_uid, p_platform)
    on conflict (token) do update set user_id = excluded.user_id, platform = excluded.platform, updated_at = now();
end $$;

create or replace function public.unregister_push_token(p_token text)
returns void language plpgsql security definer set search_path = public, pg_temp as $$
begin
  if auth.uid() is null then raise exception 'not_authenticated'; end if;
  delete from public.push_tokens where token = p_token and user_id = auth.uid();
end $$;

-- Paramètres privés (URL des fonctions + secret de webhook), jamais lisibles côté client.
create table if not exists public.private_settings (key text primary key, value text not null);
alter table public.private_settings enable row level security;
revoke all on public.private_settings from anon, authenticated;

create or replace function public._call_edge(p_fn text, p_payload jsonb)
returns void language plpgsql security definer set search_path = public, pg_temp as $$
declare v_url text; v_secret text;
begin
  select value into v_url from public.private_settings where key = 'functions_url';
  select value into v_secret from public.private_settings where key = 'webhook_secret';
  if v_url is null or v_secret is null then return; end if;
  perform net.http_post(
    url := v_url || '/' || p_fn,
    body := p_payload,
    headers := jsonb_build_object('Content-Type', 'application/json', 'x-webhook-secret', v_secret)
  );
exception when others then
  return; -- une notification manquée ne doit jamais bloquer une écriture
end $$;

-- Un seul « ami a posté » par créneau et par jour.
create table if not exists public.social_notif_log (
  user_id   uuid not null references auth.users(id) on delete cascade,
  day       date not null,
  meal_type text not null,
  primary key (user_id, day, meal_type)
);
alter table public.social_notif_log enable row level security;
revoke all on public.social_notif_log from anon, authenticated;

create or replace function public._on_friendship_change()
returns trigger language plpgsql security definer set search_path = public, pg_temp as $$
begin
  if tg_op = 'INSERT' and new.status = 'pending' then
    perform public._call_edge('notify', jsonb_build_object('event', 'friend_request',
      'from', new.requester_id, 'to', new.addressee_id));
  elsif tg_op = 'UPDATE' and old.status = 'pending' and new.status = 'accepted' then
    perform public._call_edge('notify', jsonb_build_object('event', 'friend_accepted',
      'from', new.addressee_id, 'to', new.requester_id));
  end if;
  return new;
end $$;
drop trigger if exists friendships_notify on public.friendships;
create trigger friendships_notify after insert or update of status on public.friendships
  for each row execute function public._on_friendship_change();

create or replace function public._on_meal_shared()
returns trigger language plpgsql security definer set search_path = public, pg_temp as $$
declare v_day date := new.consumed_at::date; ins int;
begin
  if not new.shared or new.meal_type not in ('dejeuner', 'diner') then return new; end if;
  if tg_op = 'UPDATE' and old.shared then return new; end if;
  insert into public.social_notif_log (user_id, day, meal_type) values (new.user_id, v_day, new.meal_type)
    on conflict do nothing;
  get diagnostics ins = row_count;
  if ins > 0 then
    perform public._call_edge('notify', jsonb_build_object('event', 'friend_meal',
      'from', new.user_id, 'meal_id', new.id, 'meal_type', new.meal_type));
  end if;
  return new;
end $$;
drop trigger if exists consumed_meals_notify on public.consumed_meals;
create trigger consumed_meals_notify after insert or update of shared on public.consumed_meals
  for each row execute function public._on_meal_shared();

-- 8. PHOTOS : bucket privé + droits de lecture limités aux amis du propriétaire.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('meal-photos', 'meal-photos', false, 1048576, array['image/jpeg'])
on conflict (id) do update set public = false, file_size_limit = 1048576, allowed_mime_types = array['image/jpeg'];

create or replace function public.can_read_meal_photo(p_name text)
returns boolean language sql stable security definer set search_path = public, pg_temp as $$
  select auth.uid() is not null and (
    split_part(p_name, '/', 1) = auth.uid()::text
    or exists (
      select 1 from public.consumed_meals m
      where m.shared and (m.photo_path = p_name or m.thumb_path = p_name)
        and (m.photo_expires_at is null or m.photo_expires_at > now())
        and public._friends(m.user_id, auth.uid()) and not public._blocked(m.user_id, auth.uid())
    )
  )
$$;

drop policy if exists "meal photos read" on storage.objects;
create policy "meal photos read" on storage.objects for select to authenticated
  using (bucket_id = 'meal-photos' and public.can_read_meal_photo(name));
drop policy if exists "meal photos insert own" on storage.objects;
create policy "meal photos insert own" on storage.objects for insert to authenticated
  with check (bucket_id = 'meal-photos' and (storage.foldername(name))[1] = auth.uid()::text);
drop policy if exists "meal photos update own" on storage.objects;
create policy "meal photos update own" on storage.objects for update to authenticated
  using (bucket_id = 'meal-photos' and (storage.foldername(name))[1] = auth.uid()::text)
  with check (bucket_id = 'meal-photos' and (storage.foldername(name))[1] = auth.uid()::text);
drop policy if exists "meal photos delete own" on storage.objects;
create policy "meal photos delete own" on storage.objects for delete to authenticated
  using (bucket_id = 'meal-photos' and (storage.foldername(name))[1] = auth.uid()::text);

-- 9. DROITS D'EXÉCUTION : rien pour public/anon ; le client n'appelle que les RPC listées.
do $$
declare r record;
begin
  for r in
    select p.oid::regprocedure as sig
    from pg_proc p join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public' and p.proname in (
      '_effective_plan','_week_start','_next_reset','_ai_status','consume_ai','refund_ai','_rate_ok',
      '_username_problem','_blocked','_friends','_user_by_name','_can_view_meal','_display_name','_scores',
      '_call_edge','_on_friendship_change','_on_meal_shared','set_photo_expiry','ensure_account','my_ai_status',
      'username_available','set_username','search_users','friend_request_send','friend_request_cancel',
      'friend_request_respond','friend_remove','user_block','user_unblock','friends_overview','profile_summary',
      'user_shared_meals','feed_page','meal_react','meal_comment_add','meal_comment_delete','meal_comments_list',
      'meal_hide','report_create','register_push_token','unregister_push_token','can_read_meal_photo')
  loop
    execute format('revoke all on function %s from public, anon, authenticated', r.sig);
  end loop;
end $$;

grant execute on function
  public.ensure_account(), public.my_ai_status(), public.username_available(text), public.set_username(text),
  public.search_users(text), public.friend_request_send(text), public.friend_request_cancel(text),
  public.friend_request_respond(text, boolean), public.friend_remove(text), public.user_block(text),
  public.user_unblock(text), public.friends_overview(), public.profile_summary(text),
  public.user_shared_meals(text, timestamp, int), public.feed_page(timestamp, uuid, int),
  public.meal_react(uuid, text), public.meal_comment_add(uuid, text), public.meal_comment_delete(uuid),
  public.meal_comments_list(uuid, int), public.meal_hide(uuid), public.report_create(uuid, uuid, text, text),
  public.register_push_token(text, text), public.unregister_push_token(text), public.can_read_meal_photo(text)
  to authenticated;
grant execute on function public.consume_ai(uuid, text), public.refund_ai(uuid, text, date) to service_role;

-- 10. PURGE NOCTURNE DES PHOTOS (extensions pg_cron + pg_net, à activer dans Database > Extensions).
--     Le bloc ne plante pas si elles sont absentes : relance ce script après les avoir activées.
do $$
begin
  create extension if not exists pg_net with schema extensions;
  create extension if not exists pg_cron;
  perform cron.unschedule(jobid) from cron.job where jobname = 'kalzo-purge-photos';
  perform cron.schedule('kalzo-purge-photos', '15 3 * * *',
    $cron$select public._call_edge('purge-photos', '{}'::jsonb)$cron$);
exception when others then
  raise notice 'pg_cron / pg_net indisponibles (%). Active-les puis relance ce script.', sqlerrm;
end $$;

-- ============================================================================
-- APRÈS ce script, une seule fois (valeurs à remplacer) :
--   insert into public.private_settings (key, value) values
--     ('functions_url', 'https://<ref-projet>.supabase.co/functions/v1'),
--     ('webhook_secret', '<le même secret que WEBHOOK_SECRET des Edge Functions>')
--   on conflict (key) do update set value = excluded.value;
-- Puis : Dashboard > Security Advisor et Performance Advisor, et corriger les alertes.
-- ============================================================================
