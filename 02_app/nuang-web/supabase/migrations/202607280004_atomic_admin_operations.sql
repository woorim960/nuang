begin;

create or replace function public.admin_apply_community_moderation(
  target_admin_account_id uuid,
  target_action text,
  target_id uuid
)
returns jsonb
language plpgsql
security definer
set search_path = pg_catalog, public, feed, profile, identity, audit
as $$
declare
  v_now timestamptz := now();
  v_report record;
  v_post record;
  v_target_id uuid;
  v_target_table text;
  v_previous_status text;
  v_next_status text;
  v_affected integer;
  v_metadata jsonb := '{}'::jsonb;
begin
  if target_admin_account_id is null or not exists (
    select 1
    from identity.account
    where id = target_admin_account_id
      and status = 'active'
      and deleted_at is null
  ) then
    raise exception 'active_admin_account_required';
  end if;

  if target_action in (
    'start_report_review',
    'dismiss_report',
    'hide_reported_profile'
  ) then
    select id, target_account_id, status
    into v_report
    from feed.profile_report
    where id = target_id
    for update;
    if not found then raise exception 'profile_report_not_found'; end if;

    v_previous_status := v_report.status;
    v_next_status := case
      when target_action = 'start_report_review' then 'in_review'
      when target_action = 'dismiss_report' then 'dismissed'
      else 'resolved'
    end;

    update feed.profile_report
    set
      status = v_next_status,
      reviewed_at = v_now,
      resolved_at = case
        when v_next_status = 'in_review' then null
        else v_now
      end
    where id = target_id;

    if target_action = 'hide_reported_profile' then
      update profile.community_profile
      set status = 'hidden', updated_at = v_now
      where account_id = v_report.target_account_id
        and deleted_at is null;
    end if;

    v_target_table := 'feed.profile_report';
    v_metadata := jsonb_build_object(
      'previousStatus', v_previous_status,
      'nextStatus', v_next_status,
      'targetAccountId', v_report.target_account_id
    );

  elsif target_action in (
    'start_content_report_review',
    'dismiss_content_report',
    'hide_reported_content'
  ) then
    select id, post_id, comment_id, status
    into v_report
    from feed.content_report
    where id = target_id
    for update;
    if not found then raise exception 'content_report_not_found'; end if;

    v_previous_status := v_report.status;
    v_next_status := case
      when target_action = 'start_content_report_review' then 'in_review'
      when target_action = 'dismiss_content_report' then 'dismissed'
      else 'resolved'
    end;

    update feed.content_report
    set
      status = v_next_status,
      reviewed_at = v_now,
      resolved_at = case
        when v_next_status = 'in_review' then null
        else v_now
      end,
      resolved_by_account_id = case
        when v_next_status = 'in_review' then null
        else target_admin_account_id
      end
    where id = target_id;

    if target_action = 'hide_reported_content' then
      if v_report.comment_id is not null then
        update feed.feed_comment
        set moderation_status = 'removed', removed_at = v_now
        where id = v_report.comment_id
          and deleted_at is null;
        v_target_id := v_report.comment_id;
      else
        update feed.feed_post
        set moderation_status = 'removed', removed_at = v_now
        where id = v_report.post_id
          and deleted_at is null;
        v_target_id := v_report.post_id;
      end if;
    else
      v_target_id := coalesce(v_report.comment_id, v_report.post_id);
    end if;

    v_target_table := 'feed.content_report';
    v_metadata := jsonb_build_object(
      'previousStatus', v_previous_status,
      'nextStatus', v_next_status,
      'targetId', v_target_id,
      'targetType', case
        when v_report.comment_id is not null then 'comment'
        else 'post'
      end
    );

  elsif target_action in ('publish_post', 'limit_post', 'remove_post') then
    select id, moderation_status, published_at
    into v_post
    from feed.feed_post
    where id = target_id
      and deleted_at is null
    for update;
    if not found then raise exception 'feed_post_not_found'; end if;

    v_previous_status := v_post.moderation_status;
    if target_action = 'publish_post'
       and v_previous_status not in ('pending_review', 'limited') then
      raise exception 'feed_post_not_publishable';
    elsif target_action = 'limit_post'
       and v_previous_status not in ('pending_review', 'published') then
      raise exception 'feed_post_not_limitable';
    elsif target_action = 'remove_post'
       and v_previous_status not in ('pending_review', 'published', 'limited') then
      raise exception 'feed_post_not_removable';
    end if;

    v_next_status := case
      when target_action = 'publish_post' then 'published'
      when target_action = 'limit_post' then 'limited'
      else 'removed'
    end;

    update feed.feed_post
    set
      moderation_status = v_next_status,
      published_at = case
        when v_next_status = 'published' then coalesce(published_at, v_now)
        else published_at
      end,
      limited_at = case
        when v_next_status = 'limited' then v_now
        when v_next_status = 'published' then null
        else limited_at
      end,
      removed_at = case
        when v_next_status = 'removed' then v_now
        when v_next_status = 'published' then null
        else removed_at
      end
    where id = target_id;

    v_target_table := 'feed.feed_post';
    v_metadata := jsonb_build_object(
      'previousStatus', v_previous_status,
      'nextStatus', v_next_status
    );
  else
    raise exception 'unsupported_community_moderation_action';
  end if;

  insert into audit.admin_audit_log (
    action,
    admin_account_id,
    metadata,
    target_id,
    target_table
  )
  values (
    target_action,
    target_admin_account_id,
    v_metadata || jsonb_build_object('source', 'admin_community'),
    target_id,
    v_target_table
  );

  get diagnostics v_affected = row_count;
  if v_affected <> 1 then raise exception 'admin_audit_write_failed'; end if;

  return jsonb_build_object(
    'ok', true,
    'targetId', target_id,
    'targetTable', v_target_table
  );
