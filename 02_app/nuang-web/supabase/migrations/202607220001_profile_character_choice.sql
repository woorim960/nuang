-- Persist the built-in character selected for a community profile.
alter table profile.community_profile
  add column if not exists avatar_character_key text not null default 'purple';

alter table profile.community_profile
  drop constraint if exists community_profile_avatar_character_key_check;

alter table profile.community_profile
  add constraint community_profile_avatar_character_key_check
  check (avatar_character_key in ('purple', 'flame', 'sun', 'water', 'forest'));

comment on column profile.community_profile.avatar_character_key is
  'Built-in Nuang character used when no uploaded avatar is selected.';
