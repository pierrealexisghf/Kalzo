-- ============================================================================
-- Kalzo — 07 : durée de vie des repas postés.
--   • FIL : un repas posté n'y reste que 48 h (sinon le fil est interminable) ;
--   • PROFIL (le mien et celui d'un ami) : 7 jours, puis le repas disparaît du profil ;
--   • sa photo, ses réactions et ses commentaires sont alors SUPPRIMÉS (la photo : 7 jours après la publication
--     au lieu de 30, via la purge nocturne existante ; le reste : purge_expired_post_data, chaque nuit à 03:30) ;
--   • le repas lui-même (valeurs, étoiles) RESTE dans le journal privé, et les flammes (jours postés) ne bougent pas.
-- Les durées se comptent depuis le moment où le repas est POSTÉ (colonne shared_at), pas depuis l'heure du repas.
-- Peut être relancé sans danger.
-- ============================================================================

-- 1. Moment de publication
alter table public.consumed_meals add column if not exists shared_at timestamptz;
update public.consumed_meals set shared_at = (consumed_at at time zone 'UTC') where shared and shared_at is null;
create index if not exists consumed_meals_shared_at on public.consumed_meals (shared_at) where shared;

create or replace function public.set_shared_at()
returns trigger language plpgsql set search_path = public, pg_temp as $$
begin
  if new.shared and (tg_op = 'INSERT' or not coalesce(old.shared, false)) then
    new.shared_at := now();
  end if;
  return new;
end $$;
drop trigger if exists consumed_meals_a_shared_at on public.consumed_meals;
-- « a_ » : doit s'exécuter AVANT le calcul de l'expiration de la photo (ordre alphabétique des déclencheurs).
create trigger consumed_meals_a_shared_at
  before insert or update of shared on public.consumed_meals
  for each row execute function public.set_shared_at();

-- 2. Expiration de la photo : 30 jours après le repas, ou 7 jours après la publication si le repas est posté (le plus court).
create or replace function public.set_photo_expiry()
returns trigger language plpgsql set search_path = public, pg_temp as $$
declare v_fin timestamptz;
begin
  if new.photo_path is null and new.thumb_path is null then
    return new;
  end if;
  v_fin := (new.consumed_at at time zone 'UTC') + interval '30 days';
  if new.shared then
    v_fin := least(v_fin, coalesce(new.shared_at, now()) + interval '7 days');
  end if;
  new.photo_expires_at := v_fin;
  return new;
end $$;
drop trigger if exists consumed_meals_photo_expiry on public.consumed_meals;
create trigger consumed_meals_photo_expiry
  before insert or update of photo_path, thumb_path, shared on public.consumed_meals
  for each row execute function public.set_photo_expiry();

-- Repas déjà postés : leur photo suit la nouvelle règle (la purge nocturne supprimera les fichiers trop anciens).
update public.consumed_meals
   set photo_expires_at = least(photo_expires_at, coalesce(shared_at, consumed_at at time zone 'UTC') + interval '7 days')
 where shared and (photo_path is not null or thumb_path is not null) and photo_expires_at is not null;

-- 3. Qui voit quoi, et combien de temps
create or replace function public._can_view_meal(p_meal uuid, p_viewer uuid)
returns boolean language sql stable security definer set search_path = public, pg_temp as $$
  select exists (
    select 1 from public.consumed_meals m
    where m.id = p_meal
      and (m.user_id = p_viewer
           or (m.shared and coalesce(m.shared_at, m.consumed_at at time zone 'UTC') >= now() - interval '7 days' and public._friends(m.user_id, p_viewer) and not public._blocked(m.user_id, p_viewer)))
  )
$$;
create or replace function public.can_read_meal_photo(p_name text)
returns boolean language sql stable security definer set search_path = public, pg_temp as $$
  select auth.uid() is not null and (
    split_part(p_name, '/', 1) = auth.uid()::text
    or exists (
      select 1 from public.consumed_meals m
      where m.shared and coalesce(m.shared_at, m.consumed_at at time zone 'UTC') >= now() - interval '7 days' and (m.photo_path = p_name or m.thumb_path = p_name)
        and (m.photo_expires_at is null or m.photo_expires_at > now())
        and public._friends(m.user_id, auth.uid()) and not public._blocked(m.user_id, auth.uid())
    )
  )
$$;
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
    where m.user_id = v_o and m.shared and coalesce(m.shared_at, m.consumed_at at time zone 'UTC') >= now() - interval '7 days' and (p_before is null or m.consumed_at < p_before)
    order by m.consumed_at desc, m.id desc
    limit least(greatest(coalesce(p_limit, 24), 1), 60);
end $$;
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
    where m.shared and coalesce(m.shared_at, m.consumed_at at time zone 'UTC') >= now() - interval '48 hours'
      and (m.user_id = v_uid
           or (public._friends(m.user_id, v_uid) and not public._blocked(m.user_id, v_uid)))
      and not exists (select 1 from public.meal_hides h where h.user_id = v_uid and h.meal_id = m.id)
      and (p_before is null or (m.consumed_at, m.id) < (p_before, coalesce(p_before_id, 'ffffffff-ffff-ffff-ffff-ffffffffffff'::uuid)))
    order by m.consumed_at desc, m.id desc
    limit least(greatest(coalesce(p_limit, 20), 1), 50);
end $$;

-- 4. Nettoyage nocturne : réactions, commentaires et masquages des repas postés depuis plus de 7 jours.
create or replace function public.purge_expired_post_data()
returns void language sql security definer set search_path = public, pg_temp as $$
  delete from public.meal_comments where meal_id in (
    select id from public.consumed_meals where shared and coalesce(shared_at, consumed_at at time zone 'UTC') < now() - interval '7 days');
  delete from public.meal_reactions where meal_id in (
    select id from public.consumed_meals where shared and coalesce(shared_at, consumed_at at time zone 'UTC') < now() - interval '7 days');
  delete from public.meal_hides where meal_id in (
    select id from public.consumed_meals where shared and coalesce(shared_at, consumed_at at time zone 'UTC') < now() - interval '7 days');
$$;
revoke all on function public.purge_expired_post_data() from public, anon, authenticated;
grant execute on function public.purge_expired_post_data() to service_role;

do $$
begin
  create extension if not exists pg_cron;
  perform cron.unschedule(jobid) from cron.job where jobname = 'kalzo-purge-posts';
  perform cron.schedule('kalzo-purge-posts', '30 3 * * *', $cron$select public.purge_expired_post_data()$cron$);
exception when others then
  raise notice 'pg_cron indisponible (%). Active-le puis relance ce script.', sqlerrm;
end $$;

-- Rappel : les nouvelles versions des fonctions ci-dessus gardent les droits d'exécution déjà posés par 03-social.sql.
