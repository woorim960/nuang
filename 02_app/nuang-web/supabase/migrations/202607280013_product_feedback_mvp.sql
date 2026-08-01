begin;

create table if not exists public.product_feedback (
  id uuid primary key default gen_random_uuid(),
  account_id uuid references identity.account(id) on delete cascade,
  request_fingerprint text not null
    check (request_fingerprint ~ '^[0-9a-f]{64}$'),
  kind text not null
    check (kind in ('bug', 'usability', 'idea')),
  area text not null
    check (
      area in (
        'home',
        'assessment',
        'community',
        'trait_map',
        'my',
        'account',
        'other'
      )
    ),
  body text not null
    check (char_length(trim(body)) between 10 and 2000),
  source_path text
    check (
      source_path is null
      or (
        char_length(source_path) between 1 and 500
        and source_path like '/%'
        and source_path not like '//%'
      )
    ),
  technical_context jsonb not null default '{}'::jsonb
    check (
      jsonb_typeof(technical_context) = 'object'
      and octet_length(technical_context::text) <= 2048
    ),
  status text not null default 'received'
    check (status in ('received', 'reviewing', 'planned', 'resolved', 'closed')),
  internal_note text
    check (internal_note is null or char_length(internal_note) <= 2000),
  reviewed_at timestamptz,
  reviewed_by_account_id uuid references identity.account(id) on delete set null,
  resolved_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists product_feedback_queue_idx
on public.product_feedback(status, created_at desc);

create index if not exists product_feedback_account_idx
on public.product_feedback(account_id, created_at desc)
where account_id is not null;

create index if not exists product_feedback_fingerprint_idx
on public.product_feedback(request_fingerprint, created_at desc);

alter table public.product_feedback enable row level security;

revoke all on public.product_feedback from public, anon, authenticated;
grant select, insert, update, delete on public.product_feedback to service_role;

comment on table public.product_feedback is
  'Private customer bug, usability and feature feedback. Read and written only by server-side service operations.';

create or replace function public.admin_manage_product_feedback(
  target_admin_account_id uuid,
  target_feedback_id uuid,
  target_status text
)
returns jsonb
language plpgsql
security definer
set search_path = pg_catalog, public, identity, audit
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

  if target_status not in ('reviewing', 'planned', 'resolved', 'closed') then
    raise exception 'unsupported_feedback_status';
  end if;

  select status
  into v_previous_status
  from public.product_feedback
  where id = target_feedback_id
  for update;

  if not found then
    raise exception 'product_feedback_not_found';
  end if;

  if v_previous_status = target_status then
    return jsonb_build_object(
      'ok', true,
      'feedbackId', target_feedback_id,
      'status', target_status
    );
  end if;

  update public.product_feedback
  set
    status = target_status,
    reviewed_at = coalesce(reviewed_at, v_now),
    reviewed_by_account_id = target_admin_account_id,
    resolved_at = case
      when target_status in ('resolved', 'closed') then v_now
      else null
    end,
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
    'product_feedback_' || target_status,
    target_admin_account_id,
    jsonb_build_object(
      'previousStatus', v_previous_status,
      'nextStatus', target_status,
      'source', 'admin_feedback'
    ),
    target_feedback_id,
    'public.product_feedback'
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

revoke all on function public.admin_manage_product_feedback(uuid, uuid, text)
from public, anon, authenticated;
grant execute on function public.admin_manage_product_feedback(uuid, uuid, text)
to service_role;

notify pgrst, 'reload schema';

commit;
