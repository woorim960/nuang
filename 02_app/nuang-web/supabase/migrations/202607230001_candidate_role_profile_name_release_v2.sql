insert into report.profile_name_release (
  profile_name_release_id,
  code_scheme_version,
  status,
  naming_model_version,
  validation_gates,
  guardrails,
  metadata
) values (
  'NUANG-PROFILE-NAME-CANDIDATE-2.0',
  'NUANG-CODE-5AXIS-CANDIDATE-1.0',
  'candidate',
  'unique-short-role-plus-family-and-long-name.v2',
  '{"owner_copy_review":"passed","language_review":"passed","measurement_alignment":"not_started","mobile_usability":"not_started","nickname_comprehension":"not_started","nickname_recall":"not_started"}'::jsonb,
  '{"noAbilityClaims":true,"noMoralRanking":true,"noMentalHealthClaims":true,"uniqueShortNames":true,"maxLongNameWords":4,"candidateSharing":false,"candidateComparison":false}'::jsonb,
  '{"purpose":"32 unique short nicknames, memorable long nicknames, and four understandable profile families","productionEligible":false,"supersedes":"NUANG-PROFILE-NAME-CANDIDATE-1.1","researchDocument":"04_PROFILE_NAMING_SYSTEM_V2.md"}'::jsonb
)
on conflict (profile_name_release_id) do update set
  naming_model_version = excluded.naming_model_version,
  validation_gates = excluded.validation_gates,
  guardrails = excluded.guardrails,
  metadata = excluded.metadata;

update report.profile_name_release
set metadata = coalesce(metadata, '{}'::jsonb) ||
  '{"supersededBy":"NUANG-PROFILE-NAME-CANDIDATE-2.0"}'::jsonb
where profile_name_release_id = 'NUANG-PROFILE-NAME-CANDIDATE-1.1';

