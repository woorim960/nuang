begin;

create table if not exists public.advertising_inquiry (
  id uuid primary key,
  public_reference text not null unique
    check (public_reference ~ '^AD-[0-9]{8}-[A-Z2-9]{6}$'),
  company_name text not null
    check (char_length(trim(company_name)) between 2 and 100),
  contact_name_ciphertext text not null
    check (char_length(contact_name_ciphertext) between 20 and 1000),
  contact_email_ciphertext text not null
    check (char_length(contact_email_ciphertext) between 20 and 1500),
  contact_email_blind_index text not null
    check (contact_email_blind_index ~ '^[0-9a-f]{64}$'),
  contact_email_masked text not null
    check (char_length(contact_email_masked) between 3 and 254),
  contact_phone_ciphertext text
    check (
      contact_phone_ciphertext is null
      or char_length(contact_phone_ciphertext) between 20 and 1000
    ),
  website_url text
    check (
      website_url is null
      or (char_length(website_url) <= 500 and website_url like 'https://%')
    ),
  promoted_offering text not null
    check (char_length(trim(promoted_offering)) between 10 and 300),
  inquiry_type text not null
    check (
      inquiry_type in (
        'banner',
        'contextual_affiliate',
        'branded_together_pack',
        'other'
      )
    ),
  campaign_objective text not null
    check (
      campaign_objective in (
        'awareness',
        'traffic',
        'engagement',
        'launch',
        'other'
      )
    ),
  preferred_placement text not null
    check (
      preferred_placement in (
        'home',
        'community',
        'together_future',
        'consultation'
      )
    ),
  budget_band text not null
    check (
      budget_band in (
        'under_1m',
        '1m_3m',
        '3m_10m',
        'over_10m',
        'undecided'
      )
    ),
  schedule_mode text not null
    check (schedule_mode in ('fixed', 'flexible')),
  desired_start_date date,
  desired_end_date date,
  target_audience text not null
    check (char_length(trim(target_audience)) between 10 and 500),
  creative_readiness text not null
    check (
      creative_readiness in ('ready', 'in_progress', 'needs_collaboration')
    ),
  details_ciphertext text not null
    check (char_length(details_ciphertext) between 20 and 8000),
  privacy_consent_version text not null
    check (char_length(privacy_consent_version) between 1 and 100),
  privacy_consented_at timestamptz not null,
  marketing_consent boolean not null default false,
  source_path text not null default '/advertise/inquiry'
    check (
      char_length(source_path) between 1 and 500
      and source_path like '/%'
      and source_path not like '//%'
    ),
  request_fingerprint text not null
    check (request_fingerprint ~ '^[0-9a-f]{64}$'),
  duplicate_hash text not null
    check (duplicate_hash ~ '^[0-9a-f]{64}$'),
  idempotency_hash text not null unique
    check (idempotency_hash ~ '^[0-9a-f]{64}$'),
  risk_flags text[] not null default '{}'::text[]
    check (cardinality(risk_flags) <= 10),
  status text not null default 'received'
    check (
      status in (
        'received',
        'reviewing',
        'contacted',
        'proposal_sent',
        'negotiating',
        'contracted',
        'closed',
        'rejected',
        'spam_review',
        'spam'
      )
    ),
  priority text not null default 'normal'
    check (priority in ('low', 'normal', 'high', 'urgent')),
  assigned_admin_account_id uuid references identity.account(id) on delete set null,
  first_response_due_at timestamptz not null,
  first_response_at timestamptz,
  next_action_at timestamptz,
  closed_reason text
    check (closed_reason is null or char_length(closed_reason) <= 1000),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  closed_at timestamptz,
  check (
    schedule_mode = 'flexible'
    or (desired_start_date is not null and desired_end_date is not null)
  ),
  check (
    desired_start_date is null
    or desired_end_date is null
    or desired_end_date >= desired_start_date
  )
);

create index if not exists advertising_inquiry_queue_idx
on public.advertising_inquiry(status, priority, created_at desc);

create index if not exists advertising_inquiry_email_rate_idx
on public.advertising_inquiry(contact_email_blind_index, created_at desc);

create index if not exists advertising_inquiry_fingerprint_rate_idx
on public.advertising_inquiry(request_fingerprint, created_at desc);

create index if not exists advertising_inquiry_duplicate_idx
on public.advertising_inquiry(duplicate_hash, created_at desc);

