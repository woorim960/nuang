insert into report.profile_name_release (
  profile_name_release_id,
  code_scheme_version,
  status,
  naming_model_version,
  validation_gates,
  guardrails,
  metadata
) values (
  'NUANG-PROFILE-NAME-CANDIDATE-1.1',
  'NUANG-CODE-5AXIS-CANDIDATE-1.0',
  'candidate',
  'short-role-plus-three-part-overview.v1',
  '{"owner_copy_review":"passed","language_review":"not_started","measurement_alignment":"not_started","mobile_usability":"not_started"}'::jsonb,
  '{"noAbilityClaims":true,"noMoralRanking":true,"noMentalHealthClaims":true,"candidateSharing":false,"candidateComparison":false}'::jsonb,
  '{"purpose":"approved short role names and readable candidate overview","productionEligible":false,"legacyLookupSeparated":true}'::jsonb
)
on conflict (profile_name_release_id) do update set
  naming_model_version = excluded.naming_model_version,
  validation_gates = excluded.validation_gates,
  guardrails = excluded.guardrails,
  metadata = excluded.metadata;

with approved_role_name(profile_code, display_name) as (
  values
    ('ERGKC', '답을 세우는 설계자'),
    ('ERGKQ', '뜨거운 해법 설계자'),
    ('ERGMC', '현장의 해법 탐구자'),
    ('ERGMQ', '열정의 현장 해결가'),
    ('ERAKC', '온도를 맞추는 조율가'),
    ('ERAKQ', '진심을 잇는 조율가'),
    ('ERAMC', '곁을 맞추는 동행가'),
    ('ERAMQ', '마음으로 걷는 동행가'),
    ('ENGKC', '가능성을 짓는 기획자'),
    ('ENGKQ', '영감을 키우는 기획자'),
    ('ENGMC', '새 길을 여는 탐험가'),
    ('ENGMQ', '번뜩이는 길잡이'),
    ('ENAKC', '이야기를 잇는 연결가'),
    ('ENAKQ', '관계를 여는 지휘자'),
    ('ENAMC', '상상을 나누는 동행가'),
    ('ENAMQ', '설렘을 잇는 이야기꾼'),
    ('IRGKC', '답을 쌓는 설계자'),
    ('IRGKQ', '열기를 품은 설계자'),
    ('IRGMC', '단서를 좇는 탐구자'),
    ('IRGMQ', '질문을 품은 탐구자'),
    ('IRAKC', '마음을 지키는 조율가'),
    ('IRAKQ', '파동을 품은 조율가'),
    ('IRAMC', '곁을 지키는 동행가'),
    ('IRAMQ', '마음결을 걷는 동행가'),
    ('INGKC', '가능성을 짓는 전략가'),
    ('INGKQ', '불꽃을 품은 전략가'),
    ('INGMC', '새 길을 찾는 탐구자'),
    ('INGMQ', '생각의 파도 탐험가'),
    ('INAKC', '조용히 잇는 연결가'),
    ('INAKQ', '고요한 마음 지휘자'),
    ('INAMC', '상상을 걷는 동행가'),
    ('INAMQ', '마음을 품은 이야기꾼')
), profile_copy as (
  select
    profile_code,
    display_name,
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
  from approved_role_name
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
  'NUANG-PROFILE-NAME-CANDIDATE-1.1',
  profile_code,
  display_name,
  display_name || ', 뉴앙 코드 ' || profile_code,
  precise_name,
  summary,
  jsonb_build_object(
    'candidateOnly', true,
    'shareable', false,
    'comparisonEligible', false,
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
