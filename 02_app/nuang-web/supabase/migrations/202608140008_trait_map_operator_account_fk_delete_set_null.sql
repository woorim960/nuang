begin;

set local lock_timeout = '5s';

do $$
declare
  target record;
begin
  if to_regclass('identity.account') is null then
    raise exception 'trait_map_operator_account_fk_identity_account_missing';
  end if;

  for target in
    select *
    from (
      values
        (
          'trait_map.guide_content_revision',
          'edited_by_account_id',
          'guide_content_revision_edited_by_account_id_fkey'
        ),
        (
          'trait_map.guide_deployment',
          'deployed_by_account_id',
          'guide_deployment_deployed_by_account_id_fkey'
        ),
        (
          'trait_map.guide_human_review_decision',
          'reviewer_account_id',
          'guide_human_review_decision_reviewer_account_id_fkey'
        ),
        (
          'trait_map.guide_profile_approval',
          'approved_by_account_id',
          'guide_profile_approval_approved_by_account_id_fkey'
        )
    ) as targets(table_name, column_name, constraint_name)
  loop
    if to_regclass(target.table_name) is null then
      raise exception
        'trait_map_operator_account_fk_table_missing: %',
        target.table_name;
    end if;
  end loop;
end
$$;

lock table
  trait_map.guide_content_revision,
  trait_map.guide_deployment,
  trait_map.guide_human_review_decision,
  trait_map.guide_profile_approval
in access exclusive mode;

do $$
declare
  target record;
  target_table regclass;
  target_column_attnum smallint;
  account_id_attnum smallint;
  target_column_type text;
  matching_fk_count integer;
  existing_fk record;
begin
  select attribute.attnum::smallint
  into account_id_attnum
  from pg_attribute attribute
  where attribute.attrelid = 'identity.account'::regclass
    and attribute.attname = 'id'
    and attribute.attnum > 0
    and not attribute.attisdropped;

  if account_id_attnum is null then
    raise exception 'trait_map_operator_account_fk_identity_account_id_missing';
  end if;

  for target in
    select *
    from (
      values
        (
          'trait_map.guide_content_revision',
          'edited_by_account_id',
          'guide_content_revision_edited_by_account_id_fkey'
        ),
        (
          'trait_map.guide_deployment',
          'deployed_by_account_id',
          'guide_deployment_deployed_by_account_id_fkey'
        ),
        (
          'trait_map.guide_human_review_decision',
          'reviewer_account_id',
          'guide_human_review_decision_reviewer_account_id_fkey'
        ),
        (
          'trait_map.guide_profile_approval',
          'approved_by_account_id',
          'guide_profile_approval_approved_by_account_id_fkey'
        )
    ) as targets(table_name, column_name, constraint_name)
  loop
    target_table := to_regclass(target.table_name);

    select
      attribute.attnum::smallint,
      format_type(attribute.atttypid, attribute.atttypmod)
    into target_column_attnum, target_column_type
    from pg_attribute attribute
    where attribute.attrelid = target_table
      and attribute.attname = target.column_name
      and attribute.attnum > 0
      and not attribute.attisdropped;

    if target_column_attnum is null or target_column_type <> 'uuid' then
      raise exception
        'trait_map_operator_account_fk_column_mismatch: %.%',
        target.table_name,
        target.column_name;
    end if;

    select count(*)
    into matching_fk_count
    from pg_constraint constraint_row
    where constraint_row.conrelid = target_table
      and constraint_row.contype = 'f'
      and constraint_row.conkey = array[target_column_attnum]::smallint[];

    if matching_fk_count <> 1 then
      raise exception
        'trait_map_operator_account_fk_count_mismatch: %.% expected 1, found %',
        target.table_name,
        target.column_name,
        matching_fk_count;
    end if;

    select
      constraint_row.conname,
      constraint_row.confrelid,
      constraint_row.confkey,
      constraint_row.confdeltype,
      constraint_row.convalidated
    into existing_fk
    from pg_constraint constraint_row
    where constraint_row.conrelid = target_table
      and constraint_row.contype = 'f'
      and constraint_row.conkey = array[target_column_attnum]::smallint[];

    if existing_fk.conname <> target.constraint_name
      or existing_fk.confrelid <> 'identity.account'::regclass
      or existing_fk.confkey <> array[account_id_attnum]::smallint[]
      or existing_fk.confdeltype not in ('r', 'n')
      or not existing_fk.convalidated
    then
      raise exception
        'trait_map_operator_account_fk_constraint_mismatch: %.%',
        target.table_name,
        target.column_name;
    end if;
  end loop;
end
$$;

alter table trait_map.guide_content_revision
  alter column edited_by_account_id drop not null;