end;
$$;

create or replace function public.admin_review_external_link(
  target_admin_account_id uuid,
  target_action text,
  target_link_id uuid
)
returns jsonb
language plpgsql
security definer
set search_path = pg_catalog, public, feed, identity, audit
as $$
declare
  v_link record;
  v_policy_id uuid;
  v_next_status text;
  v_policy_status text;
  v_now timestamptz := now();
  v_affected integer;
begin
  if target_admin_account_id is null or not exists (
    select 1
    from identity.account
    where id = target_admin_account_id
      and status = 'active'
      and deleted_at is null
  ) then
    raise exception 'active_admin_account_required';
  end if;

  select id, hostname, review_status, normalized_url
  into v_link
  from feed.feed_external_link
  where id = target_link_id
  for update;
  if not found then raise exception 'external_link_not_found'; end if;

  v_next_status := case
    when target_action = 'approve_link' then 'approved'
    when target_action = 'approve_domain' then 'trusted'
    when target_action in ('block_link', 'block_domain') then 'blocked'
    else null
  end;
  if v_next_status is null then
    raise exception 'unsupported_external_link_action';
  end if;

  if target_action in ('approve_domain', 'block_domain') then
    v_policy_status := case
      when target_action = 'approve_domain' then 'verified'
      else 'blocked'
    end;

    insert into feed.link_domain_policy (
      allow_preview,
      allow_subdomains,
      category,
      display_name,
      domain,
      source,
      status,
      updated_at,
      updated_by_account_id,
      verified_at
    )
    values (
      false,
      false,
      'admin_reviewed',
      v_link.hostname,
      v_link.hostname,
      'admin',
      v_policy_status,
      v_now,
      target_admin_account_id,
      case when v_policy_status = 'verified' then v_now else null end
    )
    on conflict (domain)
    do update set
      status = excluded.status,
      updated_at = excluded.updated_at,
      updated_by_account_id = excluded.updated_by_account_id,
      verified_at = excluded.verified_at
    returning id into v_policy_id;

    update feed.feed_external_link
    set
      domain_policy_id = v_policy_id,
      review_status = v_next_status,
      reviewed_at = v_now,
      reviewed_by_account_id = target_admin_account_id,
      updated_at = v_now
    where hostname = v_link.hostname
      and review_status in ('pending', 'approved', 'trusted');
  else
    update feed.feed_external_link
    set
      review_status = v_next_status,
      reviewed_at = v_now,
      reviewed_by_account_id = target_admin_account_id,
      updated_at = v_now
    where id = target_link_id
      and review_status = 'pending';
    get diagnostics v_affected = row_count;
    if v_affected <> 1 then raise exception 'external_link_already_reviewed'; end if;
  end if;

  insert into audit.admin_audit_log (
    action,
    admin_account_id,
    metadata,
    target_id,
    target_table
  )
  values (
    target_action,
    target_admin_account_id,
    jsonb_build_object(
      'hostname', v_link.hostname,
      'nextStatus', v_next_status,
      'normalizedUrl', v_link.normalized_url,
      'previousStatus', v_link.review_status,
      'source', 'admin_external_link_review'
    ),
    target_link_id,
    'feed.feed_external_link'
  );

  return jsonb_build_object('ok', true, 'nextStatus', v_next_status);