create table if not exists public.advertising_inquiry_event (
  id uuid primary key default gen_random_uuid(),
  inquiry_id uuid not null references public.advertising_inquiry(id) on delete cascade,
  event_type text not null
    check (
      event_type in (
        'received',
        'status_changed',
        'assignment_changed',
        'priority_changed',
        'mail_requeued',
        'contact_recorded',
        'internal_note'
      )
    ),
  actor_type text not null check (actor_type in ('system', 'admin')),
  actor_account_id uuid references identity.account(id) on delete set null,
  previous_status text,
  next_status text,
  reason text check (reason is null or char_length(reason) <= 1000),
  metadata jsonb not null default '{}'::jsonb
    check (
      jsonb_typeof(metadata) = 'object'
      and octet_length(metadata::text) <= 4096
    ),
  created_at timestamptz not null default now()
);

create index if not exists advertising_inquiry_event_timeline_idx
on public.advertising_inquiry_event(inquiry_id, created_at desc);

create table if not exists public.advertising_mail_outbox (
  id uuid primary key default gen_random_uuid(),
  event_key text not null unique
    check (char_length(event_key) between 10 and 240),
  inquiry_id uuid not null references public.advertising_inquiry(id) on delete cascade,
  template_key text not null
    check (template_key in ('operator_notification', 'inquirer_receipt')),
  template_version text not null
    check (char_length(template_version) between 1 and 40),
  recipient_role text not null check (recipient_role in ('operator', 'inquirer')),
  recipient_ciphertext text
    check (
      recipient_ciphertext is null
      or char_length(recipient_ciphertext) between 20 and 1500
    ),
  payload jsonb not null default '{}'::jsonb
    check (
      jsonb_typeof(payload) = 'object'
      and octet_length(payload::text) <= 4096
      and not (payload ?| array[
        'workEmail', 'email', 'phone', 'contactName', 'details', 'message'
      ])
    ),
  status text not null default 'pending'
    check (
      status in (
        'pending',
        'sending',
        'sent',
        'retry',
        'dead',
        'bounced',
        'complained'
      )
    ),
  attempt_count integer not null default 0
    check (attempt_count between 0 and 5),
  next_attempt_at timestamptz not null default now(),
  claimed_at timestamptz,
  worker_token uuid,
  provider_message_id text
    check (provider_message_id is null or char_length(provider_message_id) <= 500),
  last_error_code text
    check (last_error_code is null or char_length(last_error_code) <= 160),
  sent_at timestamptz,
  delivered_at timestamptz,
  bounced_at timestamptz,
  complained_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (
    (recipient_role = 'operator' and recipient_ciphertext is null)
    or (recipient_role = 'inquirer' and recipient_ciphertext is not null)
  )
);

create index if not exists advertising_mail_outbox_delivery_idx
on public.advertising_mail_outbox(status, next_attempt_at, created_at);

create index if not exists advertising_mail_outbox_inquiry_idx
on public.advertising_mail_outbox(inquiry_id, created_at);

create unique index if not exists advertising_mail_outbox_provider_message_idx
on public.advertising_mail_outbox(provider_message_id)
where provider_message_id is not null;

alter table public.advertising_inquiry enable row level security;
alter table public.advertising_inquiry_event enable row level security;
alter table public.advertising_mail_outbox enable row level security;

revoke all on public.advertising_inquiry from public, anon, authenticated;
revoke all on public.advertising_inquiry_event from public, anon, authenticated;
revoke all on public.advertising_mail_outbox from public, anon, authenticated;

grant select, insert, update, delete on public.advertising_inquiry to service_role;
grant select, insert, update, delete on public.advertising_inquiry_event to service_role;
grant select, insert, update, delete on public.advertising_mail_outbox to service_role;

comment on table public.advertising_inquiry is
  'Encrypted advertising and partnership inquiries. Server service operations only.';
comment on column public.advertising_inquiry.contact_email_blind_index is
  'Keyed blind index for exact lookup and abuse control; never an unsalted email hash.';
comment on table public.advertising_mail_outbox is
  'Transactional advertising inquiry email outbox with bounded retry and dead-letter states.';

