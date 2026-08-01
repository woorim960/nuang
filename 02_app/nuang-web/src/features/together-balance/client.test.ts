import { beforeEach, describe, expect, it, vi } from "vitest";
import { createBalanceRoom, saveBalanceResponse } from "./client";
import {
  BALANCE_ANSWER_REVEAL_CONSENT_VERSION,
  type CreateBalanceRoomResponse,
} from "./api-contract";

describe("together balance client exposure memory", () => {
  beforeEach(() => {
    const values = new Map<string, string>();
    Object.defineProperty(window, "localStorage", {
      configurable: true,
      value: {
        clear: () => values.clear(),
        getItem: (key: string) => values.get(key) ?? null,
        key: (index: number) => Array.from(values.keys())[index] ?? null,
        get length() {
          return values.size;
        },
        removeItem: (key: string) => values.delete(key),
        setItem: (key: string, value: string) => values.set(key, value),
      },
    });
    vi.restoreAllMocks();
  });

  it("sends only recent pack items and remembers the newly selected set", async () => {
    const now = Date.now();
    window.localStorage.setItem(
      "nuang.together-balance.exposure.v1",
      JSON.stringify({
        "what-to-eat": [
          {
            itemId: "food_recent",
            seenAt: new Date(now - 2 * 24 * 60 * 60 * 1_000).toISOString(),
          },
          {
            itemId: "food_old",
            seenAt: new Date(now - 100 * 24 * 60 * 60 * 1_000).toISOString(),
          },
        ],
      }),
    );
    const payload = {
      ok: true,
      participantToken: "participant-token",
      room: {
        myParticipantId: "participant-me",
        pack: { slug: "what-to-eat" },
        questions: [{ id: "food_new" }],
        roomCode: "ABC234",
      },
    } as unknown as CreateBalanceRoomResponse;
    const fetchMock = vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response(JSON.stringify(payload), {
        headers: { "content-type": "application/json" },
        status: 201,
      }),
    );

    await createBalanceRoom({
      answerRevealConsentVersion: BALANCE_ANSWER_REVEAL_CONSENT_VERSION,
      clientRequestId: "room-request-001",
      hostNickname: "민지",
      packSlug: "what-to-eat",
      participationMode: "private_group",
      questionCount: 20,
      targetParticipantCount: 2,
    });

    const request = fetchMock.mock.calls[0]?.[1];
    expect(JSON.parse(String(request?.body))).toMatchObject({
      recentItemIds: ["food_recent"],
    });
    expect(
      JSON.parse(
        window.localStorage.getItem("nuang.together-balance.exposure.v1") ??
          "{}",
      )["what-to-eat"].map((entry: { itemId: string }) => entry.itemId),
    ).toEqual(["food_recent", "food_new"]);
  });

  it("uses a persisted database-safe sequence instead of a millisecond timestamp", async () => {
    const payload = {
      ok: true,
      participantToken: "participant-token",
      room: {
        myParticipantId: "participant-me",
        pack: { slug: "mixed-taste" },
        questions: [{ id: "mixed_001" }],
        roomCode: "ABC234",
      },
    } as unknown as CreateBalanceRoomResponse;
    const fetchMock = vi.spyOn(globalThis, "fetch").mockImplementation(
      async () =>
        new Response(JSON.stringify(payload), {
          headers: { "content-type": "application/json" },
          status: 200,
        }),
    );

    await createBalanceRoom({
      answerRevealConsentVersion: BALANCE_ANSWER_REVEAL_CONSENT_VERSION,
      clientRequestId: "room-request-sequence",
      hostNickname: "민지",
      packSlug: "mixed-taste",
      participationMode: "private_group",
      questionCount: 8,
      targetParticipantCount: 2,
    });
    await saveBalanceResponse("ABC234", "mixed_001", {
      optionId: "mixed_001_a",
    });
    await saveBalanceResponse("ABC234", "mixed_001", {
      optionId: "mixed_001_b",
    });

    const firstSaveBody = JSON.parse(
      String(fetchMock.mock.calls[1]?.[1]?.body),
    );
    const secondSaveBody = JSON.parse(
      String(fetchMock.mock.calls[2]?.[1]?.body),
    );
    expect(firstSaveBody.clientSequence).toBe(1);
    expect(secondSaveBody.clientSequence).toBe(2);
    expect(secondSaveBody.clientSequence).toBeLessThanOrEqual(2_147_483_647);
  });

  it("keeps increasing the response sequence when durable storage is unavailable", async () => {
    Object.defineProperty(window, "localStorage", {
      configurable: true,
      value: {
        getItem: () => null,
        setItem: () => {
          throw new Error("storage blocked");
        },
      },
    });
    const payload = {
      ok: true,
      participantToken: "fallback-token",
      room: {
        myParticipantId: "fallback-participant",
        pack: { slug: "mixed-taste" },
        questions: [{ id: "mixed_002" }],
        roomCode: "DEF345",
      },
    } as unknown as CreateBalanceRoomResponse;
    const fetchMock = vi.spyOn(globalThis, "fetch").mockImplementation(
      async () =>
        new Response(JSON.stringify(payload), {
          headers: { "content-type": "application/json" },
          status: 200,
        }),
    );

    await createBalanceRoom({
      answerRevealConsentVersion: BALANCE_ANSWER_REVEAL_CONSENT_VERSION,
      clientRequestId: "room-request-fallback",
      hostNickname: "민지",
      packSlug: "mixed-taste",
      participationMode: "private_group",
      questionCount: 8,
      targetParticipantCount: 2,
    });
    await saveBalanceResponse("DEF345", "mixed_002", {
      optionId: "mixed_002_a",
    });
    await saveBalanceResponse("DEF345", "mixed_002", {
      optionId: "mixed_002_b",
    });

    expect(
      JSON.parse(String(fetchMock.mock.calls[1]?.[1]?.body)).clientSequence,
    ).toBe(1);
    expect(
      JSON.parse(String(fetchMock.mock.calls[2]?.[1]?.body)).clientSequence,
    ).toBe(2);
  });
});
