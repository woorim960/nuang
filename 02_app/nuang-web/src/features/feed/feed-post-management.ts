import type { FeedWriteRequest } from "@/features/feed/feed-contract";

export const userManageableFeedPostSources = [
  "balance_game",
  "daily_mood",
  "daily_question",
  "trait_card",
  "map_reflection",
  "free_text",
  "report_share",
  "together_balance_room_share",
  "together_balance_result_share",
] as const;

export type UserManageableFeedPostSource =
  (typeof userManageableFeedPostSources)[number];

export function isUserManageableFeedPostSource(
  source: string,
): source is UserManageableFeedPostSource {
  return (userManageableFeedPostSources as readonly string[]).includes(source);
}

export function isFeedPostManagementRequest(
  payload: FeedWriteRequest,
): payload is Extract<
  FeedWriteRequest,
  { action: "delete_post" | "update_post" }
> {
  return payload.action === "delete_post" || payload.action === "update_post";
}
