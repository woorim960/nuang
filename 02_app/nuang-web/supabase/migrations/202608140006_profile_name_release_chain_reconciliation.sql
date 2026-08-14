update report.profile_name_definition
set
  display_name = '마음 변화를 듣는 경청자',
  accessible_name = '마음 변화를 듣는 경청자, 뉴앙 코드 IRAMQ'
where profile_name_release_id = 'NUANG-PROFILE-NAME-CANDIDATE-3.0'
  and profile_code = 'IRAMQ';

do $profile_name_release_chain$
declare
  target_release_id text;
  definition_count integer;
  profile_code_count integer;
  display_name_count integer;
  short_name_count integer;
  invalid_code_count integer;
  empty_short_name_count integer;
  accessible_name_mismatch_count integer;
begin
  if not exists (
    select 1
    from scoring.code_scheme_release
    where code_scheme_version = 'NUANG-CODE-5AXIS-CANDIDATE-1.0'
  ) then
    raise exception 'NUANG-CODE-5AXIS-CANDIDATE-1.0 must exist before profile name reconciliation';
  end if;

  if not exists (
    select 1
    from report.profile_name_release
    where profile_name_release_id = 'NUANG-PROFILE-NAME-CANDIDATE-1.1'
  ) then
    raise exception 'NUANG-PROFILE-NAME-CANDIDATE-1.1 must exist before profile name reconciliation';
  end if;

  select
    count(*),
    count(distinct profile_code),
    count(distinct display_name),
    count(*) filter (where profile_code !~ '^[EI][RN][GA][MK][CQ]$'),
    count(*) filter (
      where accessible_name <> display_name || ', 뉴앙 코드 ' || profile_code
    )
  into
    definition_count,
    profile_code_count,
    display_name_count,
    invalid_code_count,
    accessible_name_mismatch_count
  from report.profile_name_definition
  where profile_name_release_id = 'NUANG-PROFILE-NAME-CANDIDATE-1.1';

  if definition_count <> 32
    or profile_code_count <> 32
    or display_name_count <> 32
    or invalid_code_count <> 0
    or accessible_name_mismatch_count <> 0 then
    raise exception
      'NUANG-PROFILE-NAME-CANDIDATE-1.1 precondition failed: definitions %, codes %, names %, invalid codes %, accessible mismatches %',
      definition_count,
      profile_code_count,
      display_name_count,
      invalid_code_count,
      accessible_name_mismatch_count;
  end if;

  foreach target_release_id in array array[
    'NUANG-PROFILE-NAME-CANDIDATE-2.0',
    'NUANG-PROFILE-NAME-CANDIDATE-2.1',
    'NUANG-PROFILE-NAME-CANDIDATE-3.0'
  ]
  loop
    select
      count(*),
      count(distinct profile_code),
      count(distinct display_name),
      count(distinct metadata ->> 'shortName'),
      count(*) filter (where profile_code !~ '^[EI][RN][GA][MK][CQ]$'),
      count(*) filter (
        where nullif(btrim(metadata ->> 'shortName'), '') is null
      ),
      count(*) filter (
        where accessible_name <> display_name || ', 뉴앙 코드 ' || profile_code
      )
    into
      definition_count,
      profile_code_count,
      display_name_count,
      short_name_count,
      invalid_code_count,
      empty_short_name_count,
      accessible_name_mismatch_count
    from report.profile_name_definition
    where profile_name_release_id = target_release_id;

    if definition_count <> 32
      or profile_code_count <> 32
      or display_name_count <> 32
      or short_name_count <> 32
      or invalid_code_count <> 0
      or empty_short_name_count <> 0
      or accessible_name_mismatch_count <> 0 then
      raise exception
        '% profile name contract failed: definitions %, codes %, names %, short names %, invalid codes %, empty short names %, accessible mismatches %',
        target_release_id,
        definition_count,
        profile_code_count,
        display_name_count,
        short_name_count,
        invalid_code_count,
        empty_short_name_count,
        accessible_name_mismatch_count;
    end if;

    if not exists (
      select 1
      from report.profile_name_release
      where profile_name_release_id = target_release_id
        and status = 'candidate'
        and activated_at is null
    ) then
      raise exception '% must remain an inactive candidate release', target_release_id;
    end if;
  end loop;

  if not exists (
    select 1
    from report.profile_name_release
    where profile_name_release_id = 'NUANG-PROFILE-NAME-CANDIDATE-1.1'
      and metadata ->> 'supersededBy' = 'NUANG-PROFILE-NAME-CANDIDATE-2.0'
  ) or not exists (
    select 1
    from report.profile_name_release
    where profile_name_release_id = 'NUANG-PROFILE-NAME-CANDIDATE-2.0'
      and metadata ->> 'supersedes' = 'NUANG-PROFILE-NAME-CANDIDATE-1.1'
      and metadata ->> 'supersededBy' = 'NUANG-PROFILE-NAME-CANDIDATE-2.1'
  ) or not exists (
    select 1
    from report.profile_name_release
    where profile_name_release_id = 'NUANG-PROFILE-NAME-CANDIDATE-2.1'
      and metadata ->> 'supersedes' = 'NUANG-PROFILE-NAME-CANDIDATE-2.0'
      and metadata ->> 'supersededBy' = 'NUANG-PROFILE-NAME-CANDIDATE-3.0'
  ) or not exists (
    select 1
    from report.profile_name_release
    where profile_name_release_id = 'NUANG-PROFILE-NAME-CANDIDATE-3.0'
      and metadata ->> 'supersedes' = 'NUANG-PROFILE-NAME-CANDIDATE-2.1'
      and not (metadata ? 'supersededBy')
  ) then
    raise exception 'Profile name release lineage must be 1.1 -> 2.0 -> 2.1 -> 3.0';
  end if;

  if not exists (
    select 1
    from report.profile_name_definition
    where profile_name_release_id = 'NUANG-PROFILE-NAME-CANDIDATE-3.0'
      and profile_code = 'IRAMQ'
      and display_name = '마음 변화를 듣는 경청자'
      and accessible_name = '마음 변화를 듣는 경청자, 뉴앙 코드 IRAMQ'
      and metadata ->> 'shortName' = '경청자'
      and metadata ->> 'profileNameReleaseId' = 'NUANG-PROFILE-NAME-CANDIDATE-3.0'
  ) then
    raise exception 'NUANG-PROFILE-NAME-CANDIDATE-3.0 IRAMQ must match the application catalog';
  end if;

  if exists (
    with expected_profile_name(
      profile_code,
      short_name,
      display_name,
      family_id
    ) as (
      values
        ('ERGKC', '운영자', '차분히 현장을 이끄는 운영자', 'PRACTICAL_SOLUTION'),
        ('ERGKQ', '해결사', '변수에 빠르게 답하는 해결사', 'PRACTICAL_SOLUTION'),
        ('ERGMC', '실무가', '상황에 맞춰 답을 찾는 실무가', 'PRACTICAL_SOLUTION'),
        ('ERGMQ', '돌파자', '현장의 막힘을 깨는 돌파자', 'PRACTICAL_SOLUTION'),
        ('ERAKC', '조율가', '관계를 차분히 맞추는 조율가', 'CONCRETE_CARE'),
        ('ERAKQ', '관계지기', '마음 변화를 살피는 관계지기', 'CONCRETE_CARE'),
        ('ERAMC', '동행가', '편안히 곁을 걷는 동행가', 'CONCRETE_CARE'),
        ('ERAMQ', '공감자', '마음에 바로 반응하는 공감자', 'CONCRETE_CARE'),
        ('ENGKC', '통솔자', '해법을 이끄는 통솔자', 'POSSIBILITY_SOLUTION'),
        ('ENGKQ', '혁신가', '변화를 이끄는 혁신가', 'POSSIBILITY_SOLUTION'),
        ('ENGMC', '개척자', '새 길을 여는 개척자', 'POSSIBILITY_SOLUTION'),
        ('ENGMQ', '발상가', '가능성을 펼치는 발상가', 'POSSIBILITY_SOLUTION'),
        ('ENAKC', '지휘자', '사람과 가능성을 잇는 지휘자', 'POSSIBILITY_CONNECTION'),
        ('ENAKQ', '선도자', '관계를 여는 선도자', 'POSSIBILITY_CONNECTION'),
        ('ENAMC', '소통가', '상상과 마음을 나누는 소통가', 'POSSIBILITY_CONNECTION'),
        ('ENAMQ', '이야기꾼', '마음과 상상을 펼치는 이야기꾼', 'POSSIBILITY_CONNECTION'),
        ('IRGKC', '분석가', '차근차근 답을 쌓는 분석가', 'PRACTICAL_SOLUTION'),
        ('IRGKQ', '전략가', '변수를 꼼꼼히 살피는 전략가', 'PRACTICAL_SOLUTION'),
        ('IRGMC', '탐구자', '단서로 답을 찾는 탐구자', 'PRACTICAL_SOLUTION'),
        ('IRGMQ', '추적자', '변화의 원인을 좇는 추적자', 'PRACTICAL_SOLUTION'),
        ('IRAKC', '수호자', '조용히 마음을 지키는 수호자', 'CONCRETE_CARE'),
        ('IRAKQ', '관찰자', '마음 변화를 살피는 관찰자', 'CONCRETE_CARE'),
        ('IRAMC', '조력자', '조용히 힘을 보태는 조력자', 'CONCRETE_CARE'),
        ('IRAMQ', '경청자', '마음 변화를 듣는 경청자', 'CONCRETE_CARE'),
        ('INGKC', '설계자', '가능성을 차근차근 짓는 설계자', 'POSSIBILITY_SOLUTION'),
        ('INGKQ', '과학자', '가능성을 검증하는 과학자', 'POSSIBILITY_SOLUTION'),
        ('INGMC', '탐험가', '새 가능성을 찾는 탐험가', 'POSSIBILITY_SOLUTION'),
        ('INGMQ', '사색가', '가능성을 깊이 좇는 사색가', 'POSSIBILITY_SOLUTION'),
        ('INAKC', '상담가', '마음의 길을 함께 찾는 상담가', 'POSSIBILITY_CONNECTION'),
        ('INAKQ', '안내자', '마음과 가능성을 살피는 안내자', 'POSSIBILITY_CONNECTION'),
        ('INAMC', '상상가', '마음과 가능성을 그리는 상상가', 'POSSIBILITY_CONNECTION'),
        ('INAMQ', '통찰자', '마음의 의미를 읽는 통찰자', 'POSSIBILITY_CONNECTION')
    ), actual_profile_name as (
      select
        profile_code,
        metadata ->> 'shortName' as short_name,
        display_name,
        metadata ->> 'familyId' as family_id
      from report.profile_name_definition
      where profile_name_release_id = 'NUANG-PROFILE-NAME-CANDIDATE-3.0'
    )
    select 1
    from (
      (select * from actual_profile_name except select * from expected_profile_name)
      union all
      (select * from expected_profile_name except select * from actual_profile_name)
    ) drift
  ) then
    raise exception 'NUANG-PROFILE-NAME-CANDIDATE-3.0 must match the application catalog';
  end if;

  if exists (
    select 1
    from report.profile_name_definition current_definition
    join report.profile_name_definition previous_definition
      on previous_definition.profile_name_release_id = 'NUANG-PROFILE-NAME-CANDIDATE-2.1'
     and previous_definition.profile_code = current_definition.profile_code
    where current_definition.profile_name_release_id = 'NUANG-PROFILE-NAME-CANDIDATE-3.0'
      and (
        current_definition.precise_name is distinct from previous_definition.precise_name
        or current_definition.summary is distinct from previous_definition.summary
        or current_definition.metadata ->> 'profileNameReleaseId'
          is distinct from 'NUANG-PROFILE-NAME-CANDIDATE-3.0'
      )
  ) then
    raise exception 'NUANG-PROFILE-NAME-CANDIDATE-3.0 must inherit 2.1 narrative fields and identify its release';
  end if;
end
$profile_name_release_chain$;
