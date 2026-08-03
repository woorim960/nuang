begin;

-- Release 1.1 hardens the marketing runtime so an operator can stop, inspect,
-- test and recover delivery without opening Supabase or Vercel.  No raw
-- recipient address is added to any operations table.
alter table consent.marketing_campaign
  add column if not exists content_fingerprint text,
  add column if not exists control_version bigint not null default 1,
  add column if not exists last_tested_at timestamptz,
  add column if not exists last_tested_by_account_id uuid
    references identity.account(id) on delete set null,
  add column if not exists last_test_content_fingerprint text;

alter table consent.marketing_campaign_recipient
  add column if not exists control_version bigint not null default 1;

alter table consent.marketing_campaign_recipient
  drop constraint if exists marketing_campaign_recipient_status_check;
alter table consent.marketing_campaign_recipient
  add constraint marketing_campaign_recipient_status_check check (
    status in (
      'queued', 'sending', 'retry', 'sent', 'delivered',
      'delivery_delayed', 'bounced', 'complained', 'unsubscribed',
      'suppressed', 'skipped', 'failed', 'cancelled'
    )
  );

update consent.marketing_campaign
set content_fingerprint = md5(concat_ws(
  E'\x1f', subject, eyebrow, heading, body,
  coalesce(cta_label, ''), coalesce(cta_url, '')
))
where content_fingerprint is null;

alter table consent.marketing_campaign
  alter column content_fingerprint set not null;

create table if not exists consent.marketing_channel_control (
  channel text primary key check (channel = 'email'),
  emergency_paused boolean not null default false,
  pause_reason text,
  control_version bigint not null default 1,
  updated_by_account_id uuid references identity.account(id) on delete set null,
  updated_at timestamptz not null default now(),
  check (
    (emergency_paused = false)
    or char_length(btrim(coalesce(pause_reason, ''))) between 5 and 500
  )
);

insert into consent.marketing_channel_control (
  channel, emergency_paused, pause_reason
) values ('email', false, null)
on conflict (channel) do nothing;

create table if not exists consent.marketing_test_delivery (
  id uuid primary key default gen_random_uuid(),
  campaign_id uuid not null
    references consent.marketing_campaign(id) on delete cascade,
  admin_account_id uuid not null
    references identity.account(id) on delete restrict,
  content_fingerprint text not null,
  provider_message_id text not null check (
    char_length(provider_message_id) between 2 and 500
  ),
  status text not null default 'sent' check (
    status in (
      'sent', 'delivered', 'delivery_delayed', 'failed', 'bounced',
      'complained', 'suppressed'
    )
  ),
  sent_at timestamptz not null default now(),
  last_event_at timestamptz,
  created_at timestamptz not null default now(),
  unique (provider_message_id)
);

create index if not exists marketing_test_delivery_campaign_idx
on consent.marketing_test_delivery(campaign_id, created_at desc);

create table if not exists consent.marketing_worker_run (
  id uuid primary key,
  source text not null check (source in ('cron', 'manual')),
  status text not null check (status in ('running', 'succeeded', 'degraded', 'failed', 'locked')),
  claimed_count integer not null default 0 check (claimed_count >= 0),
  confirmation_count integer not null default 0 check (confirmation_count >= 0),
  sent_count integer not null default 0 check (sent_count >= 0),
  failed_count integer not null default 0 check (failed_count >= 0),
  completion_failed_count integer not null default 0 check (completion_failed_count >= 0),
  error_code text check (error_code is null or char_length(error_code) <= 160),
  started_at timestamptz not null default now(),
  finished_at timestamptz,
  updated_at timestamptz not null default now()
);

create index if not exists marketing_worker_run_recent_idx
on consent.marketing_worker_run(started_at desc);

create table if not exists consent.marketing_webhook_receipt (
  svix_id text primary key check (char_length(svix_id) between 2 and 300),
  provider_message_id text not null check (char_length(provider_message_id) <= 500),
  event_type text not null check (char_length(event_type) between 2 and 100),
  occurred_at timestamptz not null,
  matched boolean not null default false,
  received_at timestamptz not null default now()
);

create table if not exists public.advertising_mail_worker_run (
  id uuid primary key,
  source text not null check (source in ('submission', 'cron', 'manual')),
  status text not null check (status in ('running', 'succeeded', 'degraded', 'failed')),
  claimed_count integer not null default 0 check (claimed_count >= 0),
  sent_count integer not null default 0 check (sent_count >= 0),
  failed_count integer not null default 0 check (failed_count >= 0),
  completion_failed_count integer not null default 0 check (completion_failed_count >= 0),
  error_code text check (error_code is null or char_length(error_code) <= 160),
  started_at timestamptz not null default now(),
  finished_at timestamptz,
  updated_at timestamptz not null default now()
);

create index if not exists advertising_mail_worker_run_recent_idx
on public.advertising_mail_worker_run(started_at desc);

create index if not exists marketing_webhook_receipt_recent_idx
on consent.marketing_webhook_receipt(received_at desc);

alter table consent.marketing_channel_control enable row level security;
alter table consent.marketing_test_delivery enable row level security;
alter table consent.marketing_worker_run enable row level security;
alter table consent.marketing_webhook_receipt enable row level security;
alter table public.advertising_mail_worker_run enable row level security;

revoke all on consent.marketing_channel_control from public, anon, authenticated;
revoke all on consent.marketing_test_delivery from public, anon, authenticated;
revoke all on consent.marketing_worker_run from public, anon, authenticated;
revoke all on consent.marketing_webhook_receipt from public, anon, authenticated;
revoke all on public.advertising_mail_worker_run from public, anon, authenticated;
grant select, insert, update, delete on consent.marketing_channel_control to service_role;
grant select, insert, update, delete on consent.marketing_test_delivery to service_role;
grant select, insert, update, delete on consent.marketing_worker_run to service_role;
grant select, insert, update, delete on consent.marketing_webhook_receipt to service_role;
grant select, insert, update, delete on public.advertising_mail_worker_run to service_role;

create or replace function consent.marketing_campaign_content_fingerprint(
  target_subject text,
  target_eyebrow text,
  target_heading text,
  target_body text,
  target_cta_label text,
  target_cta_url text
)
returns text
language sql
immutable
set search_path = pg_catalog
as $$
  select md5(concat_ws(
    E'\x1f',
    btrim(coalesce(target_subject, '')),
    btrim(coalesce(target_eyebrow, '')),
    btrim(coalesce(target_heading, '')),
    btrim(coalesce(target_body, '')),
    btrim(coalesce(target_cta_label, '')),
    btrim(coalesce(target_cta_url, ''))
  ));