create or replace function public.submit_advertising_inquiry_atomic(
  target_id uuid,
  target_public_reference text,
  target_company_name text,
  target_contact_name_ciphertext text,
  target_contact_email_ciphertext text,
  target_contact_email_blind_index text,
  target_contact_email_masked text,
  target_contact_phone_ciphertext text,
  target_website_url text,
  target_promoted_offering text,
  target_inquiry_type text,
  target_campaign_objective text,
  target_preferred_placement text,
  target_budget_band text,
  target_schedule_mode text,
  target_desired_start_date date,
  target_desired_end_date date,
  target_target_audience text,
  target_creative_readiness text,
  target_details_ciphertext text,
  target_privacy_consent_version text,
  target_privacy_consented_at timestamptz,
  target_marketing_consent boolean,
  target_source_path text,
  target_request_fingerprint text,
  target_duplicate_hash text,
  target_idempotency_hash text,
  target_risk_flags text[],
  target_initial_status text,
  target_inquirer_recipient_ciphertext text
)
returns jsonb
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  v_now timestamptz := now();
  v_existing public.advertising_inquiry%rowtype;
  v_recent_count integer;
  v_daily_count integer;
  v_first_response_due_at timestamptz;
begin
  perform pg_advisory_xact_lock(hashtextextended(
    'advertising-inquiry:email:' || target_contact_email_blind_index,
    0
  ));
  perform pg_advisory_xact_lock(hashtextextended(
    'advertising-inquiry:request:' || target_request_fingerprint,
    0
  ));

  select * into v_existing
  from public.advertising_inquiry
  where idempotency_hash = target_idempotency_hash
  limit 1;

  if found then
    return jsonb_build_object(
      'ok', true,
      'created', false,
      'duplicate', false,
      'inquiryId', v_existing.id,
      'publicReference', v_existing.public_reference,
      'createdAt', v_existing.created_at
    );
  end if;

  select * into v_existing
  from public.advertising_inquiry
  where duplicate_hash = target_duplicate_hash
    and created_at >= v_now - interval '15 minutes'
  order by created_at desc
  limit 1;

  if found then
    return jsonb_build_object(
      'ok', true,
      'created', false,
      'duplicate', true,
      'inquiryId', v_existing.id,
      'publicReference', v_existing.public_reference,
      'createdAt', v_existing.created_at
    );
  end if;

  select count(*)::integer into v_recent_count
  from public.advertising_inquiry
  where created_at >= v_now - interval '15 minutes'
    and (
      request_fingerprint = target_request_fingerprint
      or contact_email_blind_index = target_contact_email_blind_index
    );

  select count(*)::integer into v_daily_count
  from public.advertising_inquiry
  where created_at >= v_now - interval '24 hours'
    and (
      request_fingerprint = target_request_fingerprint
      or contact_email_blind_index = target_contact_email_blind_index
    );

  if v_recent_count >= 3 or v_daily_count >= 10 then
    return jsonb_build_object('ok', false, 'code', 'rate_limited');
  end if;

  v_first_response_due_at := v_now + case
    when extract(isodow from v_now at time zone 'Asia/Seoul') in (4, 5)
      then interval '4 days'
    when extract(isodow from v_now at time zone 'Asia/Seoul') = 6
      then interval '3 days'
    else interval '2 days'
  end;

  insert into public.advertising_inquiry (
    id,
    public_reference,
    company_name,
    contact_name_ciphertext,
    contact_email_ciphertext,
    contact_email_blind_index,
    contact_email_masked,
    contact_phone_ciphertext,
    website_url,
    promoted_offering,
    inquiry_type,
    campaign_objective,
    preferred_placement,
    budget_band,
    schedule_mode,
    desired_start_date,
    desired_end_date,
    target_audience,
    creative_readiness,
    details_ciphertext,
    privacy_consent_version,
    privacy_consented_at,
    marketing_consent,
    source_path,
    request_fingerprint,
    duplicate_hash,
    idempotency_hash,
    risk_flags,
    status,
    first_response_due_at,
    created_at,
    updated_at
  ) values (
    target_id,
    target_public_reference,
    target_company_name,
    target_contact_name_ciphertext,
    target_contact_email_ciphertext,
    target_contact_email_blind_index,
    target_contact_email_masked,
    target_contact_phone_ciphertext,
    target_website_url,
    target_promoted_offering,
    target_inquiry_type,
    target_campaign_objective,
    target_preferred_placement,
    target_budget_band,
    target_schedule_mode,
    target_desired_start_date,
    target_desired_end_date,
    target_target_audience,
    target_creative_readiness,
    target_details_ciphertext,
    target_privacy_consent_version,
    target_privacy_consented_at,
    target_marketing_consent,
    target_source_path,
    target_request_fingerprint,
    target_duplicate_hash,
    target_idempotency_hash,
    coalesce(target_risk_flags, '{}'::text[]),
    target_initial_status,
    v_first_response_due_at,
    v_now,
    v_now
  );

  insert into public.advertising_inquiry_event (
    inquiry_id,
    event_type,
    actor_type,
    next_status,
    metadata,
    created_at
  ) values (
    target_id,
    'received',
    'system',
    target_initial_status,
    jsonb_build_object('riskFlags', coalesce(target_risk_flags, '{}'::text[])),
    v_now
  );

  insert into public.advertising_mail_outbox (
    event_key,
    inquiry_id,
    template_key,
    template_version,
    recipient_role,
    recipient_ciphertext,
    payload,
    next_attempt_at,
    created_at,
    updated_at
  ) values
  (
    'ad-inquiry/operator/' || target_id || '/v1',
    target_id,
    'operator_notification',
    'v1',
    'operator',
    null,
    jsonb_build_object(
      'publicReference', target_public_reference,
      'inquiryType', target_inquiry_type,
      'companyName', target_company_name,
      'createdAt', v_now
    ),
    v_now,
    v_now,
    v_now
  ),
  (
    'ad-inquiry/inquirer/' || target_id || '/v1',
    target_id,
    'inquirer_receipt',
    'v1',
    'inquirer',
    target_inquirer_recipient_ciphertext,
    jsonb_build_object(
      'publicReference', target_public_reference,
      'inquiryType', target_inquiry_type,
      'maskedEmail', target_contact_email_masked,
      'createdAt', v_now
    ),
    v_now,
    v_now,
    v_now
  );

  return jsonb_build_object(
    'ok', true,
    'created', true,
    'duplicate', false,
    'inquiryId', target_id,
    'publicReference', target_public_reference,
    'createdAt', v_now
  );
