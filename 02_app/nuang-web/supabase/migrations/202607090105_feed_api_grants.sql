grant usage on schema feed to anon, authenticated, service_role;

grant all on all tables in schema feed to anon, authenticated, service_role;

grant all on all routines in schema feed to anon, authenticated, service_role;

grant all on all sequences in schema feed to anon, authenticated, service_role;

notify pgrst, 'reload schema';
