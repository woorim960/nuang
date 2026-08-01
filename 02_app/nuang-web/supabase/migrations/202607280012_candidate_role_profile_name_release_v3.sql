insert into report.profile_name_release (
  profile_name_release_id,
  code_scheme_version,
  status,
  naming_model_version,
  validation_gates,
  guardrails,
  metadata
)
select
  'NUANG-PROFILE-NAME-CANDIDATE-3.0',
  code_scheme_version,
  'candidate',
  'unique-role-nickname-plus-plain-korean-guide.v3',
  coalesce(validation_gates, '{}'::jsonb) ||
    '{"owner_copy_review":"passed","language_review":"passed","role_taxonomy_review":"passed","measurement_alignment":"not_started","mobile_usability":"not_started","nickname_comprehension":"not_started","nickname_recall":"not_started"}'::jsonb,
  coalesce(guardrails, '{}'::jsonb) ||
    '{"noAbilityClaims":true,"noMoralRanking":true,"noMentalHealthClaims":true,"uniqueShortNames":true,"noTypeSuffix":true,"noPredictionAbilityClaims":true}'::jsonb,
  coalesce(metadata, '{}'::jsonb) ||
    '{"purpose":"32 distinct Korean role nicknames and plain-language trait-map guides","ownerApproved":true,"productionEligible":false,"supersedes":"NUANG-PROFILE-NAME-CANDIDATE-2.1"}'::jsonb
from report.profile_name_release
where profile_name_release_id = 'NUANG-PROFILE-NAME-CANDIDATE-2.1'
on conflict (profile_name_release_id) do update set
  code_scheme_version = excluded.code_scheme_version,
  status = excluded.status,
  naming_model_version = excluded.naming_model_version,
  validation_gates = excluded.validation_gates,
  guardrails = excluded.guardrails,
  metadata = excluded.metadata;

update report.profile_name_release
set metadata = coalesce(metadata, '{}'::jsonb) ||
  '{"supersededBy":"NUANG-PROFILE-NAME-CANDIDATE-3.0"}'::jsonb
where profile_name_release_id = 'NUANG-PROFILE-NAME-CANDIDATE-2.1';

with profile_name(
  profile_code,
  short_name,
  display_name
) as (
  values
    ('ERGKC', '운영자', '차분히 현장을 이끄는 운영자'),
    ('ERGKQ', '해결사', '변수에 빠르게 답하는 해결사'),
    ('ERGMC', '실무가', '상황에 맞춰 답을 찾는 실무가'),
    ('ERGMQ', '돌파자', '현장의 막힘을 깨는 돌파자'),
    ('ERAKC', '조율가', '관계를 차분히 맞추는 조율가'),
    ('ERAKQ', '관계지기', '마음 변화를 살피는 관계지기'),
    ('ERAMC', '동행가', '편안히 곁을 걷는 동행가'),
    ('ERAMQ', '공감자', '마음에 바로 반응하는 공감자'),
    ('ENGKC', '통솔자', '해법을 이끄는 통솔자'),
    ('ENGKQ', '혁신가', '변화를 이끄는 혁신가'),
    ('ENGMC', '개척자', '새 길을 여는 개척자'),
    ('ENGMQ', '발상가', '가능성을 펼치는 발상가'),
    ('ENAKC', '지휘자', '사람과 가능성을 잇는 지휘자'),
    ('ENAKQ', '선도자', '관계를 여는 선도자'),
    ('ENAMC', '소통가', '상상과 마음을 나누는 소통가'),
    ('ENAMQ', '이야기꾼', '마음과 상상을 펼치는 이야기꾼'),
    ('IRGKC', '분석가', '차근차근 답을 쌓는 분석가'),
    ('IRGKQ', '전략가', '변수를 꼼꼼히 살피는 전략가'),
    ('IRGMC', '탐구자', '단서로 답을 찾는 탐구자'),
    ('IRGMQ', '추적자', '변화의 원인을 좇는 추적자'),
    ('IRAKC', '수호자', '조용히 마음을 지키는 수호자'),
    ('IRAKQ', '관찰자', '마음 변화를 살피는 관찰자'),
    ('IRAMC', '조력자', '조용히 힘을 보태는 조력자'),
    ('IRAMQ', '경청자', '마음의 변화를 듣는 경청자'),
    ('INGKC', '설계자', '가능성을 차근차근 짓는 설계자'),
    ('INGKQ', '과학자', '가능성을 검증하는 과학자'),
    ('INGMC', '탐험가', '새 가능성을 찾는 탐험가'),
    ('INGMQ', '사색가', '가능성을 깊이 좇는 사색가'),
    ('INAKC', '상담가', '마음의 길을 함께 찾는 상담가'),
    ('INAKQ', '안내자', '마음과 가능성을 살피는 안내자'),
    ('INAMC', '상상가', '마음과 가능성을 그리는 상상가'),
    ('INAMQ', '통찰자', '마음의 의미를 읽는 통찰자')
)
insert into report.profile_name_definition (
  profile_name_release_id,
  profile_code,
  display_name,
  accessible_name,
  precise_name,
  summary,
  metadata
)
select
  'NUANG-PROFILE-NAME-CANDIDATE-3.0',
  profile_name.profile_code,
  profile_name.display_name,
  profile_name.display_name || ', 뉴앙 코드 ' || profile_name.profile_code,
  previous.precise_name,
  previous.summary,
  jsonb_set(
    jsonb_set(
      coalesce(previous.metadata, '{}'::jsonb),
      '{shortName}',
      to_jsonb(profile_name.short_name),
      true
    ),
    '{profileNameReleaseId}',
    '"NUANG-PROFILE-NAME-CANDIDATE-3.0"'::jsonb,
    true
  )
from profile_name
join report.profile_name_definition previous
  on previous.profile_name_release_id = 'NUANG-PROFILE-NAME-CANDIDATE-2.1'
 and previous.profile_code = profile_name.profile_code
on conflict (profile_name_release_id, profile_code) do update set
  display_name = excluded.display_name,
  accessible_name = excluded.accessible_name,
  precise_name = excluded.precise_name,
  summary = excluded.summary,
  metadata = excluded.metadata;

do $$
begin
  if (
    select count(*)
    from report.profile_name_definition
    where profile_name_release_id = 'NUANG-PROFILE-NAME-CANDIDATE-3.0'
  ) <> 32 then
    raise exception 'NUANG-PROFILE-NAME-CANDIDATE-3.0 must contain 32 definitions';
  end if;
end
$$;
