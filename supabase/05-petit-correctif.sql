-- Kalzo — petit correctif signalé par le Security Advisor : fixe le chemin de recherche de _display_name.
alter function public._display_name(public.profiles) set search_path = public, pg_temp;
