create table if not exists report.profile_name_release (
  profile_name_release_id text primary key,
  code_scheme_version text not null references scoring.code_scheme_release(code_scheme_version),
  status text not null check (status in ('candidate', 'validated', 'active', 'retired')),
  naming_model_version text not null,
  validation_gates jsonb not null default '{}'::jsonb,
  guardrails jsonb not null default '{}'::jsonb,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  activated_at timestamptz
);

create unique index if not exists profile_name_release_one_active_idx
on report.profile_name_release ((status))
where status = 'active';

create table if not exists report.profile_name_definition (
  profile_name_release_id text not null references report.profile_name_release(profile_name_release_id) on delete cascade,
  profile_code text not null check (profile_code ~ '^[EI][RN][GA][MK][CQ]$'),
  display_name text not null,
  accessible_name text not null,
  precise_name text not null,
  summary text not null,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  primary key (profile_name_release_id, profile_code),
  unique (profile_name_release_id, display_name)
);

alter table report.profile_name_release enable row level security;
alter table report.profile_name_definition enable row level security;

revoke all on report.profile_name_release from anon, authenticated;
revoke all on report.profile_name_definition from anon, authenticated;

grant select, insert, update, delete on report.profile_name_release to service_role;
grant select, insert, update, delete on report.profile_name_definition to service_role;

create or replace function report.activate_profile_name_release(target_release_id text)
returns void
language plpgsql
security definer
set search_path = report, scoring, public
as $$
declare
  target_release report.profile_name_release%rowtype;
  target_scheme scoring.code_scheme_release%rowtype;
  gate_status text;
  definition_count integer;
begin
  select * into target_release
  from report.profile_name_release
  where profile_name_release_id = target_release_id
  for update;

  if not found then
    raise exception 'Unknown profile name release: %', target_release_id;
  end if;
  if target_release.status <> 'validated' then
    raise exception 'Profile name release must be validated before activation';
  end if;

  select count(*) into definition_count
  from report.profile_name_definition
  where profile_name_release_id = target_release_id;

  if definition_count <> 32 then
    raise exception 'Profile name release must contain exactly 32 definitions';
  end if;

  select * into target_scheme
  from scoring.code_scheme_release
  where code_scheme_version = target_release.code_scheme_version
  for update;

  if target_scheme.status <> 'validated' then
    raise exception 'Code scheme must be validated before profile names';
  end if;

  foreach gate_status in array array['language_review', 'measurement_alignment', 'mobile_usability'] loop
    if coalesce(target_release.validation_gates ->> gate_status, 'not_started') <> 'passed' then
      raise exception 'Profile name validation gate has not passed: %', gate_status;
    end if;
  end loop;

  update report.profile_name_release
  set status = 'retired'
  where status = 'active';

  update report.profile_name_release
  set status = 'active', activated_at = now()
  where profile_name_release_id = target_release_id;
end;
$$;

revoke all on function report.activate_profile_name_release(text) from public, anon, authenticated;
grant execute on function report.activate_profile_name_release(text) to service_role;

insert into report.profile_name_release (
  profile_name_release_id,
  code_scheme_version,
  status,
  naming_model_version,
  validation_gates,
  guardrails,
  metadata
) values (
  'NUANG-PROFILE-NAME-CANDIDATE-1.0',
  'NUANG-CODE-5AXIS-CANDIDATE-1.0',
  'candidate',
  'explicit-three-beat-plus-precise-detail.v1',
  '{"language_review":"not_started","measurement_alignment":"not_started","mobile_usability":"not_started"}'::jsonb,
  '{"noAbilityClaims":true,"noMoralRanking":true,"noMentalHealthClaims":true,"candidateSharing":false,"candidateComparison":false}'::jsonb,
  '{"purpose":"NAME-01 candidate UI and language review","productionEligible":false,"legacyLookupSeparated":true}'::jsonb
)
on conflict (profile_name_release_id) do update set
  naming_model_version = excluded.naming_model_version,
  guardrails = excluded.guardrails,
  metadata = excluded.metadata;

with direction_token(position, symbol, short_token, precise_token, description) as (
  values
    (1, 'E', '함께', '함께 활력·먼저 표현', '사람들과 함께할 때 활력이 오르고 필요한 말을 먼저 꺼내는 편이에요.'),
    (1, 'I', '혼자', '혼자 회복·살핀 뒤 표현', '혼자 생각을 정리하며 회복하고 상황을 살핀 뒤 표현하는 편이에요.'),
    (2, 'R', '구체', '구체적인 것에 관심', '이미 확인된 내용이나 익숙하고 구체적인 대상부터 살펴보는 편이에요.'),
    (2, 'N', '탐색', '새 관점과 가능성 탐색', '보이는 내용 너머의 가능성, 새로운 원리와 관점을 더 탐색하는 편이에요.'),
    (3, 'G', '해결 먼저', '원인·해결 먼저', '관계에서 문제가 생기면 원인과 해결할 부분이 먼저 눈에 들어오는 편이에요.'),
    (3, 'A', '마음 먼저', '상대 마음 먼저', '관계에서 문제가 생기면 상대의 마음을 먼저 살피는 편이에요.'),
    (4, 'K', '꾸준', '비교적 꾸준히 이어짐', '해야 할 일을 시작하고 이어가며 정리하는 흐름이 비교적 꾸준한 편이에요.'),
    (4, 'M', '상황 따라', '상황 영향을 더 받음', '해야 할 일을 시작하고 이어가며 정리하는 흐름이 그날의 상황에 따라 더 달라지는 편이에요.'),
    (5, 'C', '차분한 반응', '걱정·감정이 천천히 커짐', '불편한 상황에서도 걱정과 감정이 급격히 커지는 일이 비교적 적은 편이에요.'),
    (5, 'Q', '빠른 걱정·감정 반응', '걱정·감정이 빨리 커짐', '불편한 상황에서 걱정과 감정이 비교적 빨리 커질 수 있는 편이에요.')
), profile_rows as (
  select
    p1.symbol || p2.symbol || p3.symbol || p4.symbol || p5.symbol as profile_code,
    p1.short_token || '·' || p2.short_token || ', ' ||
      p3.short_token || '·' || p4.short_token || ', ' || p5.short_token as display_name,
    p1.short_token || ', ' || p2.short_token || ', ' || p3.short_token || ', ' ||
      p4.short_token || ', ' || p5.short_token as accessible_name,
    p1.precise_token || ' · ' || p2.precise_token || ' · ' || p3.precise_token || ' · ' ||
      p4.precise_token || ' · ' || p5.precise_token as precise_name,
    p1.description || ' ' || p2.description || ' ' || p3.description || ' ' ||
      p4.description || ' ' || p5.description as summary
  from direction_token p1
  cross join direction_token p2
  cross join direction_token p3
  cross join direction_token p4
  cross join direction_token p5
  where p1.position = 1
    and p2.position = 2
    and p3.position = 3
    and p4.position = 4
    and p5.position = 5
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
  'NUANG-PROFILE-NAME-CANDIDATE-1.0',
  profile_code,
  display_name,
  accessible_name,
  precise_name,
  summary,
  '{"candidateOnly":true,"shareable":false,"comparisonEligible":false}'::jsonb
from profile_rows
on conflict (profile_name_release_id, profile_code) do update set
  display_name = excluded.display_name,
  accessible_name = excluded.accessible_name,
  precise_name = excluded.precise_name,
  summary = excluded.summary,
  metadata = excluded.metadata;
