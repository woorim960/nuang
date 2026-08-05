begin;

-- 005가 적용된 운영 DB에서도 정렬 대상 전체를 감사 로그로 추적한다.
create or replace function public.admin_reorder_assessment_content(
  target_admin_account_id uuid,
  target_ordered_entry_ids uuid[],
  target_reason text
)
returns jsonb
language plpgsql
security definer
set search_path = pg_catalog, public, audit
as $$
declare
  v_reason text := nullif(btrim(target_reason), '');
  v_count integer;
begin
  perform public.assert_assessment_content_operator(target_admin_account_id);
  if v_reason is null or char_length(v_reason) not between 5 and 500 then
    raise exception 'assessment_content_note_required';
  end if;
  if coalesce(array_length(target_ordered_entry_ids, 1), 0) = 0 then
    raise exception 'assessment_content_order_empty';
  end if;

  update public.assessment_content_entry entry set
    display_order = ordering.position * 10,
    updated_by = target_admin_account_id,
    updated_at = now()
  from unnest(target_ordered_entry_ids) with ordinality ordering(id, position)
  where entry.id = ordering.id and entry.deleted_at is null;

  get diagnostics v_count = row_count;
  if v_count <> array_length(target_ordered_entry_ids, 1) then
    raise exception 'assessment_content_order_mismatch';
  end if;

  insert into audit.admin_audit_log (
    admin_account_id, action, target_table, target_id, metadata
  ) values (
    target_admin_account_id, 'assessment_content_reordered',
    'public.assessment_content_entry',
    target_ordered_entry_ids[1],
    jsonb_build_object(
      'count', v_count,
      'entryIds', to_jsonb(target_ordered_entry_ids),
      'reason', v_reason
    )
  );

  return jsonb_build_object('ok', true, 'updated', v_count);
end;
$$;

revoke all on function public.admin_reorder_assessment_content(
  uuid, uuid[], text
) from public, anon, authenticated;

grant execute on function public.admin_reorder_assessment_content(
  uuid, uuid[], text
) to service_role;

comment on function public.admin_reorder_assessment_content(uuid, uuid[], text) is
  'Reorders assessment entries and records every affected entry id in the admin audit log.';

notify pgrst, 'reload schema';

commit;
