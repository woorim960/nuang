import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";

const baseUrl = (
  process.env.NUANG_QA_BASE_URL ?? "http://localhost:3100"
).replace(/\/$/, "");
const origin = new URL(baseUrl).origin;
const consentVersion = "balance-answer-reveal-v1";
const participantHeader = "x-nuang-balance-participant-token";

async function request(path, { body, method = "GET", token } = {}) {
  const response = await fetch(`${baseUrl}${path}`, {
    body: body ? JSON.stringify(body) : undefined,
    headers: {
      "accept-language": "ko-KR",
      origin,
      "sec-fetch-site": "same-origin",
      "user-agent": "nuang-live-qa/1.0",
      ...(body ? { "content-type": "application/json" } : {}),
      ...(token ? { [participantHeader]: token } : {}),
    },
    method,
  });
  const payload = await response.json().catch(() => null);
  return { payload, status: response.status };
}

function requireSuccess(stage, response) {
  if (!response.payload?.ok || response.status >= 400) {
    throw new Error(
      `${stage}: ${JSON.stringify({
        code: response.payload?.code,
        message: response.payload?.message,
        status: response.status,
      })}`,
    );
  }
  return response.payload;
}

async function answerAll(room, token, offset = 0) {
  let latestRoom = room;
  const answeredCounts = [];
  for (let index = 0; index < room.questions.length; index += 1) {
    const question = room.questions[index];
    const option = question.options[(index + offset) % 2];
    const saved = requireSuccess(
      `save answer ${index + 1}`,
      await request(
        `/api/together/balance-game/rooms/${room.roomCode}/responses/${encodeURIComponent(
          question.id,
        )}`,
        {
          body: {
            clientSequence: index + 1,
            optionId: option.id,
            responseMs: 500 + index,
          },
          method: "PUT",
          token,
        },
      ),
    );
    latestRoom = saved.room;
    const me = latestRoom.participants.find((participant) => participant.isMe);
    answeredCounts.push(me?.answeredCount);
    assert.equal(me?.answeredCount, index + 1);
  }
  return { answeredCounts, room: latestRoom };
}

async function complete(roomCode, token, label) {
  return requireSuccess(
    `complete ${label}`,
    await request(`/api/together/balance-game/rooms/${roomCode}/complete`, {
      body: { clientRequestId: `${label}-${randomUUID()}` },
      method: "POST",
      token,
    }),
  ).room;
}

async function runCompletedThreePersonScenario() {
  const created = requireSuccess(
    "create completed three-person room",
    await request("/api/together/balance-game/rooms", {
      body: {
        answerRevealConsentVersion: consentVersion,
        clientRequestId: `three-complete-${randomUUID()}`,
        hostNickname: "QA그룹장",
        packSlug: "mixed-taste",
        participationMode: "private_group",
        questionCount: 8,
        roomName: "3인 그룹 결과 점검",
        targetParticipantCount: 3,
      },
      method: "POST",
    }),
  );
  const guests = [];
  for (let index = 1; index <= 2; index += 1) {
    guests.push(
      requireSuccess(
        `join completed guest ${index}`,
        await request(
          `/api/together/balance-game/rooms/${created.room.roomCode}/join`,
          {
            body: {
              answerRevealConsentVersion: consentVersion,
              clientRequestId: `completed-guest-${index}-${randomUUID()}`,
              nickname: `QA그룹${index}`,
            },
            method: "POST",
          },
        ),
      ),
    );
  }

  await answerAll(created.room, created.participantToken, 0);
  await answerAll(guests[0].room, guests[0].participantToken, 1);
  await answerAll(guests[1].room, guests[1].participantToken, 0);

  const afterFirstComplete = await complete(
    created.room.roomCode,
    created.participantToken,
    "three-host-complete",
  );
  assert.equal(afterFirstComplete.resultStatus, "waiting");
  assert.equal(afterFirstComplete.result, null);
  const afterSecondComplete = await complete(
    created.room.roomCode,
    guests[0].participantToken,
    "three-guest-one-complete",
  );
  assert.equal(afterSecondComplete.resultStatus, "current");
  const final = await complete(
    created.room.roomCode,
    guests[1].participantToken,
    "three-guest-two-complete",
  );
  assert.equal(final.resultStatus, "final");
  assert.equal(final.result?.completedParticipantCount, 3);
  assert.equal(final.result?.pairCount, 3);
  assert.equal(final.result?.comparedQuestionCount, 8);
  assert.equal(final.result?.pairResults.length, 2);
  assert.equal(
    final.result?.pairResults.every((pair) => pair.answers.length === 8),
    true,
  );
  return {
    comparedQuestionCount: final.result?.comparedQuestionCount,
    completedParticipantCount: final.result?.completedParticipantCount,
    groupScore: final.result?.groupScore,
    myVisiblePairCount: final.result?.pairResults.length,
    pairCount: final.result?.pairCount,
    roomCode: final.roomCode,
    status: final.resultStatus,
  };
}

