begin;

-- NUANG marketing email Release 1.
-- Email is the only enabled channel. Raw contact values remain encrypted in
-- identity.contact_profile and are revealed only by the server delivery worker.

create table if not exists consent.marketing_campaign (
  id uuid primary key default gen_random_uuid(),
  internal_name text not null check (char_length(btrim(internal_name)) between 2 and 100),
  subject text not null check (char_length(btrim(subject)) between 2 and 90),
  eyebrow text not null check (char_length(btrim(eyebrow)) between 2 and 50),
  heading text not null check (char_length(btrim(heading)) between 2 and 100),
  body text not null check (char_length(btrim(body)) between 10 and 4000),
  cta_label text check (cta_label is null or char_length(btrim(cta_label)) between 2 and 40),
  cta_url text check (
    cta_url is null
    or cta_url ~ '^https://([a-z0-9-]+\.)*nuang\.app(/|$)'
  ),
  status text not null default 'draft' check (
    status in (
      'draft', 'approved', 'queued', 'sending', 'paused',
      'completed', 'cancelled', 'failed'
    )
  ),
  consent_version text not null default 'NUANG-MARKETING-EMAIL-KO-2026-08-03'
    check (consent_version = 'NUANG-MARKETING-EMAIL-KO-2026-08-03'),
  template_version text not null default 'NUANG-MARKETING-EMAIL-TEMPLATE-1'
    check (template_version = 'NUANG-MARKETING-EMAIL-TEMPLATE-1'),
  scheduled_at timestamptz,
  audience_count integer not null default 0 check (audience_count >= 0),
  created_by_account_id uuid not null references identity.account(id),
  approved_by_account_id uuid references identity.account(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  approved_at timestamptz,
  queued_at timestamptz,
  completed_at timestamptz,
  cancelled_at timestamptz,
  check ((cta_label is null) = (cta_url is null))
);

create index if not exists marketing_campaign_queue_idx
on consent.marketing_campaign(status, scheduled_at, created_at);

create table if not exists consent.marketing_campaign_recipient (
  id uuid primary key default gen_random_uuid(),
  campaign_id uuid not null references consent.marketing_campaign(id) on delete cascade,
  account_id uuid not null references identity.account(id) on delete cascade,
  status text not null default 'queued' check (
    status in (
      'queued', 'sending', 'retry', 'sent', 'delivered', 'bounced',
      'complained', 'unsubscribed', 'suppressed', 'skipped',
      'failed', 'cancelled'
    )
  ),
  consent_recorded_at timestamptz not null,
  contact_verified_at timestamptz not null,
  attempt_count integer not null default 0 check (attempt_count between 0 and 5),
  next_attempt_at timestamptz not null default now(),
  claimed_at timestamptz,
  worker_token uuid,
  provider_message_id text check (
    provider_message_id is null or char_length(provider_message_id) <= 500
  ),
  last_error_code text check (
    last_error_code is null or char_length(last_error_code) <= 160
  ),
  sent_at timestamptz,
  delivered_at timestamptz,
  bounced_at timestamptz,
  complained_at timestamptz,
  unsubscribed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (campaign_id, account_id)
);

create index if not exists marketing_campaign_recipient_delivery_idx
on consent.marketing_campaign_recipient(status, next_attempt_at, created_at);
create index if not exists marketing_campaign_recipient_campaign_idx
on consent.marketing_campaign_recipient(campaign_id, status, created_at);
create unique index if not exists marketing_campaign_recipient_provider_idx
on consent.marketing_campaign_recipient(provider_message_id)
where provider_message_id is not null;

create table if not exists consent.marketing_consent_confirmation_outbox (
  id uuid primary key default gen_random_uuid(),
  account_id uuid not null references identity.account(id) on delete cascade,
  consent_version text not null
    check (consent_version = 'NUANG-MARKETING-EMAIL-KO-2026-08-03'),
  original_consented_at timestamptz not null,
  cycle_due_on date not null,
  status text not null default 'queued' check (
    status in (
      'queued', 'sending', 'retry', 'sent', 'delivered', 'bounced',
      'complained', 'unsubscribed', 'suppressed', 'skipped', 'failed'
    )
  ),
  attempt_count integer not null default 0 check (attempt_count between 0 and 5),
  next_attempt_at timestamptz not null default now(),
  claimed_at timestamptz,
  worker_token uuid,
  provider_message_id text check (
    provider_message_id is null or char_length(provider_message_id) <= 500
  ),
  last_error_code text check (
    last_error_code is null or char_length(last_error_code) <= 160
  ),
  sent_at timestamptz,
  delivered_at timestamptz,
  bounced_at timestamptz,
  complained_at timestamptz,
  unsubscribed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (account_id, cycle_due_on)
);

create index if not exists marketing_confirmation_delivery_idx
on consent.marketing_consent_confirmation_outbox(status, next_attempt_at, created_at);
create unique index if not exists marketing_confirmation_provider_idx
on consent.marketing_consent_confirmation_outbox(provider_message_id)
where provider_message_id is not null;

create table if not exists consent.marketing_email_event (
  id uuid primary key default gen_random_uuid(),
  provider_message_id text not null check (char_length(provider_message_id) <= 500),
  event_type text not null check (char_length(event_type) between 2 and 100),
  account_id uuid references identity.account(id) on delete set null,
  campaign_id uuid references consent.marketing_campaign(id) on delete set null,
  occurred_at timestamptz not null,
  created_at timestamptz not null default now(),
  unique (provider_message_id, event_type)
);

create index if not exists marketing_email_event_recent_idx
on consent.marketing_email_event(created_at desc);

alter table consent.marketing_campaign enable row level security;
alter table consent.marketing_campaign_recipient enable row level security;
alter table consent.marketing_consent_confirmation_outbox enable row level security;
alter table consent.marketing_email_event enable row level security;

revoke all on consent.marketing_campaign from public, anon, authenticated;
revoke all on consent.marketing_campaign_recipient from public, anon, authenticated;
revoke all on consent.marketing_consent_confirmation_outbox from public, anon, authenticated;
revoke all on consent.marketing_email_event from public, anon, authenticated;

grant select, insert, update, delete on consent.marketing_campaign to service_role;
grant select, insert, update, delete on consent.marketing_campaign_recipient to service_role;
grant select, insert, update, delete on consent.marketing_consent_confirmation_outbox to service_role;
grant select, insert, update, delete on consent.marketing_email_event to service_role;

-- The Release 0 resolver returned three columns and also interpreted phone
-- consent. PostgreSQL cannot replace a function while changing its return
-- row type, so remove that contract before installing the email-only one.
drop function if exists consent.resolve_marketing_audience(text);

create function consent.resolve_marketing_audience(p_channel text)
returns table (
  account_id uuid,
  channel text,
  contact_verified_at timestamptz,
  consent_recorded_at timestamptz
)
language sql
stable
security definer
set search_path = pg_catalog, consent, identity, pg_temp
as $$
  select
    account.id,
    'email'::text,
    contact.email_verified_at,
    status.marketing_consent_updated_at
  from identity.account account
  join consent.age_and_consent_status status
    on status.account_id = account.id
  join identity.contact_profile contact
    on contact.account_id = account.id
  where p_channel = 'email'
    and account.status = 'active'
    and account.deleted_at is null
    and status.marketing_opt_in = true
    and status.marketing_consent_version = 'NUANG-MARKETING-EMAIL-KO-2026-08-03'
    and status.marketing_consent_updated_at is not null
    and contact.email_status = 'verified'
    and contact.email_verified_at is not null
    and contact.email_encrypted is not null
    and not exists (
      select 1
      from consent.marketing_suppression suppression
      where suppression.account_id = account.id
        and suppression.removed_at is null
        and suppression.channel in ('email', 'all')
    )
    and not exists (
      select 1
      from identity.account_merge_case merge_case
      where account.id in (
        merge_case.canonical_account_id,
        merge_case.source_account_id
      )
        and merge_case.status in ('proof_required', 'ready', 'processing')
    )
    and not exists (
      select 1
      from identity.identity_resolution_conflict conflict
      where conflict.status = 'open'
        and account.id = any(conflict.account_ids)
    );
$$;

-- A member who explicitly opts in again may clear only their own prior
-- unsubscribe suppression. Provider bounce and complaint suppressions remain
-- protected for operator review and contact correction.
create or replace function consent.clear_member_unsubscribe_on_marketing_opt_in()
returns trigger
language plpgsql
security definer
set search_path = pg_catalog, consent
as $$
begin
  if new.marketing_opt_in = true
    and new.marketing_consent_version = 'NUANG-MARKETING-EMAIL-KO-2026-08-03'
    and (
      old.marketing_opt_in is distinct from true
      or old.marketing_consent_version is distinct from new.marketing_consent_version
    ) then
    update consent.marketing_suppression
    set removed_at = now()
    where account_id = new.account_id
      and channel = 'email'
      and reason = 'member_unsubscribed'
      and removed_at is null;
  end if;
  return new;
end;
$$;

drop trigger if exists clear_member_unsubscribe_on_marketing_opt_in
on consent.age_and_consent_status;
create trigger clear_member_unsubscribe_on_marketing_opt_in
after update of marketing_opt_in, marketing_consent_version
on consent.age_and_consent_status
for each row execute function consent.clear_member_unsubscribe_on_marketing_opt_in();

create or replace function consent.admin_upsert_marketing_campaign(
  target_admin_account_id uuid,
  target_campaign_id uuid,
  target_internal_name text,
  target_subject text,
  target_eyebrow text,
  target_heading text,
  target_body text,
  target_cta_label text,
  target_cta_url text
)
returns jsonb
language plpgsql
security definer
set search_path = pg_catalog, consent, identity, audit
as $$
declare
  v_id uuid := coalesce(target_campaign_id, gen_random_uuid());
  v_previous_status text;
begin
  if not exists (
    select 1 from identity.account
    where id = target_admin_account_id and status = 'active' and deleted_at is null
  ) then raise exception 'active_admin_account_required'; end if;

  if target_cta_url is not null and target_cta_url !~ '^https://([a-z0-9-]+\.)*nuang\.app(/|$)' then
    raise exception 'marketing_campaign_cta_not_allowed';
  end if;

  select status into v_previous_status
  from consent.marketing_campaign
  where id = v_id
  for update;

  if found and v_previous_status not in ('draft', 'approved') then
    raise exception 'marketing_campaign_not_editable';
  end if;

  insert into consent.marketing_campaign (
    id, internal_name, subject, eyebrow, heading, body, cta_label, cta_url,
    status, created_by_account_id, created_at, updated_at
  ) values (
    v_id, btrim(target_internal_name), btrim(target_subject), btrim(target_eyebrow),
    btrim(target_heading), btrim(target_body), nullif(btrim(target_cta_label), ''),
    nullif(btrim(target_cta_url), ''), 'draft', target_admin_account_id, now(), now()
  )
  on conflict (id) do update set
    internal_name = excluded.internal_name,
    subject = excluded.subject,
    eyebrow = excluded.eyebrow,
    heading = excluded.heading,
    body = excluded.body,
    cta_label = excluded.cta_label,
    cta_url = excluded.cta_url,
    status = 'draft',
    approved_by_account_id = null,
    approved_at = null,
    updated_at = now();

  insert into audit.admin_audit_log (
    admin_account_id, action, target_table, target_id, metadata
  ) values (
    target_admin_account_id,
    case when target_campaign_id is null then 'marketing_campaign_created' else 'marketing_campaign_updated' end,
    'consent.marketing_campaign', v_id,
    jsonb_build_object('previousStatus', v_previous_status, 'nextStatus', 'draft')
  );

  return jsonb_build_object('ok', true, 'campaignId', v_id, 'status', 'draft');
end;
$$;

create or replace function consent.admin_manage_marketing_campaign(
  target_admin_account_id uuid,
  target_campaign_id uuid,
  target_action text,
  target_scheduled_at timestamptz
)
returns jsonb
language plpgsql
security definer
set search_path = pg_catalog, consent, identity, audit
as $$
declare
  v_campaign consent.marketing_campaign%rowtype;
  v_audience_count integer := 0;
begin
  if not exists (
    select 1 from identity.account
    where id = target_admin_account_id and status = 'active' and deleted_at is null
  ) then raise exception 'active_admin_account_required'; end if;

  select * into v_campaign
  from consent.marketing_campaign
  where id = target_campaign_id
  for update;
  if not found then raise exception 'marketing_campaign_not_found'; end if;

  if target_action = 'approve' then
    if v_campaign.status <> 'draft' then raise exception 'marketing_campaign_must_be_draft'; end if;
    update consent.marketing_campaign set
      status = 'approved', approved_by_account_id = target_admin_account_id,
      approved_at = now(), updated_at = now()
    where id = target_campaign_id;
  elsif target_action = 'queue' then
    if v_campaign.status <> 'approved' then raise exception 'marketing_campaign_must_be_approved'; end if;
    insert into consent.marketing_campaign_recipient (
      campaign_id, account_id, status, consent_recorded_at,
      contact_verified_at, next_attempt_at
    )
    select
      target_campaign_id, audience.account_id, 'queued',
      audience.consent_recorded_at, audience.contact_verified_at,
      greatest(coalesce(target_scheduled_at, now()), now())
    from consent.resolve_marketing_audience('email') audience
    on conflict (campaign_id, account_id) do nothing;
    get diagnostics v_audience_count = row_count;
    if v_audience_count = 0 then
      raise exception 'marketing_campaign_audience_empty';
    end if;
    update consent.marketing_campaign set
      status = 'queued',
      scheduled_at = greatest(coalesce(target_scheduled_at, now()), now()),
      audience_count = v_audience_count,
      queued_at = now(), updated_at = now()
    where id = target_campaign_id;
  elsif target_action = 'pause' then
    if v_campaign.status not in ('queued', 'sending') then raise exception 'marketing_campaign_not_pausable'; end if;
    update consent.marketing_campaign set status = 'paused', updated_at = now()
    where id = target_campaign_id;
  elsif target_action = 'resume' then
    if v_campaign.status <> 'paused' then raise exception 'marketing_campaign_not_paused'; end if;
    update consent.marketing_campaign set
      status = case when exists (
        select 1 from consent.marketing_campaign_recipient
        where campaign_id = target_campaign_id and status in ('queued', 'sending', 'retry')
      ) then 'queued' else 'completed' end,
      completed_at = case when exists (
        select 1 from consent.marketing_campaign_recipient
        where campaign_id = target_campaign_id and status in ('queued', 'sending', 'retry')
      ) then completed_at else now() end,
      updated_at = now()
    where id = target_campaign_id;
  elsif target_action = 'cancel' then
    if v_campaign.status in ('completed', 'cancelled') then raise exception 'marketing_campaign_already_final'; end if;
    update consent.marketing_campaign set
      status = 'cancelled', cancelled_at = now(), updated_at = now()
    where id = target_campaign_id;
    update consent.marketing_campaign_recipient set
      status = 'cancelled', claimed_at = null, worker_token = null, updated_at = now()
    where campaign_id = target_campaign_id and status in ('queued', 'retry');
  else
    raise exception 'unsupported_marketing_campaign_action';
  end if;

  insert into audit.admin_audit_log (
    admin_account_id, action, target_table, target_id, metadata
  ) values (
    target_admin_account_id, 'marketing_campaign_' || target_action,
    'consent.marketing_campaign', target_campaign_id,
    jsonb_build_object(
      'previousStatus', v_campaign.status,
      'scheduledAt', target_scheduled_at,
      'audienceCount', v_audience_count
    )
  );

  return jsonb_build_object(
    'ok', true, 'campaignId', target_campaign_id,
    'action', target_action, 'audienceCount', v_audience_count
  );
end;
$$;

create or replace function consent.claim_marketing_email_outbox(
  target_batch_size integer,
  target_worker_token uuid
)
returns setof consent.marketing_campaign_recipient
language plpgsql
security definer
set search_path = pg_catalog, consent
as $$
begin
  if target_worker_token is null then raise exception 'worker_token_required'; end if;
  if (now() at time zone 'Asia/Seoul')::time < time '08:00'
    or (now() at time zone 'Asia/Seoul')::time >= time '21:00' then
    return;
  end if;

  return query
  with candidate as (
    select recipient.id
    from consent.marketing_campaign_recipient recipient
    join consent.marketing_campaign campaign on campaign.id = recipient.campaign_id
    where campaign.status in ('queued', 'sending')
      and coalesce(campaign.scheduled_at, now()) <= now()
      and (
        (recipient.status in ('queued', 'retry') and recipient.next_attempt_at <= now())
        or (recipient.status = 'sending' and recipient.claimed_at < now() - interval '15 minutes')
      )
      and recipient.attempt_count < 5
    order by recipient.created_at
    for update of recipient skip locked
    limit least(greatest(coalesce(target_batch_size, 20), 1), 50)
  ), updated as (
    update consent.marketing_campaign_recipient recipient set
      status = 'sending', attempt_count = recipient.attempt_count + 1,
      claimed_at = now(), worker_token = target_worker_token, updated_at = now()
    from candidate where recipient.id = candidate.id
    returning recipient.*
  )
  select * from updated;

  update consent.marketing_campaign campaign set status = 'sending', updated_at = now()
  where status = 'queued' and exists (
    select 1 from consent.marketing_campaign_recipient recipient
    where recipient.campaign_id = campaign.id and recipient.worker_token = target_worker_token
  );
end;
$$;

create or replace function consent.complete_marketing_email_outbox(
  target_outbox_id uuid,
  target_worker_token uuid,
  target_outcome text,
  target_provider_message_id text,
  target_error_code text
)
returns jsonb
language plpgsql
security definer
set search_path = pg_catalog, consent
as $$
declare
  v_row consent.marketing_campaign_recipient%rowtype;
  v_next_status text;
  v_campaign_id uuid;
begin
  select * into v_row from consent.marketing_campaign_recipient
  where id = target_outbox_id and status = 'sending' and worker_token = target_worker_token
  for update;
  if not found then return jsonb_build_object('ok', false, 'code', 'claim_not_found'); end if;
  v_campaign_id := v_row.campaign_id;

  if target_outcome = 'sent' then
    update consent.marketing_campaign_recipient set
      status = 'sent', provider_message_id = target_provider_message_id,
      last_error_code = null, sent_at = now(), claimed_at = null,
      worker_token = null, updated_at = now()
    where id = target_outbox_id;
    v_next_status := 'sent';
  elsif target_outcome in ('unsubscribed', 'suppressed', 'skipped') then
    update consent.marketing_campaign_recipient set
      status = target_outcome,
      last_error_code = left(coalesce(target_error_code, target_outcome), 160),
      claimed_at = null, worker_token = null, updated_at = now(),
      unsubscribed_at = case when target_outcome = 'unsubscribed' then now() else unsubscribed_at end
    where id = target_outbox_id;
    v_next_status := target_outcome;
  elsif target_outcome = 'retry' then
    v_next_status := case when v_row.attempt_count >= 5 then 'failed' else 'retry' end;
    update consent.marketing_campaign_recipient set
      status = v_next_status,
      next_attempt_at = now() + case v_row.attempt_count
        when 1 then interval '1 minute'
        when 2 then interval '5 minutes'
        when 3 then interval '30 minutes'
        when 4 then interval '2 hours'
        else interval '12 hours'
      end,
      last_error_code = left(coalesce(target_error_code, 'delivery_failed'), 160),
      claimed_at = null, worker_token = null, updated_at = now()
    where id = target_outbox_id;
  else
    raise exception 'unsupported_marketing_delivery_outcome';
  end if;

  if not exists (
    select 1 from consent.marketing_campaign_recipient
    where campaign_id = v_campaign_id and status in ('queued', 'sending', 'retry')
  ) then
    update consent.marketing_campaign set
      status = case
        when exists (
          select 1 from consent.marketing_campaign_recipient
          where campaign_id = v_campaign_id and status = 'failed'
        ) then 'failed' else 'completed' end,
      completed_at = now(), updated_at = now()
    where id = v_campaign_id and status not in ('cancelled', 'paused');
  end if;

  return jsonb_build_object('ok', true, 'status', v_next_status);
end;
$$;

create or replace function consent.unsubscribe_marketing_email(
  target_account_id uuid,
  target_source text default 'email_unsubscribe'
)
returns jsonb
language plpgsql
security definer
set search_path = pg_catalog, consent, identity
as $$
declare
  v_now timestamptz := now();
begin
  if not exists (select 1 from identity.account where id = target_account_id) then
    return jsonb_build_object('ok', true, 'alreadyUnsubscribed', true);
  end if;

  insert into consent.age_and_consent_status (
    account_id, is_14_or_older, policy_version, required_terms_version,
    required_privacy_version, marketing_opt_in, marketing_consent_version,
    marketing_consent_updated_at, updated_at
  ) values (
    target_account_id, false, 'unknown', 'unknown', 'unknown', false,
    'NUANG-MARKETING-EMAIL-KO-2026-08-03', v_now, v_now
  ) on conflict (account_id) do update set
    marketing_opt_in = false,
    marketing_consent_version = 'NUANG-MARKETING-EMAIL-KO-2026-08-03',
    marketing_consent_updated_at = v_now,
    updated_at = v_now;

  insert into consent.consent_record (
    account_id, consent_type, consent_version, status, source,
    recorded_at, revoked_at, metadata
  ) values (
    target_account_id, 'marketing', 'NUANG-MARKETING-EMAIL-KO-2026-08-03',
    'revoked', left(coalesce(nullif(btrim(target_source), ''), 'email_unsubscribe'), 120),
    v_now, v_now, jsonb_build_object('channel', 'email')
  );

  insert into consent.marketing_suppression(account_id, channel, reason, created_at)
  values (target_account_id, 'email', 'member_unsubscribed', v_now)
  on conflict (account_id, channel) where removed_at is null do nothing;

  update consent.marketing_campaign_recipient set
    status = 'unsubscribed', unsubscribed_at = v_now,
    claimed_at = null, worker_token = null, updated_at = v_now
  where account_id = target_account_id and status in ('queued', 'retry');

  update consent.marketing_consent_confirmation_outbox set
    status = 'unsubscribed', unsubscribed_at = v_now,
    claimed_at = null, worker_token = null, updated_at = v_now
  where account_id = target_account_id and status in ('queued', 'retry');

  return jsonb_build_object('ok', true, 'unsubscribedAt', v_now);
end;
$$;

create or replace function consent.prepare_marketing_consent_confirmations(
  target_now timestamptz default now()
)
returns integer
language plpgsql
security definer
set search_path = pg_catalog, consent
as $$
declare
  v_inserted integer;
begin
  insert into consent.marketing_consent_confirmation_outbox (
    account_id, consent_version, original_consented_at, cycle_due_on,
    status, next_attempt_at
  )
  select
    audience.account_id,
    'NUANG-MARKETING-EMAIL-KO-2026-08-03',
    audience.consent_recorded_at,
    (anchor.last_notice_at + interval '2 years')::date,
    'queued', target_now
  from consent.resolve_marketing_audience('email') audience
  cross join lateral (
    select coalesce(
      max(outbox.sent_at),
      audience.consent_recorded_at
    ) as last_notice_at
    from consent.marketing_consent_confirmation_outbox outbox
    where outbox.account_id = audience.account_id
      and outbox.status in ('sent', 'delivered')
  ) anchor
  where anchor.last_notice_at <= target_now - interval '2 years'
  on conflict (account_id, cycle_due_on) do nothing;
  get diagnostics v_inserted = row_count;
  return v_inserted;
end;
$$;

create or replace function consent.claim_marketing_consent_confirmations(
  target_batch_size integer,
  target_worker_token uuid
)
returns setof consent.marketing_consent_confirmation_outbox
language plpgsql
security definer
set search_path = pg_catalog, consent
as $$
begin
  if target_worker_token is null then raise exception 'worker_token_required'; end if;
  if (now() at time zone 'Asia/Seoul')::time < time '08:00'
    or (now() at time zone 'Asia/Seoul')::time >= time '21:00' then
    return;
  end if;
  return query
  with candidate as (
    select outbox.id
    from consent.marketing_consent_confirmation_outbox outbox
    where (
      (outbox.status in ('queued', 'retry') and outbox.next_attempt_at <= now())
      or (outbox.status = 'sending' and outbox.claimed_at < now() - interval '15 minutes')
    ) and outbox.attempt_count < 5
    order by outbox.created_at
    for update skip locked
    limit least(greatest(coalesce(target_batch_size, 10), 1), 50)
  )
  update consent.marketing_consent_confirmation_outbox outbox set
    status = 'sending', attempt_count = outbox.attempt_count + 1,
    claimed_at = now(), worker_token = target_worker_token, updated_at = now()
  from candidate where outbox.id = candidate.id
  returning outbox.*;
end;
$$;

create or replace function consent.complete_marketing_consent_confirmation(
  target_outbox_id uuid,
  target_worker_token uuid,
  target_outcome text,
  target_provider_message_id text,
  target_error_code text
)
returns jsonb
language plpgsql
security definer
set search_path = pg_catalog, consent
as $$
declare
  v_row consent.marketing_consent_confirmation_outbox%rowtype;
  v_next_status text;
begin
  select * into v_row from consent.marketing_consent_confirmation_outbox
  where id = target_outbox_id and status = 'sending' and worker_token = target_worker_token
  for update;
  if not found then return jsonb_build_object('ok', false, 'code', 'claim_not_found'); end if;

  if target_outcome = 'sent' then
    update consent.marketing_consent_confirmation_outbox set
      status = 'sent', provider_message_id = target_provider_message_id,
      last_error_code = null, sent_at = now(), claimed_at = null,
      worker_token = null, updated_at = now()
    where id = target_outbox_id;
    v_next_status := 'sent';
  elsif target_outcome in ('unsubscribed', 'suppressed', 'skipped') then
    update consent.marketing_consent_confirmation_outbox set
      status = target_outcome,
      last_error_code = left(coalesce(target_error_code, target_outcome), 160),
      claimed_at = null, worker_token = null, updated_at = now(),
      unsubscribed_at = case when target_outcome = 'unsubscribed' then now() else unsubscribed_at end
    where id = target_outbox_id;
    v_next_status := target_outcome;
  elsif target_outcome = 'retry' then
    v_next_status := case when v_row.attempt_count >= 5 then 'failed' else 'retry' end;
    update consent.marketing_consent_confirmation_outbox set
      status = v_next_status,
      next_attempt_at = now() + case v_row.attempt_count
        when 1 then interval '1 minute'
        when 2 then interval '5 minutes'
        when 3 then interval '30 minutes'
        when 4 then interval '2 hours'
        else interval '12 hours'
      end,
      last_error_code = left(coalesce(target_error_code, 'delivery_failed'), 160),
      claimed_at = null, worker_token = null, updated_at = now()
    where id = target_outbox_id;
  else
    raise exception 'unsupported_marketing_delivery_outcome';
  end if;
  return jsonb_build_object('ok', true, 'status', v_next_status);
end;
$$;

create or replace function consent.record_marketing_email_webhook(
  target_provider_message_id text,
  target_event_type text,
  target_occurred_at timestamptz
)
returns jsonb
language plpgsql
security definer
set search_path = pg_catalog, consent
as $$
declare
  v_account_id uuid;
  v_campaign_id uuid;
begin
  if target_event_type not in ('email.delivered', 'email.bounced', 'email.complained') then
    return jsonb_build_object('ok', true, 'ignored', true);
  end if;

  update consent.marketing_campaign_recipient set
    status = case target_event_type
      when 'email.delivered' then case
        when status = 'sent' then 'delivered' else status end
      when 'email.bounced' then 'bounced'
      when 'email.complained' then 'complained' end,
    delivered_at = case when target_event_type = 'email.delivered' then coalesce(delivered_at, target_occurred_at) else delivered_at end,
    bounced_at = case when target_event_type = 'email.bounced' then coalesce(bounced_at, target_occurred_at) else bounced_at end,
    complained_at = case when target_event_type = 'email.complained' then coalesce(complained_at, target_occurred_at) else complained_at end,
    updated_at = now()
  where provider_message_id = target_provider_message_id
  returning account_id, campaign_id into v_account_id, v_campaign_id;

  if v_account_id is null then
    update consent.marketing_consent_confirmation_outbox set
      status = case target_event_type
        when 'email.delivered' then case
          when status = 'sent' then 'delivered' else status end
        when 'email.bounced' then 'bounced'
        when 'email.complained' then 'complained' end,
      delivered_at = case when target_event_type = 'email.delivered' then coalesce(delivered_at, target_occurred_at) else delivered_at end,
      bounced_at = case when target_event_type = 'email.bounced' then coalesce(bounced_at, target_occurred_at) else bounced_at end,
      complained_at = case when target_event_type = 'email.complained' then coalesce(complained_at, target_occurred_at) else complained_at end,
      updated_at = now()
    where provider_message_id = target_provider_message_id
    returning account_id into v_account_id;
  end if;

  if v_account_id is not null then
    insert into consent.marketing_email_event (
      provider_message_id, event_type, account_id, campaign_id, occurred_at
    ) values (
      target_provider_message_id, target_event_type, v_account_id, v_campaign_id, target_occurred_at
    ) on conflict (provider_message_id, event_type) do nothing;
  end if;

  if v_account_id is not null and target_event_type in ('email.bounced', 'email.complained') then
    insert into consent.marketing_suppression(account_id, channel, reason, created_at)
    values (
      v_account_id, 'email',
      case when target_event_type = 'email.complained' then 'provider_spam_complaint' else 'provider_hard_bounce' end,
      target_occurred_at
    ) on conflict (account_id, channel) where removed_at is null do nothing;

    update consent.marketing_campaign_recipient set
      status = 'suppressed', updated_at = now()
    where account_id = v_account_id and status in ('queued', 'retry');
    update consent.marketing_consent_confirmation_outbox set
      status = 'suppressed', updated_at = now()
    where account_id = v_account_id and status in ('queued', 'retry');
  end if;

  return jsonb_build_object('ok', true, 'matched', v_account_id is not null);
end;
$$;

revoke execute on function consent.resolve_marketing_audience(text) from public, anon, authenticated;
grant execute on function consent.resolve_marketing_audience(text) to service_role;
revoke all on function consent.clear_member_unsubscribe_on_marketing_opt_in() from public, anon, authenticated;
revoke all on function consent.admin_upsert_marketing_campaign(uuid, uuid, text, text, text, text, text, text, text) from public, anon, authenticated;
grant execute on function consent.admin_upsert_marketing_campaign(uuid, uuid, text, text, text, text, text, text, text) to service_role;
revoke all on function consent.admin_manage_marketing_campaign(uuid, uuid, text, timestamptz) from public, anon, authenticated;
grant execute on function consent.admin_manage_marketing_campaign(uuid, uuid, text, timestamptz) to service_role;
revoke all on function consent.claim_marketing_email_outbox(integer, uuid) from public, anon, authenticated;
grant execute on function consent.claim_marketing_email_outbox(integer, uuid) to service_role;
revoke all on function consent.complete_marketing_email_outbox(uuid, uuid, text, text, text) from public, anon, authenticated;
grant execute on function consent.complete_marketing_email_outbox(uuid, uuid, text, text, text) to service_role;
revoke all on function consent.unsubscribe_marketing_email(uuid, text) from public, anon, authenticated;
grant execute on function consent.unsubscribe_marketing_email(uuid, text) to service_role;
revoke all on function consent.prepare_marketing_consent_confirmations(timestamptz) from public, anon, authenticated;
grant execute on function consent.prepare_marketing_consent_confirmations(timestamptz) to service_role, postgres;
revoke all on function consent.claim_marketing_consent_confirmations(integer, uuid) from public, anon, authenticated;
grant execute on function consent.claim_marketing_consent_confirmations(integer, uuid) to service_role;
revoke all on function consent.complete_marketing_consent_confirmation(uuid, uuid, text, text, text) from public, anon, authenticated;
grant execute on function consent.complete_marketing_consent_confirmation(uuid, uuid, text, text, text) to service_role;
revoke all on function consent.record_marketing_email_webhook(text, text, timestamptz) from public, anon, authenticated;
grant execute on function consent.record_marketing_email_webhook(text, text, timestamptz) to service_role;

comment on table consent.marketing_campaign is
  'Structured operator-authored email campaign content. Arbitrary HTML and raw recipient addresses are not stored.';
comment on table consent.marketing_campaign_recipient is
  'Account-reference-only marketing email outbox with bounded retry, idempotency and provider event state.';
comment on function consent.resolve_marketing_audience(text) is
  'Release 1 service-only audience contract. Only email is supported and no raw contact value is returned.';

commit;

-- Scheduler setup intentionally runs outside the transaction so a missing
-- extension does not partially apply the data model.
create extension if not exists pg_cron with schema extensions;
create extension if not exists pg_net with schema extensions;
create extension if not exists supabase_vault with schema vault;

create or replace function public.invoke_marketing_email_outbox_drain()
returns bigint
language plpgsql
security definer
set search_path = pg_catalog, public, vault, net
as $$
declare
  app_origin text;
  cron_secret text;
  request_id bigint;
begin
  select decrypted_secret into app_origin
  from vault.decrypted_secrets where name = 'nuang_app_origin'
  order by created_at desc limit 1;
  select decrypted_secret into cron_secret
  from vault.decrypted_secrets where name = 'nuang_ad_outbox_cron_secret'
  order by created_at desc limit 1;

  app_origin := rtrim(coalesce(app_origin, ''), '/');
  cron_secret := btrim(coalesce(cron_secret, ''));
  if app_origin !~ '^https://[a-z0-9.-]+(?::[0-9]+)?$' then
    raise exception 'nuang_app_origin Vault secret is missing or invalid';
  end if;
  if char_length(cron_secret) < 32 then
    raise exception 'nuang_ad_outbox_cron_secret Vault secret is missing or invalid';
  end if;

  select net.http_post(
    url := app_origin || '/api/internal/marketing/outbox/drain',
    headers := jsonb_build_object(
      'Authorization', 'Bearer ' || cron_secret,
      'Content-Type', 'application/json'
    ),
    body := '{}'::jsonb,
    timeout_milliseconds := 30000
  ) into request_id;
  return request_id;
end;
$$;

revoke all on function public.invoke_marketing_email_outbox_drain()
from public, anon, authenticated, service_role;
grant execute on function public.invoke_marketing_email_outbox_drain() to postgres;

do $$
declare existing_job_id bigint;
begin
  select jobid into existing_job_id from cron.job
  where jobname = 'nuang-marketing-email-outbox-drain' limit 1;
  if existing_job_id is not null then perform cron.unschedule(existing_job_id); end if;
  perform cron.schedule(
    'nuang-marketing-email-outbox-drain', '* * * * *',
    'select public.invoke_marketing_email_outbox_drain();'
  );

  select jobid into existing_job_id from cron.job
  where jobname = 'nuang-marketing-consent-confirmation-prepare' limit 1;
  if existing_job_id is not null then perform cron.unschedule(existing_job_id); end if;
  perform cron.schedule(
    'nuang-marketing-consent-confirmation-prepare', '31 18 * * *',
    'select consent.prepare_marketing_consent_confirmations(now());'
  );
end;
$$;
