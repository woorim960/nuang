-- Official home poll. Votes and comments stay in the existing feed moderation flow.

insert into identity.account (id, status)
values ('4d3e7a61-7e8c-4a09-9f7a-3c607bd20801', 'active')
on conflict (id) do nothing;

insert into feed.feed_post (
  id,
  author_account_id,
  source,
  source_id,
  body,
  visibility,
  moderation_status,
  attachment_payload,
  public_projection_payload,
  published_at
)
values (
  '6af1b7c2-b8e1-4ee5-9c68-76b92bda0801',
  '4d3e7a61-7e8c-4a09-9f7a-3c607bd20801',
  'balance_game',
  'balance_home_free_day_together_solo_001',
  '오늘 더 끌리는 쪽을 고르고, 다른 뉴앙 코드의 선택도 함께 살펴보세요.',
  'public',
  'published',
  '[]'::jsonb,
  '{"authorHandle":"nuang.official","authorName":"NUANG"}'::jsonb,
  now()
)
on conflict (id) do update
set
  body = excluded.body,
  moderation_status = 'published',
  public_projection_payload = excluded.public_projection_payload,
  source_id = excluded.source_id,
  visibility = 'public';

insert into feed.feed_poll (
  id,
  post_id,
  prompt_id,
  question,
  status
)
values (
  '7be2c8d3-c9f2-4f16-8d79-87ca3ceb0801',
  '6af1b7c2-b8e1-4ee5-9c68-76b92bda0801',
  'balance_home_free_day_together_solo_001',
  '갑자기 하루 여유가 생겼다면, 지금 더 끌리는 쪽은?',
  'active'
)
on conflict (id) do update
set
  question = excluded.question,
  status = 'active';

insert into feed.feed_poll_option (
  id,
  poll_id,
  option_key,
  label,
  sort_order
)
values
  (
    '8cf3d9e4-daf3-4017-8e8a-98db4dfc0801',
    '7be2c8d3-c9f2-4f16-8d79-87ca3ceb0801',
    'together',
    '사람을 만나 함께 보낸다',
    1
  ),
  (
    '9df4eaf5-eb04-4128-9f9b-a9ec5efd0801',
    '7be2c8d3-c9f2-4f16-8d79-87ca3ceb0801',
    'solo',
    '혼자 여유롭게 보낸다',
    2
  )
on conflict (id) do update
set
  label = excluded.label,
  option_key = excluded.option_key,
  sort_order = excluded.sort_order;

notify pgrst, 'reload schema';
