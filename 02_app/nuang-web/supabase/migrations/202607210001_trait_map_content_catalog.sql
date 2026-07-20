create schema if not exists trait_map;

revoke all on schema trait_map from public, anon, authenticated;
grant usage on schema trait_map to service_role;

create table if not exists trait_map.content_release (
  release_id text primary key,
  contract_version text not null,
  code_scheme_version text not null references scoring.code_scheme_release(code_scheme_version),
  profile_name_release_id text not null references report.profile_name_release(profile_name_release_id),
  status text not null check (status in ('draft', 'in_review', 'approved', 'published', 'retired')),
  validation_gates jsonb not null default '{}'::jsonb,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  published_at timestamptz
);

create unique index if not exists trait_map_content_release_one_published_idx
on trait_map.content_release ((status))
where status = 'published';

create table if not exists trait_map.axis_definition (
  release_id text not null references trait_map.content_release(release_id) on delete cascade,
  axis_id text not null check (axis_id in ('SE', 'OE', 'RO', 'SM', 'ER')),
  code_position integer not null check (code_position between 1 and 5),
  display_label text not null,
  left_symbol text not null check (left_symbol in ('E', 'R', 'G', 'K', 'C')),
  right_symbol text not null check (right_symbol in ('I', 'N', 'A', 'M', 'Q')),
  scoring_high_symbol text not null check (scoring_high_symbol in ('E', 'N', 'A', 'K', 'Q')),
  scoring_low_symbol text not null check (scoring_low_symbol in ('I', 'R', 'G', 'M', 'C')),
  measurement_status text not null check (measurement_status in ('research_candidate_not_validated', 'validated')),
  primary key (release_id, axis_id),
  unique (release_id, code_position)
);

create table if not exists trait_map.facet_definition (
  release_id text not null,
  facet_id text not null,
  axis_id text not null,
  label text not null,
  included_meaning text not null,
  excluded_meanings jsonb not null check (jsonb_typeof(excluded_meanings) = 'array'),
  measurement_status text not null check (measurement_status in ('research_candidate_not_validated', 'validated')),
  primary key (release_id, facet_id),
  foreign key (release_id, axis_id)
    references trait_map.axis_definition(release_id, axis_id) on delete cascade
);

create table if not exists trait_map.role_profile (
  release_id text not null references trait_map.content_release(release_id) on delete cascade,
  profile_code text not null check (profile_code ~ '^[EI][RN][GA][MK][CQ]$'),
  profile_name text not null,
  name_purpose text not null check (name_purpose = 'memory_aid_not_scoring_evidence'),
  publication_state text not null check (publication_state in ('research_only', 'approved', 'published', 'retired')),
  primary key (release_id, profile_code),
  unique (release_id, profile_name)
);

create table if not exists trait_map.content_atom (
  release_id text not null references trait_map.content_release(release_id) on delete cascade,
  atom_id text not null,
  version integer not null check (version > 0),
  entity_kind text not null check (entity_kind in ('axis', 'facet', 'role_profile')),
  entity_ref text not null,
  slot text not null check (slot in (
    'summary', 'measured_definition', 'not_measured_boundary', 'role_name_meaning',
    'five_axis_breakdown', 'facet_breakdown', 'inner_thought', 'observable_response',
    'daily_life', 'family', 'friend', 'partner', 'person_of_interest', 'work',
    'strength', 'friction', 'possible_misread', 'support_preference',
    'conversation_prompt', 'growth_practice', 'limitation', 'evidence_note'
  )),
  relationship_context text not null check (relationship_context in ('general', 'family', 'friend', 'partner', 'person_of_interest', 'work')),
  copy_short text not null,
  copy_standard text,
  copy_long text,
  privacy_scope text not null check (privacy_scope in ('self_only', 'comparison_safe', 'public_safe')),
  publication_state text not null check (publication_state in ('research_only', 'review_candidate', 'approved', 'published', 'retired')),
  required_signals text[] not null default array[]::text[],
  surfaces text[] not null,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (release_id, atom_id, version),
  check (cardinality(surfaces) > 0),
  check (relationship_context = 'general' or 'relationship_context' = any(required_signals)),
  check (privacy_scope <> 'self_only' or not (surfaces && array['comparison_report', 'public_profile']::text[])),
  check (slot not in ('inner_thought', 'observable_response') or privacy_scope = 'self_only')
);

