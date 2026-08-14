begin;

create or replace function public.get_admin_trait_map_content_dashboard()
returns jsonb
language sql
stable
security definer
set search_path = trait_map, public
as $$
  select jsonb_build_object(
    'releases',
    coalesce((
      select jsonb_agg(
        jsonb_build_object(
          'releaseId', release.release_id,
          'contractVersion', release.contract_version,
          'codeSchemeVersion', release.code_scheme_version,
          'profileNameReleaseId', release.profile_name_release_id,
          'status', release.status,
          'createdAt', release.created_at,
          'updatedAt', release.updated_at,
          'inventory', jsonb_build_object(
            'axes', (select count(*) from trait_map.axis_definition item where item.release_id = release.release_id),
            'facets', (select count(*) from trait_map.facet_definition item where item.release_id = release.release_id),
            'profiles', (select count(*) from trait_map.role_profile item where item.release_id = release.release_id),
            'atoms', (select count(*) from trait_map.content_atom item where item.release_id = release.release_id)
          ),
          'atomCounts', coalesce((
            select jsonb_object_agg(state.publication_state, state.item_count)
            from (
              select atom.publication_state, count(*) as item_count
              from trait_map.content_atom atom
              where atom.release_id = release.release_id
              group by atom.publication_state
            ) state
          ), '{}'::jsonb),
          'reviewCounts', coalesce((
            select jsonb_object_agg(state.status, state.item_count)
            from (
              select review.status, count(*) as item_count
              from trait_map.content_review review
              where review.release_id = release.release_id
              group by review.status
            ) state
          ), '{}'::jsonb)
        )
        order by release.created_at desc
      )
      from trait_map.content_release release
    ), '[]'::jsonb),
    'reviews',
    coalesce((
      select jsonb_agg(
        jsonb_build_object(
          'releaseId', review.release_id,
          'atomId', review.atom_id,
          'atomVersion', review.atom_version,
          'reviewRole', review.review_role,
          'reviewStatus', review.status,
          'updatedAt', review.updated_at,
          'atomState', atom.publication_state,
          'entityRef', atom.entity_ref,
          'slot', atom.slot,
          'copyShort', atom.copy_short
        )
        order by
          case review.status
            when 'changes_requested' then 0
            when 'in_review' then 1
            when 'not_started' then 2
            else 3
          end,
          review.updated_at desc
      )
      from trait_map.content_review review
      join trait_map.content_atom atom
        on atom.release_id = review.release_id
       and atom.atom_id = review.atom_id
       and atom.version = review.atom_version
    ), '[]'::jsonb)
  );
$$;

revoke all on function public.get_admin_trait_map_content_dashboard()
from public, anon, authenticated;
grant execute on function public.get_admin_trait_map_content_dashboard()
to service_role;

create or replace function public.admin_manage_trait_map_content(
  target_action text,
  target_release_id text,
  target_atom_id text default null,
  target_atom_version integer default null,
  target_review_role text default null,
  target_reviewer_ref text default null
)
returns jsonb
language plpgsql
security definer
set search_path = trait_map, public
as $$
declare
  affected_count integer;
  axis_count integer;
  facet_count integer;
  profile_count integer;
  atom_count integer;
  approved_atom_count integer;
begin
  if target_action = 'start_release_review' then
    update trait_map.content_release
    set status = 'in_review', updated_at = now()
    where release_id = target_release_id and status = 'draft';
    get diagnostics affected_count = row_count;
    if affected_count <> 1 then
      raise exception 'release_not_draft';
    end if;

  elsif target_action = 'approve_release' then
    select count(*) into axis_count
    from trait_map.axis_definition where release_id = target_release_id;
    select count(*) into facet_count
    from trait_map.facet_definition where release_id = target_release_id;
    select count(*) into profile_count
    from trait_map.role_profile where release_id = target_release_id;
    select count(*) into atom_count
    from trait_map.content_atom where release_id = target_release_id;
    select count(*) into approved_atom_count
    from trait_map.content_atom
    where release_id = target_release_id and publication_state = 'approved';

    if axis_count <> 5 or facet_count <> 10 or profile_count <> 32
       or atom_count = 0 or approved_atom_count <> atom_count then
      raise exception 'release_not_ready';
    end if;

    update trait_map.content_release
    set status = 'approved', updated_at = now()
    where release_id = target_release_id and status in ('draft', 'in_review');
    get diagnostics affected_count = row_count;
    if affected_count <> 1 then
      raise exception 'release_not_reviewable';
    end if;

  elsif target_action = 'publish_release' then
    perform trait_map.publish_content_release(target_release_id);

  elsif target_action = 'approve_atom' then
    update trait_map.content_atom
    set publication_state = 'approved', updated_at = now()
    where release_id = target_release_id
      and atom_id = target_atom_id
      and version = target_atom_version;
    get diagnostics affected_count = row_count;
    if affected_count <> 1 then
      raise exception 'atom_not_found';
    end if;

  elsif target_action in ('pass_review', 'request_changes') then
    update trait_map.content_review
    set
      status = case
        when target_action = 'pass_review' then 'passed'
        else 'changes_requested'
      end,
      reviewer_ref = target_reviewer_ref,
      reviewed_at = now(),
      updated_at = now()
    where release_id = target_release_id
      and atom_id = target_atom_id
      and atom_version = target_atom_version
      and review_role = target_review_role;
    get diagnostics affected_count = row_count;
    if affected_count <> 1 then
      raise exception 'review_not_found';
    end if;

  else
    raise exception 'unsupported_admin_content_action';
  end if;

  return jsonb_build_object('ok', true);
end;
$$;

revoke all on function public.admin_manage_trait_map_content(
  text, text, text, integer, text, text
) from public, anon, authenticated;
grant execute on function public.admin_manage_trait_map_content(
  text, text, text, integer, text, text
) to service_role;

commit;
