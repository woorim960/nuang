begin;

create table if not exists report.core_result_feedback (
  id uuid primary key default gen_random_uuid(),
  account_id uuid not null references identity.account(id) on delete cascade,
  result_report_id uuid not null references report.result_report(id) on delete cascade,
  profile_code text not null check (profile_code ~ '^[EI][RN][GA][KM][CQ]$'),
  report_kind text not null check (report_kind in ('quick', 'full')),
  surface text not null check (surface in ('completion', 'my')),
  section_id text not null check (char_length(section_id) between 1 and 160),
  content_key text not null check (char_length(content_key) between 1 and 160),
  content_version text not null check (char_length(content_version) between 1 and 160),
  manifest_digest text check (
    manifest_digest is null or char_length(manifest_digest) between 1 and 160
  ),
  trait_map_baseline_id text check (
    trait_map_baseline_id is null or char_length(trait_map_baseline_id) between 1 and 120
  ),
  sentiment text not null check (sentiment in ('fit', 'depends', 'not_fit')),
  reason text check (
    reason is null
    or reason in (
      'context_differs',
      'too_broad',
      'wording_unclear',
      'important_part_missing',
      'other'
    )
  ),
  status text not null default 'received'
    check (status in ('received', 'reviewing', 'incorporated', 'dismissed')),
  reviewed_at timestamptz,
  reviewed_by_account_id uuid references identity.account(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (account_id, result_report_id, section_id)
);

create index if not exists core_result_feedback_queue_idx
on report.core_result_feedback(status, created_at desc);

create index if not exists core_result_feedback_content_idx
on report.core_result_feedback(
  profile_code,
  report_kind,
  section_id,
  content_key,
  content_version,
  created_at desc
);

alter table report.core_result_feedback enable row level security;

revoke all on report.core_result_feedback from public, anon, authenticated;
grant select, insert, update, delete on report.core_result_feedback to service_role;

comment on table report.core_result_feedback is
  'Owner-only, exact-version fit feedback for rendered core result report sections. Server service operations only.';

create or replace view report.core_result_feedback_review_summary as
select
  profile_code,
  report_kind,
  section_id,
  content_key,
  content_version,
  count(*)::bigint as sample_count,
  count(*) filter (where sentiment = 'fit')::bigint as fit_count,
  count(*) filter (where sentiment = 'depends')::bigint as depends_count,
  count(*) filter (where sentiment = 'not_fit')::bigint as not_fit_count,
  round(
    count(*) filter (where sentiment = 'not_fit')::numeric
    / nullif(count(*), 0),
    4
  ) as not_fit_rate,
  max(updated_at) as last_seen_at,
  case
    when count(*) >= 20 and (
      count(*) filter (where sentiment = 'not_fit')::numeric
      / nullif(count(*), 0)
    ) >= 0.25 then 'high'
    when count(*) >= 10 and (
      count(*) filter (where sentiment = 'not_fit')::numeric
      / nullif(count(*), 0)
    ) >= 0.15 then 'medium'
    when count(*) < 10 then 'collecting'
    else 'normal'
  end as priority
from report.core_result_feedback
group by profile_code, report_kind, section_id, content_key, content_version;

revoke all on report.core_result_feedback_review_summary
from public, anon, authenticated;
grant select on report.core_result_feedback_review_summary to service_role;

create or replace function public.admin_manage_core_result_feedback(
  target_admin_account_id uuid,
  target_feedback_id uuid,
  target_status text
)
returns jsonb
language plpgsql
security definer
set search_path = pg_catalog, public, report, identity, audit
as $$
declare
  v_now timestamptz := now();
  v_previous_status text;
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

  if target_status not in ('reviewing', 'incorporated', 'dismissed') then
    raise exception 'unsupported_core_result_feedback_status';
  end if;

  select status
  into v_previous_status
  from report.core_result_feedback
  where id = target_feedback_id
  for update;

  if not found then raise exception 'core_result_feedback_not_found'; end if;

  if v_previous_status = target_status then
    return jsonb_build_object(
      'ok', true,
      'feedbackId', target_feedback_id,
      'status', target_status
    );
  end if;

  update report.core_result_feedback
  set
    status = target_status,
    reviewed_at = coalesce(reviewed_at, v_now),
    reviewed_by_account_id = target_admin_account_id,
    updated_at = v_now
  where id = target_feedback_id;

  insert into audit.admin_audit_log (
    action,
    admin_account_id,
    metadata,
    target_id,
    target_table
  )
  values (
    'core_result_feedback_' || target_status,
    target_admin_account_id,
    jsonb_build_object(
      'previousStatus', v_previous_status,
      'nextStatus', target_status,
      'source', 'admin_core_result_feedback'
    ),
    target_feedback_id,
    'report.core_result_feedback'
  );

  get diagnostics v_affected = row_count;
  if v_affected <> 1 then raise exception 'admin_audit_write_failed'; end if;

  return jsonb_build_object(
    'ok', true,
    'feedbackId', target_feedback_id,
    'status', target_status
  );
end;
$$;

revoke all on function public.admin_manage_core_result_feedback(uuid, uuid, text)
from public, anon, authenticated;
grant execute on function public.admin_manage_core_result_feedback(uuid, uuid, text)
to service_role;

notify pgrst, 'reload schema';

commit;