alter table trait_map.content_atom
drop constraint if exists content_atom_atom_id_check;

alter table trait_map.content_atom
add constraint content_atom_atom_id_check
check (atom_id ~ '^tmc\.v1\.[a-z0-9._-]+$');

create table if not exists trait_map.content_claim_link (
  release_id text not null,
  atom_id text not null,
  atom_version integer not null,
  claim_ref text not null,
  primary key (release_id, atom_id, atom_version, claim_ref),
  foreign key (release_id, atom_id, atom_version)
    references trait_map.content_atom(release_id, atom_id, version) on delete cascade
);

create table if not exists trait_map.content_evidence_link (
  release_id text not null,
  atom_id text not null,
  atom_version integer not null,
  evidence_ref text not null,
  primary key (release_id, atom_id, atom_version, evidence_ref),
  foreign key (release_id, atom_id, atom_version)
    references trait_map.content_atom(release_id, atom_id, version) on delete cascade
);

create table if not exists trait_map.content_review (
  release_id text not null,
  atom_id text not null,
  atom_version integer not null,
  review_role text not null check (review_role in ('psychology', 'measurement', 'product_safety', 'plain_language')),
  status text not null check (status in ('not_started', 'in_review', 'passed', 'changes_requested')),
  reviewer_ref text,
  note text,
  reviewed_at timestamptz,
  updated_at timestamptz not null default now(),
  primary key (release_id, atom_id, atom_version, review_role),
  foreign key (release_id, atom_id, atom_version)
    references trait_map.content_atom(release_id, atom_id, version) on delete cascade
);

alter table trait_map.content_release enable row level security;
alter table trait_map.axis_definition enable row level security;
alter table trait_map.facet_definition enable row level security;
alter table trait_map.role_profile enable row level security;
alter table trait_map.content_atom enable row level security;
alter table trait_map.content_claim_link enable row level security;
alter table trait_map.content_evidence_link enable row level security;
alter table trait_map.content_review enable row level security;

revoke all on all tables in schema trait_map from public, anon, authenticated;
grant select, insert, update, delete on all tables in schema trait_map to service_role;

create or replace function trait_map.enforce_content_atom_gate()
returns trigger
language plpgsql
security definer
set search_path = trait_map, public
as $$
declare
  claim_count integer;
  evidence_count integer;
  passed_review_count integer;
begin
  if new.publication_state not in ('approved', 'published') then
    return new;
  end if;

  select count(*) into claim_count
  from trait_map.content_claim_link
  where release_id = new.release_id
    and atom_id = new.atom_id
    and atom_version = new.version;

  select count(*) into evidence_count
  from trait_map.content_evidence_link
  where release_id = new.release_id
    and atom_id = new.atom_id
    and atom_version = new.version;

  select count(*) into passed_review_count
  from trait_map.content_review
  where release_id = new.release_id
    and atom_id = new.atom_id
    and atom_version = new.version
    and review_role in ('psychology', 'measurement', 'product_safety', 'plain_language')
    and status = 'passed';

  if claim_count = 0 then
    raise exception 'Content atom needs at least one claim link before approval';
  end if;
  if evidence_count = 0 then
    raise exception 'Content atom needs at least one evidence link before approval';
  end if;
  if passed_review_count <> 4 then
    raise exception 'Content atom needs all four required reviews before approval';
  end if;

  new.updated_at := now();
  return new;
end;
$$;

drop trigger if exists trait_map_content_atom_gate on trait_map.content_atom;
create trigger trait_map_content_atom_gate
before insert or update on trait_map.content_atom
for each row execute function trait_map.enforce_content_atom_gate();

create or replace function trait_map.enforce_content_release_gate()
returns trigger
language plpgsql
security definer
set search_path = trait_map, scoring, report, public
as $$
declare
  axis_count integer;
  facet_count integer;
  role_count integer;
  atom_count integer;
  unpublished_atom_count integer;
  target_scheme_status text;
  target_profile_status text;
