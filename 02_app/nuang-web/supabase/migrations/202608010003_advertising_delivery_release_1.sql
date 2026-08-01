begin;

create table if not exists public.advertising_inventory (
  id uuid primary key default gen_random_uuid(),
  placement_key text not null unique
    check (placement_key in ('HOME_INLINE_01', 'FEED_COMMERCE_01')),
  route_context text not null
    check (route_context in ('home_recommended', 'feed_recommended')),
  provider text not null check (provider in ('adsense', 'coupang')),
  format text not null check (format in ('responsive_display', 'affiliate_card')),
  is_active boolean not null default false,
  minimum_organic_count integer not null default 0
    check (minimum_organic_count between 0 and 100),
  minimum_interval_seconds integer not null default 180
    check (minimum_interval_seconds between 0 and 86400),
  session_cap integer not null default 1 check (session_cap between 0 and 10),
  daily_cap integer not null default 1 check (daily_cap between 0 and 20),
  requires_moderation boolean not null default false,
  rollout_percentage integer not null default 0
    check (rollout_percentage between 0 and 100),
  policy_version text not null default 'advertising-v1'
    check (char_length(policy_version) between 1 and 80),
  active_from timestamptz,
  active_until timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (active_until is null or active_from is null or active_until > active_from)
);

create table if not exists public.advertising_campaign (
  id uuid primary key default gen_random_uuid(),
  inquiry_id uuid references public.advertising_inquiry(id) on delete set null,
  provider text not null check (provider in ('adsense', 'coupang', 'direct')),
  name text not null check (char_length(trim(name)) between 2 and 160),
  status text not null default 'draft'
    check (
      status in (
        'draft', 'policy_review', 'approved', 'scheduled', 'active', 'paused', 'ended'
      )
    ),
  objective text not null default 'awareness'
    check (objective in ('awareness', 'traffic', 'engagement', 'launch', 'other')),
  placement_keys text[] not null default '{}'::text[]
    check (
      cardinality(placement_keys) between 1 and 10
      and placement_keys <@ array['HOME_INLINE_01', 'FEED_COMMERCE_01']::text[]
    ),
  starts_at timestamptz,
  ends_at timestamptz,
  budget_note text check (budget_note is null or char_length(budget_note) <= 1000),
  policy_version text
    check (policy_version is null or char_length(policy_version) between 1 and 80),
  policy_approved_at timestamptz,
  policy_approved_by_account_id uuid references identity.account(id) on delete set null,
  created_by_account_id uuid references identity.account(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (ends_at is null or starts_at is null or ends_at > starts_at)
);

create index if not exists advertising_campaign_status_idx
on public.advertising_campaign(status, starts_at, ends_at);

create table if not exists public.advertising_creative (
  id uuid primary key default gen_random_uuid(),
  campaign_id uuid not null references public.advertising_campaign(id) on delete cascade,
  provider text not null check (provider in ('adsense', 'coupang', 'direct')),
  title text not null check (char_length(trim(title)) between 2 and 160),
  description text check (description is null or char_length(description) <= 500),
  image_url text
    check (image_url is null or (char_length(image_url) <= 1000 and image_url like 'https://%')),
  alt_text text check (alt_text is null or char_length(alt_text) <= 300),
  destination_url text
    check (
      destination_url is null
      or (char_length(destination_url) <= 1500 and destination_url like 'https://%')
    ),
  disclosure_text text
    check (disclosure_text is null or char_length(disclosure_text) <= 500),
  fact_checked_at timestamptz,
  expires_at timestamptz,
  review_status text not null default 'pending'
    check (
      review_status in ('pending', 'approved', 'changes_requested', 'rejected', 'expired')
    ),
  reviewed_at timestamptz,
  reviewed_by_account_id uuid references identity.account(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists advertising_creative_review_idx
on public.advertising_creative(review_status, provider, updated_at desc);

create table if not exists public.advertising_kill_switch (
  id uuid primary key default gen_random_uuid(),
  scope text not null check (scope in ('global', 'provider', 'slot')),
  switch_key text not null check (char_length(switch_key) between 1 and 80),
  suspended boolean not null default true,
  reason text check (reason is null or char_length(reason) <= 500),
  updated_by_account_id uuid references identity.account(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (scope, switch_key),
  check (
    (scope = 'global' and switch_key = 'advertising')
    or (scope = 'provider' and switch_key in ('adsense', 'coupang'))
    or (scope = 'slot' and switch_key in ('HOME_INLINE_01', 'FEED_COMMERCE_01'))
  )
);

create table if not exists public.advertising_feedback (
  id uuid primary key default gen_random_uuid(),
  placement_key text not null
    check (placement_key in ('HOME_INLINE_01', 'FEED_COMMERCE_01')),
  provider text not null check (provider in ('adsense', 'coupang')),
  campaign_id uuid references public.advertising_campaign(id) on delete set null,
  creative_id uuid references public.advertising_creative(id) on delete set null,
  reason text not null
    check (reason in ('not_interested', 'too_repetitive', 'uncomfortable', 'seems_wrong')),
  ephemeral_session_hash text not null
    check (ephemeral_session_hash ~ '^[0-9a-f]{64}$'),
  viewport_bucket text not null check (viewport_bucket in ('mobile', 'tablet', 'desktop')),
  created_at timestamptz not null default now()
);

create index if not exists advertising_feedback_quality_idx
on public.advertising_feedback(reason, placement_key, created_at desc);

create index if not exists advertising_feedback_rate_idx
on public.advertising_feedback(ephemeral_session_hash, created_at desc);

create table if not exists public.advertising_event (
  id uuid primary key default gen_random_uuid(),
  event_name text not null
    check (
      event_name in (
        'ad_slot_eligible', 'ad_render_requested', 'ad_slot_filled',
        'ad_slot_no_fill', 'ad_slot_error', 'ad_slot_viewable',
        'ad_click_out', 'ad_feedback_submitted', 'ad_suppressed',
        'ad_inquiry_started', 'ad_inquiry_submitted',
        'ad_notification_delivered', 'ad_notification_failed'
      )
    ),
  placement_key text
    check (placement_key is null or placement_key in ('HOME_INLINE_01', 'FEED_COMMERCE_01')),
  provider text check (provider is null or provider in ('adsense', 'coupang')),
  campaign_id uuid references public.advertising_campaign(id) on delete set null,
  creative_id uuid references public.advertising_creative(id) on delete set null,
  page_context text
    check (page_context is null or page_context in ('home_recommended', 'feed_recommended', 'advertise')),
  viewport_bucket text
    check (viewport_bucket is null or viewport_bucket in ('mobile', 'tablet', 'desktop')),
  ephemeral_session_hash text
    check (ephemeral_session_hash is null or ephemeral_session_hash ~ '^[0-9a-f]{64}$'),
  app_version text check (app_version is null or char_length(app_version) <= 80),
  error_code text check (error_code is null or char_length(error_code) <= 120),
  occurred_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);

create index if not exists advertising_event_metric_idx
on public.advertising_event(occurred_at, provider, placement_key, event_name);

create table if not exists public.advertising_metric_daily (
  id uuid primary key default gen_random_uuid(),
  metric_date date not null,
  provider text not null check (provider in ('adsense', 'coupang', 'direct')),
  placement_key text not null
    check (placement_key in ('HOME_INLINE_01', 'FEED_COMMERCE_01')),
  campaign_id uuid references public.advertising_campaign(id) on delete set null,
  impressions bigint not null default 0 check (impressions >= 0),
  viewable_impressions bigint not null default 0 check (viewable_impressions >= 0),
  fill_count bigint not null default 0 check (fill_count >= 0),
  no_fill_count bigint not null default 0 check (no_fill_count >= 0),
  error_count bigint not null default 0 check (error_count >= 0),
  clicks bigint check (clicks is null or clicks >= 0),
  feedback_count bigint not null default 0 check (feedback_count >= 0),
  hide_count bigint not null default 0 check (hide_count >= 0),
  revenue_amount numeric(14, 2) check (revenue_amount is null or revenue_amount >= 0),
  currency text check (currency is null or currency ~ '^[A-Z]{3}$'),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists advertising_metric_daily_dimension_idx
on public.advertising_metric_daily(
  metric_date,
  provider,
  placement_key,
  coalesce(campaign_id, '00000000-0000-0000-0000-000000000000'::uuid)
);

alter table public.advertising_inventory enable row level security;
alter table public.advertising_campaign enable row level security;
alter table public.advertising_creative enable row level security;
alter table public.advertising_kill_switch enable row level security;
alter table public.advertising_feedback enable row level security;
alter table public.advertising_event enable row level security;
alter table public.advertising_metric_daily enable row level security;

revoke all on public.advertising_inventory from public, anon, authenticated;
revoke all on public.advertising_campaign from public, anon, authenticated;
revoke all on public.advertising_creative from public, anon, authenticated;
revoke all on public.advertising_kill_switch from public, anon, authenticated;
revoke all on public.advertising_feedback from public, anon, authenticated;
revoke all on public.advertising_event from public, anon, authenticated;
revoke all on public.advertising_metric_daily from public, anon, authenticated;

grant select, insert, update, delete on public.advertising_inventory to service_role;
grant select, insert, update, delete on public.advertising_campaign to service_role;
grant select, insert, update, delete on public.advertising_creative to service_role;
grant select, insert, update, delete on public.advertising_kill_switch to service_role;
grant select, insert, update, delete on public.advertising_feedback to service_role;
grant select, insert, update, delete on public.advertising_event to service_role;
grant select, insert, update, delete on public.advertising_metric_daily to service_role;

insert into public.advertising_inventory (
  placement_key, route_context, provider, format, is_active,
  minimum_organic_count, minimum_interval_seconds, session_cap, daily_cap,
  requires_moderation, rollout_percentage, policy_version
) values
  (
    'HOME_INLINE_01', 'home_recommended', 'adsense', 'responsive_display', false,
    3, 180, 1, 1, false, 0, 'advertising-v1'
  ),
  (
    'FEED_COMMERCE_01', 'feed_recommended', 'coupang', 'affiliate_card', false,
    8, 180, 1, 2, true, 0, 'advertising-v1'
  )
on conflict (placement_key) do nothing;

insert into public.advertising_kill_switch (scope, switch_key, suspended, reason)
values
  ('global', 'advertising', true, '외부 공급자 승인 전 기본 중지'),
  ('provider', 'adsense', true, 'AdSense Ready 및 CMP 확인 전 기본 중지'),
  ('provider', 'coupang', true, '쿠팡 파트너스 활동 URL·소재 승인 전 기본 중지'),
  ('slot', 'HOME_INLINE_01', true, '단계적 송출 승인 전 기본 중지'),
  ('slot', 'FEED_COMMERCE_01', true, '단계적 송출 승인 전 기본 중지')
on conflict (scope, switch_key) do nothing;

create or replace function public.resolve_advertising_delivery(
  target_placement_key text
)
returns jsonb
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  v_inventory public.advertising_inventory%rowtype;
  v_campaign public.advertising_campaign%rowtype;
  v_creative public.advertising_creative%rowtype;
  v_suspended boolean;
begin
  select * into v_inventory
  from public.advertising_inventory
  where placement_key = target_placement_key;

  if not found then
    return jsonb_build_object('enabled', false, 'code', 'inventory_not_found');
  end if;

  select exists (
    select 1 from public.advertising_kill_switch
    where suspended
      and (
        (scope = 'global' and switch_key = 'advertising')
        or (scope = 'provider' and switch_key = v_inventory.provider)
        or (scope = 'slot' and switch_key = v_inventory.placement_key)
      )
  ) into v_suspended;

  if not v_inventory.is_active
    or v_inventory.rollout_percentage = 0
    or v_suspended
    or (v_inventory.active_from is not null and v_inventory.active_from > now())
    or (v_inventory.active_until is not null and v_inventory.active_until <= now()) then
    return jsonb_build_object(
      'enabled', false,
      'code', case when v_suspended then 'suspended' else 'inventory_inactive' end,
      'placementKey', v_inventory.placement_key,
      'provider', v_inventory.provider
    );
  end if;

  if v_inventory.provider = 'coupang' then
    select * into v_campaign
    from public.advertising_campaign
    where provider = 'coupang'
      and status = 'active'
      and policy_approved_at is not null
      and policy_version is not null
      and target_placement_key = any(placement_keys)
      and (starts_at is null or starts_at <= now())
      and (ends_at is null or ends_at > now())
    order by starts_at nulls first, created_at
    limit 1;

    if not found then
      return jsonb_build_object('enabled', false, 'code', 'campaign_unavailable');
    end if;

    select * into v_creative
    from public.advertising_creative
    where campaign_id = v_campaign.id
      and provider = 'coupang'
      and review_status = 'approved'
      and destination_url is not null
      and image_url is not null
      and disclosure_text is not null
      and disclosure_text like '%일정액의 수수료%'
      and char_length(trim(coalesce(alt_text, ''))) >= 2
      and fact_checked_at is not null
      and (expires_at is null or expires_at > now())
    order by updated_at desc
    limit 1;

    if not found then
      return jsonb_build_object('enabled', false, 'code', 'creative_unavailable');
    end if;

    return jsonb_build_object(
      'enabled', true,
      'placementKey', v_inventory.placement_key,
      'provider', v_inventory.provider,
      'routeContext', v_inventory.route_context,
      'minimumOrganicCount', v_inventory.minimum_organic_count,
      'sessionCap', v_inventory.session_cap,
      'dailyCap', v_inventory.daily_cap,
      'rolloutPercentage', v_inventory.rollout_percentage,
      'campaignId', v_campaign.id,
      'creative', jsonb_build_object(
        'creativeId', v_creative.id,
        'title', v_creative.title,
        'description', v_creative.description,
        'imageUrl', v_creative.image_url,
        'altText', v_creative.alt_text,
        'destinationUrl', v_creative.destination_url,
        'disclosure', v_creative.disclosure_text
      )
    );
  end if;

  return jsonb_build_object(
    'enabled', true,
    'placementKey', v_inventory.placement_key,
    'provider', v_inventory.provider,
    'routeContext', v_inventory.route_context,
    'minimumOrganicCount', v_inventory.minimum_organic_count,
    'sessionCap', v_inventory.session_cap,
    'dailyCap', v_inventory.daily_cap,
    'rolloutPercentage', v_inventory.rollout_percentage
  );
end;
$$;

revoke all on function public.resolve_advertising_delivery(text)
from public, anon, authenticated;
grant execute on function public.resolve_advertising_delivery(text) to service_role;

create or replace function public.admin_upsert_advertising_campaign(
  target_admin_account_id uuid,
  target_campaign_id uuid,
  target_inquiry_id uuid,
  target_provider text,
  target_name text,
  target_objective text,
  target_placement_keys text[],
  target_starts_at timestamptz,
  target_ends_at timestamptz,
  target_budget_note text,
  target_policy_version text,
  target_reason text
)
returns jsonb
language plpgsql
security definer
set search_path = pg_catalog, public, identity, audit
as $$
declare
  v_campaign_id uuid := coalesce(target_campaign_id, gen_random_uuid());
  v_previous public.advertising_campaign%rowtype;
  v_created boolean := target_campaign_id is null;
  v_audit_count integer;
begin
  if target_admin_account_id is null or not exists (
    select 1 from identity.account
    where id = target_admin_account_id and status = 'active' and deleted_at is null
  ) then raise exception 'active_admin_account_required'; end if;
  if char_length(trim(coalesce(target_reason, ''))) < 2 then
    raise exception 'advertising_campaign_reason_required';
  end if;
  if target_provider not in ('adsense', 'coupang', 'direct') then
    raise exception 'unsupported_advertising_campaign_provider';
  end if;
  if target_provider = 'adsense' and target_placement_keys <> array['HOME_INLINE_01']::text[] then
    raise exception 'adsense_home_placement_required';
  end if;
  if target_provider = 'coupang' and target_placement_keys <> array['FEED_COMMERCE_01']::text[] then
    raise exception 'coupang_feed_placement_required';
  end if;
  if target_inquiry_id is not null and not exists (
    select 1 from public.advertising_inquiry where id = target_inquiry_id
  ) then raise exception 'advertising_inquiry_not_found'; end if;

  if target_campaign_id is null then
    insert into public.advertising_campaign (
      id, inquiry_id, provider, name, objective, placement_keys,
      starts_at, ends_at, budget_note, policy_version,
      created_by_account_id, status, created_at, updated_at
    ) values (
      v_campaign_id, target_inquiry_id, target_provider, trim(target_name),
      target_objective, target_placement_keys, target_starts_at, target_ends_at,
      nullif(trim(coalesce(target_budget_note, '')), ''),
      nullif(trim(coalesce(target_policy_version, '')), ''),
      target_admin_account_id, 'draft', now(), now()
    );
  else
    select * into v_previous from public.advertising_campaign
    where id = target_campaign_id for update;
    if not found then raise exception 'advertising_campaign_not_found'; end if;
    if v_previous.status in ('active', 'ended') then
      raise exception 'active_or_ended_campaign_is_not_editable';
    end if;

    update public.advertising_campaign set
      inquiry_id = target_inquiry_id,
      provider = target_provider,
      name = trim(target_name),
      objective = target_objective,
      placement_keys = target_placement_keys,
      starts_at = target_starts_at,
      ends_at = target_ends_at,
      budget_note = nullif(trim(coalesce(target_budget_note, '')), ''),
      policy_version = nullif(trim(coalesce(target_policy_version, '')), ''),
      status = case when status = 'draft' then 'draft' else 'policy_review' end,
      policy_approved_at = null,
      policy_approved_by_account_id = null,
      updated_at = now()
    where id = target_campaign_id;
  end if;

  insert into audit.admin_audit_log (
    action, admin_account_id, metadata, target_id, target_table
  ) values (
    case when v_created then 'advertising_campaign_created' else 'advertising_campaign_updated' end,
    target_admin_account_id,
    jsonb_build_object(
      'provider', target_provider,
      'placementKeys', target_placement_keys,
      'reason', trim(target_reason),
      'source', 'admin_advertising'
    ),
    v_campaign_id,
    'public.advertising_campaign'
  );
  get diagnostics v_audit_count = row_count;
  if v_audit_count <> 1 then raise exception 'admin_audit_write_failed'; end if;

  return jsonb_build_object(
    'ok', true,
    'created', v_created,
    'campaignId', v_campaign_id,
    'status', case when v_created or v_previous.status = 'draft' then 'draft' else 'policy_review' end
  );
end;
$$;

revoke all on function public.admin_upsert_advertising_campaign(
  uuid, uuid, uuid, text, text, text, text[], timestamptz, timestamptz,
  text, text, text
) from public, anon, authenticated;
grant execute on function public.admin_upsert_advertising_campaign(
  uuid, uuid, uuid, text, text, text, text[], timestamptz, timestamptz,
  text, text, text
) to service_role;

create or replace function public.admin_upsert_advertising_creative(
  target_admin_account_id uuid,
  target_creative_id uuid,
  target_campaign_id uuid,
  target_provider text,
  target_title text,
  target_description text,
  target_image_url text,
  target_alt_text text,
  target_destination_url text,
  target_disclosure_text text,
  target_fact_checked_at timestamptz,
  target_expires_at timestamptz,
  target_reason text
)
returns jsonb
language plpgsql
security definer
set search_path = pg_catalog, public, identity, audit
as $$
declare
  v_creative_id uuid := coalesce(target_creative_id, gen_random_uuid());
  v_campaign public.advertising_campaign%rowtype;
  v_created boolean := target_creative_id is null;
  v_audit_count integer;
begin
  if target_admin_account_id is null or not exists (
    select 1 from identity.account
    where id = target_admin_account_id and status = 'active' and deleted_at is null
  ) then raise exception 'active_admin_account_required'; end if;
  if char_length(trim(coalesce(target_reason, ''))) < 2 then
    raise exception 'advertising_creative_reason_required';
  end if;

  select * into v_campaign from public.advertising_campaign
  where id = target_campaign_id for share;
  if not found then raise exception 'advertising_campaign_not_found'; end if;
  if v_campaign.provider <> target_provider then
    raise exception 'creative_campaign_provider_mismatch';
  end if;
  if target_provider = 'coupang' and target_destination_url is not null and
    target_destination_url !~* '^https://([a-z0-9-]+\.)*(coupang\.com|coupangcdn\.com)([:/]|$)' then
    raise exception 'unsupported_coupang_destination_host';
  end if;

  if target_creative_id is null then
    insert into public.advertising_creative (
      id, campaign_id, provider, title, description, image_url, alt_text,
      destination_url, disclosure_text, fact_checked_at, expires_at,
      review_status, created_at, updated_at
    ) values (
      v_creative_id, target_campaign_id, target_provider, trim(target_title),
      nullif(trim(coalesce(target_description, '')), ''), target_image_url,
      nullif(trim(coalesce(target_alt_text, '')), ''), target_destination_url,
      nullif(trim(coalesce(target_disclosure_text, '')), ''),
      target_fact_checked_at, target_expires_at, 'pending', now(), now()
    );
  else
    if not exists (
      select 1 from public.advertising_creative where id = target_creative_id for update
    ) then raise exception 'advertising_creative_not_found'; end if;

    update public.advertising_creative set
      campaign_id = target_campaign_id,
      provider = target_provider,
      title = trim(target_title),
      description = nullif(trim(coalesce(target_description, '')), ''),
      image_url = target_image_url,
      alt_text = nullif(trim(coalesce(target_alt_text, '')), ''),
      destination_url = target_destination_url,
      disclosure_text = nullif(trim(coalesce(target_disclosure_text, '')), ''),
      fact_checked_at = target_fact_checked_at,
      expires_at = target_expires_at,
      review_status = 'pending',
      reviewed_at = null,
      reviewed_by_account_id = null,
      updated_at = now()
    where id = target_creative_id;
  end if;

  insert into audit.admin_audit_log (
    action, admin_account_id, metadata, target_id, target_table
  ) values (
    case when v_created then 'advertising_creative_created' else 'advertising_creative_updated' end,
    target_admin_account_id,
    jsonb_build_object(
      'campaignId', target_campaign_id,
      'provider', target_provider,
      'reviewStatus', 'pending',
      'reason', trim(target_reason),
      'source', 'admin_advertising'
    ),
    v_creative_id,
    'public.advertising_creative'
  );
  get diagnostics v_audit_count = row_count;
  if v_audit_count <> 1 then raise exception 'admin_audit_write_failed'; end if;

  return jsonb_build_object(
    'ok', true,
    'created', v_created,
    'creativeId', v_creative_id,
    'reviewStatus', 'pending'
  );
end;
$$;

revoke all on function public.admin_upsert_advertising_creative(
  uuid, uuid, uuid, text, text, text, text, text, text, text,
  timestamptz, timestamptz, text
) from public, anon, authenticated;
grant execute on function public.admin_upsert_advertising_creative(
  uuid, uuid, uuid, text, text, text, text, text, text, text,
  timestamptz, timestamptz, text
) to service_role;

create or replace function public.admin_manage_advertising_inventory(
  target_admin_account_id uuid,
  target_placement_key text,
  target_is_active boolean,
  target_minimum_organic_count integer,
  target_minimum_interval_seconds integer,
  target_session_cap integer,
  target_daily_cap integer,
  target_rollout_percentage integer,
  target_active_from timestamptz,
  target_active_until timestamptz,
  target_reason text
)
returns jsonb
language plpgsql
security definer
set search_path = pg_catalog, public, identity, audit
as $$
declare
  v_inventory public.advertising_inventory%rowtype;
  v_audit_count integer;
begin
  if target_admin_account_id is null or not exists (
    select 1 from identity.account
    where id = target_admin_account_id and status = 'active' and deleted_at is null
  ) then raise exception 'active_admin_account_required'; end if;
  if char_length(trim(coalesce(target_reason, ''))) < 2 then
    raise exception 'advertising_inventory_reason_required';
  end if;

  select * into v_inventory from public.advertising_inventory
  where placement_key = target_placement_key for update;
  if not found then raise exception 'advertising_inventory_not_found'; end if;

  update public.advertising_inventory set
    is_active = target_is_active,
    minimum_organic_count = target_minimum_organic_count,
    minimum_interval_seconds = target_minimum_interval_seconds,
    session_cap = target_session_cap,
    daily_cap = target_daily_cap,
    rollout_percentage = target_rollout_percentage,
    active_from = target_active_from,
    active_until = target_active_until,
    updated_at = now()
  where id = v_inventory.id;

  insert into audit.admin_audit_log (
    action, admin_account_id, metadata, target_id, target_table
  ) values (
    'advertising_inventory_managed',
    target_admin_account_id,
    jsonb_build_object(
      'placementKey', target_placement_key,
      'previousActive', v_inventory.is_active,
      'nextActive', target_is_active,
      'previousRolloutPercentage', v_inventory.rollout_percentage,
      'nextRolloutPercentage', target_rollout_percentage,
      'reason', trim(target_reason),
      'source', 'admin_advertising'
    ),
    v_inventory.id,
    'public.advertising_inventory'
  );
  get diagnostics v_audit_count = row_count;
  if v_audit_count <> 1 then raise exception 'admin_audit_write_failed'; end if;

  return jsonb_build_object(
    'ok', true,
    'placementKey', target_placement_key,
    'isActive', target_is_active,
    'rolloutPercentage', target_rollout_percentage
  );
end;
$$;

revoke all on function public.admin_manage_advertising_inventory(
  uuid, text, boolean, integer, integer, integer, integer, integer,
  timestamptz, timestamptz, text
) from public, anon, authenticated;
grant execute on function public.admin_manage_advertising_inventory(
  uuid, text, boolean, integer, integer, integer, integer, integer,
  timestamptz, timestamptz, text
) to service_role;

create or replace function public.admin_manage_advertising_campaign(
  target_admin_account_id uuid,
  target_campaign_id uuid,
  target_status text,
  target_reason text
)
returns jsonb
language plpgsql
security definer
set search_path = pg_catalog, public, identity, audit
as $$
declare
  v_previous public.advertising_campaign%rowtype;
  v_now timestamptz := now();
  v_audit_count integer;
begin
  if target_admin_account_id is null or not exists (
    select 1 from identity.account
    where id = target_admin_account_id and status = 'active' and deleted_at is null
  ) then raise exception 'active_admin_account_required'; end if;
  if target_status not in (
    'draft', 'policy_review', 'approved', 'scheduled', 'active', 'paused', 'ended'
  ) then raise exception 'unsupported_advertising_campaign_status'; end if;
  if char_length(trim(coalesce(target_reason, ''))) < 2 then
    raise exception 'advertising_campaign_reason_required';
  end if;

  select * into v_previous from public.advertising_campaign
  where id = target_campaign_id for update;
  if not found then raise exception 'advertising_campaign_not_found'; end if;

  if v_previous.status = 'ended' and target_status <> 'ended' then
    raise exception 'ended_campaign_is_terminal';
  end if;
  if v_previous.status = 'paused' and target_status = 'active' then
    raise exception 'paused_campaign_requires_policy_review';
  end if;
  if target_status in ('scheduled', 'active') and (
    v_previous.policy_approved_at is null
    or v_previous.policy_version is null
  ) then raise exception 'campaign_policy_approval_required'; end if;

  update public.advertising_campaign set
    status = target_status,
    policy_approved_at = case
      when target_status = 'approved' then v_now
      when target_status = 'policy_review' then null
      else policy_approved_at
    end,
    policy_approved_by_account_id = case
      when target_status = 'approved' then target_admin_account_id
      when target_status = 'policy_review' then null
      else policy_approved_by_account_id
    end,
    updated_at = v_now
  where id = target_campaign_id;

  insert into audit.admin_audit_log (
    action, admin_account_id, metadata, target_id, target_table
  ) values (
    'advertising_campaign_' || target_status,
    target_admin_account_id,
    jsonb_build_object(
      'previousStatus', v_previous.status,
      'nextStatus', target_status,
      'reason', trim(target_reason),
      'source', 'admin_advertising'
    ),
    target_campaign_id,
    'public.advertising_campaign'
  );
  get diagnostics v_audit_count = row_count;
  if v_audit_count <> 1 then raise exception 'admin_audit_write_failed'; end if;

  return jsonb_build_object('ok', true, 'campaignId', target_campaign_id, 'status', target_status);
end;
$$;

revoke all on function public.admin_manage_advertising_campaign(uuid, uuid, text, text)
from public, anon, authenticated;
grant execute on function public.admin_manage_advertising_campaign(uuid, uuid, text, text)
to service_role;

create or replace function public.admin_manage_advertising_creative(
  target_admin_account_id uuid,
  target_creative_id uuid,
  target_review_status text,
  target_reason text
)
returns jsonb
language plpgsql
security definer
set search_path = pg_catalog, public, identity, audit
as $$
declare
  v_creative public.advertising_creative%rowtype;
  v_audit_count integer;
begin
  if target_admin_account_id is null or not exists (
    select 1 from identity.account
    where id = target_admin_account_id and status = 'active' and deleted_at is null
  ) then raise exception 'active_admin_account_required'; end if;
  if target_review_status not in ('approved', 'changes_requested', 'rejected') then
    raise exception 'unsupported_advertising_creative_review_status';
  end if;
  if char_length(trim(coalesce(target_reason, ''))) < 2 then
    raise exception 'advertising_creative_reason_required';
  end if;

  select * into v_creative from public.advertising_creative
  where id = target_creative_id for update;
  if not found then raise exception 'advertising_creative_not_found'; end if;

  if target_review_status = 'approved' and v_creative.provider = 'coupang' and (
    v_creative.destination_url is null
    or v_creative.image_url is null
    or char_length(trim(coalesce(v_creative.alt_text, ''))) < 2
    or char_length(trim(coalesce(v_creative.disclosure_text, ''))) < 10
    or v_creative.disclosure_text not like '%일정액의 수수료%'
    or v_creative.fact_checked_at is null
    or (v_creative.expires_at is not null and v_creative.expires_at <= now())
  ) then raise exception 'coupang_creative_policy_fields_required'; end if;

  update public.advertising_creative set
    review_status = target_review_status,
    reviewed_at = now(),
    reviewed_by_account_id = target_admin_account_id,
    updated_at = now()
  where id = target_creative_id;

  insert into audit.admin_audit_log (
    action, admin_account_id, metadata, target_id, target_table
  ) values (
    'advertising_creative_' || target_review_status,
    target_admin_account_id,
    jsonb_build_object(
      'previousStatus', v_creative.review_status,
      'nextStatus', target_review_status,
      'reason', trim(target_reason),
      'source', 'admin_advertising'
    ),
    target_creative_id,
    'public.advertising_creative'
  );
  get diagnostics v_audit_count = row_count;
  if v_audit_count <> 1 then raise exception 'admin_audit_write_failed'; end if;

  return jsonb_build_object('ok', true, 'creativeId', target_creative_id, 'reviewStatus', target_review_status);
end;
$$;

revoke all on function public.admin_manage_advertising_creative(uuid, uuid, text, text)
from public, anon, authenticated;
grant execute on function public.admin_manage_advertising_creative(uuid, uuid, text, text)
to service_role;

create or replace function public.admin_toggle_advertising_kill_switch(
  target_admin_account_id uuid,
  target_scope text,
  target_key text,
  target_suspended boolean,
  target_reason text
)
returns jsonb
language plpgsql
security definer
set search_path = pg_catalog, public, identity, audit
as $$
declare
  v_switch public.advertising_kill_switch%rowtype;
  v_audit_count integer;
begin
  if target_admin_account_id is null or not exists (
    select 1 from identity.account
    where id = target_admin_account_id and status = 'active' and deleted_at is null
  ) then raise exception 'active_admin_account_required'; end if;
  if char_length(trim(coalesce(target_reason, ''))) < 2 then
    raise exception 'advertising_kill_switch_reason_required';
  end if;

  select * into v_switch from public.advertising_kill_switch
  where scope = target_scope and switch_key = target_key for update;
  if not found then raise exception 'advertising_kill_switch_not_found'; end if;

  update public.advertising_kill_switch set
    suspended = target_suspended,
    reason = trim(target_reason),
    updated_by_account_id = target_admin_account_id,
    updated_at = now()
  where id = v_switch.id;

  insert into audit.admin_audit_log (
    action, admin_account_id, metadata, target_id, target_table
  ) values (
    'advertising_kill_switch_' || case when target_suspended then 'suspended' else 'released' end,
    target_admin_account_id,
    jsonb_build_object(
      'scope', target_scope,
      'key', target_key,
      'previousSuspended', v_switch.suspended,
      'nextSuspended', target_suspended,
      'reason', trim(target_reason),
      'source', 'admin_advertising'
    ),
    v_switch.id,
    'public.advertising_kill_switch'
  );
  get diagnostics v_audit_count = row_count;
  if v_audit_count <> 1 then raise exception 'admin_audit_write_failed'; end if;

  return jsonb_build_object(
    'ok', true,
    'scope', target_scope,
    'key', target_key,
    'suspended', target_suspended
  );
end;
$$;

revoke all on function public.admin_toggle_advertising_kill_switch(uuid, text, text, boolean, text)
from public, anon, authenticated;
grant execute on function public.admin_toggle_advertising_kill_switch(uuid, text, text, boolean, text)
to service_role;

create or replace function public.record_advertising_event_atomic(
  target_event_name text,
  target_placement_key text,
  target_provider text,
  target_campaign_id uuid,
  target_creative_id uuid,
  target_page_context text,
  target_viewport_bucket text,
  target_ephemeral_session_hash text,
  target_app_version text,
  target_error_code text
)
returns jsonb
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  v_recent_count integer;
  v_event_id uuid;
begin
  if target_campaign_id is not null and not exists (
    select 1 from public.advertising_campaign
    where id = target_campaign_id
      and provider = target_provider
      and target_placement_key = any(placement_keys)
  ) then
    return jsonb_build_object('ok', false, 'code', 'invalid_campaign_reference');
  end if;
  if target_creative_id is not null and not exists (
    select 1 from public.advertising_creative
    where id = target_creative_id
      and campaign_id = target_campaign_id
      and provider = target_provider
  ) then
    return jsonb_build_object('ok', false, 'code', 'invalid_creative_reference');
  end if;

  perform pg_advisory_xact_lock(hashtextextended(
    'advertising-event:' || target_ephemeral_session_hash,
    0
  ));
  select count(*)::integer into v_recent_count
  from public.advertising_event
  where ephemeral_session_hash = target_ephemeral_session_hash
    and created_at >= now() - interval '1 hour';
  if v_recent_count >= 500 then
    return jsonb_build_object('ok', false, 'code', 'rate_limited');
  end if;

  insert into public.advertising_event (
    event_name, placement_key, provider, campaign_id, creative_id,
    page_context, viewport_bucket, ephemeral_session_hash, app_version, error_code
  ) values (
    target_event_name, target_placement_key, target_provider,
    target_campaign_id, target_creative_id, target_page_context,
    target_viewport_bucket, target_ephemeral_session_hash,
    target_app_version, target_error_code
  ) returning id into v_event_id;

  return jsonb_build_object('ok', true, 'eventId', v_event_id);
end;
$$;

revoke all on function public.record_advertising_event_atomic(
  text, text, text, uuid, uuid, text, text, text, text, text
) from public, anon, authenticated;
grant execute on function public.record_advertising_event_atomic(
  text, text, text, uuid, uuid, text, text, text, text, text
) to service_role;

create or replace function public.submit_advertising_feedback_atomic(
  target_placement_key text,
  target_provider text,
  target_campaign_id uuid,
  target_creative_id uuid,
  target_reason text,
  target_ephemeral_session_hash text,
  target_viewport_bucket text
)
returns jsonb
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  v_recent_count integer;
  v_existing_id uuid;
  v_feedback_id uuid;
begin
  if target_campaign_id is not null and not exists (
    select 1 from public.advertising_campaign
    where id = target_campaign_id
      and provider = target_provider
      and target_placement_key = any(placement_keys)
  ) then
    return jsonb_build_object('ok', false, 'code', 'invalid_campaign_reference');
  end if;
  if target_creative_id is not null and not exists (
    select 1 from public.advertising_creative
    where id = target_creative_id
      and campaign_id = target_campaign_id
      and provider = target_provider
  ) then
    return jsonb_build_object('ok', false, 'code', 'invalid_creative_reference');
  end if;

  perform pg_advisory_xact_lock(hashtextextended(
    'advertising-feedback:' || target_ephemeral_session_hash,
    0
  ));

  select id into v_existing_id
  from public.advertising_feedback
  where ephemeral_session_hash = target_ephemeral_session_hash
    and placement_key = target_placement_key
    and provider = target_provider
    and reason = target_reason
    and creative_id is not distinct from target_creative_id
    and created_at >= now() - interval '30 minutes'
  order by created_at desc
  limit 1;
  if found then
    return jsonb_build_object(
      'ok', true,
      'created', false,
      'feedbackId', v_existing_id
    );
  end if;

  select count(*)::integer into v_recent_count
  from public.advertising_feedback
  where ephemeral_session_hash = target_ephemeral_session_hash
    and created_at >= now() - interval '24 hours';
  if v_recent_count >= 10 then
    return jsonb_build_object('ok', false, 'code', 'rate_limited');
  end if;

  insert into public.advertising_feedback (
    placement_key, provider, campaign_id, creative_id, reason,
    ephemeral_session_hash, viewport_bucket
  ) values (
    target_placement_key, target_provider, target_campaign_id,
    target_creative_id, target_reason, target_ephemeral_session_hash,
    target_viewport_bucket
  ) returning id into v_feedback_id;

  insert into public.advertising_event (
    event_name, placement_key, provider, campaign_id, creative_id,
    page_context, viewport_bucket, ephemeral_session_hash
  ) values (
    'ad_feedback_submitted', target_placement_key, target_provider,
    target_campaign_id, target_creative_id,
    case target_placement_key
      when 'HOME_INLINE_01' then 'home_recommended'
      else 'feed_recommended'
    end,
    target_viewport_bucket, target_ephemeral_session_hash
  );

  return jsonb_build_object(
    'ok', true,
    'created', true,
    'feedbackId', v_feedback_id
  );
end;
$$;

revoke all on function public.submit_advertising_feedback_atomic(
  text, text, uuid, uuid, text, text, text
) from public, anon, authenticated;
grant execute on function public.submit_advertising_feedback_atomic(
  text, text, uuid, uuid, text, text, text
) to service_role;

notify pgrst, 'reload schema';

commit;