$$;

create or replace function consent.sync_marketing_campaign_content_fingerprint()
returns trigger
language plpgsql
set search_path = pg_catalog, consent
as $$
declare v_fingerprint text;
begin
  v_fingerprint := consent.marketing_campaign_content_fingerprint(
    new.subject, new.eyebrow, new.heading, new.body, new.cta_label, new.cta_url
  );
  if tg_op = 'UPDATE' and old.content_fingerprint is distinct from v_fingerprint then
    new.last_tested_at := null;
    new.last_tested_by_account_id := null;
    new.last_test_content_fingerprint := null;
  end if;
  new.content_fingerprint := v_fingerprint;
  return new;
end;
$$;

drop trigger if exists sync_marketing_campaign_content_fingerprint
on consent.marketing_campaign;
create trigger sync_marketing_campaign_content_fingerprint
before insert or update of subject, eyebrow, heading, body, cta_label, cta_url
on consent.marketing_campaign
for each row execute function consent.sync_marketing_campaign_content_fingerprint();

-- Every risky admin RPC verifies the server-synchronised operator marker as a
-- defence-in-depth assertion.  The application allow-list remains the source
-- of administrator authorization.
create or replace function consent.assert_marketing_operator(target_account_id uuid)
returns void
language plpgsql
stable
security definer
set search_path = pg_catalog, identity
as $$
begin
  if not exists (
    select 1
    from identity.account account
    join identity.operator_account operator
      on operator.account_id = account.id
    where account.id = target_account_id
      and account.status = 'active'
      and account.deleted_at is null
  ) then
    raise exception 'marketing_operator_required';
  end if;
end;
$$;

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
  perform consent.assert_marketing_operator(target_admin_account_id);
  if char_length(btrim(coalesce(target_internal_name, ''))) not between 2 and 100
    or char_length(btrim(coalesce(target_subject, ''))) not between 2 and 90
    or char_length(btrim(coalesce(target_eyebrow, ''))) not between 2 and 50
    or char_length(btrim(coalesce(target_heading, ''))) not between 2 and 100
    or char_length(btrim(coalesce(target_body, ''))) not between 10 and 4000 then
    raise exception 'marketing_campaign_content_invalid';
  end if;
  if (nullif(btrim(target_cta_label), '') is null)
    is distinct from (nullif(btrim(target_cta_url), '') is null) then
    raise exception 'marketing_campaign_cta_pair_required';
  end if;
  if nullif(btrim(target_cta_url), '') is not null
    and btrim(target_cta_url) !~ '^https://([a-z0-9-]+\.)*nuang\.app(/|$)' then
    raise exception 'marketing_campaign_cta_not_allowed';
  end if;

  select status into v_previous_status
  from consent.marketing_campaign where id = v_id for update;
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
  ) on conflict (id) do update set
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
    jsonb_build_object(
      'previousStatus', v_previous_status,
      'nextStatus', 'draft',
      'contentFingerprint', (select content_fingerprint from consent.marketing_campaign where id = v_id)
    )
  );
  return jsonb_build_object(
    'ok', true,
    'campaignId', v_id,
    'status', 'draft',
    'contentFingerprint', (select content_fingerprint from consent.marketing_campaign where id = v_id)
  );
end;
$$;

create or replace function consent.admin_record_marketing_campaign_test(
  target_admin_account_id uuid,
  target_campaign_id uuid,
  target_provider_message_id text
)
returns jsonb
language plpgsql
security definer
set search_path = pg_catalog, consent, audit
as $$
declare v_campaign consent.marketing_campaign%rowtype;
begin
  perform consent.assert_marketing_operator(target_admin_account_id);
  select * into v_campaign from consent.marketing_campaign
  where id = target_campaign_id for update;
  if not found then raise exception 'marketing_campaign_not_found'; end if;
  if v_campaign.status <> 'draft' then raise exception 'marketing_campaign_test_requires_draft'; end if;
  if char_length(btrim(coalesce(target_provider_message_id, ''))) not between 2 and 500 then
    raise exception 'marketing_test_provider_id_required';
  end if;

  insert into consent.marketing_test_delivery (
    campaign_id, admin_account_id, content_fingerprint, provider_message_id,
    status, sent_at, created_at
  ) values (
    target_campaign_id, target_admin_account_id, v_campaign.content_fingerprint,
    btrim(target_provider_message_id), 'sent', now(), now()
  );
  update consent.marketing_campaign set
    last_tested_at = now(),
    last_tested_by_account_id = target_admin_account_id,
    last_test_content_fingerprint = content_fingerprint,
    updated_at = now()
  where id = target_campaign_id;
  insert into audit.admin_audit_log (
    admin_account_id, action, target_table, target_id, metadata
  ) values (
    target_admin_account_id, 'marketing_campaign_test_sent',
    'consent.marketing_campaign', target_campaign_id,
    jsonb_build_object(
      'contentFingerprint', v_campaign.content_fingerprint,
      'providerMessageId', btrim(target_provider_message_id)
    )
  );
  return jsonb_build_object('ok', true, 'campaignId', target_campaign_id);
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
set search_path = pg_catalog, consent, audit
as $$
declare
  v_campaign consent.marketing_campaign%rowtype;
  v_audience_count integer := 0;