begin
  if new.status <> 'published' then
    new.updated_at := now();
    return new;
  end if;

  select status into target_scheme_status
  from scoring.code_scheme_release
  where code_scheme_version = new.code_scheme_version;
  select status into target_profile_status
  from report.profile_name_release
  where profile_name_release_id = new.profile_name_release_id;
  select count(*) into axis_count from trait_map.axis_definition where release_id = new.release_id;
  select count(*) into facet_count from trait_map.facet_definition where release_id = new.release_id;
  select count(*) into role_count from trait_map.role_profile where release_id = new.release_id;
  select count(*) into atom_count from trait_map.content_atom where release_id = new.release_id;
  select count(*) into unpublished_atom_count
  from trait_map.content_atom
  where release_id = new.release_id and publication_state <> 'published';

  if target_scheme_status <> 'active' or target_profile_status <> 'active' then
    raise exception 'Active code scheme and profile names are required before trait map publication';
  end if;
  if axis_count <> 5 or facet_count <> 10 or role_count <> 32 then
    raise exception 'Published trait map release needs exactly 5 axes, 10 facets, and 32 role profiles';
  end if;
  if atom_count = 0 or unpublished_atom_count > 0 then
    raise exception 'Published trait map release cannot contain unpublished content atoms';
  end if;

  new.updated_at := now();
  new.published_at := coalesce(new.published_at, now());
  return new;
end;
$$;

drop trigger if exists trait_map_content_release_gate on trait_map.content_release;
create trigger trait_map_content_release_gate
before insert or update on trait_map.content_release
for each row execute function trait_map.enforce_content_release_gate();

create or replace function trait_map.publish_content_release(target_release_id text)
returns void
language plpgsql
security definer
set search_path = trait_map, scoring, report, public
as $$
declare
  target_release trait_map.content_release%rowtype;
  axis_count integer;
  facet_count integer;
  role_count integer;
  atom_count integer;
  unapproved_atom_count integer;
  target_scheme_status text;
  target_profile_status text;
begin
  select * into target_release
  from trait_map.content_release
  where release_id = target_release_id
  for update;

  if not found then
    raise exception 'Unknown trait map content release: %', target_release_id;
  end if;
  if target_release.status <> 'approved' then
    raise exception 'Trait map content release must be approved before publication';
  end if;

  select status into target_scheme_status
  from scoring.code_scheme_release
  where code_scheme_version = target_release.code_scheme_version;
  select status into target_profile_status
  from report.profile_name_release
  where profile_name_release_id = target_release.profile_name_release_id;

  if target_scheme_status <> 'active' then
    raise exception 'Code scheme must be active before trait map publication';
  end if;
  if target_profile_status <> 'active' then
    raise exception 'Profile name release must be active before trait map publication';
  end if;

  select count(*) into axis_count from trait_map.axis_definition where release_id = target_release_id;
  select count(*) into facet_count from trait_map.facet_definition where release_id = target_release_id;
  select count(*) into role_count from trait_map.role_profile where release_id = target_release_id;
  select count(*) into atom_count from trait_map.content_atom where release_id = target_release_id;
  select count(*) into unapproved_atom_count
  from trait_map.content_atom
  where release_id = target_release_id and publication_state <> 'approved';

  if axis_count <> 5 or facet_count <> 10 or role_count <> 32 then
    raise exception 'Trait map release inventory must contain exactly 5 axes, 10 facets, and 32 role profiles';
  end if;
  if atom_count = 0 or unapproved_atom_count > 0 then
    raise exception 'Every content atom must be approved before release publication';
  end if;

  update trait_map.content_release set status = 'retired' where status = 'published';
  update trait_map.content_atom
  set publication_state = 'published', updated_at = now()
  where release_id = target_release_id;
  update trait_map.role_profile
  set publication_state = 'published'
  where release_id = target_release_id;
  update trait_map.content_release
  set status = 'published', published_at = now(), updated_at = now()
  where release_id = target_release_id;
end;
$$;

revoke all on function trait_map.enforce_content_atom_gate() from public, anon, authenticated;
revoke all on function trait_map.enforce_content_release_gate() from public, anon, authenticated;
revoke all on function trait_map.publish_content_release(text) from public, anon, authenticated;
grant execute on function trait_map.publish_content_release(text) to service_role;