end;
$$;

revoke all on function public.submit_advertising_inquiry_atomic(
  uuid, text, text, text, text, text, text, text, text, text, text, text,
  text, text, text, date, date, text, text, text, text, timestamptz, boolean,
  text, text, text, text, text[], text, text
) from public, anon, authenticated;
grant execute on function public.submit_advertising_inquiry_atomic(
  uuid, text, text, text, text, text, text, text, text, text, text, text,
  text, text, text, date, date, text, text, text, text, timestamptz, boolean,
  text, text, text, text, text[], text, text
) to service_role;

create or replace function public.claim_advertising_mail_outbox(
  target_batch_size integer,
  target_worker_token uuid,
  target_inquiry_id uuid
)
returns setof public.advertising_mail_outbox
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
begin
  if target_worker_token is null then
    raise exception 'worker_token_required';
  end if;

  return query
  with candidate as (
    select outbox.id
    from public.advertising_mail_outbox as outbox
    where (
        (outbox.status in ('pending', 'retry') and outbox.next_attempt_at <= now())
        or (
          outbox.status = 'sending'
          and outbox.claimed_at < now() - interval '15 minutes'
        )
      )
      and outbox.attempt_count < 5
      and (target_inquiry_id is null or outbox.inquiry_id = target_inquiry_id)
    order by outbox.created_at
    for update skip locked
    limit least(greatest(coalesce(target_batch_size, 10), 1), 50)
  )
  update public.advertising_mail_outbox as outbox
  set
    status = 'sending',
    attempt_count = outbox.attempt_count + 1,
    claimed_at = now(),
    worker_token = target_worker_token,
    updated_at = now()
  from candidate
  where outbox.id = candidate.id
  returning outbox.*;
end;
$$;

revoke all on function public.claim_advertising_mail_outbox(integer, uuid, uuid)
from public, anon, authenticated;
grant execute on function public.claim_advertising_mail_outbox(integer, uuid, uuid)
to service_role;

create or replace function public.complete_advertising_mail_outbox(
  target_outbox_id uuid,
  target_worker_token uuid,
  target_succeeded boolean,
  target_provider_message_id text,
  target_error_code text
)
returns jsonb
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  v_attempt_count integer;
  v_next_status text;
  v_next_attempt_at timestamptz;
