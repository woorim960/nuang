begin;

-- PostgreSQL grants EXECUTE on new functions to PUBLIC by default. A
-- per-schema REVOKE cannot remove that built-in global grant, so remove it
-- from the postgres creator role globally. Consent functions grant EXECUTE to
-- their intended runtime roles explicitly in the migration that creates them.
alter default privileges for role postgres
  revoke all on functions from public, anon, authenticated;

-- Per-schema defaults are additive. Remove any consent-specific grants that
-- may have been introduced independently of the global defaults.
alter default privileges for role postgres in schema consent
  revoke all on tables from public, anon, authenticated;
alter default privileges for role postgres in schema consent
  revoke all on sequences from public, anon, authenticated;
alter default privileges for role postgres in schema consent
  revoke all on functions from public, anon, authenticated;

do $consent_default_privileges_guard$
declare
  v_postgres_oid oid;
  v_consent_oid oid;
  v_anon_oid oid;
  v_authenticated_oid oid;
  v_forbidden_grant_count bigint;
  v_forbidden_grants text;
begin
  select role.oid
  into v_postgres_oid
  from pg_catalog.pg_roles role
  where role.rolname = 'postgres';

  select namespace.oid
  into v_consent_oid
  from pg_catalog.pg_namespace namespace
  where namespace.nspname = 'consent';

  select role.oid
  into v_anon_oid
  from pg_catalog.pg_roles role
  where role.rolname = 'anon';

  select role.oid
  into v_authenticated_oid
  from pg_catalog.pg_roles role
  where role.rolname = 'authenticated';

  if v_postgres_oid is null
    or v_consent_oid is null
    or v_anon_oid is null
    or v_authenticated_oid is null then
    raise exception
      'consent default privilege guard requires postgres, anon, authenticated and the consent schema';
  end if;

  with object_kind(object_type, object_label) as (
    values
      ('r'::"char", 'table'),
      ('S'::"char", 'sequence'),
      ('f'::"char", 'function')
  ),
  global_default_acl as (
    select
      object_kind.object_label,
      coalesce(
        default_acl.defaclacl,
        pg_catalog.acldefault(object_kind.object_type, v_postgres_oid)
      ) as acl
    from object_kind
    left join pg_catalog.pg_default_acl default_acl
      on default_acl.defaclrole = v_postgres_oid
      and default_acl.defaclnamespace = 0::oid
      and default_acl.defaclobjtype = object_kind.object_type
  ),
  consent_schema_default_acl as (
    select
      object_kind.object_label,
      default_acl.defaclacl as acl
    from object_kind
    join pg_catalog.pg_default_acl default_acl
      on default_acl.defaclrole = v_postgres_oid
      and default_acl.defaclnamespace = v_consent_oid
      and default_acl.defaclobjtype = object_kind.object_type
  ),
  effective_default_grant as (
    select
      'global'::text as grant_scope,
      global_default_acl.object_label,
      grant_acl.grantee,
      grant_acl.privilege_type
    from global_default_acl
    cross join lateral pg_catalog.aclexplode(global_default_acl.acl) grant_acl

    union all

    select
      'consent'::text as grant_scope,
      consent_schema_default_acl.object_label,
      grant_acl.grantee,
      grant_acl.privilege_type
    from consent_schema_default_acl
    cross join lateral pg_catalog.aclexplode(consent_schema_default_acl.acl) grant_acl
  )
  select
    count(*),
    string_agg(
      format(
        '%s/%s/%s/%s',
        grant_scope,
        object_label,
        case
          when grantee = 0::oid then 'PUBLIC'
          else pg_catalog.pg_get_userbyid(grantee)
        end,
        privilege_type
      ),
      ', '
      order by grant_scope, object_label, grantee, privilege_type
    )
  into v_forbidden_grant_count, v_forbidden_grants
  from effective_default_grant
  where grantee in (0::oid, v_anon_oid, v_authenticated_oid);

  if v_forbidden_grant_count <> 0 then
    raise exception
      'consent default privilege guard found forbidden grants: %',
      v_forbidden_grants
      using errcode = '42501';
  end if;
end;
$consent_default_privileges_guard$;

commit;