create or replace function public.get_published_trait_map_profile(target_code text)
returns jsonb
language sql
stable
security definer
set search_path = trait_map, public
as $$
  select jsonb_build_object(
    'releaseId', release.release_id,
    'contractVersion', release.contract_version,
    'profile', jsonb_build_object(
      'code', profile.profile_code,
      'name', profile.profile_name
    ),
    'contentAtoms', coalesce((
      select jsonb_agg(jsonb_build_object(
        'atomId', atom.atom_id,
        'version', atom.version,
        'slot', atom.slot,
        'context', atom.relationship_context,
        'copy', jsonb_build_object(
          'short', atom.copy_short,
          'standard', atom.copy_standard,
          'long', atom.copy_long
        )
      ) order by atom.atom_id)
      from trait_map.content_atom atom
      where atom.release_id = release.release_id
        and atom.entity_kind = 'role_profile'
        and atom.entity_ref = profile.profile_code
        and atom.publication_state = 'published'
        and atom.privacy_scope = 'public_safe'
        and 'map_explorer' = any(atom.surfaces)
    ), '[]'::jsonb)
  )
  from trait_map.content_release release
  join trait_map.role_profile profile on profile.release_id = release.release_id
  where release.status = 'published'
    and profile.publication_state = 'published'
    and profile.profile_code = upper(target_code)
  limit 1;
$$;

revoke all on function public.get_published_trait_map_profile(text) from public;
grant execute on function public.get_published_trait_map_profile(text) to anon, authenticated, service_role;

create or replace function public.get_trait_map_review_snapshot(target_release_id text)
returns jsonb
language sql
stable
security definer
set search_path = trait_map, public
as $$
  select jsonb_build_object(
    'releaseId', release.release_id,
    'status', release.status,
    'contractVersion', release.contract_version,
    'inventory', jsonb_build_object(
      'axes', (select count(*) from trait_map.axis_definition where release_id = release.release_id),
      'facets', (select count(*) from trait_map.facet_definition where release_id = release.release_id),
      'roleProfiles', (select count(*) from trait_map.role_profile where release_id = release.release_id),
      'contentAtoms', (select count(*) from trait_map.content_atom where release_id = release.release_id),
      'publishedAtoms', (select count(*) from trait_map.content_atom where release_id = release.release_id and publication_state = 'published')
    ),
    'atoms', coalesce((
      select jsonb_agg(jsonb_build_object(
        'atomId', atom.atom_id,
        'version', atom.version,
        'slot', atom.slot,
        'context', atom.relationship_context,
        'copyShort', atom.copy_short,
        'publicationState', atom.publication_state,
        'claimCount', (select count(*) from trait_map.content_claim_link claim where claim.release_id = atom.release_id and claim.atom_id = atom.atom_id and claim.atom_version = atom.version),
        'evidenceCount', (select count(*) from trait_map.content_evidence_link evidence where evidence.release_id = atom.release_id and evidence.atom_id = atom.atom_id and evidence.atom_version = atom.version),
        'reviews', (select jsonb_object_agg(review.review_role, review.status) from trait_map.content_review review where review.release_id = atom.release_id and review.atom_id = atom.atom_id and review.atom_version = atom.version)
      ) order by atom.atom_id)
      from trait_map.content_atom atom
      where atom.release_id = release.release_id
    ), '[]'::jsonb)
  )
  from trait_map.content_release release
  where release.release_id = target_release_id;
$$;

revoke all on function public.get_trait_map_review_snapshot(text) from public, anon, authenticated;
grant execute on function public.get_trait_map_review_snapshot(text) to service_role;

insert into trait_map.content_release (
  release_id,
  contract_version,
  code_scheme_version,
  profile_name_release_id,
  status,
  validation_gates,
  metadata
) values (
  'NUANG-TRAIT-MAP-CONTENT-1.0-DRAFT',
  'nuang-trait-map-content.v1',
  'NUANG-CODE-5AXIS-CANDIDATE-1.0',
  'NUANG-PROFILE-NAME-CANDIDATE-1.1',
  'draft',
  '{"psychology":"in_review","measurement":"in_review","product_safety":"in_review","plain_language":"in_review"}'::jsonb,
  '{"productionEligible":false,"customerVisible":false,"purpose":"trait map content operations and review"}'::jsonb
)
on conflict (release_id) do update set
  contract_version = excluded.contract_version,
  validation_gates = excluded.validation_gates,
  metadata = excluded.metadata,
  updated_at = now();

