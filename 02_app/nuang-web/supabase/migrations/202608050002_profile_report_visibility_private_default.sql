begin;

-- Missing visibility rows are resolved per report kind by the application.
-- Any future database write that omits visibility must remain private.
alter table profile.profile_report_visibility
  alter column visibility set default 'private';

comment on table profile.profile_report_visibility is
  'Explicit per-report visibility. Missing rows use application policy: full core public; quick core, topic, and lab private.';

commit;