end;
$$;

create or replace function public.admin_apply_member_action(
  target_admin_account_id uuid,
  target_action text,
  target_account_id uuid
)
returns jsonb
language plpgsql
security definer
set search_path = pg_catalog, public, feed, profile, identity, audit
as $$
declare
  v_now timestamptz := now();
  v_affected integer;
  v_suspended boolean;
begin
  if target_admin_account_id is null
     or target_admin_account_id = target_account_id
     or not exists (
       select 1
       from identity.account
       where id = target_admin_account_id
         and status = 'active'
         and deleted_at is null
     ) then
    raise exception 'valid_admin_account_required';
  end if;

  if target_action in ('hide_profile', 'restore_profile') then
    update profile.community_profile
    set
      status = case when target_action = 'hide_profile' then 'hidden' else 'active' end,
      updated_at = v_now
    where account_id = target_account_id
      and deleted_at is null;
    get diagnostics v_affected = row_count;
    if v_affected <> 1 then raise exception 'community_profile_not_found'; end if;
  elsif target_action in ('suspend_account', 'reactivate_account') then
    v_suspended := target_action = 'suspend_account';

    update identity.account
    set
      status = case when v_suspended then 'suspended' else 'active' end,
      updated_at = v_now
    where id = target_account_id
      and deleted_at is null;
    get diagnostics v_affected = row_count;
    if v_affected <> 1 then raise exception 'account_not_found'; end if;

    update profile.community_profile
    set
      status = case when v_suspended then 'hidden' else 'active' end,
      updated_at = v_now
    where account_id = target_account_id
      and deleted_at is null;

    if v_suspended then
      update feed.feed_post
      set
        limited_at = v_now,
        moderation_status = 'limited'
      where author_account_id = target_account_id
        and moderation_status in ('pending_review', 'published')
        and deleted_at is null;
    end if;
  else
    raise exception 'unsupported_member_action';
  end if;

  insert into audit.admin_audit_log (
    action,
    admin_account_id,
    metadata,
    target_id,
    target_table
  )
  values (
    target_action,
    target_admin_account_id,
    jsonb_build_object('source', 'admin_member_detail'),
    target_account_id,
    'identity.account'
  );

  return jsonb_build_object('ok', true);
end;
$$;

create or replace function public.admin_manage_community_content_atomic(
  target_payload jsonb,
  target_admin_account_id uuid
)
returns jsonb
language plpgsql
security definer
set search_path = pg_catalog, public, feed, identity, audit
as $$
declare
  v_action text := target_payload ->> 'action';
  v_content_id uuid;
  v_content_type text;
  v_result jsonb;
  v_affected integer;
  v_response_closes_at timestamptz;
begin
  if target_admin_account_id is null or not exists (
    select 1
    from identity.account
    where id = target_admin_account_id
      and status = 'active'
      and deleted_at is null
  ) then
    raise exception 'active_admin_account_required';
  end if;

  if target_payload ? 'contentId' then
    v_content_id := (target_payload ->> 'contentId')::uuid;
  end if;

  if v_action = 'feature' then
    select content_type
    into v_content_type
    from feed.official_community_content
    where id = v_content_id
      and lifecycle_status = 'published'
    for update;
    if not found then raise exception 'community_content_not_featureable'; end if;

    update feed.official_community_content
    set is_featured = false, updated_at = now()
    where content_type = v_content_type
      and is_featured = true;

    update feed.official_community_content
    set
      is_featured = true,
      updated_at = now(),
      updated_by_account_id = target_admin_account_id
    where id = v_content_id
      and lifecycle_status = 'published';
    get diagnostics v_affected = row_count;
    if v_affected <> 1 then raise exception 'community_content_feature_failed'; end if;

    insert into audit.admin_audit_log (
      action,
      admin_account_id,
      metadata,
      target_id,
      target_table
    )
    values (
      'community_content_feature',
      target_admin_account_id,
      jsonb_build_object('contentType', v_content_type),
      v_content_id,
      'feed.official_community_content'
    );

    return jsonb_build_object('contentId', v_content_id, 'ok', true);
  end if;

  v_result := public.admin_manage_community_content(
    target_payload,
    target_admin_account_id
  );
  v_content_id := (v_result ->> 'contentId')::uuid;

  if v_action in ('create', 'update') then
    v_response_closes_at := nullif(
      target_payload ->> 'responseClosesAt',
      ''
    )::timestamptz;

    update feed.official_community_content
    set
      response_closes_at = v_response_closes_at,
      updated_at = now(),
      updated_by_account_id = target_admin_account_id
    where id = v_content_id;
    get diagnostics v_affected = row_count;
    if v_affected <> 1 then raise exception 'response_close_write_failed'; end if;
  end if;

  return v_result;
