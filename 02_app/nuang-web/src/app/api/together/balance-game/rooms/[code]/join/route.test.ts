import { beforeEach, describe, expect, it, vi } from "vitest";
import { BALANCE_ANSWER_REVEAL_CONSENT_VERSION } from "@/features/together-balance/constants";

const mocks = vi.hoisted(() => ({
  enforceBalanceRequestRateLimit: vi.fn(),
  joinBalanceRoomOnServer: vi.fn(),
  readBalanceRequestAccountId: vi.fn(),
  revalidateBalanceFeed: vi.fn(),
}));

vi.mock("@/app/api/together/balance-game/_shared", async (importOriginal) => {
  const original =
    await importOriginal<
      typeof import("@/app/api/together/balance-game/_shared")
    >();

  return {
    ...original,
    revalidateBalanceFeed: mocks.revalidateBalanceFeed,
  };
});

vi.mock("@/features/together-balance/server", async (importOriginal) => {
  const original =
    await importOriginal<typeof import("@/features/together-balance/server")>();

  return {
    ...original,
    enforceBalanceRequestRateLimit: mocks.enforceBalanceRequestRateLimit,
    joinBalanceRoomOnServer: mocks.joinBalanceRoomOnServer,
    readBalanceRequestAccountId: mocks.readBalanceRequestAccountId,
  };
});

import { POST } from "@/app/api/together/balance-game/rooms/[code]/join/route";

describe("balance room join cache policy", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.readBalanceRequestAccountId.mockResolvedValue(null);
  });

  it("does not invalidate the community feed for a private room", async () => {
    mocks.joinBalanceRoomOnServer.mockResolvedValue(
      joinResult("private_group"),
    );

    const response = await POST(joinRequest(), {
      params: Promise.resolve({ code: "ABC123" }),
    });

    expect(response.status).toBe(201);
    expect(mocks.revalidateBalanceFeed).not.toHaveBeenCalled();
  });

  it("invalidates the community feed when a feed room changes", async () => {
    mocks.joinBalanceRoomOnServer.mockResolvedValue(joinResult("feed_group"));

    const response = await POST(joinRequest(), {
      params: Promise.resolve({ code: "ABC123" }),
    });

    expect(response.status).toBe(201);
    expect(mocks.revalidateBalanceFeed).toHaveBeenCalledOnce();
  });
});

function joinRequest() {
  return new Request(
    "http://localhost:3000/api/together/balance-game/rooms/ABC123/join",
    {
      body: JSON.stringify({
        answerRevealConsentVersion: BALANCE_ANSWER_REVEAL_CONSENT_VERSION,
        clientRequestId: "join-request-123",
        nickname: "뉴앙이",
      }),
      headers: {
        "content-type": "application/json",
        origin: "http://localhost:3000",
      },
      method: "POST",
    },
  );
}

function joinResult(participationMode: "private_group" | "feed_group") {
  return {
    participantToken: "participant-token",
    room: { participationMode },
  };
}
