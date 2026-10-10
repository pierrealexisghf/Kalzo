-- ============================================================================
-- Kalzo — durcissement de la base, ÉTAPE 1 (sans risque pour la version en ligne)
-- À coller dans le SQL Editor du projet NutriFlow. Peut être relancé sans danger.
-- ============================================================================

-- 1. Les visiteurs non connectés (anon) n'ont besoin d'aucun accès aux tables.
revoke all on all tables in schema public from anon;
alter default privileges in schema public revoke all on tables from anon;

-- 2. Les utilisateurs connectés n'ont pas besoin de TRUNCATE / REFERENCES / TRIGGER.
revoke truncate, references, trigger on all tables in schema public from authenticated;

-- 3. PROFILES : un utilisateur ne doit PAS pouvoir modifier plan, abonnement, etc.
--    On n'autorise l'écriture que sur les colonnes de profil sportif/nutrition.
revoke insert, update, delete on public.profiles from authenticated;

grant insert (id, email, weight, height, age, gender, activity, goal,
              kcal, prot, gluc, lip, weight_goal, weight_entries, current_plan)
  on public.profiles to authenticated;
grant update (id, email, weight, height, age, gender, activity, goal,
              kcal, prot, gluc, lip, weight_goal, weight_entries, current_plan)
  on public.profiles to authenticated;

drop policy if exists "User sees own profile"        on public.profiles;
drop policy if exists "Users can read own profile"   on public.profiles;
drop policy if exists "Users can update own profile" on public.profiles;
drop policy if exists profiles_select_own on public.profiles;
drop policy if exists profiles_insert_own on public.profiles;
drop policy if exists profiles_update_own on public.profiles;

create policy profiles_select_own on public.profiles
  for select to authenticated using (auth.uid() = id);
create policy profiles_insert_own on public.profiles
  for insert to authenticated with check (auth.uid() = id);
create policy profiles_update_own on public.profiles
  for update to authenticated using (auth.uid() = id) with check (auth.uid() = id);

-- 4. TRANSACTIONS : lecture seule pour l'utilisateur (écriture réservée au serveur).
revoke insert, update, delete on public.transactions from authenticated;
drop policy if exists "User sees own transactions" on public.transactions;
drop policy if exists transactions_select_own on public.transactions;
create policy transactions_select_own on public.transactions
  for select to authenticated using (auth.uid() = user_id);

-- 5. Repas / sport / hydratation : mêmes règles, mais réservées aux connectés.
drop policy if exists "User can delete own meals"  on public.consumed_meals;
drop policy if exists "User can insert own meals"  on public.consumed_meals;
drop policy if exists "User can select own meals"  on public.consumed_meals;
drop policy if exists meals_select_own on public.consumed_meals;
drop policy if exists meals_insert_own on public.consumed_meals;
drop policy if exists meals_delete_own on public.consumed_meals;
create policy meals_select_own on public.consumed_meals
  for select to authenticated using (auth.uid() = user_id);
create policy meals_insert_own on public.consumed_meals
  for insert to authenticated with check (auth.uid() = user_id);
create policy meals_delete_own on public.consumed_meals
  for delete to authenticated using (auth.uid() = user_id);

drop policy if exists "User can delete own sport" on public.sport_activities;
drop policy if exists "User can insert own sport" on public.sport_activities;
drop policy if exists "User can select own sport" on public.sport_activities;
drop policy if exists sport_select_own on public.sport_activities;
drop policy if exists sport_insert_own on public.sport_activities;
drop policy if exists sport_delete_own on public.sport_activities;
create policy sport_select_own on public.sport_activities
  for select to authenticated using (auth.uid() = user_id);
create policy sport_insert_own on public.sport_activities
  for insert to authenticated with check (auth.uid() = user_id);
create policy sport_delete_own on public.sport_activities
  for delete to authenticated using (auth.uid() = user_id);

drop policy if exists "Users can manage their own hydration" on public.hydration;
drop policy if exists hydration_own on public.hydration;
create policy hydration_own on public.hydration
  for all to authenticated
  using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- 6. Garde-fous sur les valeurs (NOT VALID = ne bloque pas les anciennes lignes).
alter table public.hydration drop constraint if exists hydration_ml_range;
alter table public.hydration add constraint hydration_ml_range
  check (ml between 0 and 20000 and goal between 500 and 10000) not valid;

alter table public.sport_activities drop constraint if exists sport_values_range;
alter table public.sport_activities add constraint sport_values_range
  check (duration between 0 and 1440 and kcal_burned between 0 and 10000) not valid;

alter table public.credits drop constraint if exists credits_non_negative;
alter table public.credits add constraint credits_non_negative
  check (balance >= 0) not valid;

-- 7. Les fonctions de déclencheur ne doivent pas être appelables depuis l'API.
revoke execute on function public.handle_new_user()    from public, anon, authenticated;
revoke execute on function public.handle_new_profile() from public, anon, authenticated;

-- 8. Nouveau : compteur d'usage IA + débit de crédit ATOMIQUE réservé au serveur.
create table if not exists public.ai_usage (
  user_id uuid not null,
  day     date not null default current_date,
  count   int  not null default 0,
  primary key (user_id, day)
);
alter table public.ai_usage enable row level security;
revoke all on public.ai_usage from anon, authenticated;

create or replace function public.debit_credit(p_user uuid, p_daily_cap int default 100)
returns jsonb
language plpgsql security definer set search_path = public as $$
declare
  v_plan text; v_status text; v_balance int; v_count int;
begin
  select plan, subscription_status into v_plan, v_status
    from public.profiles where id = p_user;

  insert into public.ai_usage (user_id, day, count) values (p_user, current_date, 1)
    on conflict (user_id, day) do update set count = public.ai_usage.count + 1
    returning count into v_count;

  if v_count > p_daily_cap then
    update public.ai_usage set count = count - 1
      where user_id = p_user and day = current_date;
    return jsonb_build_object('ok', false, 'reason', 'daily_cap');
  end if;

  if v_plan = 'vip' and v_status in ('active', 'trialing', 'cancelling') then
    return jsonb_build_object('ok', true, 'balance', null);
  end if;

  update public.credits set balance = balance - 1, updated_at = now()
    where user_id = p_user and balance > 0
    returning balance into v_balance;

  if not found then
    update public.ai_usage set count = count - 1
      where user_id = p_user and day = current_date;
    return jsonb_build_object('ok', false, 'reason', 'no_credits');
  end if;

  return jsonb_build_object('ok', true, 'balance', v_balance);
end $$;

create or replace function public.refund_credit(p_user uuid)
returns void
language plpgsql security definer set search_path = public as $$
declare v_plan text;
begin
  select plan into v_plan from public.profiles where id = p_user;
  if coalesce(v_plan, 'free') <> 'vip' then
    update public.credits set balance = balance + 1, updated_at = now()
      where user_id = p_user;
  end if;
  update public.ai_usage set count = greatest(count - 1, 0)
    where user_id = p_user and day = current_date;
end $$;

revoke execute on function public.debit_credit(uuid, int) from public, anon, authenticated;
revoke execute on function public.refund_credit(uuid)     from public, anon, authenticated;
grant  execute on function public.debit_credit(uuid, int) to service_role;
grant  execute on function public.refund_credit(uuid)     to service_role;
