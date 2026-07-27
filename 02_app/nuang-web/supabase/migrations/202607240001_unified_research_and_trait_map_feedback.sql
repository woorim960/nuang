alter table public.research_gate_c_session
  add column if not exists pool_version text not null default 'GATE-C-FIXED-FORMS-1.0',
  add column if not exists assignment_strategy text not null default 'legacy_fixed_form',
  add column if not exists item_assignment jsonb not null default '[]'::jsonb
    check (jsonb_typeof(item_assignment) = 'array');

comment on column public.research_gate_c_session.item_assignment is
  'Server-locked item snapshot shown to this participant. Never used to activate customer scoring releases automatically.';

create table if not exists public.research_trait_map_section_feedback (
  id uuid primary key default gen_random_uuid(),
  account_id uuid not null references identity.account(id) on delete cascade,
  guide_version text not null,
  profile_code text not null
    check (profile_code ~ '^[EI][RN][GA][KM][CQ]$'),
  chapter_id text not null
    check (chapter_id ~ '^chapter-[0-9]{2}$'),
  section_key text not null
    check (section_key ~ '^section-[0-9]{2}$'),
  section_title text not null check (char_length(section_title) between 1 and 100),
  fit_rating text not null
    check (fit_rating in ('very_close', 'mostly_close', 'partly_different', 'very_different')),
  note text check (char_length(note) <= 500),
  verification_source text not null default 'account_result'
    check (verification_source = 'account_result'),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (account_id, guide_version, profile_code, chapter_id, section_key)
);

create index if not exists research_trait_map_feedback_code_idx
on public.research_trait_map_section_feedback (
  guide_version,
  profile_code,
  chapter_id,
  section_key
);

alter table public.research_trait_map_section_feedback enable row level security;

revoke all on public.research_trait_map_section_feedback
from public, anon, authenticated;

grant select, insert, update, delete
on public.research_trait_map_section_feedback
to service_role;

comment on table public.research_trait_map_section_feedback is
  'Section-level fit feedback accepted only when the signed-in account has a matching Nuang result. Review data never edits published copy automatically.';
