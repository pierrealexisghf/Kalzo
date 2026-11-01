-- ============================================================================
-- Kalzo — 06 : les flammes comptent les jours où un repas est posté (plus la note).
-- Remplace la fonction interne _scores ; la moyenne sur 7 jours ne change pas.
-- Peut être relancé sans danger.
-- ============================================================================
create or replace function public._scores(p_user uuid, p_shared_only boolean)
returns jsonb language plpgsql stable security definer set search_path = public, pg_temp as $$
declare v_today date; v_avg numeric; v_streak int := 0; v_day date;
begin
  v_today := (now() at time zone coalesce((select timezone from public.profiles where id = p_user), 'Europe/Paris'))::date;
  select round(avg(stars)::numeric, 1) into v_avg from public.consumed_meals
    where user_id = p_user and stars is not null and (not p_shared_only or shared)
      and consumed_at >= v_today - 6;
  -- un jour compte s'il contient au moins un repas partagé (posté) ; la série d'hier reste valable
  v_day := case when exists (select 1 from public.consumed_meals where user_id = p_user and shared and consumed_at::date = v_today)
                then v_today else v_today - 1 end;
  while v_streak < 400 and exists (select 1 from public.consumed_meals where user_id = p_user and shared and consumed_at::date = v_day) loop
    v_streak := v_streak + 1;
    v_day := v_day - 1;
  end loop;
  return jsonb_build_object('avg7', v_avg, 'streak', v_streak);
end $$;