insert into trait_map.axis_definition (
  release_id, axis_id, code_position, display_label, left_symbol, right_symbol,
  scoring_high_symbol, scoring_low_symbol, measurement_status
) values
  ('NUANG-TRAIT-MAP-CONTENT-1.0-DRAFT', 'SE', 1, '사람 사이 에너지', 'E', 'I', 'E', 'I', 'research_candidate_not_validated'),
  ('NUANG-TRAIT-MAP-CONTENT-1.0-DRAFT', 'OE', 2, '생각과 탐색', 'R', 'N', 'N', 'R', 'research_candidate_not_validated'),
  ('NUANG-TRAIT-MAP-CONTENT-1.0-DRAFT', 'RO', 3, '관계에서 관심이 가는 곳', 'G', 'A', 'A', 'G', 'research_candidate_not_validated'),
  ('NUANG-TRAIT-MAP-CONTENT-1.0-DRAFT', 'SM', 4, '일상을 꾸리는 방식', 'K', 'M', 'K', 'M', 'research_candidate_not_validated'),
  ('NUANG-TRAIT-MAP-CONTENT-1.0-DRAFT', 'ER', 5, '걱정과 감정 반응', 'C', 'Q', 'Q', 'C', 'research_candidate_not_validated')
on conflict (release_id, axis_id) do update set
  code_position = excluded.code_position,
  display_label = excluded.display_label,
  measurement_status = excluded.measurement_status;

insert into trait_map.facet_definition (
  release_id, facet_id, axis_id, label, included_meaning, excluded_meanings, measurement_status
) values
  ('NUANG-TRAIT-MAP-CONTENT-1.0-DRAFT', 'SE-RE', 'SE', '함께할 때의 에너지', '교류 중·후의 활력 변화와 관여', '["친구 수","인기","사교 능력"]'::jsonb, 'research_candidate_not_validated'),
  ('NUANG-TRAIT-MAP-CONTENT-1.0-DRAFT', 'SE-AI', 'SE', '먼저 표현하기', '필요한 의견·요청·선택지를 먼저 꺼내는 경향', '["발표 능력","리더십 능력","설득력"]'::jsonb, 'research_candidate_not_validated'),
  ('NUANG-TRAIT-MAP-CONTENT-1.0-DRAFT', 'OE-AE', 'OE', '미적 경험', '분위기·음악·장면의 미적 인상에 관심을 두는 정도', '["예술 능력","감각의 정확도"]'::jsonb, 'research_candidate_not_validated'),
  ('NUANG-TRAIT-MAP-CONTENT-1.0-DRAFT', 'OE-CI', 'OE', '상상 확장', '현재 정보 너머의 장면·이야기·가능성을 펼치는 정도', '["창의적 성과","아이디어 품질"]'::jsonb, 'research_candidate_not_validated'),
  ('NUANG-TRAIT-MAP-CONTENT-1.0-DRAFT', 'OE-IE', 'OE', '지적 탐구', '필요한 답을 넘어 원리·배경·다른 설명을 탐색하는 정도', '["지능","학업 성취","이해 속도"]'::jsonb, 'research_candidate_not_validated'),
  ('NUANG-TRAIT-MAP-CONTENT-1.0-DRAFT', 'RO-EC', 'RO', '관계 주의 방향', '관계 상황에서 원인·해결과 상대 감정·필요 중 관심이 가는 방향', '["착함","공감 능력","문제 해결 능력"]'::jsonb, 'research_candidate_not_validated'),
  ('NUANG-TRAIT-MAP-CONTENT-1.0-DRAFT', 'SM-EP', 'SM', '실행·지속', '착수, 중단 뒤 복귀, 지속의 경향', '["책임감","도덕성","성과"]'::jsonb, 'research_candidate_not_validated'),
  ('NUANG-TRAIT-MAP-CONTENT-1.0-DRAFT', 'SM-OS', 'SM', '질서·구조', '물건·시간·절차를 정돈하고 미리 구조화하는 경향', '["완성 능력","유연성의 우열"]'::jsonb, 'research_candidate_not_validated'),
  ('NUANG-TRAIT-MAP-CONTENT-1.0-DRAFT', 'ER-IR', 'ER', '감정 동요', '일상적 불편 정서가 활성화되는 속도와 크기', '["정신건강 진단","회복력","감정조절 능력"]'::jsonb, 'research_candidate_not_validated'),
  ('NUANG-TRAIT-MAP-CONTENT-1.0-DRAFT', 'ER-WD', 'ER', '걱정·주저', '부정적 가능성이 반복되고 선택 전에 주저하는 정도', '["위험 탐지 능력","신중함의 우열"]'::jsonb, 'research_candidate_not_validated')