alter table trait_map.guide_deployment
  alter column deployed_by_account_id drop not null;
alter table trait_map.guide_human_review_decision
  alter column reviewer_account_id drop not null;
alter table trait_map.guide_profile_approval
  alter column approved_by_account_id drop not null;

alter table trait_map.guide_content_revision
  drop constraint if exists guide_content_revision_edited_by_account_id_fkey;
alter table trait_map.guide_deployment
  drop constraint if exists guide_deployment_deployed_by_account_id_fkey;
alter table trait_map.guide_human_review_decision
  drop constraint if exists guide_human_review_decision_reviewer_account_id_fkey;
alter table trait_map.guide_profile_approval
  drop constraint if exists guide_profile_approval_approved_by_account_id_fkey;

alter table trait_map.guide_content_revision
  add constraint guide_content_revision_edited_by_account_id_fkey
  foreign key (edited_by_account_id)
  references identity.account(id)
  on delete set null
  not valid;
alter table trait_map.guide_deployment
  add constraint guide_deployment_deployed_by_account_id_fkey
  foreign key (deployed_by_account_id)
  references identity.account(id)
  on delete set null
  not valid;
alter table trait_map.guide_human_review_decision
  add constraint guide_human_review_decision_reviewer_account_id_fkey
  foreign key (reviewer_account_id)
  references identity.account(id)
  on delete set null
  not valid;
alter table trait_map.guide_profile_approval
  add constraint guide_profile_approval_approved_by_account_id_fkey
  foreign key (approved_by_account_id)
  references identity.account(id)
  on delete set null
  not valid;

alter table trait_map.guide_content_revision
  validate constraint guide_content_revision_edited_by_account_id_fkey;
alter table trait_map.guide_deployment
  validate constraint guide_deployment_deployed_by_account_id_fkey;
alter table trait_map.guide_human_review_decision
  validate constraint guide_human_review_decision_reviewer_account_id_fkey;
alter table trait_map.guide_profile_approval
  validate constraint guide_profile_approval_approved_by_account_id_fkey;

do $$
declare
  target record;
  target_table regclass;
  target_column_attnum smallint;
  account_id_attnum smallint;
  target_column_not_null boolean;
  final_fk_count integer;
  final_fk record;
begin
  select attribute.attnum::smallint
  into account_id_attnum
  from pg_attribute attribute
  where attribute.attrelid = 'identity.account'::regclass
    and attribute.attname = 'id'
    and attribute.attnum > 0
    and not attribute.attisdropped;

  for target in
    select *
    from (
      values
        (
          'trait_map.guide_content_revision',
          'edited_by_account_id',
          'guide_content_revision_edited_by_account_id_fkey'
        ),
        (
          'trait_map.guide_deployment',
          'deployed_by_account_id',
          'guide_deployment_deployed_by_account_id_fkey'
        ),
        (
          'trait_map.guide_human_review_decision',
          'reviewer_account_id',
          'guide_human_review_decision_reviewer_account_id_fkey'
        ),
        (
          'trait_map.guide_profile_approval',
          'approved_by_account_id',
          'guide_profile_approval_approved_by_account_id_fkey'
        )
    ) as targets(table_name, column_name, constraint_name)
  loop
    target_table := to_regclass(target.table_name);

    select attribute.attnum::smallint, attribute.attnotnull
    into target_column_attnum, target_column_not_null
    from pg_attribute attribute
    where attribute.attrelid = target_table
      and attribute.attname = target.column_name
      and attribute.attnum > 0
      and not attribute.attisdropped;

    select count(*)
    into final_fk_count
    from pg_constraint constraint_row
    where constraint_row.conrelid = target_table
      and constraint_row.contype = 'f'
      and constraint_row.conkey = array[target_column_attnum]::smallint[];

    select
      constraint_row.conname,
      constraint_row.confrelid,
      constraint_row.confkey,
      constraint_row.confdeltype,
      constraint_row.convalidated
    into final_fk
    from pg_constraint constraint_row
    where constraint_row.conrelid = target_table
      and constraint_row.contype = 'f'
      and constraint_row.conkey = array[target_column_attnum]::smallint[];

    if target_column_not_null
      or final_fk_count <> 1
      or final_fk.conname <> target.constraint_name
      or final_fk.confrelid <> 'identity.account'::regclass
      or final_fk.confkey <> array[account_id_attnum]::smallint[]
      or final_fk.confdeltype <> 'n'
      or not final_fk.convalidated
    then
      raise exception
        'trait_map_operator_account_fk_postcondition_failed: %.%',
        target.table_name,
        target.column_name;
    end if;
  end loop;
end
$$;

commit;