begin
  perform consent.assert_marketing_operator(target_admin_account_id);
  select * into v_campaign from consent.marketing_campaign
  where id = target_campaign_id for update;
  if not found then raise exception 'marketing_campaign_not_found'; end if;

  if target_action = 'approve' then
    if v_campaign.status <> 'draft' then raise exception 'marketing_campaign_must_be_draft'; end if;
    if v_campaign.last_tested_at is null
      or v_campaign.last_test_content_fingerprint is distinct from v_campaign.content_fingerprint then
      raise exception 'marketing_campaign_current_version_test_required';
    end if;
    update consent.marketing_campaign set
      status = 'approved', approved_by_account_id = target_admin_account_id,
      approved_at = now(), updated_at = now()
    where id = target_campaign_id;
  elsif target_action = 'queue' then
    if v_campaign.status <> 'approved' then raise exception 'marketing_campaign_must_be_approved'; end if;
    if exists (
      select 1 from consent.marketing_channel_control
      where channel = 'email' and emergency_paused = true
    ) then raise exception 'marketing_channel_emergency_paused'; end if;
    if target_scheduled_at > now() + interval '1 year' then
      raise exception 'marketing_campaign_schedule_too_far';
    end if;
    insert into consent.marketing_campaign_recipient (
      campaign_id, account_id, status, consent_recorded_at,
      contact_verified_at, next_attempt_at, control_version
    )
    select
      target_campaign_id, audience.account_id, 'queued',
      audience.consent_recorded_at, audience.contact_verified_at,
      greatest(coalesce(target_scheduled_at, now()), now()),
      v_campaign.control_version
    from consent.resolve_marketing_audience('email') audience
    on conflict (campaign_id, account_id) do nothing;
    get diagnostics v_audience_count = row_count;
    if v_audience_count = 0 then raise exception 'marketing_campaign_audience_empty'; end if;
    update consent.marketing_campaign set
      status = 'queued',
      scheduled_at = greatest(coalesce(target_scheduled_at, now()), now()),
      audience_count = v_audience_count,
      queued_at = now(), updated_at = now()
    where id = target_campaign_id;
  elsif target_action = 'pause' then
    if v_campaign.status not in ('queued', 'sending') then raise exception 'marketing_campaign_not_pausable'; end if;
    update consent.marketing_campaign set
      status = 'paused', control_version = control_version + 1, updated_at = now()
    where id = target_campaign_id;
  elsif target_action = 'resume' then
    if v_campaign.status <> 'paused' then raise exception 'marketing_campaign_not_paused'; end if;
    if exists (
      select 1 from consent.marketing_channel_control
      where channel = 'email' and emergency_paused = true
    ) then raise exception 'marketing_channel_emergency_paused'; end if;
    update consent.marketing_campaign set
      control_version = control_version + 1,
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
    update consent.marketing_campaign_recipient recipient set
      control_version = campaign.control_version,
      status = case when recipient.status = 'sending' then 'retry' else recipient.status end,
      claimed_at = null, worker_token = null, next_attempt_at = now(), updated_at = now()
    from consent.marketing_campaign campaign
    where campaign.id = target_campaign_id
      and recipient.campaign_id = target_campaign_id
      and recipient.status in ('queued', 'sending', 'retry');
  elsif target_action = 'cancel' then
    if v_campaign.status in ('completed', 'cancelled') then raise exception 'marketing_campaign_already_final'; end if;
    update consent.marketing_campaign set
      status = 'cancelled', control_version = control_version + 1,
      cancelled_at = now(), updated_at = now()
    where id = target_campaign_id;
    update consent.marketing_campaign_recipient set
      status = 'cancelled', claimed_at = null, worker_token = null, updated_at = now()
    where campaign_id = target_campaign_id and status in ('queued', 'sending', 'retry');
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
      'audienceCount', v_audience_count,
      'contentFingerprint', v_campaign.content_fingerprint
    )
  );
  return jsonb_build_object(
    'ok', true, 'campaignId', target_campaign_id,
    'action', target_action, 'audienceCount', v_audience_count
  );
end;
$$;

create or replace function consent.admin_set_marketing_channel_control(
  target_admin_account_id uuid,
  target_paused boolean,
  target_reason text
)
returns jsonb
language plpgsql
security definer
set search_path = pg_catalog, consent, audit
as $$
declare v_reason text := nullif(btrim(target_reason), '');
begin
  perform consent.assert_marketing_operator(target_admin_account_id);
  if v_reason is null or char_length(v_reason) not between 5 and 500 then
    raise exception 'marketing_control_reason_required';
  end if;
  insert into consent.marketing_channel_control (
    channel, emergency_paused, pause_reason, control_version,
    updated_by_account_id, updated_at
  ) values (
    'email', target_paused, v_reason, 2, target_admin_account_id, now()
  ) on conflict (channel) do update set
    emergency_paused = excluded.emergency_paused,
    pause_reason = excluded.pause_reason,
    control_version = consent.marketing_channel_control.control_version + 1,
    updated_by_account_id = excluded.updated_by_account_id,
    updated_at = now();
  insert into audit.admin_audit_log (
    admin_account_id, action, target_table, target_id, metadata
  ) values (
    target_admin_account_id,
    case when target_paused then 'marketing_channel_emergency_paused' else 'marketing_channel_emergency_resumed' end,
    'consent.marketing_channel_control', null,
    jsonb_build_object('channel', 'email', 'reason', v_reason)
  );
  return jsonb_build_object('ok', true, 'paused', target_paused);
end;
$$;

create or replace function consent.admin_retry_marketing_campaign_failures(
  target_admin_account_id uuid,
  target_campaign_id uuid,
  target_reason text
)
returns jsonb
language plpgsql
security definer
set search_path = pg_catalog, consent, audit
as $$
declare v_count integer; v_reason text := nullif(btrim(target_reason), '');
begin
  perform consent.assert_marketing_operator(target_admin_account_id);
  if v_reason is null or char_length(v_reason) not between 5 and 500 then
    raise exception 'marketing_retry_reason_required';
  end if;
  if exists (
    select 1 from consent.marketing_channel_control
    where channel = 'email' and emergency_paused = true
  ) then raise exception 'marketing_channel_emergency_paused'; end if;
  update consent.marketing_campaign_recipient set
    status = 'retry', attempt_count = 0, next_attempt_at = now(),
    claimed_at = null, worker_token = null, last_error_code = null,
    updated_at = now()
  where campaign_id = target_campaign_id
    and status = 'failed'
    and provider_message_id is null;
  get diagnostics v_count = row_count;
  if v_count = 0 then raise exception 'marketing_retryable_failure_empty'; end if;
  update consent.marketing_campaign set status = 'queued', updated_at = now()
  where id = target_campaign_id and status = 'failed';
  insert into audit.admin_audit_log (
    admin_account_id, action, target_table, target_id, metadata
  ) values (
    target_admin_account_id, 'marketing_campaign_failures_requeued',
    'consent.marketing_campaign', target_campaign_id,
    jsonb_build_object('count', v_count, 'reason', v_reason)
  );
  return jsonb_build_object('ok', true, 'requeued', v_count);
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
  if exists (
    select 1 from consent.marketing_channel_control
    where channel = 'email' and emergency_paused = true
  ) then return; end if;
  if (now() at time zone 'Asia/Seoul')::time < time '08:00'
    or (now() at time zone 'Asia/Seoul')::time >= time '21:00' then return; end if;
  return query
  with candidate as (
    select recipient.id
    from consent.marketing_campaign_recipient recipient
    join consent.marketing_campaign campaign on campaign.id = recipient.campaign_id
    where campaign.status in ('queued', 'sending')
      and recipient.control_version = campaign.control_version
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
  ) select * from updated;
  update consent.marketing_campaign campaign set status = 'sending', updated_at = now()
  where status = 'queued' and exists (
    select 1 from consent.marketing_campaign_recipient recipient
    where recipient.campaign_id = campaign.id and recipient.worker_token = target_worker_token
  );
