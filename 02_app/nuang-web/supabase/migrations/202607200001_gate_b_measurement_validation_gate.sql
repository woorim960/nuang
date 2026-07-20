do $$
begin
  if exists (
    select 1
    from scoring.code_scheme_release
    where code_scheme_version = 'NUANG-CODE-5AXIS-CANDIDATE-1.0'
      and status in ('validated', 'active')
      and coalesce(validation_gates ->> 'fairness_and_invariance', 'not_started') <> 'passed'
  ) then
    raise exception 'Gate B migration refused: the candidate code scheme is already released without a passed fairness gate';
  end if;

  if exists (
    select 1
    from assessment.item_bank_release
    where code_scheme_version = 'NUANG-CODE-5AXIS-CANDIDATE-1.0'
      and status in ('validated', 'active')
      and coalesce(validation_gates ->> 'fairness_and_invariance', 'not_started') <> 'passed'
  ) then
    raise exception 'Gate B migration refused: a candidate item bank is already released without a passed fairness gate';
  end if;
end;
$$;

update scoring.code_scheme_release
set validation_gates = validation_gates || jsonb_build_object(
  'fairness_and_invariance',
  coalesce(validation_gates ->> 'fairness_and_invariance', 'not_started')
)
where code_scheme_version = 'NUANG-CODE-5AXIS-CANDIDATE-1.0';

update assessment.item_bank_release
set validation_gates = validation_gates || jsonb_build_object(
  'fairness_and_invariance',
  coalesce(validation_gates ->> 'fairness_and_invariance', 'not_started')
)
where code_scheme_version = 'NUANG-CODE-5AXIS-CANDIDATE-1.0';

create or replace function scoring.require_gate_b_code_scheme_validation()
returns trigger
language plpgsql
set search_path = scoring, public
as $$
declare
  gate_name text;
begin
  if new.code_scheme_version = 'NUANG-CODE-5AXIS-CANDIDATE-1.0'
    and new.status in ('validated', 'active') then
    foreach gate_name in array array[
      'cognitive_review',
      'fairness_and_invariance',
      'quantitative_pilot',
      'reliability_and_structure'
    ] loop
      if coalesce(new.validation_gates ->> gate_name, 'not_started') <> 'passed' then
        raise exception 'Code scheme validation gate has not passed: %', gate_name;
      end if;
    end loop;
  end if;

  return new;
end;
$$;

drop trigger if exists require_gate_b_code_scheme_validation_trigger
on scoring.code_scheme_release;

create trigger require_gate_b_code_scheme_validation_trigger
before insert or update of status, validation_gates
on scoring.code_scheme_release
for each row
execute function scoring.require_gate_b_code_scheme_validation();

create or replace function assessment.require_gate_b_item_bank_validation()
returns trigger
language plpgsql
set search_path = assessment, public
as $$
declare
  gate_name text;
begin
  if new.status in ('validated', 'active')
    and new.code_scheme_version = 'NUANG-CODE-5AXIS-CANDIDATE-1.0' then
    foreach gate_name in array array[
      'cognitive_review',
      'fairness_and_invariance',
      'quantitative_pilot',
      'reliability_and_structure'
    ] loop
      if coalesce(new.validation_gates ->> gate_name, 'not_started') <> 'passed' then
        raise exception 'Item bank validation gate has not passed: %', gate_name;
      end if;
    end loop;
  end if;

  return new;
end;
$$;

drop trigger if exists require_gate_b_item_bank_validation_trigger
on assessment.item_bank_release;

create trigger require_gate_b_item_bank_validation_trigger
before insert or update of status, validation_gates
on assessment.item_bank_release
for each row
execute function assessment.require_gate_b_item_bank_validation();

revoke all on function scoring.require_gate_b_code_scheme_validation() from public;
revoke all on function assessment.require_gate_b_item_bank_validation() from public;

comment on function scoring.require_gate_b_code_scheme_validation() is
  'Blocks validated or active candidate code schemes until every Gate B measurement requirement passes.';

comment on function assessment.require_gate_b_item_bank_validation() is
  'Blocks validated or active candidate item banks until every Gate B measurement requirement passes.';