on conflict (release_id, facet_id) do update set
  label = excluded.label,
  included_meaning = excluded.included_meaning,
  excluded_meanings = excluded.excluded_meanings,
  measurement_status = excluded.measurement_status;

insert into trait_map.role_profile (
  release_id, profile_code, profile_name, name_purpose, publication_state
)
select
  'NUANG-TRAIT-MAP-CONTENT-1.0-DRAFT',
  profile_code,
  display_name,
  'memory_aid_not_scoring_evidence',
  'research_only'
from report.profile_name_definition
where profile_name_release_id = 'NUANG-PROFILE-NAME-CANDIDATE-1.1'
on conflict (release_id, profile_code) do update set
  profile_name = excluded.profile_name,
  name_purpose = excluded.name_purpose;

insert into trait_map.content_atom (
  release_id, atom_id, version, entity_kind, entity_ref, slot,
  relationship_context, copy_short, privacy_scope, publication_state,
  required_signals, surfaces, metadata
) values
  ('NUANG-TRAIT-MAP-CONTENT-1.0-DRAFT', 'tmc.v1.enakq.summary.general', 1, 'role_profile', 'ENAKQ', 'summary', 'general', '사람들과 함께할 때 활력이 오르고, 보이는 내용 너머의 가능성과 새로운 관점을 더 찾아봐요. 관계 문제에서는 상대가 어떤 마음인지 자연스럽게 살피며, 해야 할 일은 비교적 꾸준히 이어가요. 불편한 일이 생기면 걱정과 감정이 비교적 빠르게 커질 수 있어요.', 'public_safe', 'research_only', array['domain_scores'], array['map_explorer'], '{"sourceTemplate":"ENAKQ-MAP-TEMPLATE-1.0-REVIEW"}'::jsonb),
  ('NUANG-TRAIT-MAP-CONTENT-1.0-DRAFT', 'tmc.v1.enakq.role-name.general', 1, 'role_profile', 'ENAKQ', 'role_name_meaning', 'general', '‘관계를 여는’은 함께할 때 활력이 오르는 E와 상대 마음에 관심이 가는 A를 기억하기 위한 표현이에요. ‘지휘자’는 새로운 관점을 살피는 N과 정한 흐름을 이어가는 K를 한 장면으로 묶은 이름이에요.', 'public_safe', 'research_only', array['domain_scores'], array['map_explorer'], '{"sourceTemplate":"ENAKQ-MAP-TEMPLATE-1.0-REVIEW"}'::jsonb),
  ('NUANG-TRAIT-MAP-CONTENT-1.0-DRAFT', 'tmc.v1.enakq.process-boundary.general', 1, 'role_profile', 'ENAKQ', 'limitation', 'general', '대표 A는 관계에서 상대 마음에 관심이 가는 방향을 보여줘요. 하지만 처음에는 원인과 해결이 궁금해도 상대의 감정을 고려해 마음을 살피는 말부터 건넬 수 있고, 그 반대도 가능해요. 이런 차이는 정밀 검사에서 두 층위를 따로 측정한 경우에만 개인 리포트에 보여줘요.', 'public_safe', 'research_only', array['domain_scores'], array['map_explorer'], '{"sourceTemplate":"ENAKQ-MAP-TEMPLATE-1.0-REVIEW"}'::jsonb),
  ('NUANG-TRAIT-MAP-CONTENT-1.0-DRAFT', 'tmc.v1.enakq.daily', 1, 'role_profile', 'ENAKQ', 'daily_life', 'general', '대화를 시작하고 여러 가능성을 살펴본 뒤, 함께 정한 일을 이어가려는 모습이 나타날 수 있어요. 실제 모습은 그날의 여유와 맡은 역할에 따라 달라질 수 있어요.', 'public_safe', 'research_only', array['domain_scores'], array['map_explorer'], '{"sourceTemplate":"ENAKQ-MAP-TEMPLATE-1.0-REVIEW"}'::jsonb),
  ('NUANG-TRAIT-MAP-CONTENT-1.0-DRAFT', 'tmc.v1.enakq.family', 1, 'role_profile', 'ENAKQ', 'family', 'family', '가족의 대화나 일정을 먼저 챙기려는 모습이 나타날 수 있어요. 상대를 생각하는 마음이 있어도 늘 먼저 움직여야 하는 책임이 생기는 것은 아니에요.', 'public_safe', 'research_only', array['domain_scores','relationship_context'], array['map_explorer'], '{"sourceTemplate":"ENAKQ-MAP-TEMPLATE-1.0-REVIEW"}'::jsonb),
  ('NUANG-TRAIT-MAP-CONTENT-1.0-DRAFT', 'tmc.v1.enakq.friend', 1, 'role_profile', 'ENAKQ', 'friend', 'friend', '먼저 연락하거나 함께할 일을 제안하며 관계의 흐름을 열 수 있어요. 가까운 친구라도 연락 빈도와 혼자 쉬는 시간은 다를 수 있어요.', 'public_safe', 'research_only', array['domain_scores','relationship_context'], array['map_explorer'], '{"sourceTemplate":"ENAKQ-MAP-TEMPLATE-1.0-REVIEW"}'::jsonb),
  ('NUANG-TRAIT-MAP-CONTENT-1.0-DRAFT', 'tmc.v1.enakq.partner', 1, 'role_profile', 'ENAKQ', 'partner', 'partner', '상대 반응이 분명하지 않을 때 마음이 더 신경 쓰이고 여러 가능성을 떠올릴 수 있어요. 코드만으로 관계의 안정이나 궁합을 판단하지 않아요.', 'public_safe', 'research_only', array['domain_scores','relationship_context'], array['map_explorer'], '{"sourceTemplate":"ENAKQ-MAP-TEMPLATE-1.0-REVIEW"}'::jsonb),
  ('NUANG-TRAIT-MAP-CONTENT-1.0-DRAFT', 'tmc.v1.enakq.person_of_interest', 1, 'role_profile', 'ENAKQ', 'person_of_interest', 'person_of_interest', '상대의 말과 반응에서 여러 의미를 떠올릴 수 있지만, 호감과 속마음은 뉴앙 코드나 행동 한 장면만으로 알 수 없어요.', 'public_safe', 'research_only', array['domain_scores','relationship_context'], array['map_explorer'], '{"sourceTemplate":"ENAKQ-MAP-TEMPLATE-1.0-REVIEW"}'::jsonb),
  ('NUANG-TRAIT-MAP-CONTENT-1.0-DRAFT', 'tmc.v1.enakq.work', 1, 'role_profile', 'ENAKQ', 'work', 'work', '의견을 먼저 꺼내고 여러 방법을 살펴본 뒤 해야 할 일을 이어갈 수 있어요. 코드가 기획력·성과·리더십을 보장하는 것은 아니에요.', 'public_safe', 'research_only', array['domain_scores','relationship_context'], array['map_explorer'], '{"sourceTemplate":"ENAKQ-MAP-TEMPLATE-1.0-REVIEW"}'::jsonb),
  ('NUANG-TRAIT-MAP-CONTENT-1.0-DRAFT', 'tmc.v1.enakq.evidence-note.general', 1, 'role_profile', 'ENAKQ', 'evidence_note', 'general', '뉴앙 코드는 다섯 방향을 기억하기 쉽게 묶은 언어예요. 역할 이름은 능력이나 직업을 뜻하지 않고, 관계의 성공이나 상대의 마음을 예측하지 않아요. 개인 설명은 실제 점수와 세부 성향, 별도로 측정한 반응 자료가 있을 때만 더 좁혀야 해요.', 'public_safe', 'research_only', array['domain_scores'], array['map_explorer'], '{"sourceTemplate":"ENAKQ-MAP-TEMPLATE-1.0-REVIEW"}'::jsonb)