end;
$$;

create or replace function public.admin_manage_trait_map_content_atomic(
  target_admin_account_id uuid,
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
set search_path = pg_catalog, public, trait_map, identity, audit
as $$
declare
  v_result jsonb;
begin
  if target_admin_account_id is null or not exists (
    select 1
    from identity.account
    where id = target_admin_account_id
      and status = 'active'
      and deleted_at is null
  ) then
    raise exception 'active_admin_account_required';
  end if;

  v_result := public.admin_manage_trait_map_content(
    target_action,
    target_release_id,
    target_atom_id,
    target_atom_version,
    target_review_role,
    target_reviewer_ref
  );

  insert into audit.admin_audit_log (
    action,
    admin_account_id,
    metadata,
    target_id,
    target_table
  )
  values (
    'content_' || target_action,
    target_admin_account_id,
    jsonb_build_object(
      'atomId', target_atom_id,
      'atomVersion', target_atom_version,
      'releaseId', target_release_id,
      'reviewRole', target_review_role
    ),
    null,
    'trait_map.content_release'
  );

  return v_result;
end;
$$;

create or replace function public.admin_mark_reward_contacted(
  target_admin_account_id uuid,
  target_campaign_id text,
  target_entry_id uuid
)
returns jsonb
language plpgsql
security definer
set search_path = pg_catalog, public, identity, audit
as $$
declare
  v_affected integer;
begin
  if target_admin_account_id is null or not exists (
    select 1
    from identity.account
    where id = target_admin_account_id
      and status = 'active'
      and deleted_at is null
  ) then
    raise exception 'active_admin_account_required';
  end if;

  update public.research_gate_c_reward_entry
  set status = 'contacted', updated_at = now()
  where id = target_entry_id
    and campaign_id = target_campaign_id
    and status in ('winner', 'contacted');
  get diagnostics v_affected = row_count;
  if v_affected <> 1 then raise exception 'reward_winner_not_found'; end if;

  insert into audit.admin_audit_log (
    action,
    admin_account_id,
    metadata,
    target_id,
    target_table
  )
  values (
    'reward_winner_contacted',
    target_admin_account_id,
    jsonb_build_object('campaign_id', target_campaign_id),
    target_entry_id,
    'public.research_gate_c_reward_entry'
  );

  return jsonb_build_object('ok', true);
end;
$$;

revoke all on function public.admin_apply_community_moderation(uuid, text, uuid)
from public, anon, authenticated;
revoke all on function public.admin_review_external_link(uuid, text, uuid)
from public, anon, authenticated;
revoke all on function public.admin_apply_member_action(uuid, text, uuid)
from public, anon, authenticated;
revoke all on function public.admin_manage_community_content_atomic(jsonb, uuid)
from public, anon, authenticated;
revoke all on function public.admin_manage_trait_map_content_atomic(
  uuid, text, text, text, integer, text, text
) from public, anon, authenticated;
revoke all on function public.admin_mark_reward_contacted(uuid, text, uuid)
from public, anon, authenticated;

grant execute on function public.admin_apply_community_moderation(uuid, text, uuid)
to service_role;
grant execute on function public.admin_review_external_link(uuid, text, uuid)
to service_role;
grant execute on function public.admin_apply_member_action(uuid, text, uuid)
to service_role;
grant execute on function public.admin_manage_community_content_atomic(jsonb, uuid)
to service_role;
grant execute on function public.admin_manage_trait_map_content_atomic(
  uuid, text, text, text, integer, text, text
) to service_role;
grant execute on function public.admin_mark_reward_contacted(uuid, text, uuid)
to service_role;

notify pgrst, 'reload schema';

commit;
