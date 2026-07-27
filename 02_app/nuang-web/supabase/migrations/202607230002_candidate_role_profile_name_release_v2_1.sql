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
  'NUANG-PROFILE-NAME-CANDIDATE-2.1',
  code_scheme_version,
  'candidate',
  'unique-short-role-plus-family-and-long-name.v2.1',
  coalesce(validation_gates, '{}'::jsonb) ||
    '{"owner_copy_review":"passed","language_review":"passed","measurement_alignment":"not_started","mobile_usability":"not_started","nickname_comprehension":"not_started","nickname_recall":"not_started"}'::jsonb,
  coalesce(guardrails, '{}'::jsonb) ||
    '{"noPredictionAbilityClaims":true,"noGuaranteedRiskDetection":true}'::jsonb,
  coalesce(metadata, '{}'::jsonb) ||
    '{"purpose":"remove prediction and guaranteed-ability implications while preserving 32 memorable role names","productionEligible":false,"supersedes":"NUANG-PROFILE-NAME-CANDIDATE-2.0","researchDocument":"04_PROFILE_NAMING_SYSTEM_V2.md"}'::jsonb
from report.profile_name_release
where profile_name_release_id = 'NUANG-PROFILE-NAME-CANDIDATE-2.0'
on conflict (profile_name_release_id) do update set
  code_scheme_version = excluded.code_scheme_version,
  status = excluded.status,
  naming_model_version = excluded.naming_model_version,
  validation_gates = excluded.validation_gates,
  guardrails = excluded.guardrails,
  metadata = excluded.metadata;

update report.profile_name_release
set metadata = coalesce(metadata, '{}'::jsonb) ||
  '{"supersededBy":"NUANG-PROFILE-NAME-CANDIDATE-2.1"}'::jsonb
where profile_name_release_id = 'NUANG-PROFILE-NAME-CANDIDATE-2.0';

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
  'NUANG-PROFILE-NAME-CANDIDATE-2.1',
  profile_code,
  case profile_code
    when 'ERGKQ' then '변수에 빠르게 반응하는 해결사'
    when 'IRGKQ' then '변수를 꼼꼼히 살피는 전략가'
    when 'IRGMQ' then '변화의 원인을 좇는 추적자'
    when 'INGKQ' then '가능성과 변수를 살피는 구상가'
    else display_name
  end,
  case profile_code
    when 'ERGKQ' then '변수에 빠르게 반응하는 해결사'
    when 'IRGKQ' then '변수를 꼼꼼히 살피는 전략가'
    when 'IRGMQ' then '변화의 원인을 좇는 추적자'
    when 'INGKQ' then '가능성과 변수를 살피는 구상가'
    else display_name
  end || ', 뉴앙 코드 ' || profile_code,
  precise_name,
  summary,
  jsonb_set(
    jsonb_set(
      case
        when profile_code = 'INGKQ'
          then jsonb_set(coalesce(metadata, '{}'::jsonb), '{shortName}', '"구상가"'::jsonb, true)
        else coalesce(metadata, '{}'::jsonb)
      end,
      '{codeTokens}',
      jsonb_build_array(
        case substr(profile_code, 1, 1) when 'E' then '외향형' else '내향형' end,
        case substr(profile_code, 2, 1) when 'R' then '현실형' else '가능성형' end,
        case substr(profile_code, 3, 1) when 'G' then '해결형' else '마음형' end,
        case substr(profile_code, 4, 1) when 'K' then '꾸준형' else '상황형' end,
        case substr(profile_code, 5, 1) when 'C' then '차분반응형' else '빠른반응형' end
      ),
      true
    ),
    '{symbolLanguageReleaseId}',
    '"NUANG-CODE-SYMBOL-LANGUAGE-1.0"'::jsonb,
    true
  )
from report.profile_name_definition
where profile_name_release_id = 'NUANG-PROFILE-NAME-CANDIDATE-2.0'
on conflict (profile_name_release_id, profile_code) do update set
  display_name = excluded.display_name,
  accessible_name = excluded.accessible_name,
  precise_name = excluded.precise_name,
  summary = excluded.summary,
  metadata = excluded.metadata;
