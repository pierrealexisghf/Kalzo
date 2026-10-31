-- ============================================================================
-- Kalzo — 04 : photo de profil
-- Additif et sans risque : une colonne, un bucket public « avatars » (un dossier par utilisateur),
-- deux fonctions. Peut être relancé sans danger.
-- ============================================================================

alter table public.profiles add column if not exists avatar_path text;

-- Bucket public (une photo de profil est visible de tous les utilisateurs, comme le pseudo).
-- Chemin : <id utilisateur>/<horodatage>.jpg ; seul le propriétaire du dossier peut écrire.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('avatars', 'avatars', true, 512000, array['image/jpeg'])
on conflict (id) do update set public = true, file_size_limit = 512000, allowed_mime_types = array['image/jpeg'];

drop policy if exists "avatars insert own" on storage.objects;
create policy "avatars insert own" on storage.objects for insert to authenticated
  with check (bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text);
drop policy if exists "avatars update own" on storage.objects;
create policy "avatars update own" on storage.objects for update to authenticated
  using (bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text)
  with check (bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text);
drop policy if exists "avatars delete own" on storage.objects;
create policy "avatars delete own" on storage.objects for delete to authenticated
  using (bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text);

-- Enregistre (ou retire, avec null) la photo de profil de l'utilisateur connecté.
create or replace function public.set_avatar(p_path text)
returns jsonb language plpgsql security definer set search_path = public, pg_temp as $$
declare v_uid uuid := auth.uid();
begin
  if v_uid is null then raise exception 'not_authenticated'; end if;
  if not public._rate_ok(v_uid, 'set_avatar', 20, interval '1 hour') then raise exception 'rate_limited'; end if;
  if p_path is not null and (split_part(p_path, '/', 1) <> v_uid::text or p_path !~ '^[0-9a-f-]{36}/[0-9]+\.jpg$') then
    raise exception 'forbidden';
  end if;
  update public.profiles set avatar_path = p_path where id = v_uid;
  return jsonb_build_object('ok', true, 'avatar_path', p_path);
end $$;

-- Photos de profil d'une liste de pseudos (soi-même et les autres, sauf blocages).
create or replace function public.avatars_for(p_usernames text[])
returns table (username text, avatar_path text)
language plpgsql stable security definer set search_path = public, pg_temp as $$
declare v_uid uuid := auth.uid();
begin
  if v_uid is null then raise exception 'not_authenticated'; end if;
  return query
    select p.username, p.avatar_path from public.profiles p
    where lower(p.username) = any (select lower(x) from unnest(p_usernames[1:100]) x)
      and p.avatar_path is not null
      and (p.id = v_uid or not public._blocked(p.id, v_uid));
end $$;

revoke all on function public.set_avatar(text) from public, anon;
revoke all on function public.avatars_for(text[]) from public, anon;
grant execute on function public.set_avatar(text) to authenticated;
grant execute on function public.avatars_for(text[]) to authenticated;