end;
$$;

create or replace function consent.authorize_marketing_email_delivery(
  target_outbox_id uuid,
  target_worker_token uuid
)
returns jsonb
language plpgsql
security definer
set search_path = pg_catalog, consent
as $$
declare
  v_row consent.marketing_campaign_recipient%rowtype;
  v_campaign consent.marketing_campaign%rowtype;
  v_current_consent timestamptz;
  v_suppression_reason text;
begin
  select * into v_row from consent.marketing_campaign_recipient
  where id = target_outbox_id and status = 'sending'
    and worker_token = target_worker_token for update;
  if not found then return jsonb_build_object('ok', false, 'outcome', 'skipped', 'code', 'claim_not_found'); end if;
  select * into v_campaign from consent.marketing_campaign
  where id = v_row.campaign_id;
  if v_campaign.status = 'paused' then
    return jsonb_build_object('ok', false, 'outcome', 'retry', 'code', 'campaign_paused');
  end if;
  if v_campaign.status not in ('queued', 'sending')
    or v_row.control_version <> v_campaign.control_version then
    return jsonb_build_object('ok', false, 'outcome', 'skipped', 'code', 'campaign_control_changed');
  end if;
  if exists (
    select 1 from consent.marketing_channel_control
    where channel = 'email' and emergency_paused = true
  ) then
    return jsonb_build_object('ok', false, 'outcome', 'retry', 'code', 'channel_emergency_paused');
  end if;
  select suppression.reason into v_suppression_reason
  from consent.marketing_suppression suppression
  where suppression.account_id = v_row.account_id
    and suppression.channel in ('email', 'all') and suppression.removed_at is null
  order by case
    when suppression.reason = 'provider_spam_complaint' then 1
    when suppression.reason in ('provider_hard_bounce', 'provider_suppressed') then 2
    else 3 end
  limit 1;
  if v_suppression_reason is not null then
    return jsonb_build_object(
      'ok', false,
      'outcome', case when v_suppression_reason = 'member_unsubscribed' then 'unsubscribed' else 'suppressed' end,
      'code', v_suppression_reason
    );
  end if;
  select audience.consent_recorded_at into v_current_consent
  from consent.resolve_marketing_audience('email') audience
  where audience.account_id = v_row.account_id;
  if v_current_consent is null then
    return jsonb_build_object('ok', false, 'outcome', 'skipped', 'code', 'recipient_not_eligible');
  end if;
  if v_current_consent is distinct from v_row.consent_recorded_at then
    return jsonb_build_object('ok', false, 'outcome', 'skipped', 'code', 'consent_cycle_changed');
  end if;
  return jsonb_build_object('ok', true, 'outcome', 'sent');
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
  if exists (
    select 1 from consent.marketing_channel_control
    where channel = 'email' and emergency_paused = true
  ) then return; end if;
  if (now() at time zone 'Asia/Seoul')::time < time '08:00'
    or (now() at time zone 'Asia/Seoul')::time >= time '21:00' then return; end if;
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

create or replace function consent.authorize_marketing_confirmation_delivery(
  target_outbox_id uuid,
  target_worker_token uuid
)
returns jsonb
language plpgsql
security definer
set search_path = pg_catalog, consent
as $$
declare
  v_row consent.marketing_consent_confirmation_outbox%rowtype;
  v_current_consent timestamptz;
  v_suppression_reason text;
begin
  select * into v_row from consent.marketing_consent_confirmation_outbox
  where id = target_outbox_id and status = 'sending'
    and worker_token = target_worker_token for update;
  if not found then return jsonb_build_object('ok', false, 'outcome', 'skipped', 'code', 'claim_not_found'); end if;
  if exists (
    select 1 from consent.marketing_channel_control
    where channel = 'email' and emergency_paused = true
  ) then return jsonb_build_object('ok', false, 'outcome', 'retry', 'code', 'channel_emergency_paused'); end if;
  select suppression.reason into v_suppression_reason
  from consent.marketing_suppression suppression
  where suppression.account_id = v_row.account_id
    and suppression.channel in ('email', 'all') and suppression.removed_at is null
  order by case
    when suppression.reason = 'provider_spam_complaint' then 1
    when suppression.reason in ('provider_hard_bounce', 'provider_suppressed') then 2
    else 3 end
  limit 1;
  if v_suppression_reason is not null then
    return jsonb_build_object(
      'ok', false,
      'outcome', case when v_suppression_reason = 'member_unsubscribed' then 'unsubscribed' else 'suppressed' end,
      'code', v_suppression_reason
    );
  end if;
  select audience.consent_recorded_at into v_current_consent
  from consent.resolve_marketing_audience('email') audience
  where audience.account_id = v_row.account_id;
  if v_current_consent is null then
    return jsonb_build_object('ok', false, 'outcome', 'skipped', 'code', 'recipient_not_eligible');
  end if;
  if v_current_consent is distinct from v_row.original_consented_at then
    return jsonb_build_object('ok', false, 'outcome', 'skipped', 'code', 'consent_cycle_changed');
  end if;
  return jsonb_build_object('ok', true, 'outcome', 'sent');
end;
$$;