with profile_name(
  profile_code,
  short_name,
  display_name,
  family_id,
  family_name
) as (
  values
    ('ERGKC', '운영가', '차분히 답을 세우는 운영가', 'PRACTICAL_SOLUTION', '현실 해법형'),
    ('ERGKQ', '해결사', '문제를 빠르게 푸는 해결사', 'PRACTICAL_SOLUTION', '현실 해법형'),
    ('ERGMC', '대응가', '유연하게 답을 찾는 대응가', 'PRACTICAL_SOLUTION', '현실 해법형'),
    ('ERGMQ', '현장해결가', '빠르게 움직이는 현장해결가', 'PRACTICAL_SOLUTION', '현실 해법형'),
    ('ERAKC', '조율가', '차분히 관계를 맞추는 조율가', 'CONCRETE_CARE', '생활 관계형'),
    ('ERAKQ', '관계지기', '관계 변화를 살피는 관계지기', 'CONCRETE_CARE', '생활 관계형'),
    ('ERAMC', '동행가', '유연하게 곁을 걷는 동행가', 'CONCRETE_CARE', '생활 관계형'),
    ('ERAMQ', '공감자', '마음에 바로 반응하는 공감자', 'CONCRETE_CARE', '생활 관계형'),
    ('ENGKC', '기획자', '가능성을 계획하는 기획자', 'POSSIBILITY_SOLUTION', '가능성 개척형'),
    ('ENGKQ', '혁신가', '변화에 답하는 혁신가', 'POSSIBILITY_SOLUTION', '가능성 개척형'),
    ('ENGMC', '개척자', '새 길을 여는 개척자', 'POSSIBILITY_SOLUTION', '가능성 개척형'),
    ('ENGMQ', '발상가', '가능성을 펼치는 발상가', 'POSSIBILITY_SOLUTION', '가능성 개척형'),
    ('ENAKC', '연결가', '사람과 가능성을 잇는 연결가', 'POSSIBILITY_CONNECTION', '관계 영감형'),
    ('ENAKQ', '지휘자', '관계를 여는 지휘자', 'POSSIBILITY_CONNECTION', '관계 영감형'),
    ('ENAMC', '소통가', '상상과 마음을 나누는 소통가', 'POSSIBILITY_CONNECTION', '관계 영감형'),
    ('ENAMQ', '이야기꾼', '마음과 상상을 펼치는 이야기꾼', 'POSSIBILITY_CONNECTION', '관계 영감형'),
    ('IRGKC', '분석가', '차근차근 답을 쌓는 분석가', 'PRACTICAL_SOLUTION', '현실 해법형'),
    ('IRGKQ', '전략가', '위험을 미리 살피는 전략가', 'PRACTICAL_SOLUTION', '현실 해법형'),
    ('IRGMC', '탐구자', '단서로 답을 찾는 탐구자', 'PRACTICAL_SOLUTION', '현실 해법형'),
    ('IRGMQ', '추적자', '원인을 끝까지 좇는 추적자', 'PRACTICAL_SOLUTION', '현실 해법형'),
    ('IRAKC', '수호자', '조용히 마음을 지키는 수호자', 'CONCRETE_CARE', '생활 관계형'),
    ('IRAKQ', '관찰자', '마음 변화를 살피는 관찰자', 'CONCRETE_CARE', '생활 관계형'),
    ('IRAMC', '지원가', '조용히 곁을 맞추는 지원가', 'CONCRETE_CARE', '생활 관계형'),
    ('IRAMQ', '경청자', '마음 변화를 듣는 경청자', 'CONCRETE_CARE', '생활 관계형'),
    ('INGKC', '설계자', '가능성을 차근차근 짓는 설계자', 'POSSIBILITY_SOLUTION', '가능성 개척형'),
    ('INGKQ', '예측가', '위험과 가능성을 보는 예측가', 'POSSIBILITY_SOLUTION', '가능성 개척형'),
    ('INGMC', '탐험가', '새 가능성을 찾는 탐험가', 'POSSIBILITY_SOLUTION', '가능성 개척형'),
    ('INGMQ', '사색가', '가능성을 깊이 좇는 사색가', 'POSSIBILITY_SOLUTION', '가능성 개척형'),
    ('INAKC', '조정자', '조용히 관계를 잇는 조정자', 'POSSIBILITY_CONNECTION', '관계 영감형'),
    ('INAKQ', '안내자', '마음과 가능성을 살피는 안내자', 'POSSIBILITY_CONNECTION', '관계 영감형'),
    ('INAMC', '상상가', '마음과 가능성을 그리는 상상가', 'POSSIBILITY_CONNECTION', '관계 영감형'),
    ('INAMQ', '기록가', '마음의 이야기를 품는 기록가', 'POSSIBILITY_CONNECTION', '관계 영감형')
), profile_copy as (
  select
    profile_code,
    short_name,
    display_name,
    family_id,
    family_name,
    case substr(profile_code, 1, 1)
      when 'E' then '함께 활력·먼저 표현'
      else '혼자 회복·살핀 뒤 표현'
    end || ' · ' ||
    case substr(profile_code, 2, 1)
      when 'R' then '구체적인 것에 관심'
      else '새 관점과 가능성 탐색'
    end || ' · ' ||
    case substr(profile_code, 3, 1)
      when 'G' then '원인과 해결할 부분에 관심'
      else '상대가 어떤 마음인지에 관심'
    end || ' · ' ||
    case substr(profile_code, 4, 1)
      when 'K' then '비교적 꾸준히 이어짐'
      else '상황 영향을 더 받음'
    end || ' · ' ||
    case substr(profile_code, 5, 1)
      when 'C' then '걱정·감정이 천천히 커짐'
      else '걱정·감정이 빨리 커짐'
    end as precise_name,
    case substr(profile_code, 1, 2)
      when 'ER' then '사람들과 함께할 때 활력이 오르고, 확인된 사실과 구체적인 내용을 중심으로 살펴봐요.'
      when 'EN' then '사람들과 함께할 때 활력이 오르고, 보이는 내용 너머의 가능성과 새로운 관점을 더 찾아봐요.'
      when 'IR' then '혼자 생각을 정리하며 회복하고, 확인된 사실과 구체적인 내용을 중심으로 살펴봐요.'
      else '혼자 생각을 정리하며 회복하고, 보이는 내용 너머의 가능성과 새로운 관점을 더 찾아봐요.'
    end || ' ' ||
    case substr(profile_code, 3, 2)
      when 'GK' then '관계 문제에서는 무슨 일이 있었고 어떻게 풀 수 있을지에 관심이 가며, 해야 할 일은 비교적 꾸준히 이어가요.'
      when 'GM' then '관계 문제에서는 무슨 일이 있었고 어떻게 풀 수 있을지에 관심이 가며, 일의 시작과 지속은 그날의 상황에 따라 달라지는 편이에요.'
      when 'AK' then '관계 문제에서는 상대가 어떤 마음인지 자연스럽게 살피며, 해야 할 일은 비교적 꾸준히 이어가요.'
      else '관계 문제에서는 상대가 어떤 마음인지 자연스럽게 살피며, 일의 시작과 지속은 그날의 상황에 따라 달라지는 편이에요.'
    end || ' ' ||
    case substr(profile_code, 5, 1)
      when 'C' then '불편한 일이 생겨도 걱정과 감정은 비교적 천천히 커지는 편이에요.'
      else '불편한 일이 생기면 걱정과 감정이 비교적 빠르게 커질 수 있어요.'
    end as summary,
    jsonb_build_array(
      case substr(profile_code, 1, 1) when 'E' then '함께' else '혼자' end,
      case substr(profile_code, 2, 1) when 'R' then '구체' else '탐색' end,
      case substr(profile_code, 3, 1) when 'G' then '원인과 해결 살피기' else '상대 마음 살피기' end,
      case substr(profile_code, 4, 1) when 'K' then '꾸준' else '상황 따라' end,
      case substr(profile_code, 5, 1) when 'C' then '차분한 반응' else '빠른 걱정·감정 반응' end
    ) as code_tokens
  from profile_name
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
  'NUANG-PROFILE-NAME-CANDIDATE-2.0',
  profile_code,
  display_name,
  display_name || ', 뉴앙 코드 ' || profile_code,
  precise_name,
  summary,
  jsonb_build_object(
    'candidateOnly', true,
    'shareable', false,
    'comparisonEligible', false,
    'shortName', short_name,
    'familyId', family_id,
    'familyName', family_name,
    'codeTokens', code_tokens,
    'overviewLabels', jsonb_build_array('에너지와 관심', '관계와 일상', '걱정과 감정')
  )
from profile_copy
on conflict (profile_name_release_id, profile_code) do update set
  display_name = excluded.display_name,
  accessible_name = excluded.accessible_name,
  precise_name = excluded.precise_name,
  summary = excluded.summary,
  metadata = excluded.metadata;
