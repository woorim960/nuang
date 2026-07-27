-- DRAFT ONLY — DO NOT APPLY WITHOUT EXPLICIT AUTHORIZATION
-- v2.3 P0 direct-validation research schema
-- Default deny: RLS is enabled and this draft intentionally creates no policies.

create schema if not exists research;

create table if not exists research.trait_map_dv_study_version (
  study_version_id uuid primary key not null,
  module_spec_report_id text not null,
  assessment_release_id text not null,
  analysis_plan_hash text not null,
  state text not null,
  opened_at timestamptz,
  analysis_locked_at timestamptz,
  created_at timestamptz not null
);
alter table research.trait_map_dv_study_version enable row level security;

create table if not exists research.trait_map_dv_module_version (
  module_version_id uuid primary key not null,
  study_version_id uuid not null references research.trait_map_dv_study_version(study_version_id),
  module_id text not null,
  scenario_ref text not null,
  stimulus_version integer not null,
  stimulus_text text not null,
  stimulus_hash text not null,
  target_axes text[] not null,
  response_sequence jsonb not null,
  created_at timestamptz not null,
  unique (study_version_id, module_id, stimulus_version)
);
alter table research.trait_map_dv_module_version enable row level security;

create table if not exists research.trait_map_dv_participant (
  participant_ref uuid primary key not null,
  study_version_id uuid not null references research.trait_map_dv_study_version(study_version_id),
  age_band text not null,
  korean_language_comfort text not null,
  relationship_context_experience text not null,
  personality_test_familiarity text not null,
  consent_version text not null,
  consented_at timestamptz not null,
  withdrawn_at timestamptz,
  deletion_state text not null
);
alter table research.trait_map_dv_participant enable row level security;

create table if not exists research.trait_map_dv_session (
  session_ref uuid primary key not null,
  study_version_id uuid not null references research.trait_map_dv_study_version(study_version_id),
  participant_ref uuid not null references research.trait_map_dv_participant(participant_ref),
  stage text not null,
  assignment_seed text not null,
  assessment_order text not null,
  state text not null,
  started_at timestamptz,
  completed_at timestamptz,
  quality_signals jsonb not null,
  unique (participant_ref, study_version_id)
);
alter table research.trait_map_dv_session enable row level security;

create table if not exists research.trait_map_dv_assignment (
  assignment_ref uuid primary key not null,
  session_ref uuid not null references research.trait_map_dv_session(session_ref),
  module_version_id uuid not null references research.trait_map_dv_module_version(module_version_id),
  module_order integer not null,
  assigned_at timestamptz not null,
  unique (session_ref, module_order),
  unique (session_ref, module_version_id)
);
alter table research.trait_map_dv_assignment enable row level security;

create table if not exists research.trait_map_dv_axis_score_snapshot (
  axis_snapshot_ref uuid primary key not null,
  session_ref uuid not null references research.trait_map_dv_session(session_ref),
  assessment_release_id text not null,
  assessment_response_hash text not null,
  axis_scores jsonb not null,
  score_uncertainty jsonb not null,
  scored_at timestamptz not null,
  unique (session_ref, assessment_release_id)
);
alter table research.trait_map_dv_axis_score_snapshot enable row level security;

create table if not exists research.trait_map_dv_response (
  response_ref uuid primary key not null,
  assignment_ref uuid not null references research.trait_map_dv_assignment(assignment_ref),
  response_layer text not null,
  prompt_snapshot text not null,
  open_text_redacted text not null,
  behavior_choice text,
  response_time_ms integer not null,
  submitted_at timestamptz not null,
  unique (assignment_ref, response_layer)
);
alter table research.trait_map_dv_response enable row level security;

create table if not exists research.trait_map_dv_coder_assignment (
  coder_assignment_ref uuid primary key not null,
  response_ref uuid not null references research.trait_map_dv_response(response_ref),
  coder_ref uuid not null,
  blind_packet_hash text not null,
  assigned_at timestamptz not null,
  unique (response_ref, coder_ref)
);
alter table research.trait_map_dv_coder_assignment enable row level security;

create table if not exists research.trait_map_dv_coder_rating (
  coder_rating_ref uuid primary key not null,
  coder_assignment_ref uuid not null unique references research.trait_map_dv_coder_assignment(coder_assignment_ref),
  direction_code text not null,
  continuous_rating numeric,
  evidence_span text not null,
  confidence integer not null,
  submitted_at timestamptz not null
);
alter table research.trait_map_dv_coder_rating enable row level security;

create table if not exists research.trait_map_dv_adjudication (
  adjudication_ref uuid primary key not null,
  response_ref uuid not null unique references research.trait_map_dv_response(response_ref),
  adjudicator_ref uuid not null,
  final_direction_code text not null,
  source_coder_rating_refs uuid[] not null,
  rationale text not null,
  adjudicated_at timestamptz not null
);
alter table research.trait_map_dv_adjudication enable row level security;

-- Before application:
-- 1. obtain independent privacy/security review;
-- 2. add narrowly scoped API/RLS policies;
-- 3. prepare an environment-specific rollback;
-- 4. receive explicit customer authorization.
