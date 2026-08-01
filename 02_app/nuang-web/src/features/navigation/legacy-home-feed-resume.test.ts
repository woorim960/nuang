import { describe, expect, it } from "vitest";
import {
  getLegacyHomePollResumeHref,
  parseLegacyHomePollResumeIntent,
} from "@/features/navigation/legacy-home-feed-resume";

const pollId = "11111111-1111-4111-8111-111111111111";
const optionId = "22222222-2222-4222-8222-222222222222";

describe("getLegacyHomePollResumeHref", () => {
  it("moves an authenticated legacy home poll resume to the community", () => {
    expect(
      getLegacyHomePollResumeHref({
        auth: "connected",
        optionId,
        pollId,
        resumeFeed: "poll",
      }),
    ).toBe(
      `/feed?auth=connected&optionId=${optionId}&pollId=${pollId}&resumeFeed=poll`,
    );
  });

  it.each([
    { auth: "pending", optionId, pollId, resumeFeed: "poll" },
    { auth: "connected", optionId, pollId, resumeFeed: "comment" },
    {
      auth: "connected",
      optionId: "not-a-uuid",
      pollId,
      resumeFeed: "poll",
    },
    {
      auth: "connected",
      optionId,
      pollId: "not-a-uuid",
      resumeFeed: "poll",
    },
  ])("rejects incomplete or unsupported resume input", (query) => {
    expect(getLegacyHomePollResumeHref(query)).toBeNull();
  });

  it("drops every unapproved query field", () => {
    expect(
      getLegacyHomePollResumeHref({
        auth: ["connected", "other"],
        external: "https://example.com",
        optionId,
        pollId,
        postId: "33333333-3333-4333-8333-333333333333",
        resumeFeed: "poll",
        view: "decal",
      }),
    ).toBe(
      `/feed?auth=connected&optionId=${optionId}&pollId=${pollId}&resumeFeed=poll`,
    );
  });

  it("returns the validated poll intent for the feed payload lookup", () => {
    expect(
      parseLegacyHomePollResumeIntent({
        auth: "connected",
        optionId,
        pollId,
        resumeFeed: "poll",
      }),
    ).toEqual({ optionId, pollId });
  });
});