on conflict (release_id, atom_id, version) do update set
  copy_short = excluded.copy_short,
  required_signals = excluded.required_signals,
  metadata = excluded.metadata,
  updated_at = now();

with links(atom_id, claim_ref) as (
  values
    ('tmc.v1.enakq.summary.general', 'ENAKQ.general.definition.E'),
    ('tmc.v1.enakq.summary.general', 'ENAKQ.general.definition.N'),
    ('tmc.v1.enakq.summary.general', 'ENAKQ.general.definition.A'),
    ('tmc.v1.enakq.summary.general', 'ENAKQ.general.definition.K'),
    ('tmc.v1.enakq.summary.general', 'ENAKQ.general.definition.Q'),
    ('tmc.v1.enakq.role-name.general', 'ENAKQ.general.role.opens'),
    ('tmc.v1.enakq.role-name.general', 'ENAKQ.general.role.conductor'),
    ('tmc.v1.enakq.process-boundary.general', 'ENAKQ.process.non_inference'),
    ('tmc.v1.enakq.daily', 'ENAKQ.daily.context'),
    ('tmc.v1.enakq.daily', 'ENAKQ.interaction.boundary'),
    ('tmc.v1.enakq.family', 'ENAKQ.family.context'),
    ('tmc.v1.enakq.family', 'ENAKQ.family.support_prompt'),
    ('tmc.v1.enakq.friend', 'ENAKQ.friend.context'),
    ('tmc.v1.enakq.friend', 'ENAKQ.friend.similarity'),
    ('tmc.v1.enakq.partner', 'ENAKQ.partner.boundary'),
    ('tmc.v1.enakq.partner', 'ENAKQ.partner.similarity'),
    ('tmc.v1.enakq.person_of_interest', 'ENAKQ.crush.boundary'),
    ('tmc.v1.enakq.person_of_interest', 'ENAKQ.crush.similarity'),
    ('tmc.v1.enakq.work', 'ENAKQ.work.context'),
    ('tmc.v1.enakq.work', 'ENAKQ.work.performance_boundary'),
    ('tmc.v1.enakq.evidence-note.general', 'ENAKQ.evidence.scope'),
    ('tmc.v1.enakq.evidence-note.general', 'ENAKQ.evidence.nonvalidation'),
    ('tmc.v1.enakq.evidence-note.general', 'ENAKQ.evidence.final_boundary')
)
insert into trait_map.content_claim_link (release_id, atom_id, atom_version, claim_ref)
select 'NUANG-TRAIT-MAP-CONTENT-1.0-DRAFT', atom_id, 1, claim_ref from links
on conflict do nothing;