-- Escalate an existing member unsubscribe to the stronger provider reason.
-- This prevents a later member re-opt-in from clearing a hard bounce or spam
-- complaint that arrived after the unsubscribe.
create or replace function consent.record_marketing_email_webhook_v2(
  target_svix_id text,
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
  v_matched boolean := false;
  v_reason text;
begin
  if target_event_type not in (
    'email.sent', 'email.delivered', 'email.delivery_delayed',
    'email.failed', 'email.bounced', 'email.complained', 'email.suppressed'
  ) then return jsonb_build_object('ok', true, 'ignored', true); end if;
  if char_length(btrim(coalesce(target_svix_id, ''))) not between 2 and 300 then
    raise exception 'marketing_webhook_id_required';
  end if;
  insert into consent.marketing_webhook_receipt (
    svix_id, provider_message_id, event_type, occurred_at
  ) values (
    btrim(target_svix_id), target_provider_message_id,
    target_event_type, target_occurred_at
  ) on conflict (svix_id) do nothing;
  if not found then return jsonb_build_object('ok', true, 'duplicate', true); end if;

  update consent.marketing_campaign_recipient set
    status = case target_event_type
      when 'email.delivered' then case when status in ('sent', 'delivery_delayed') then 'delivered' else status end
      when 'email.delivery_delayed' then case when status = 'sent' then 'delivery_delayed' else status end
      when 'email.failed' then case when status not in ('delivered', 'complained') then 'failed' else status end
      when 'email.bounced' then case when status <> 'complained' then 'bounced' else status end
      when 'email.complained' then 'complained'
      when 'email.suppressed' then 'suppressed'
      else status end,
    delivered_at = case when target_event_type = 'email.delivered' then coalesce(delivered_at, target_occurred_at) else delivered_at end,
    bounced_at = case when target_event_type = 'email.bounced' then coalesce(bounced_at, target_occurred_at) else bounced_at end,
    complained_at = case when target_event_type = 'email.complained' then coalesce(complained_at, target_occurred_at) else complained_at end,
    last_error_code = case when target_event_type in ('email.failed', 'email.suppressed') then left(target_event_type, 160) else last_error_code end,
    updated_at = now()
  where provider_message_id = target_provider_message_id
  returning account_id, campaign_id into v_account_id, v_campaign_id;

  if v_account_id is null then
    update consent.marketing_consent_confirmation_outbox set
      status = case target_event_type
        when 'email.delivered' then case when status = 'sent' then 'delivered' else status end
        when 'email.failed' then case when status not in ('delivered', 'complained') then 'failed' else status end
        when 'email.bounced' then case when status <> 'complained' then 'bounced' else status end
        when 'email.complained' then 'complained'
        when 'email.suppressed' then 'suppressed'
        else status end,
      delivered_at = case when target_event_type = 'email.delivered' then coalesce(delivered_at, target_occurred_at) else delivered_at end,
      bounced_at = case when target_event_type = 'email.bounced' then coalesce(bounced_at, target_occurred_at) else bounced_at end,
      complained_at = case when target_event_type = 'email.complained' then coalesce(complained_at, target_occurred_at) else complained_at end,
      last_error_code = case when target_event_type in ('email.failed', 'email.suppressed', 'email.delivery_delayed') then left(target_event_type, 160) else last_error_code end,
      updated_at = now()
    where provider_message_id = target_provider_message_id
    returning account_id into v_account_id;
  end if;

  if v_account_id is null then
    update consent.marketing_test_delivery set
      status = case target_event_type
        when 'email.delivered' then 'delivered'
        when 'email.delivery_delayed' then 'delivery_delayed'
        when 'email.failed' then 'failed'
        when 'email.bounced' then 'bounced'
        when 'email.complained' then 'complained'
        when 'email.suppressed' then 'suppressed'
        else status end,
      last_event_at = target_occurred_at
    where provider_message_id = target_provider_message_id
    returning campaign_id into v_campaign_id;
  end if;

  v_matched := v_account_id is not null or v_campaign_id is not null;
  insert into consent.marketing_email_event (
    provider_message_id, event_type, account_id, campaign_id, occurred_at
  ) values (
    target_provider_message_id, target_event_type, v_account_id,
    v_campaign_id, target_occurred_at
  ) on conflict (provider_message_id, event_type) do nothing;

  if v_account_id is not null and target_event_type in (
    'email.bounced', 'email.complained', 'email.suppressed'
  ) then
    v_reason := case
      when target_event_type = 'email.complained' then 'provider_spam_complaint'
      when target_event_type = 'email.suppressed' then 'provider_suppressed'
      else 'provider_hard_bounce' end;
    insert into consent.marketing_suppression(account_id, channel, reason, created_at)
    values (v_account_id, 'email', v_reason, target_occurred_at)
    on conflict (account_id, channel) where removed_at is null do update set
      reason = case
        when consent.marketing_suppression.reason = 'provider_spam_complaint' then consent.marketing_suppression.reason
        when excluded.reason = 'provider_spam_complaint' then excluded.reason
        when consent.marketing_suppression.reason in ('provider_hard_bounce', 'provider_suppressed') then consent.marketing_suppression.reason
        else excluded.reason end,
      created_at = least(consent.marketing_suppression.created_at, excluded.created_at);
    update consent.marketing_campaign_recipient set status = 'suppressed', updated_at = now()
    where account_id = v_account_id and status in ('queued', 'retry');
    update consent.marketing_consent_confirmation_outbox set status = 'suppressed', updated_at = now()
    where account_id = v_account_id and status in ('queued', 'retry');
  end if;

  update consent.marketing_webhook_receipt set matched = v_matched
  where svix_id = target_svix_id;
  return jsonb_build_object('ok', true, 'matched', v_matched);
end;
$$;

-- Keep the Release 1 function callable for compatibility, while routing all
-- new webhook traffic through the svix-id aware projection above.
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
begin
  return consent.record_marketing_email_webhook_v2(
    'legacy-' || md5(target_provider_message_id || ':' || target_event_type || ':' || target_occurred_at::text),
    target_provider_message_id, target_event_type, target_occurred_at
  );
end;
$$;

create or replace view consent.marketing_campaign_operations_summary as
select
  campaign.id,
  campaign.internal_name,
  campaign.subject,
  campaign.eyebrow,
  campaign.heading,
  campaign.body,
  campaign.cta_label,
  campaign.cta_url,
  campaign.status,
  campaign.scheduled_at,
  campaign.audience_count,
  campaign.approved_at,
  campaign.created_at,
  campaign.updated_at,
  campaign.content_fingerprint,
  campaign.last_tested_at,
  campaign.last_test_content_fingerprint,
  coalesce(count(recipient.id) filter (where recipient.status = 'queued'), 0)::bigint as queued_count,
  coalesce(count(recipient.id) filter (where recipient.status = 'sending'), 0)::bigint as sending_count,
  coalesce(count(recipient.id) filter (where recipient.status = 'retry'), 0)::bigint as retry_count,
  coalesce(count(recipient.id) filter (where recipient.status = 'sent'), 0)::bigint as sent_count,
  coalesce(count(recipient.id) filter (where recipient.status = 'delivered'), 0)::bigint as delivered_count,
  coalesce(count(recipient.id) filter (where recipient.status = 'delivery_delayed'), 0)::bigint as delayed_count,
  coalesce(count(recipient.id) filter (where recipient.status = 'bounced'), 0)::bigint as bounced_count,
  coalesce(count(recipient.id) filter (where recipient.status = 'complained'), 0)::bigint as complained_count,
  coalesce(count(recipient.id) filter (where recipient.status = 'unsubscribed'), 0)::bigint as unsubscribed_count,
  coalesce(count(recipient.id) filter (where recipient.status = 'suppressed'), 0)::bigint as suppressed_count,
  coalesce(count(recipient.id) filter (where recipient.status = 'skipped'), 0)::bigint as skipped_count,
  coalesce(count(recipient.id) filter (where recipient.status = 'failed'), 0)::bigint as failed_count,
  min(recipient.next_attempt_at) filter (where recipient.status in ('queued', 'retry')) as oldest_pending_at,
  max(test.status) filter (
    where test.content_fingerprint = campaign.content_fingerprint
  ) as current_test_status
from consent.marketing_campaign campaign
left join consent.marketing_campaign_recipient recipient
  on recipient.campaign_id = campaign.id
left join lateral (
  select delivery.status, delivery.content_fingerprint
  from consent.marketing_test_delivery delivery
  where delivery.campaign_id = campaign.id
  order by delivery.created_at desc
  limit 1
) test on true
group by campaign.id;

revoke all on consent.marketing_campaign_operations_summary from public, anon, authenticated;
grant select on consent.marketing_campaign_operations_summary to service_role;

create or replace function consent.admin_marketing_operations_snapshot()
returns jsonb
language sql
stable
security definer
set search_path = pg_catalog, consent
as $$
  select jsonb_build_object(
    'channelControl', coalesce((
      select jsonb_build_object(
        'paused', control.emergency_paused,
        'reason', control.pause_reason,
        'updatedAt', control.updated_at
      ) from consent.marketing_channel_control control where control.channel = 'email'
    ), jsonb_build_object('paused', true, 'reason', 'control_missing')),
    'queue', jsonb_build_object(
      'queued', (select count(*) from consent.marketing_campaign_recipient where status = 'queued'),
      'sending', (select count(*) from consent.marketing_campaign_recipient where status = 'sending'),
      'retry', (select count(*) from consent.marketing_campaign_recipient where status = 'retry'),
      'failed', (select count(*) from consent.marketing_campaign_recipient where status = 'failed'),
      'stale', (select count(*) from consent.marketing_campaign_recipient where status = 'sending' and claimed_at < now() - interval '15 minutes'),
      'oldestPendingAt', (select min(next_attempt_at) from consent.marketing_campaign_recipient where status in ('queued', 'retry'))
    ),
    'deliveryTotals', jsonb_build_object(
      'queued', (select count(*) from consent.marketing_campaign_recipient where status = 'queued'),
      'sending', (select count(*) from consent.marketing_campaign_recipient where status = 'sending'),
      'retry', (select count(*) from consent.marketing_campaign_recipient where status = 'retry'),
      'sent', (select count(*) from consent.marketing_campaign_recipient where status = 'sent'),
      'delayed', (select count(*) from consent.marketing_campaign_recipient where status = 'delivery_delayed'),
      'delivered', (select count(*) from consent.marketing_campaign_recipient where status = 'delivered'),
      'bounced', (select count(*) from consent.marketing_campaign_recipient where status = 'bounced'),
      'complained', (select count(*) from consent.marketing_campaign_recipient where status = 'complained'),
      'unsubscribed', (select count(*) from consent.marketing_campaign_recipient where status = 'unsubscribed'),
      'suppressed', (select count(*) from consent.marketing_campaign_recipient where status = 'suppressed'),
      'skipped', (select count(*) from consent.marketing_campaign_recipient where status = 'skipped'),
      'failed', (select count(*) from consent.marketing_campaign_recipient where status = 'failed')
    ),
    'confirmations', jsonb_build_object(
      'queued', (select count(*) from consent.marketing_consent_confirmation_outbox where status = 'queued'),
      'retry', (select count(*) from consent.marketing_consent_confirmation_outbox where status = 'retry'),
      'sent', (select count(*) from consent.marketing_consent_confirmation_outbox where status in ('sent', 'delivered')),
      'failed', (select count(*) from consent.marketing_consent_confirmation_outbox where status = 'failed'),
      'dueWithin30Days', (
        select count(*) from consent.resolve_marketing_audience('email') audience
        where audience.consent_recorded_at <= now() - interval '2 years' + interval '30 days'
      )
    ),
    'suppressions', jsonb_build_object(
      'active', (select count(*) from consent.marketing_suppression where channel in ('email', 'all') and removed_at is null),
      'memberUnsubscribed', (select count(*) from consent.marketing_suppression where channel = 'email' and reason = 'member_unsubscribed' and removed_at is null),
      'providerRisk', (select count(*) from consent.marketing_suppression where channel = 'email' and reason in ('provider_hard_bounce', 'provider_spam_complaint', 'provider_suppressed') and removed_at is null)
    ),
    'worker', coalesce((
      select jsonb_build_object(
        'status', run.status,
        'startedAt', run.started_at,
        'finishedAt', run.finished_at,
        'claimed', run.claimed_count + run.confirmation_count,
        'sent', run.sent_count,
        'failed', run.failed_count,
        'completionFailed', run.completion_failed_count,
        'errorCode', run.error_code
      ) from consent.marketing_worker_run run order by run.started_at desc limit 1
    ), '{}'::jsonb),
    'webhook', jsonb_build_object(
      'lastReceivedAt', (select max(received_at) from consent.marketing_webhook_receipt),
      'unmatched24h', (select count(*) from consent.marketing_webhook_receipt where matched = false and received_at >= now() - interval '24 hours')
    )
  );
$$;

revoke all on function consent.marketing_campaign_content_fingerprint(text, text, text, text, text, text) from public, anon, authenticated;
revoke all on function consent.sync_marketing_campaign_content_fingerprint() from public, anon, authenticated;
revoke all on function consent.assert_marketing_operator(uuid) from public, anon, authenticated;
revoke all on function consent.admin_record_marketing_campaign_test(uuid, uuid, text) from public, anon, authenticated;
revoke all on function consent.admin_set_marketing_channel_control(uuid, boolean, text) from public, anon, authenticated;
revoke all on function consent.admin_retry_marketing_campaign_failures(uuid, uuid, text) from public, anon, authenticated;
revoke all on function consent.authorize_marketing_email_delivery(uuid, uuid) from public, anon, authenticated;
revoke all on function consent.authorize_marketing_confirmation_delivery(uuid, uuid) from public, anon, authenticated;
revoke all on function consent.record_marketing_email_webhook_v2(text, text, text, timestamptz) from public, anon, authenticated;
revoke all on function consent.admin_marketing_operations_snapshot() from public, anon, authenticated;
grant execute on function consent.admin_record_marketing_campaign_test(uuid, uuid, text) to service_role;
grant execute on function consent.admin_set_marketing_channel_control(uuid, boolean, text) to service_role;
grant execute on function consent.admin_retry_marketing_campaign_failures(uuid, uuid, text) to service_role;
grant execute on function consent.authorize_marketing_email_delivery(uuid, uuid) to service_role;
grant execute on function consent.authorize_marketing_confirmation_delivery(uuid, uuid) to service_role;
grant execute on function consent.record_marketing_email_webhook_v2(text, text, text, timestamptz) to service_role;
grant execute on function consent.admin_marketing_operations_snapshot() to service_role;

comment on table consent.marketing_channel_control is
  'Database runtime kill switch for marketing email. Environment enablement and this control must both allow delivery.';
comment on table consent.marketing_test_delivery is
  'PII-free record proving which immutable campaign content version an operator sent as a test.';
comment on table consent.marketing_worker_run is
  'PII-free execution health used by the operations console to detect cron and worker failures.';
comment on table consent.marketing_webhook_receipt is
  'Svix-idempotent Resend webhook receipt metadata. Raw payload and recipient addresses are not retained.';

create or replace function public.record_advertising_mail_worker_run(
  target_run_id uuid,
  target_source text,
  target_status text,
  target_claimed_count integer default 0,
  target_sent_count integer default 0,
  target_failed_count integer default 0,
  target_completion_failed_count integer default 0,
  target_error_code text default null
)
returns jsonb
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
begin
  if target_run_id is null
    or target_source not in ('submission', 'cron', 'manual')
    or target_status not in ('running', 'succeeded', 'degraded', 'failed') then
    raise exception 'advertising_mail_worker_run_invalid';
  end if;
  insert into public.advertising_mail_worker_run (
    id, source, status, claimed_count, sent_count, failed_count,
    completion_failed_count, error_code, started_at, finished_at, updated_at
  ) values (
    target_run_id, target_source, target_status,
    greatest(coalesce(target_claimed_count, 0), 0),
    greatest(coalesce(target_sent_count, 0), 0),
    greatest(coalesce(target_failed_count, 0), 0),
    greatest(coalesce(target_completion_failed_count, 0), 0),
    left(target_error_code, 160), now(),
    case when target_status = 'running' then null else now() end, now()
  ) on conflict (id) do update set
    status = excluded.status,
    claimed_count = excluded.claimed_count,
    sent_count = excluded.sent_count,
    failed_count = excluded.failed_count,
    completion_failed_count = excluded.completion_failed_count,
    error_code = excluded.error_code,
    finished_at = case when excluded.status = 'running' then null else now() end,
    updated_at = now();
  return jsonb_build_object('ok', true, 'runId', target_run_id);
end;
$$;

create or replace function public.admin_retry_advertising_inquiry_mail(
  target_admin_account_id uuid,
  target_inquiry_id uuid,
  target_reason text
)
returns jsonb
language plpgsql
security definer
set search_path = pg_catalog, public, identity, audit
as $$
declare v_count integer; v_reason text := nullif(btrim(target_reason), '');
begin
  if not exists (
    select 1 from identity.account account
    join identity.operator_account operator on operator.account_id = account.id
    where account.id = target_admin_account_id
      and account.status = 'active' and account.deleted_at is null
  ) then raise exception 'advertising_operator_required'; end if;
  if v_reason is null or char_length(v_reason) not between 5 and 500 then
    raise exception 'advertising_mail_retry_reason_required';
  end if;
  if not exists (
    select 1 from public.advertising_inquiry where id = target_inquiry_id
  ) then raise exception 'advertising_inquiry_not_found'; end if;
  update public.advertising_mail_outbox set
    status = 'retry', attempt_count = 0, next_attempt_at = now(),
    claimed_at = null, worker_token = null, last_error_code = null,
    updated_at = now()
  where inquiry_id = target_inquiry_id
    and status = 'dead'
    and provider_message_id is null;
  get diagnostics v_count = row_count;
  if v_count = 0 then raise exception 'advertising_mail_retryable_failure_empty'; end if;
  insert into audit.admin_audit_log (
    admin_account_id, action, target_table, target_id, metadata
  ) values (
    target_admin_account_id, 'advertising_inquiry_mail_requeued',
    'public.advertising_inquiry', target_inquiry_id,
    jsonb_build_object('count', v_count, 'reason', v_reason)
  );
  return jsonb_build_object('ok', true, 'requeued', v_count);
end;
$$;

create or replace function public.admin_advertising_mail_operations_snapshot()
returns jsonb
language sql
stable
security definer
set search_path = pg_catalog, public
as $$
  select jsonb_build_object(
    'queue', jsonb_build_object(
      'pending', (select count(*) from public.advertising_mail_outbox where status = 'pending'),
      'sending', (select count(*) from public.advertising_mail_outbox where status = 'sending'),
      'retry', (select count(*) from public.advertising_mail_outbox where status = 'retry'),
      'dead', (select count(*) from public.advertising_mail_outbox where status = 'dead'),
      'stale', (select count(*) from public.advertising_mail_outbox where status = 'sending' and claimed_at < now() - interval '15 minutes')
    ),
    'worker', coalesce((
      select jsonb_build_object(
        'status', run.status,
        'source', run.source,
        'startedAt', run.started_at,
        'finishedAt', run.finished_at,
        'claimed', run.claimed_count,
        'sent', run.sent_count,
        'failed', run.failed_count,
        'completionFailed', run.completion_failed_count,
        'errorCode', run.error_code
      ) from public.advertising_mail_worker_run run
      order by run.started_at desc limit 1
    ), '{}'::jsonb)
  );
$$;

revoke all on function public.record_advertising_mail_worker_run(uuid, text, text, integer, integer, integer, integer, text)
from public, anon, authenticated;
grant execute on function public.record_advertising_mail_worker_run(uuid, text, text, integer, integer, integer, integer, text)
to service_role;
revoke all on function public.admin_retry_advertising_inquiry_mail(uuid, uuid, text)
from public, anon, authenticated;
grant execute on function public.admin_retry_advertising_inquiry_mail(uuid, uuid, text)
to service_role;
revoke all on function public.admin_advertising_mail_operations_snapshot()
from public, anon, authenticated;
grant execute on function public.admin_advertising_mail_operations_snapshot()
to service_role;

comment on table public.advertising_mail_worker_run is
  'PII-free health history for advertising inquiry notification delivery.';

-- Advertising campaign transitions are adjacent and policy-gated.  A free
-- status dropdown can no longer bypass review or activate a campaign without
-- a safe provider, approved creative and open delivery controls.
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
begin
  if not exists (
    select 1 from identity.account account
    join identity.operator_account operator on operator.account_id = account.id
    where account.id = target_admin_account_id
      and account.status = 'active' and account.deleted_at is null
  ) then raise exception 'advertising_operator_required'; end if;
  if char_length(btrim(coalesce(target_reason, ''))) < 5 then
    raise exception 'advertising_campaign_reason_required';
  end if;
  select * into v_previous from public.advertising_campaign
  where id = target_campaign_id for update;
  if not found then raise exception 'advertising_campaign_not_found'; end if;
  if not (
    v_previous.status = target_status
    or (v_previous.status = 'draft' and target_status = 'policy_review')
    or (v_previous.status = 'policy_review' and target_status in ('draft', 'approved'))
    or (v_previous.status = 'approved' and target_status in ('policy_review', 'scheduled'))
    or (v_previous.status = 'scheduled' and target_status in ('active', 'paused', 'ended', 'policy_review'))
    or (v_previous.status = 'active' and target_status in ('paused', 'ended'))
    or (v_previous.status = 'paused' and target_status in ('policy_review', 'ended'))
  ) then raise exception 'advertising_campaign_transition_not_allowed'; end if;
  if target_status = 'approved' and v_previous.policy_version is null then
    raise exception 'advertising_campaign_policy_version_required';
  end if;
  if target_status in ('approved', 'scheduled', 'active')
    and v_previous.provider = 'direct' then
    raise exception 'direct_advertising_delivery_not_available';
  end if;
  if target_status in ('approved', 'scheduled', 'active')
    and v_previous.provider = 'coupang'
    and not exists (
      select 1 from public.advertising_creative creative
      where creative.campaign_id = target_campaign_id
        and creative.review_status = 'approved'
        and creative.destination_url is not null
        and creative.image_url is not null
        and creative.fact_checked_at is not null
        and (creative.expires_at is null or creative.expires_at > now())
    ) then raise exception 'approved_coupang_creative_required'; end if;
  if target_status in ('scheduled', 'active') and (
    v_previous.policy_approved_at is null
    or v_previous.policy_version is null
    or exists (
      select 1 from public.advertising_kill_switch switch
      where switch.suspended = true and (
        (switch.scope = 'global' and switch.switch_key = 'advertising')
        or (switch.scope = 'provider' and switch.switch_key = v_previous.provider)
        or (switch.scope = 'slot' and switch.switch_key = any(v_previous.placement_keys))
      )
    )
  ) then raise exception 'advertising_campaign_delivery_gate_blocked'; end if;

  update public.advertising_campaign set
    status = target_status,
    policy_approved_at = case
      when target_status = 'approved' then v_now
      when target_status in ('draft', 'policy_review') then null
      else policy_approved_at end,
    policy_approved_by_account_id = case
      when target_status = 'approved' then target_admin_account_id
      when target_status in ('draft', 'policy_review') then null
      else policy_approved_by_account_id end,
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
      'reason', btrim(target_reason),
      'source', 'admin_advertising'
    ),
    target_campaign_id,
    'public.advertising_campaign'
  );
  return jsonb_build_object(
    'ok', true, 'campaignId', target_campaign_id, 'status', target_status
  );