begin
  select attempt_count into v_attempt_count
  from public.advertising_mail_outbox
  where id = target_outbox_id
    and status = 'sending'
    and worker_token = target_worker_token
  for update;

  if not found then
    return jsonb_build_object('ok', false, 'code', 'claim_not_found');
  end if;

  if target_succeeded then
    update public.advertising_mail_outbox
    set
      status = 'sent',
      provider_message_id = target_provider_message_id,
      last_error_code = null,
      sent_at = now(),
      claimed_at = null,
      worker_token = null,
      updated_at = now()
    where id = target_outbox_id;
    return jsonb_build_object('ok', true, 'status', 'sent');
  end if;

  v_next_status := case when v_attempt_count >= 5 then 'dead' else 'retry' end;
  v_next_attempt_at := now() + case v_attempt_count
    when 1 then interval '1 minute'
    when 2 then interval '5 minutes'
    when 3 then interval '30 minutes'
    when 4 then interval '2 hours'
    else interval '12 hours'
  end;

  update public.advertising_mail_outbox
  set
    status = v_next_status,
    next_attempt_at = v_next_attempt_at,
    last_error_code = left(coalesce(target_error_code, 'delivery_failed'), 160),
    claimed_at = null,
    worker_token = null,
    updated_at = now()
  where id = target_outbox_id;

  return jsonb_build_object('ok', true, 'status', v_next_status);
end;
$$;

revoke all on function public.complete_advertising_mail_outbox(
  uuid, uuid, boolean, text, text
) from public, anon, authenticated;
grant execute on function public.complete_advertising_mail_outbox(
  uuid, uuid, boolean, text, text
) to service_role;

create or replace function public.record_advertising_mail_webhook(
  target_provider_message_id text,
  target_event_type text,
  target_occurred_at timestamptz
)
returns jsonb
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  v_outbox_id uuid;
begin
  if target_event_type not in ('email.delivered', 'email.bounced', 'email.complained') then
    return jsonb_build_object('ok', true, 'ignored', true);
  end if;

  update public.advertising_mail_outbox
  set
    status = case target_event_type
      when 'email.bounced' then 'bounced'
      when 'email.complained' then 'complained'
      else status
    end,
    delivered_at = case
      when target_event_type = 'email.delivered'
        then coalesce(delivered_at, target_occurred_at)
      else delivered_at
    end,
    bounced_at = case
      when target_event_type = 'email.bounced'
        then coalesce(bounced_at, target_occurred_at)
      else bounced_at
    end,
    complained_at = case
      when target_event_type = 'email.complained'
        then coalesce(complained_at, target_occurred_at)
      else complained_at
    end,
    updated_at = now()
  where provider_message_id = target_provider_message_id
  returning id into v_outbox_id;

  return jsonb_build_object(
    'ok', true,
    'matched', v_outbox_id is not null,
    'outboxId', v_outbox_id
  );
end;
$$;

revoke all on function public.record_advertising_mail_webhook(text, text, timestamptz)
from public, anon, authenticated;
grant execute on function public.record_advertising_mail_webhook(text, text, timestamptz)
to service_role;

create or replace function public.admin_manage_advertising_inquiry(
  target_admin_account_id uuid,
  target_inquiry_id uuid,
  target_status text,
  target_priority text,
  target_assigned_admin_account_id uuid,
  target_next_action_at timestamptz,
  target_reason text
)
returns jsonb
language plpgsql
security definer
set search_path = pg_catalog, public, identity, audit
as $$
declare
  v_now timestamptz := now();
  v_previous public.advertising_inquiry%rowtype;
  v_audit_count integer;
