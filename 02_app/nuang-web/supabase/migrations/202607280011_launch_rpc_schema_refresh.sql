begin;

do $$
begin
  if to_regprocedure(
    'public.claim_assessment_result_atomic(uuid,text,text,text,timestamptz,text,text,text,text,text,jsonb,jsonb,text,text,jsonb,jsonb)'
  ) is null then
    raise exception
      'missing function public.claim_assessment_result_atomic; apply migration 202607280008 first';
  end if;

  if to_regprocedure(
    'public.check_gate_c_request_guard(text,text)'
  ) is null then
    raise exception
      'missing function public.check_gate_c_request_guard; apply migration 202607280009 first';
  end if;

  if to_regprocedure(
    'public.delete_own_nuang_account(uuid,uuid)'
  ) is null then
    raise exception
      'missing function public.delete_own_nuang_account; apply migration 202607280010 first';
  end if;
end;
$$;

grant execute on function public.claim_assessment_result_atomic(
  uuid,
  text,
  text,
  text,
  timestamptz,
  text,
  text,
  text,
  text,
  text,
  jsonb,
  jsonb,
  text,
  text,
  jsonb,
  jsonb
) to service_role;

grant execute on function public.check_gate_c_request_guard(text, text)
to service_role;

grant execute on function public.delete_own_nuang_account(uuid, uuid)
to service_role;

select pg_notify('pgrst', 'reload schema');

commit;
