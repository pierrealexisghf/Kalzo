-- ============================================================================
-- Kalzo — durcissement de la base, ÉTAPE 2 (à lancer AU MOMENT de la mise en ligne
-- de la nouvelle version : l'ancienne version de l'app cesserait de fonctionner
-- pour les crédits, car elle les débitait depuis le navigateur).
-- ============================================================================

-- 1. Les crédits ne peuvent plus être modifiés que par le serveur.
revoke insert, update, delete on public.credits from authenticated;
drop policy if exists "User sees own credits" on public.credits;
drop policy if exists credits_select_own on public.credits;
create policy credits_select_own on public.credits
  for select to authenticated using (auth.uid() = user_id);

create unique index if not exists credits_user_id_key on public.credits (user_id);

-- 2. Crédits offerts à l'inscription : 10, attribués dès la création du compte
--    (et non plus à la création du profil). Sans risque pour l'inscription :
--    en cas d'erreur la fonction laisse passer.
create or replace function public.handle_new_user()
returns trigger
language plpgsql security definer set search_path = public as $$
begin
  insert into public.credits (user_id, balance)
  values (new.id, 10)
  on conflict (user_id) do nothing;
  return new;
exception when others then
  return new;
end $$;

revoke execute on function public.handle_new_user() from public, anon, authenticated;

drop trigger if exists on_profile_created on public.profiles;
drop function if exists public.handle_new_profile();

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();