async function main() {
  const createRequestId = `live-qa-${randomUUID()}`;
  const createBody = {
    answerRevealConsentVersion: consentVersion,
    clientRequestId: createRequestId,
    hostNickname: "QA방장",
    packSlug: "mixed-taste",
    participationMode: "private_group",
    questionCount: 8,
    roomName: "3인 최종 회귀 점검",
    targetParticipantCount: 3,
  };
  const created = requireSuccess(
    "create room",
    await request("/api/together/balance-game/rooms", {
      body: createBody,
      method: "POST",
    }),
  );
  const repeatedCreate = requireSuccess(
    "repeat create room",
    await request("/api/together/balance-game/rooms", {
      body: createBody,
      method: "POST",
    }),
  );
  assert.equal(repeatedCreate.room.roomCode, created.room.roomCode);
  assert.equal(
    repeatedCreate.room.myParticipantId,
    created.room.myParticipantId,
  );

  const roomCode = created.room.roomCode;
  const firstGuestRequestId = `guest-one-${randomUUID()}`;
  const firstGuestBody = {
    answerRevealConsentVersion: consentVersion,
    clientRequestId: firstGuestRequestId,
    nickname: "QA친구1",
  };
  const firstGuest = requireSuccess(
    "join first guest",
    await request(`/api/together/balance-game/rooms/${roomCode}/join`, {
      body: firstGuestBody,
      method: "POST",
    }),
  );
  const repeatedFirstGuest = requireSuccess(
    "repeat first guest join",
    await request(`/api/together/balance-game/rooms/${roomCode}/join`, {
      body: firstGuestBody,
      method: "POST",
    }),
  );
  assert.equal(
    repeatedFirstGuest.room.myParticipantId,
    firstGuest.room.myParticipantId,
  );

  const secondGuestRequestId = `guest-two-${randomUUID()}`;
  const secondGuestBody = {
    answerRevealConsentVersion: consentVersion,
    clientRequestId: secondGuestRequestId,
    nickname: "QA친구2",
  };
  const secondGuest = requireSuccess(
    "join second guest",
    await request(`/api/together/balance-game/rooms/${roomCode}/join`, {
      body: secondGuestBody,
      method: "POST",
    }),
  );
  assert.equal(secondGuest.room.currentParticipantCount, 3);

  const hostAnswered = await answerAll(
    created.room,
    created.participantToken,
    0,
  );
  const firstGuestAnswered = await answerAll(
    firstGuest.room,
    firstGuest.participantToken,
    1,
  );
  await complete(roomCode, created.participantToken, "host-complete");
  await complete(roomCode, firstGuest.participantToken, "guest-complete");

  const currentHostState = requireSuccess(
    "read current result",
    await request(`/api/together/balance-game/rooms/${roomCode}/state`, {
      token: created.participantToken,
    }),
  ).room;
  assert.equal(currentHostState.resultStatus, "current");
  assert.equal(currentHostState.canFinalize, true);
  assert.equal(currentHostState.result?.completedParticipantCount, 2);
  assert.equal(currentHostState.result?.pairCount, 1);
  assert.equal(currentHostState.result?.comparedQuestionCount, 8);
  assert.equal(currentHostState.result?.pairResults[0]?.answers.length, 8);

  const removed = requireSuccess(
    "remove unfinished guest",
    await request(
      `/api/together/balance-game/rooms/${roomCode}/participants/${secondGuest.room.myParticipantId}/remove`,
      {
        body: { clientRequestId: `remove-${randomUUID()}` },
        method: "POST",
        token: created.participantToken,
      },
    ),
  ).room;
  assert.equal(removed.currentParticipantCount, 2);
  assert.equal(
    removed.participants.some(
      (participant) => participant.id === secondGuest.room.myParticipantId,
    ),
    false,
  );

  const blockedRejoin = await request(
    `/api/together/balance-game/rooms/${roomCode}/join`,
    {
      body: secondGuestBody,
      method: "POST",
    },
  );
  assert.equal(blockedRejoin.status, 403);
  assert.equal(blockedRejoin.payload?.code, "participant_removed");

  const finalized = requireSuccess(
    "finalize room",
    await request(`/api/together/balance-game/rooms/${roomCode}/finalize`, {
      body: { clientRequestId: `finalize-${randomUUID()}` },
      method: "POST",
      token: created.participantToken,
    }),
  ).room;
  assert.equal(finalized.resultStatus, "final");
  assert.equal(finalized.result?.isFinal, true);

  const closedPreview = requireSuccess(
    "read closed preview",
    await request(`/api/together/balance-game/rooms/${roomCode}/preview`),
  ).room;
  assert.equal(closedPreview.joinStatus, "closed");

  const completedGroup = await runCompletedThreePersonScenario();

  console.log(
    JSON.stringify(
      {
        answerPersistence: {
          firstGuest: firstGuestAnswered.answeredCounts,
          host: hostAnswered.answeredCounts,
        },
        idempotency: {
          create: "passed",
          join: "passed",
        },
        participantModeration: {
          rejoinBlocked: blockedRejoin.payload?.code,
          removedCount: removed.currentParticipantCount,
        },
        completedThreePersonGroup: completedGroup,
        result: {
          comparedQuestionCount: finalized.result?.comparedQuestionCount,
          completedParticipantCount:
            finalized.result?.completedParticipantCount,
          groupScore: finalized.result?.groupScore,
          pairCount: finalized.result?.pairCount,
          status: finalized.resultStatus,
        },
        roomCode,
      },
      null,
      2,
    ),
  );
}

await main();