end;
$$;

revoke all on function public.admin_manage_advertising_campaign(uuid, uuid, text, text)
from public, anon, authenticated;
grant execute on function public.admin_manage_advertising_campaign(uuid, uuid, text, text)
to service_role;

create or replace function consent.prune_business_operations_metadata(
  target_now timestamptz default now()
)
returns jsonb
language plpgsql
security definer
set search_path = pg_catalog, consent
as $$
declare
  v_worker bigint;
  v_advertising_worker bigint;
  v_webhook bigint;
  v_test bigint;
begin
  delete from consent.marketing_worker_run
  where started_at < target_now - interval '90 days';
  get diagnostics v_worker = row_count;
  delete from public.advertising_mail_worker_run
  where started_at < target_now - interval '90 days';
  get diagnostics v_advertising_worker = row_count;
  delete from consent.marketing_webhook_receipt
  where received_at < target_now - interval '90 days';
  get diagnostics v_webhook = row_count;
  delete from consent.marketing_test_delivery
  where created_at < target_now - interval '1 year';
  get diagnostics v_test = row_count;
  return jsonb_build_object(
    'workerRuns', v_worker,
    'advertisingWorkerRuns', v_advertising_worker,
    'webhookReceipts', v_webhook,
    'testDeliveries', v_test
  );
end;
$$;

revoke all on function consent.prune_business_operations_metadata(timestamptz)
from public, anon, authenticated;
grant execute on function consent.prune_business_operations_metadata(timestamptz)
to service_role, postgres;

notify pgrst, 'reload schema';
commit;

do $$
declare existing_job_id bigint;
begin
  select jobid into existing_job_id from cron.job
  where jobname = 'nuang-business-operations-metadata-prune' limit 1;
  if existing_job_id is not null then perform cron.unschedule(existing_job_id); end if;
  perform cron.schedule(
    'nuang-business-operations-metadata-prune', '17 19 * * *',
    'select consent.prune_business_operations_metadata(now());'
  );
end;
$$;