begin
  if target_admin_account_id is null or not exists (
    select 1 from identity.account
    where id = target_admin_account_id and status = 'active' and deleted_at is null
  ) then
    raise exception 'active_admin_account_required';
  end if;

  if target_assigned_admin_account_id is not null and not exists (
    select 1 from identity.account
    where id = target_assigned_admin_account_id
      and status = 'active'
      and deleted_at is null
  ) then
    raise exception 'active_assignee_required';
  end if;

  if target_status not in (
    'received', 'reviewing', 'contacted', 'proposal_sent', 'negotiating',
    'contracted', 'closed', 'rejected', 'spam_review', 'spam'
  ) then raise exception 'unsupported_advertising_inquiry_status'; end if;

  if target_priority not in ('low', 'normal', 'high', 'urgent') then
    raise exception 'unsupported_advertising_inquiry_priority';
  end if;

  if target_status in ('contracted', 'closed', 'rejected', 'spam')
    and char_length(trim(coalesce(target_reason, ''))) < 2 then
    raise exception 'advertising_inquiry_reason_required';
  end if;

  select * into v_previous
  from public.advertising_inquiry
  where id = target_inquiry_id
  for update;

  if not found then raise exception 'advertising_inquiry_not_found'; end if;

  update public.advertising_inquiry
  set
    status = target_status,
    priority = target_priority,
    assigned_admin_account_id = target_assigned_admin_account_id,
    next_action_at = target_next_action_at,
    first_response_at = case
      when target_status in ('contacted', 'proposal_sent', 'negotiating', 'contracted', 'closed')
        then coalesce(first_response_at, v_now)
      else first_response_at
    end,
    closed_at = case
      when target_status in ('closed', 'rejected', 'spam') then v_now
      else null
    end,
    closed_reason = case
      when target_status in ('closed', 'rejected', 'spam')
        then trim(target_reason)
      else null
    end,
    updated_at = v_now
  where id = target_inquiry_id;

  insert into public.advertising_inquiry_event (
    inquiry_id,
    event_type,
    actor_type,
    actor_account_id,
    previous_status,
    next_status,
    reason,
    metadata,
    created_at
  ) values (
    target_inquiry_id,
    'status_changed',
    'admin',
    target_admin_account_id,
    v_previous.status,
    target_status,
    nullif(trim(coalesce(target_reason, '')), ''),
    jsonb_build_object(
      'previousPriority', v_previous.priority,
      'nextPriority', target_priority,
      'previousAssignee', v_previous.assigned_admin_account_id,
      'nextAssignee', target_assigned_admin_account_id,
      'nextActionAt', target_next_action_at
    ),
    v_now
  );

  insert into audit.admin_audit_log (
    action,
    admin_account_id,
    metadata,
    target_id,
    target_table
  ) values (
    'advertising_inquiry_managed',
    target_admin_account_id,
    jsonb_build_object(
      'previousStatus', v_previous.status,
      'nextStatus', target_status,
      'previousPriority', v_previous.priority,
      'nextPriority', target_priority,
      'source', 'admin_advertising'
    ),
    target_inquiry_id,
    'public.advertising_inquiry'
  );

  get diagnostics v_audit_count = row_count;
  if v_audit_count <> 1 then raise exception 'admin_audit_write_failed'; end if;

  return jsonb_build_object(
    'ok', true,
    'inquiryId', target_inquiry_id,
    'status', target_status,
    'priority', target_priority
  );
end;
$$;

revoke all on function public.admin_manage_advertising_inquiry(
  uuid, uuid, text, text, uuid, timestamptz, text
) from public, anon, authenticated;
grant execute on function public.admin_manage_advertising_inquiry(
  uuid, uuid, text, text, uuid, timestamptz, text
) to service_role;

create or replace function public.admin_record_advertising_inquiry_sensitive_access(
  target_admin_account_id uuid,
  target_inquiry_id uuid
)
returns jsonb
language plpgsql
security definer
set search_path = pg_catalog, public, identity, audit
as $$
declare
  v_audit_count integer;
begin
  if target_admin_account_id is null or not exists (
    select 1 from identity.account
    where id = target_admin_account_id and status = 'active' and deleted_at is null
  ) then raise exception 'active_admin_account_required'; end if;

  if not exists (
    select 1 from public.advertising_inquiry where id = target_inquiry_id
  ) then raise exception 'advertising_inquiry_not_found'; end if;

  insert into audit.admin_audit_log (
    action,
    admin_account_id,
    metadata,
    target_id,
    target_table
  ) values (
    'advertising_inquiry_sensitive_fields_viewed',
    target_admin_account_id,
    jsonb_build_object('source', 'admin_advertising'),
    target_inquiry_id,
    'public.advertising_inquiry'
  );
  get diagnostics v_audit_count = row_count;
  if v_audit_count <> 1 then raise exception 'admin_audit_write_failed'; end if;

  return jsonb_build_object('ok', true, 'inquiryId', target_inquiry_id);
end;
$$;

revoke all on function public.admin_record_advertising_inquiry_sensitive_access(uuid, uuid)
from public, anon, authenticated;
grant execute on function public.admin_record_advertising_inquiry_sensitive_access(uuid, uuid)
to service_role;

notify pgrst, 'reload schema';

commit;