with links(atom_id, evidence_ref) as (
  values
    ('tmc.v1.enakq.summary.general', 'ENAKQ-P1-01'),
    ('tmc.v1.enakq.role-name.general', 'ENAKQ-P2-01'),
    ('tmc.v1.enakq.role-name.general', 'ENAKQ-P2-02'),
    ('tmc.v1.enakq.process-boundary.general', 'ENAKQ-P5-05'),
    ('tmc.v1.enakq.process-boundary.general', 'ENAKQ-P14-03'),
    ('tmc.v1.enakq.daily', 'ENAKQ-P4-07'),
    ('tmc.v1.enakq.daily', 'ENAKQ-P6-01'),
    ('tmc.v1.enakq.family', 'ENAKQ-P7-01'),
    ('tmc.v1.enakq.family', 'ENAKQ-P7-06'),
    ('tmc.v1.enakq.friend', 'ENAKQ-P8-01'),
    ('tmc.v1.enakq.friend', 'ENAKQ-P8-06'),
    ('tmc.v1.enakq.partner', 'ENAKQ-P9-01'),
    ('tmc.v1.enakq.partner', 'ENAKQ-P9-09'),
    ('tmc.v1.enakq.person_of_interest', 'ENAKQ-P10-06'),
    ('tmc.v1.enakq.person_of_interest', 'ENAKQ-P10-07'),
    ('tmc.v1.enakq.work', 'ENAKQ-P11-01'),
    ('tmc.v1.enakq.work', 'ENAKQ-P11-05'),
    ('tmc.v1.enakq.evidence-note.general', 'ENAKQ-P15-01'),
    ('tmc.v1.enakq.evidence-note.general', 'ENAKQ-P15-06')
)
insert into trait_map.content_evidence_link (release_id, atom_id, atom_version, evidence_ref)
select 'NUANG-TRAIT-MAP-CONTENT-1.0-DRAFT', atom_id, 1, evidence_ref from links
on conflict do nothing;

insert into trait_map.content_review (
  release_id, atom_id, atom_version, review_role, status
)
select
  atom.release_id,
  atom.atom_id,
  atom.version,
  role.review_role,
  'in_review'
from trait_map.content_atom atom
cross join (values ('psychology'), ('measurement'), ('product_safety'), ('plain_language')) as role(review_role)
where atom.release_id = 'NUANG-TRAIT-MAP-CONTENT-1.0-DRAFT'
on conflict (release_id, atom_id, atom_version, review_role) do nothing;

select pg_notify('pgrst', 'reload schema');
