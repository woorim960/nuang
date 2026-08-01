import "server-only";

import { createHash, randomUUID } from "node:crypto";
import type { SupabaseClient } from "@supabase/supabase-js";
import { ensureAccountForUser } from "@/features/account/server-writes";
import { checkCommunityWriteGuard } from "@/features/feed/server-write-guard";
import type {
  BalanceApiError,
  BalanceQuestionResultView,
  BalanceRoomPreview,
  BalanceRoomQuestionView,
  BalanceRoomResultView,
  BalanceRoomState,
  CreateBalanceRoomRequest,
  SaveBalanceResponseRequest,
} from "@/features/together-balance/api-contract";
import {
  PUBLIC_BALANCE_PACKS,
  getBalanceResultLabel,
  getDisplayedBalanceOptions,
  getPublicBalancePack,
  scoreBalanceGroup,
  selectBalanceQuestionSet,
} from "@/features/together-balance";
import type {
  BalancePack,
  BalanceQuestion,
  BalanceResponse,
} from "@/features/together-balance/types";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import {
  createSupabaseServiceClient,
  getSupabaseServiceEnv,
} from "@/lib/supabase/service";

type ServiceClient = SupabaseClient;

type RoomRow = {
  answer_reveal_policy: "after_result_open" | "never";
  completed_count: number;
  created_at: string;
  current_participant_count: number;
  expires_at: string;
  id: string;
  initialization_status: "pending" | "ready" | "failed";
  join_status: "open" | "full" | "closed";
  lifecycle_status: "active" | "closed" | "deleted" | "expired";
  owner_participant_id: string;
  participation_mode: "private_group" | "feed_group";
  planned_question_count: number;
  result_status: "waiting" | "current" | "final";
  room_name: string;
  room_question_seed: string;
  target_participant_count: number;
  template_version_id: string;
};

type ParticipantRow = {
  account_id: string | null;
  completed_at: string | null;
  created_at: string;
  id: string;
  joined_at: string | null;
  nickname: string;
  pair_visibility_consent: boolean;
  room_id: string;
  status: "reserved" | "joined" | "completed" | "left" | "expired" | "removed";
};

type RoundRow = {
  id: string;
  question_count: number;
  round_number: number;
  status: "draft" | "open" | "result_open" | "finalized";
};

type RoundItemRow = {
  display_order: number;
  item_id: string;
  round_id: string;
};

type ItemRow = {
  id: string;
  item_key: string;
};

type StoredItemRow = ItemRow & {
  audience: "all_ages" | "adult";
  content_version?: number;
  conversation_value: number;
  highlight_priority: number;
  intensity: "light" | "closer" | "serious";
  meaning_code: string | null;
  option_a_text: string;
  option_b_text: string;
  prompt: string;
  prompt_role: BalanceQuestion["promptRole"];
  scored: boolean;
  sensitivity_level: "general" | "personal" | "sensitive";
  subtopic_id: string;
};

type BalanceRateLimitAction = "create_room" | "preview_room" | "join_room";

type ResponseRow = {
  client_sequence: number;
  item_id: string;
  option_key: "a" | "b" | "skipped";
  participant_id: string;
};

const roomCodeAlphabet = "23456789ABCDEFGHJKLMNPQRSTUVWXYZ";

export class BalanceServerError extends Error {
  code: BalanceApiError["code"];
  httpStatus: number;
  retryable: boolean;

  constructor(
    code: BalanceApiError["code"],
    message: string,
    httpStatus = 400,
    retryable = false,
  ) {
    super(message);
    this.name = "BalanceServerError";
    this.code = code;
    this.httpStatus = httpStatus;
    this.retryable = retryable;
  }
}

export async function readBalanceRequestAccountId(required: boolean) {
  const browserClient = await createServerSupabaseClient();
  const serviceClient = getBalanceServiceClient();

  if (!browserClient) {
    if (required) {
      throw new BalanceServerError(
        "feed_auth_required",
        "피드에서 모집하려면 먼저 로그인해 주세요.",
        401,
      );
    }
    return null;
  }

  const { data } = await browserClient.auth.getUser();
  if (!data.user) {
    if (required) {
      throw new BalanceServerError(
        "feed_auth_required",
        "피드에서 모집하려면 먼저 로그인해 주세요.",
        401,
      );
    }
    return null;
  }

  const account = await ensureAccountForUser(serviceClient, data.user);
  if (!account.ok) {
    throw new BalanceServerError(
      "storage_unavailable",
      "계정 정보를 연결하지 못했어요. 잠시 뒤 다시 시도해 주세요.",
      503,
      true,
    );
  }
  return account.accountId;
}

export async function enforceBalanceRequestRateLimit({
  action,
  request,
}: {
  action: BalanceRateLimitAction;
  request: Request;
}) {
  const client = getBalanceServiceClient();
  const networkScope = readBalanceNetworkScope(request);
  const scopeHash = hashBalanceSecret(`request-budget:${networkScope}`);
  const policies =
    action === "create_room"
      ? [
          { action: "create_room_short", limit: 6, windowSeconds: 600 },
          { action: "create_room_daily", limit: 20, windowSeconds: 86400 },
        ]
      : action === "preview_room"
        ? [
            { action: "preview_room_short", limit: 40, windowSeconds: 60 },
            { action: "preview_room_daily", limit: 500, windowSeconds: 86400 },
          ]
        : [
            { action: "join_room_short", limit: 12, windowSeconds: 300 },
            { action: "join_room_daily", limit: 80, windowSeconds: 86400 },
          ];

  for (const policy of policies) {
    const result = await client
      .schema("together_balance")
      .rpc("consume_request_budget", {
        p_action: policy.action,
        p_limit: policy.limit,
        p_scope_hash: scopeHash,
        p_window_seconds: policy.windowSeconds,
      });
    if (result.error) throw mapDatabaseError(result.error);
  }
}

export async function createBalanceRoomOnServer({
  accountId,
  input,
}: {
  accountId: string | null;
  input: CreateBalanceRoomRequest;
}) {
  const client = getBalanceServiceClient();
  const pack = getPublicBalancePack(input.packSlug);
  if (!pack) {
    throw new BalanceServerError(
      "pack_not_found",
      "지금은 시작할 수 없는 주제예요.",
      404,
    );
  }
  if (!pack.supportedQuestionCounts.includes(input.questionCount)) {
    throw new BalanceServerError(
      "validation_error",
      "이 주제에서 지원하지 않는 문항 수예요.",
      422,
    );
  }
  if (input.participationMode === "feed_group" && !accountId) {
    throw new BalanceServerError(
      "feed_auth_required",
      "피드에서 모집하려면 먼저 로그인해 주세요.",
      401,
    );
  }

  const synced = await syncPackToDatabase(client, pack, input.questionCount);
  const participantToken = deriveBalanceSecret(
    "create-room-participant",
    input.clientRequestId,
  );
  const roomQuestionSeed = deriveBalanceSecret(
    "create-room-question-seed",
    input.clientRequestId,
  );
  const questionSet = selectBalanceQuestionSet({
    exposures: (input.recentItemIds ?? []).map((itemId) => ({
      itemId,
      participantId: "local-history",
      seenAt: new Date(),
    })),
    pack,
    participantIds: ["local-history"],
    questionCount: input.questionCount,
    roomQuestionSeed,
  });

  for (let attempt = 0; attempt < 4; attempt += 1) {
    const roomCode = createRoomCode(input.clientRequestId, attempt);
    const result = await client.schema("together_balance").rpc("create_room", {
      p_join_code_hash: hashBalanceSecret(roomCode),
      p_owner_account_id: accountId,
      p_owner_join_token_hash: hashBalanceSecret(participantToken),
      p_owner_nickname: input.hostNickname,
      p_participation_mode: input.participationMode,
      p_planned_question_count: input.questionCount,
      p_room_name: input.roomName ?? `${input.hostNickname.trim()}의 취향 대결`,
      p_room_question_seed: roomQuestionSeed,
      p_session_recipe_id: synced.recipeId,
      p_target_participant_count: input.targetParticipantCount,
      p_template_version_id: synced.templateVersionId,
      p_visibility_consent_version: input.answerRevealConsentVersion,
    });

    if (result.error) {
      if (isUniqueViolation(result.error)) {
        try {
          const existing = await readOwnedBalanceRoomForInitialization({
            client,
            participantToken,
            roomCode,
          });
          if (
            existing.template_version_id !== synced.templateVersionId ||
            existing.planned_question_count !== input.questionCount ||
            existing.participation_mode !== input.participationMode ||
            existing.target_participant_count !== input.targetParticipantCount
          ) {
            throw new BalanceServerError(
              "request_conflict",
              "같은 요청으로 이미 다른 설정의 방이 만들어졌어요.",
              409,
            );
          }
          if (existing.initialization_status !== "ready") {
            await finishBalanceRoomInitialization({
              accountId,
              client,
              itemIdByKey: synced.itemIdByKey,
              pack,
              participantToken,
              participationMode: existing.participation_mode,
              questionSet,
              roomCode,
              roomId: existing.id,
              roomName: existing.room_name,
              targetParticipantCount: existing.target_participant_count,
            });
          }
          const room = await readBalanceRoomStateOnServer({
            participantToken,
            roomCode,
          });
          return { participantToken, room };
        } catch (error) {
          if (
            error instanceof BalanceServerError &&
            ["participant_unauthorized", "room_not_found"].includes(
              error.code,
            ) &&
            attempt < 3
          ) {
            continue;
          }
          throw error;
        }
      }
      throw mapDatabaseError(result.error);
    }

    const created = result.data as {
      ownerParticipantId?: unknown;
      roomId?: unknown;
    } | null;
    if (
      !created ||
      typeof created.roomId !== "string" ||
      typeof created.ownerParticipantId !== "string"
    ) {
      throw new BalanceServerError(
        "storage_unavailable",
        "방을 저장하지 못했어요. 잠시 뒤 다시 시도해 주세요.",
        503,
        true,
      );
    }

    try {
      await finishBalanceRoomInitialization({
        accountId,
        client,
        itemIdByKey: synced.itemIdByKey,
        pack,
        participantToken,
        participationMode: input.participationMode,
        questionSet,
        roomCode,
        roomId: created.roomId,
        roomName: input.roomName ?? `${input.hostNickname.trim()}의 취향 대결`,
        targetParticipantCount: input.targetParticipantCount,
      });
      const room = await readBalanceRoomStateOnServer({
        participantToken,
        roomCode,
      });
      return { participantToken, room };
    } catch (error) {
      const initialization = await client
        .schema("together_balance")
        .from("room")
        .select("initialization_status")
        .eq("id", created.roomId);
      if (
        !initialization.error &&
        initialization.data?.[0]?.initialization_status === "pending"
      ) {
        await client
          .schema("together_balance")
          .from("room")
          .delete()
          .eq("id", created.roomId)
          .eq("initialization_status", "pending");
      }
      throw error;
    }
  }

  throw new BalanceServerError(
    "request_conflict",
    "방 코드를 만들지 못했어요. 다시 시도해 주세요.",
    409,
    true,
  );
}

async function readOwnedBalanceRoomForInitialization({
  client,
  participantToken,
  roomCode,
}: {
  client: ServiceClient;
  participantToken: string;
  roomCode: string;
}) {
  const roomResult = await client
    .schema("together_balance")
    .from("room")
    .select("*")
    .eq("join_code_hash", hashBalanceSecret(normalizeRoomCode(roomCode)))
    .maybeSingle();
  if (roomResult.error) throw mapDatabaseError(roomResult.error);
  if (!roomResult.data) {
    throw new BalanceServerError(
      "room_not_found",
      "초대 방을 찾지 못했어요.",
      404,
    );
  }
  const room = roomResult.data as RoomRow;
  const ownerResult = await client
    .schema("together_balance")
    .from("participant")
    .select("id")
    .eq("id", room.owner_participant_id)
    .eq("room_id", room.id)
    .eq("join_token_hash", hashBalanceSecret(participantToken))
    .maybeSingle();
  if (ownerResult.error) throw mapDatabaseError(ownerResult.error);
  if (!ownerResult.data) {
    throw new BalanceServerError(
      "participant_unauthorized",
      "참여 정보를 다시 확인해 주세요.",
      401,
    );
  }
  return room;
}

async function finishBalanceRoomInitialization({
  accountId,
  client,
  itemIdByKey,
  pack,
  participantToken,
  participationMode,
  questionSet,
  roomCode,
  roomId,
  roomName,
  targetParticipantCount,
}: {
  accountId: string | null;
  client: ServiceClient;
  itemIdByKey: ReadonlyMap<string, string>;
  pack: BalancePack;
  participantToken: string;
  participationMode: RoomRow["participation_mode"];
  questionSet: ReturnType<typeof selectBalanceQuestionSet>;
  roomCode: string;
  roomId: string;
  roomName: string;
  targetParticipantCount: number;
}) {
  await persistQuestionSet({ client, itemIdByKey, questionSet, roomId });
  const ready = await client.schema("together_balance").rpc("mark_room_ready", {
    p_owner_join_token_hash: hashBalanceSecret(participantToken),
    p_room_id: roomId,
  });
  if (ready.error) throw mapDatabaseError(ready.error);

  if (participationMode === "feed_group" && accountId) {
    await createRecruitmentFeedShare({
      accountId,
      client,
      pack,
      questionCount: questionSet.questionCount,
      roomCode,
      roomId,
      roomName,
      targetParticipantCount,
    });
  }
}

async function createRecruitmentFeedShare({
  accountId,
  client,
  pack,
  questionCount,
  roomCode,
  roomId,
  roomName,
  targetParticipantCount,
}: {
  accountId: string;
  client: ServiceClient;
  pack: BalancePack;
  questionCount: number;
  roomCode: string;
  roomId: string;
  roomName: string;
  targetParticipantCount: number;
}) {
  const body = `${pack.title} 밸런스 게임을 함께할 사람을 기다리고 있어요.`;
  const existingShare = await client
    .schema("together_balance")
    .from("feed_share")
    .select("id")
    .eq("room_id", roomId)
    .eq("share_kind", "recruitment")
    .is("deleted_at", null)
    .maybeSingle();
  if (existingShare.error) throw mapDatabaseError(existingShare.error);
  if (existingShare.data) return;

  const orphanPost = await client
    .schema("feed")
    .from("feed_post")
    .select("id")
    .eq("author_account_id", accountId)
    .eq("source", "together_balance_room_share")
    .eq("source_id", roomId)
    .is("deleted_at", null)
    .order("created_at", { ascending: true })
    .limit(1)
    .maybeSingle();
  if (orphanPost.error) throw mapDatabaseError(orphanPost.error);
  if (orphanPost.data) {
    const bridge = await client
      .schema("together_balance")
      .from("feed_share")
      .insert({
        created_by_account_id: accountId,
        feed_post_id: String(orphanPost.data.id),
        room_id: roomId,
        share_kind: "recruitment",
        status: "active",
      });
    if (!bridge.error || isUniqueViolation(bridge.error)) return;
    throw mapDatabaseError(bridge.error);
  }

  const guardFailure = await checkCommunityWriteGuard({
    accountId,
    action: "create_post",
    body: `${roomName} ${body}`,
    client,
  });
  if (guardFailure) {
    throw new BalanceServerError(
      "feed_share_failed",
      guardFailure === "required_consent_missing"
        ? "피드 이용에 필요한 동의를 먼저 확인해 주세요."
        : "피드 모집 글을 올리지 못했어요. 잠시 뒤 다시 시도해 주세요.",
      guardFailure === "rate_limited" ? 429 : 403,
      guardFailure === "rate_limited" || guardFailure === "guard_unavailable",
    );
  }

  const postResult = await client
    .schema("feed")
    .from("feed_post")
    .insert({
      attachment_payload: [],
      author_account_id: accountId,
      body,
      moderation_status: "published",
      public_projection_payload: {
        capacity: targetParticipantCount,
        occupancy: 1,
        packSlug: pack.slug,
        packTitle: pack.title,
        questionCount,
        recruitmentStatus: "open",
        roomCode,
        roomName,
      },
      published_at: new Date().toISOString(),
      source: "together_balance_room_share",
      source_id: roomId,
      visibility: "public",
    })
    .select("id")
    .single();
  if (postResult.error || !postResult.data) {
    throw new BalanceServerError(
      "feed_share_failed",
      "피드 모집 글을 올리지 못했어요.",
      503,
      true,
    );
  }

  const shareResult = await client
    .schema("together_balance")
    .from("feed_share")
    .insert({
      created_by_account_id: accountId,
      feed_post_id: String(postResult.data.id),
      room_id: roomId,
      share_kind: "recruitment",
      status: "active",
    });
  if (shareResult.error) {
    await client
      .schema("feed")
      .from("feed_post")
      .delete()
      .eq("id", String(postResult.data.id));
    throw new BalanceServerError(
      "feed_share_failed",
      "피드 모집 글을 연결하지 못했어요.",
      503,
      true,
    );
  }
}

export async function readBalanceRoomPreviewOnServer(
  roomCode: string,
): Promise<BalanceRoomPreview> {
  const client = getBalanceServiceClient();
  const result = await client
    .schema("together_balance")
    .rpc("get_room_join_preview", {
      p_join_code_hash: hashBalanceSecret(normalizeRoomCode(roomCode)),
    });

  if (result.error) throw mapDatabaseError(result.error);
  const preview = result.data as Record<string, unknown> | null;
  if (!preview || typeof preview.roomId !== "string") {
    throw new BalanceServerError(
      "room_not_found",
      "초대 방을 찾지 못했어요.",
      404,
    );
  }

  const pack =
    typeof preview.templateVersionId === "string"
      ? await loadBalancePackFromDatabase(client, preview.templateVersionId)
      : typeof preview.packSlug === "string"
        ? getPublicBalancePack(preview.packSlug)
        : null;
  if (!pack) {
    throw new BalanceServerError(
      "pack_not_found",
      "이 방의 주제를 불러오지 못했어요.",
      503,
      true,
    );
  }

  return {
    currentParticipantCount: numberValue(preview.currentParticipantCount),
    expiresAt: stringValue(preview.expiresAt),
    hostNickname: stringValue(preview.ownerNickname, "방장"),
    joinStatus: normalizeJoinStatus(preview.joinStatus),
    pack: {
      description: pack.description,
      slug: pack.slug,
      title: pack.title,
    },
    participationMode:
      preview.participationMode === "feed_group"
        ? "feed_group"
        : "private_group",
    questionCount: numberValue(preview.plannedQuestionCount),
    roomCode: normalizeRoomCode(roomCode),
    roomName: stringValue(preview.roomName, `${pack.title} 취향 대결`),
    targetParticipantCount: numberValue(preview.targetParticipantCount),
  };
}

export async function joinBalanceRoomOnServer({
  accountId,
  answerRevealConsentVersion,
  clientRequestId,
  nickname,
  roomCode,
}: {
  accountId: string | null;
  answerRevealConsentVersion: string;
  clientRequestId: string;
  nickname: string;
  roomCode: string;
}) {
  const client = getBalanceServiceClient();
  const preview = await readBalanceRoomPreviewOnServer(roomCode);
  if (preview.participationMode === "feed_group" && !accountId) {
    throw new BalanceServerError(
      "feed_auth_required",
      "이 방은 로그인한 사용자만 참여할 수 있어요.",
      401,
    );
  }

  const participantToken = deriveBalanceSecret(
    "join-room-participant",
    `${normalizeRoomCode(roomCode)}:${clientRequestId}`,
  );
  const normalizedNickname = await createAvailableNickname({
    client,
    nickname,
    roomCode,
  });
  const reserve = await client.schema("together_balance").rpc("reserve_seat", {
    p_account_id: accountId,
    p_join_code_hash: hashBalanceSecret(normalizeRoomCode(roomCode)),
    p_join_token_hash: hashBalanceSecret(participantToken),
    p_nickname: normalizedNickname,
    p_visibility_consent_version: answerRevealConsentVersion,
  });
  if (reserve.error) throw mapDatabaseError(reserve.error);

  const reserved = reserve.data as {
    participantId?: unknown;
    roomId?: unknown;
  } | null;
  if (
    !reserved ||
    typeof reserved.participantId !== "string" ||
    typeof reserved.roomId !== "string"
  ) {
    throw new BalanceServerError(
      "storage_unavailable",
      "자리를 잡지 못했어요. 다시 시도해 주세요.",
      503,
      true,
    );
  }

  const confirmed = await client
    .schema("together_balance")
    .rpc("confirm_seat", {
      p_join_token_hash: hashBalanceSecret(participantToken),
      p_participant_id: reserved.participantId,
    });
  if (confirmed.error) throw mapDatabaseError(confirmed.error);

  const room = await readBalanceRoomStateOnServer({
    participantToken,
    roomCode,
  });
  return { participantToken, room };
}

export async function readBalanceRoomStateOnServer({
  participantToken,
  roomCode,
}: {
  participantToken: string;
  roomCode: string;
}): Promise<BalanceRoomState> {
  const client = getBalanceServiceClient();
  const context = await readAuthorizedRoomContext({
    client,
    participantToken,
    roomCode,
  });
  const { pack, participant, room } = context;

  const roundsResult = await client
    .schema("together_balance")
    .from("round")
    .select("id,round_number,status,question_count")
    .eq("room_id", room.id)
    .order("round_number", { ascending: true });
  if (roundsResult.error) throw mapDatabaseError(roundsResult.error);
  const rounds = (roundsResult.data ?? []) as RoundRow[];
  const roundIds = rounds.map((round) => round.id);

  const [roundItemsResult, participantsResult] = await Promise.all([
    roundIds.length > 0
      ? client
          .schema("together_balance")
          .from("round_item")
          .select("round_id,item_id,display_order")
          .in("round_id", roundIds)
      : Promise.resolve({ data: [], error: null }),
    client
      .schema("together_balance")
      .from("participant")
      .select(
        "id,room_id,account_id,nickname,status,joined_at,completed_at,created_at,pair_visibility_consent",
      )
      .eq("room_id", room.id)
      .in("status", ["reserved", "joined", "completed"])
      .order("created_at", { ascending: true }),
  ]);
  if (roundItemsResult.error) throw mapDatabaseError(roundItemsResult.error);
  if (participantsResult.error)
    throw mapDatabaseError(participantsResult.error);

  const roundItems = (roundItemsResult.data ?? []) as RoundItemRow[];
  const participants = (participantsResult.data ?? []) as ParticipantRow[];
  const itemIds = roundItems.map((item) => item.item_id);
  const itemsResult =
    itemIds.length > 0
      ? await client
          .schema("together_balance")
          .from("item")
          .select("id,item_key")
          .in("id", itemIds)
      : { data: [], error: null };
  if (itemsResult.error) throw mapDatabaseError(itemsResult.error);
  const itemRows = (itemsResult.data ?? []) as ItemRow[];

  const responsesResult = await client
    .schema("together_balance")
    .from("response")
    .select("participant_id,item_id,option_key,client_sequence")
    .eq("room_id", room.id)
    .in(
      "participant_id",
      participants.map((item) => item.id),
    );
  if (responsesResult.error) throw mapDatabaseError(responsesResult.error);
  const responseRows = (responsesResult.data ?? []) as ResponseRow[];

  const questionByKey = new Map(
    pack.questions.map((question) => [question.id, question]),
  );
  const itemKeyById = new Map(itemRows.map((item) => [item.id, item.item_key]));
  const roundById = new Map(rounds.map((round) => [round.id, round]));
  const ownResponseByItemId = new Map(
    responseRows
      .filter((response) => response.participant_id === participant.id)
      .map((response) => [response.item_id, response]),
  );
  const orderedItems = [...roundItems].sort((left, right) => {
    const leftRound = roundById.get(left.round_id)?.round_number ?? 0;
    const rightRound = roundById.get(right.round_id)?.round_number ?? 0;
    return leftRound - rightRound || left.display_order - right.display_order;
  });
  const questions = orderedItems.flatMap<BalanceRoomQuestionView>(
    (roundItem) => {
      const itemKey = itemKeyById.get(roundItem.item_id);
      const question = itemKey ? questionByKey.get(itemKey) : undefined;
      const round = roundById.get(roundItem.round_id);
      if (!question || !round) return [];
      const displayedOptions = getDisplayedBalanceOptions(
        question,
        room.room_question_seed,
        participant.id,
      );
      const ownResponse = ownResponseByItemId.get(roundItem.item_id);
      return [
        {
          id: question.id,
          options: [
            {
              id: displayedOptions[0].id,
              position: "left" as const,
              text: displayedOptions[0].text,
            },
            {
              id: displayedOptions[1].id,
              position: "right" as const,
              text: displayedOptions[1].text,
            },
          ] as BalanceRoomQuestionView["options"],
          prompt: question.prompt,
          responseOptionId: ownResponse
            ? optionIdForKey(question, ownResponse.option_key)
            : null,
          roundNumber: round.round_number,
          subtopic: question.subtopic,
        },
      ];
    },
  );

  const answeredCountByParticipant = new Map<string, number>();
  for (const response of responseRows) {
    answeredCountByParticipant.set(
      response.participant_id,
      (answeredCountByParticipant.get(response.participant_id) ?? 0) + 1,
    );
  }

  let result: BalanceRoomResultView | null = null;
  if (room.result_status !== "waiting" && participant.status === "completed") {
    let liveResult = createRoomResult({
      itemKeyById,
      pack,
      participants,
      responseRows,
      room,
      viewerParticipantId: participant.id,
    });
    if (liveResult) {
      let snapshot = await readStoredBalanceResult({
        client,
        participant,
        participantToken,
        room,
      });
      if (!snapshot) {
        await persistLatestResultSnapshot({
          client,
          pack,
          roomId: room.id,
        });
        snapshot = await readStoredBalanceResult({
          client,
          participant,
          participantToken,
          room,
        });
      }
      if (!snapshot) {
        throw new BalanceServerError(
          "storage_unavailable",
          "저장된 결과를 불러오지 못했어요. 잠시 뒤 다시 시도해 주세요.",
          503,
          true,
        );
      }
      liveResult = applyStoredSnapshotToResult({
        liveResult,
        pack,
        snapshot,
      });
      result = liveResult;
    }
  }

  return {
    canFinalize:
      participant.id === room.owner_participant_id &&
      room.result_status === "current",
    canShareToFeed:
      participant.id === room.owner_participant_id &&
      Boolean(participant.account_id),
    currentParticipantCount: participants.length,
    expiresAt: room.expires_at,
    isOwner: participant.id === room.owner_participant_id,
    myParticipantId: participant.id,
    pack: {
      description: pack.description,
      resultLabel: getBalanceResultLabel(pack.resultSemantics),
      scoringTemplate: pack.scoringTemplate,
      slug: pack.slug,
      title: pack.title,
    },
    participants: participants.map((item) => ({
      answeredCount: answeredCountByParticipant.get(item.id) ?? 0,
      completedAt: item.completed_at,
      id: item.id,
      isMe: item.id === participant.id,
      isOwner: item.id === room.owner_participant_id,
      nickname: item.nickname,
      status: mapParticipantStatus(item.status),
    })),
    participationMode: room.participation_mode,
    questions,
    questionCount: room.planned_question_count,
    result,
    resultStatus: room.result_status,
    roomCode: normalizeRoomCode(roomCode),
    roomId: room.id,
    roomName: room.room_name,
    targetParticipantCount: room.target_participant_count,
  };
}

export async function saveBalanceResponseOnServer({
  input,
  itemKey,
  participantToken,
  roomCode,
}: {
  input: SaveBalanceResponseRequest;
  itemKey: string;
  participantToken: string;
  roomCode: string;
}) {
  const client = getBalanceServiceClient();
  const context = await readAuthorizedRoomContext({
    client,
    participantToken,
    roomCode,
  });
  const question = context.pack.questions.find((item) => item.id === itemKey);
  if (!question) {
    throw new BalanceServerError(
      "question_not_found",
      "이 방에 없는 질문이에요.",
      404,
    );
  }
  const optionIndex = question.options.findIndex(
    (option) => option.id === input.optionId,
  );
  if (optionIndex < 0) {
    throw new BalanceServerError(
      "option_not_found",
      "선택지를 확인하지 못했어요.",
      422,
    );
  }
  const itemId = balanceItemId(context.pack, question.id);
  const roundItemResult = await client
    .schema("together_balance")
    .from("round_item")
    .select("round_id")
    .eq("room_id", context.room.id)
    .eq("item_id", itemId)
    .maybeSingle();
  if (roundItemResult.error || !roundItemResult.data) {
    throw new BalanceServerError(
      "question_not_found",
      "이 방에 없는 질문이에요.",
      404,
    );
  }

  const save = await client.schema("together_balance").rpc("save_response", {
    p_client_sequence: input.clientSequence,
    p_idempotency_key: randomUUID(),
    p_item_id: itemId,
    p_join_token_hash: hashBalanceSecret(participantToken),
    p_option_key: optionIndex === 0 ? "a" : "b",
    p_participant_id: context.participant.id,
    p_response_ms: input.responseMs ?? null,
    p_room_id: context.room.id,
    p_round_id: String(roundItemResult.data.round_id),
  });
  if (save.error) throw mapDatabaseError(save.error);

  return readBalanceRoomStateOnServer({ participantToken, roomCode });
}

export async function completeBalanceRoomOnServer({
  participantToken,
  roomCode,
}: {
  participantToken: string;
  roomCode: string;
}) {
  const client = getBalanceServiceClient();
  const context = await readAuthorizedRoomContext({
    client,
    participantToken,
    roomCode,
  });
  if (context.participant.status !== "completed") {
    const roundsResult = await client
      .schema("together_balance")
      .from("round")
      .select("id,round_number")
      .eq("room_id", context.room.id)
      .order("round_number", { ascending: true });
    if (roundsResult.error) throw mapDatabaseError(roundsResult.error);

    const completedRoundsResult = await client
      .schema("together_balance")
      .from("round_completion")
      .select("round_id")
      .eq("room_id", context.room.id)
      .eq("participant_id", context.participant.id);
    if (completedRoundsResult.error) {
      throw mapDatabaseError(completedRoundsResult.error);
    }
    const completedRoundIds = new Set(
      (completedRoundsResult.data ?? []).map((item) => String(item.round_id)),
    );

    for (const round of roundsResult.data ?? []) {
      if (completedRoundIds.has(String(round.id))) continue;
      const completeRound = await client
        .schema("together_balance")
        .rpc("complete_round", {
          p_join_token_hash: hashBalanceSecret(participantToken),
          p_participant_id: context.participant.id,
          p_room_id: context.room.id,
          p_round_id: String(round.id),
        });
      if (completeRound.error) throw mapDatabaseError(completeRound.error);
    }

    const complete = await client
      .schema("together_balance")
      .rpc("complete_game", {
        p_join_token_hash: hashBalanceSecret(participantToken),
        p_participant_id: context.participant.id,
        p_room_id: context.room.id,
      });
    if (complete.error) throw mapDatabaseError(complete.error);
  }

  await persistLatestResultSnapshot({
    client,
    pack: context.pack,
    roomId: context.room.id,
  });

  return readBalanceRoomStateOnServer({ participantToken, roomCode });
}

export async function finalizeBalanceRoomOnServer({
  participantToken,
  roomCode,
}: {
  participantToken: string;
  roomCode: string;
}) {
  const client = getBalanceServiceClient();
  const context = await readAuthorizedRoomContext({
    client,
    participantToken,
    roomCode,
  });
  if (context.participant.id !== context.room.owner_participant_id) {
    throw new BalanceServerError(
      "owner_only",
      "방장만 현재 인원으로 마감할 수 있어요.",
      403,
    );
  }
  if (context.room.result_status !== "final") {
    const finalize = await client
      .schema("together_balance")
      .rpc("finalize_room", {
        p_owner_join_token_hash: hashBalanceSecret(participantToken),
        p_owner_participant_id: context.participant.id,
        p_room_id: context.room.id,
      });
    if (finalize.error) throw mapDatabaseError(finalize.error);
  }

  await persistLatestResultSnapshot({
    client,
    pack: context.pack,
    roomId: context.room.id,
  });

  return readBalanceRoomStateOnServer({ participantToken, roomCode });
}

export async function removeBalanceParticipantOnServer({
  participantToken,
  roomCode,
  targetParticipantId,
}: {
  participantToken: string;
  roomCode: string;
  targetParticipantId: string;
}) {
  const client = getBalanceServiceClient();
  const context = await readAuthorizedRoomContext({
    client,
    participantToken,
    roomCode,
  });
  if (context.participant.id !== context.room.owner_participant_id) {
    throw new BalanceServerError(
      "owner_only",
      "방장만 참여자를 내보낼 수 있어요.",
      403,
    );
  }

  const removal = await client
    .schema("together_balance")
    .rpc("remove_participant", {
      p_owner_join_token_hash: hashBalanceSecret(participantToken),
      p_owner_participant_id: context.participant.id,
      p_room_id: context.room.id,
      p_target_participant_id: targetParticipantId,
    });
  if (removal.error) throw mapDatabaseError(removal.error);
  return readBalanceRoomStateOnServer({ participantToken, roomCode });
}

export async function shareBalanceResultToFeedOnServer({
  accountId,
  participantToken,
  roomCode,
}: {
  accountId: string;
  participantToken: string;
  roomCode: string;
}) {
  const client = getBalanceServiceClient();
  const context = await readAuthorizedRoomContext({
    client,
    participantToken,
    roomCode,
  });
  if (context.participant.id !== context.room.owner_participant_id) {
    throw new BalanceServerError(
      "owner_only",
      "방장만 결과를 피드에 공유할 수 있어요.",
      403,
    );
  }
  if (context.participant.account_id !== accountId) {
    throw new BalanceServerError(
      "feed_auth_required",
      "방을 만든 계정으로 로그인해 주세요.",
      401,
    );
  }
  if (context.room.result_status === "waiting") {
    throw new BalanceServerError(
      "incomplete_answers",
      "두 명 이상 완료한 뒤 결과를 공유할 수 있어요.",
      409,
    );
  }

  const snapshotId = await persistLatestResultSnapshot({
    client,
    pack: context.pack,
    roomId: context.room.id,
  });
  if (!snapshotId) {
    throw new BalanceServerError(
      "storage_unavailable",
      "공유할 결과를 준비하지 못했어요.",
      503,
      true,
    );
  }

  const existingShare = await client
    .schema("together_balance")
    .from("feed_share")
    .select("id,feed_post_id")
    .eq("room_id", context.room.id)
    .eq("share_kind", "anonymous_result")
    .eq("status", "active")
    .is("deleted_at", null)
    .maybeSingle();
  if (existingShare.error) throw mapDatabaseError(existingShare.error);

  const snapshotResult = await client
    .schema("together_balance")
    .from("result_snapshot")
    .select("group_score,participant_count,result_state,highlights")
    .eq("id", snapshotId)
    .single();
  if (snapshotResult.error) throw mapDatabaseError(snapshotResult.error);
  const snapshot = snapshotResult.data as {
    group_score: number | string;
    highlights: unknown;
    participant_count: number;
    result_state: "current" | "final";
  };
  const score = Math.round(Number(snapshot.group_score));
  const scoreLabel = getGroupScoreLabel(score, context.pack.resultSemantics);
  const highlight = readPublicSnapshotHighlight(snapshot.highlights);
  const body = `${context.pack.title}에서 우리 그룹의 ${getBalanceResultLabel(
    context.pack.resultSemantics,
  )}는 ${score}점이었어요.`;
  const publicProjection = {
    completedCount: snapshot.participant_count,
    highlight,
    packSlug: context.pack.slug,
    packTitle: context.pack.title,
    resultStatus: snapshot.result_state,
    roomName: `${context.pack.title} 함께한 결과`,
    score,
    scoreLabel,
  };
  const guardFailure = await checkCommunityWriteGuard({
    accountId,
    action: "create_post",
    body,
    client,
  });
  if (guardFailure) {
    throw new BalanceServerError(
      "feed_share_failed",
      guardFailure === "required_consent_missing"
        ? "피드 이용에 필요한 동의를 먼저 확인해 주세요."
        : "결과를 피드에 공유하지 못했어요. 잠시 뒤 다시 시도해 주세요.",
      guardFailure === "rate_limited" ? 429 : 403,
      guardFailure === "rate_limited" || guardFailure === "guard_unavailable",
    );
  }

  if (existingShare.data) {
    const feedPostId = String(existingShare.data.feed_post_id);
    const updatePost = await client
      .schema("feed")
      .from("feed_post")
      .update({
        body,
        public_projection_payload: publicProjection,
      })
      .eq("id", feedPostId)
      .eq("author_account_id", accountId);
    if (updatePost.error) throw mapDatabaseError(updatePost.error);
    const updateShare = await client
      .schema("together_balance")
      .from("feed_share")
      .update({ snapshot_id: snapshotId })
      .eq("id", String(existingShare.data.id));
    if (updateShare.error) throw mapDatabaseError(updateShare.error);
    return readBalanceRoomStateOnServer({ participantToken, roomCode });
  }

  const postResult = await client
    .schema("feed")
    .from("feed_post")
    .insert({
      attachment_payload: [],
      author_account_id: accountId,
      body,
      moderation_status: "published",
      public_projection_payload: publicProjection,
      published_at: new Date().toISOString(),
      source: "together_balance_result_share",
      source_id: context.room.id,
      visibility: "public",
    })
    .select("id")
    .single();
  if (postResult.error || !postResult.data) {
    throw new BalanceServerError(
      "feed_share_failed",
      "결과를 피드에 공유하지 못했어요.",
      503,
      true,
    );
  }

  const shareResult = await client
    .schema("together_balance")
    .from("feed_share")
    .insert({
      created_by_account_id: accountId,
      feed_post_id: String(postResult.data.id),
      room_id: context.room.id,
      share_kind: "anonymous_result",
      snapshot_id: snapshotId,
      status: "active",
    });
  if (shareResult.error) {
    await client
      .schema("feed")
      .from("feed_post")
      .delete()
      .eq("id", String(postResult.data.id));
    throw new BalanceServerError(
      "feed_share_failed",
      "결과 공유를 연결하지 못했어요.",
      503,
      true,
    );
  }

  return readBalanceRoomStateOnServer({ participantToken, roomCode });
}

export function createBalanceErrorPayload(error: unknown): BalanceApiError {
  const normalized =
    error instanceof BalanceServerError
      ? error
      : new BalanceServerError(
          "unexpected_error",
          "처리 중 문제가 생겼어요. 잠시 뒤 다시 시도해 주세요.",
          500,
          true,
        );
  return {
    code: normalized.code,
    message: normalized.message,
    ok: false,
    retryable: normalized.retryable,
  };
}

export function getBalanceErrorStatus(error: unknown) {
  return error instanceof BalanceServerError ? error.httpStatus : 500;
}

async function syncPackToDatabase(
  client: ServiceClient,
  pack: BalancePack,
  questionCount: number,
) {
  const now = new Date().toISOString();
  const templateId = deterministicUuid(`balance:template:${pack.id}`);
  const templateVersionId = deterministicUuid(
    `balance:template:${pack.id}:version:${pack.contentPoolVersion}`,
  );
  const recipeId = deterministicUuid(
    `balance:template:${pack.id}:version:${pack.contentPoolVersion}:recipe:${questionCount}:v1`,
  );

  const templateResult = await client
    .schema("together_balance")
    .from("template")
    .upsert(
      {
        id: templateId,
        mode: "small_group",
        scoring_template: pack.scoringTemplate,
        slug: pack.slug,
        status: "published",
        title: pack.title,
        updated_at: now,
      },
      { onConflict: "id" },
    );
  if (templateResult.error) throw mapDatabaseError(templateResult.error);

  const versionResult = await client
    .schema("together_balance")
    .from("template_version")
    .upsert(
      {
        content_pool_version: `content.v${pack.contentPoolVersion}`,
        default_question_count: pack.defaultQuestionCount,
        id: templateVersionId,
        max_question_count: 24,
        min_question_count: 8,
        published_at: now,
        scoring_template: pack.scoringTemplate,
        scoring_version: "together-balance-v1",
        status: "published",
        template_id: templateId,
        version: pack.contentPoolVersion,
      },
      { onConflict: "id" },
    );
  if (versionResult.error) throw mapDatabaseError(versionResult.error);

  const recipeVersion = [8, 12, 16, 20, 24].indexOf(questionCount) + 1;
  const recipeResult = await client
    .schema("together_balance")
    .from("session_recipe")
    .upsert(
      {
        id: recipeId,
        intensity_mix: {},
        label: `${questionCount}문항`,
        max_repeat_ratio: 0.2,
        question_count: questionCount,
        repeat_window_days: 90,
        round_size: 8,
        status: "published",
        subtopic_quota: {},
        template_version_id: templateVersionId,
        version: recipeVersion,
      },
      { onConflict: "id" },
    );
  if (recipeResult.error) throw mapDatabaseError(recipeResult.error);

  const itemRows = pack.questions.map((question) => ({
    audience: "all_ages",
    conversation_value: question.conversationValue,
    highlight_priority: question.highlightPriority,
    id: balanceItemId(pack, question.id),
    intensity:
      question.intensity === "deep"
        ? "serious"
        : question.intensity === "lively"
          ? "closer"
          : "light",
    item_key: question.id,
    meaning_code: question.meaningCode ?? null,
    occasion: null,
    option_a_key: "a",
    option_a_text: question.options[0].text,
    option_b_key: "b",
    option_b_text: question.options[1].text,
    prompt: question.prompt,
    prompt_role: question.promptRole,
    published_at: now,
    retired_at: null,
    scored: question.scored,
    sensitivity_level:
      question.sensitivity === "private" ? "sensitive" : question.sensitivity,
    subtopic_id: question.subtopic,
    template_version_id: templateVersionId,
    topic_id: pack.slug,
  }));
  const itemCountResult = await client
    .schema("together_balance")
    .from("item")
    .select("id", { count: "exact", head: true })
    .eq("template_version_id", templateVersionId);
  if (itemCountResult.error) throw mapDatabaseError(itemCountResult.error);
  if (itemCountResult.count !== itemRows.length) {
    const itemsResult = await client
      .schema("together_balance")
      .from("item")
      .upsert(itemRows, { onConflict: "id" });
    if (itemsResult.error) throw mapDatabaseError(itemsResult.error);
  }

  return {
    itemIdByKey: new Map(
      itemRows.map((row) => [row.item_key, row.id] as const),
    ),
    recipeId,
    templateVersionId,
  };
}

async function persistQuestionSet({
  client,
  itemIdByKey,
  questionSet,
  roomId,
}: {
  client: ServiceClient;
  itemIdByKey: ReadonlyMap<string, string>;
  questionSet: ReturnType<typeof selectBalanceQuestionSet>;
  roomId: string;
}) {
  for (const round of questionSet.rounds) {
    const roundHash = sha256Hex(
      round.questions.map((item) => item.question.id).join("|"),
    );
    const existingRound = await client
      .schema("together_balance")
      .from("round")
      .select("id,question_count,question_set_hash")
      .eq("room_id", roomId)
      .eq("round_number", round.roundNumber)
      .maybeSingle();
    if (existingRound.error) throw mapDatabaseError(existingRound.error);

    let roundId: string;
    if (existingRound.data) {
      if (
        Number(existingRound.data.question_count) !== round.questions.length ||
        String(existingRound.data.question_set_hash) !== roundHash
      ) {
        throw new BalanceServerError(
          "request_conflict",
          "이미 저장된 문항 구성이 현재 요청과 달라요.",
          409,
        );
      }
      roundId = String(existingRound.data.id);
    } else {
      roundId = deterministicUuid(
        `balance:room:${roomId}:round:${round.roundNumber}`,
      );
      const roundResult = await client
        .schema("together_balance")
        .from("round")
        .insert({
          id: roundId,
          opened_at: new Date().toISOString(),
          question_count: round.questions.length,
          question_set_hash: roundHash,
          room_id: roomId,
          round_number: round.roundNumber,
          status: "open",
        });
      if (roundResult.error && !isUniqueViolation(roundResult.error)) {
        throw mapDatabaseError(roundResult.error);
      }
    }

    const roundItems = round.questions.map((selected, index) => {
      const itemId = itemIdByKey.get(selected.question.id);
      if (!itemId) {
        throw new BalanceServerError(
          "storage_unavailable",
          "출제 문항을 저장하지 못했어요.",
          503,
          true,
        );
      }
      return {
        display_order: index + 1,
        item_id: itemId,
        option_order_seed: sha256Hex(
          `${questionSet.roomQuestionSeed}:${selected.question.id}`,
        ),
        room_id: roomId,
        round_id: roundId,
      };
    });
    const itemResult = await client
      .schema("together_balance")
      .from("round_item")
      .upsert(roundItems, {
        ignoreDuplicates: true,
        onConflict: "round_id,item_id",
      });
    if (itemResult.error) throw mapDatabaseError(itemResult.error);

    const verification = await client
      .schema("together_balance")
      .from("round_item")
      .select("item_id,display_order")
      .eq("round_id", roundId)
      .order("display_order", { ascending: true });
    if (verification.error) throw mapDatabaseError(verification.error);
    const storedItems = verification.data ?? [];
    if (
      storedItems.length !== roundItems.length ||
      storedItems.some(
        (item, index) =>
          String(item.item_id) !== roundItems[index]?.item_id ||
          Number(item.display_order) !== roundItems[index]?.display_order,
      )
    ) {
      throw new BalanceServerError(
        "request_conflict",
        "저장된 문항 순서를 복구하지 못했어요.",
        409,
        true,
      );
    }
  }
}

async function readAuthorizedRoomContext({
  client,
  participantToken,
  roomCode,
}: {
  client: ServiceClient;
  participantToken: string;
  roomCode: string;
}) {
  if (!participantToken.trim()) {
    throw new BalanceServerError(
      "participant_unauthorized",
      "이 방의 참여 정보를 찾지 못했어요.",
      401,
    );
  }
  const roomResult = await client
    .schema("together_balance")
    .from("room")
    .select("*")
    .eq("join_code_hash", hashBalanceSecret(normalizeRoomCode(roomCode)))
    .maybeSingle();
  if (roomResult.error) throw mapDatabaseError(roomResult.error);
  if (!roomResult.data) {
    throw new BalanceServerError(
      "room_not_found",
      "초대 방을 찾지 못했어요.",
      404,
    );
  }
  const room = roomResult.data as RoomRow;
  if (room.initialization_status !== "ready") {
    throw new BalanceServerError(
      "room_not_found",
      "초대 방을 찾지 못했어요.",
      404,
    );
  }
  if (new Date(room.expires_at).getTime() <= Date.now()) {
    throw new BalanceServerError(
      "room_expired",
      "이 방의 참여 기간이 끝났어요.",
      410,
    );
  }
  const participantResult = await client
    .schema("together_balance")
    .from("participant")
    .select(
      "id,room_id,account_id,nickname,status,joined_at,completed_at,created_at,pair_visibility_consent",
    )
    .eq("room_id", room.id)
    .eq("join_token_hash", hashBalanceSecret(participantToken))
    .maybeSingle();
  if (participantResult.error) throw mapDatabaseError(participantResult.error);
  if (!participantResult.data) {
    throw new BalanceServerError(
      "participant_unauthorized",
      "이 방의 참여 정보를 찾지 못했어요.",
      401,
    );
  }
  const participant = participantResult.data as ParticipantRow;
  if (participant.status === "removed") {
    throw new BalanceServerError(
      "participant_removed",
      "이 방에는 더 이상 참여할 수 없어요.",
      403,
    );
  }
  if (!["joined", "completed"].includes(participant.status)) {
    throw new BalanceServerError(
      "participant_unauthorized",
      "참여 세션이 만료됐어요. 다시 참여해 주세요.",
      401,
    );
  }
  const activity = await client
    .schema("together_balance")
    .from("participant")
    .update({ last_active_at: new Date().toISOString() })
    .eq("id", participant.id)
    .eq("room_id", room.id);
  if (activity.error) throw mapDatabaseError(activity.error);

  const pack = await loadBalancePackFromDatabase(
    client,
    room.template_version_id,
  );
  if (!pack) {
    throw new BalanceServerError(
      "pack_not_found",
      "이 방의 주제를 불러오지 못했어요.",
      503,
      true,
    );
  }
  return { pack, participant, room };
}

function createRoomResult({
  itemKeyById,
  pack,
  participants,
  responseRows,
  room,
  viewerParticipantId,
}: {
  itemKeyById: ReadonlyMap<string, string>;
  pack: BalancePack;
  participants: readonly ParticipantRow[];
  responseRows: readonly ResponseRow[];
  room: RoomRow;
  viewerParticipantId: string;
}): BalanceRoomResultView | null {
  const computation = computeRoomResult({
    itemKeyById,
    pack,
    participants,
    responseRows,
  });
  if (!computation) return null;
  const { completedParticipants, group, responsesByParticipant } = computation;
  const roundedGroupScore = group.roundedScore;
  if (roundedGroupScore === null) return null;

  const participantNameById = new Map(
    completedParticipants.map((participant) => [
      participant.id,
      participant.nickname,
    ]),
  );
  const participantConsentById = new Map(
    completedParticipants.map((participant) => [
      participant.id,
      participant.pair_visibility_consent,
    ]),
  );
  const canRevealPairAnswers =
    room.answer_reveal_policy === "after_result_open" &&
    participantConsentById.get(viewerParticipantId) === true;
  const pairResults = group.pairs
    .filter(
      (pair) =>
        canRevealPairAnswers &&
        (pair.participantAId === viewerParticipantId ||
          pair.participantBId === viewerParticipantId),
    )
    .flatMap((pair) => {
      if (pair.roundedScore === null) return [];
      const otherParticipantId =
        pair.participantAId === viewerParticipantId
          ? pair.participantBId
          : pair.participantAId;
      if (participantConsentById.get(otherParticipantId) !== true) return [];
      return [
        {
          answers: createPairAnswerViews({
            otherParticipantId,
            pack,
            responsesByParticipant,
            viewerParticipantId,
          }),
          comparedCount: pair.comparedCount,
          matchCount: pair.matchCount,
          otherParticipantId,
          otherParticipantNickname:
            participantNameById.get(otherParticipantId) ?? "참여자",
          score: pair.roundedScore,
        },
      ];
    });

  const questionResults =
    room.answer_reveal_policy === "after_result_open"
      ? createQuestionResults({
          completedParticipants,
          pack,
          responsesByParticipant,
        })
      : [];
  return {
    comparedQuestionCount:
      group.pairs.find((pair) => pair.comparedCount > 0)?.comparedCount ?? 0,
    completedParticipantCount: completedParticipants.length,
    groupLabel: getGroupScoreLabel(roundedGroupScore, pack.resultSemantics),
    groupScore: roundedGroupScore,
    isFinal: room.result_status === "final",
    pairCount: group.pairCount,
    pairResults,
    splitQuestions: [...questionResults]
      .filter((question) => !question.isUnanimous)
      .sort((left, right) => splitDistance(left) - splitDistance(right))
      .slice(0, 4),
    unanimousQuestions: questionResults
      .filter((question) => question.isUnanimous)
      .slice(0, 4),
  };
}

async function readStoredBalanceResult({
  client,
  participant,
  participantToken,
  room,
}: {
  client: ServiceClient;
  participant: ParticipantRow;
  participantToken: string;
  room: RoomRow;
}) {
  const stored = await client
    .schema("together_balance")
    .rpc("get_result_state", {
      p_join_token_hash: hashBalanceSecret(participantToken),
      p_participant_id: participant.id,
      p_room_id: room.id,
      p_snapshot_id: null,
    });
  if (stored.error) {
    if (databaseErrorMessage(stored.error).includes("snapshot_not_found")) {
      return null;
    }
    throw mapDatabaseError(stored.error);
  }
  return stored.data as Record<string, unknown> | null;
}

function applyStoredSnapshotToResult({
  liveResult,
  pack,
  snapshot,
}: {
  liveResult: BalanceRoomResultView;
  pack: BalancePack;
  snapshot: Record<string, unknown>;
}): BalanceRoomResultView {
  const storedPairs = Array.isArray(snapshot.myPairResults)
    ? (snapshot.myPairResults as Array<Record<string, unknown>>)
    : [];
  const storedPairByOtherId = new Map(
    storedPairs.map((pair) => [stringValue(pair.otherParticipantId), pair]),
  );
  const pairResults = liveResult.pairResults.flatMap((pair) => {
    const storedPair = storedPairByOtherId.get(pair.otherParticipantId);
    if (!storedPair) return [];
    return [
      {
        ...pair,
        comparedCount: numericValue(
          storedPair.comparedCount,
          pair.comparedCount,
        ),
        matchCount: numericValue(storedPair.matchCount, pair.matchCount),
        score: Math.round(numericValue(storedPair.roundedScore, pair.score)),
      },
    ];
  });
  const groupScore = Math.round(
    numericValue(snapshot.groupScore, liveResult.groupScore),
  );
  return {
    ...liveResult,
    comparedQuestionCount:
      pairResults[0]?.comparedCount ?? liveResult.comparedQuestionCount,
    completedParticipantCount: numericValue(
      snapshot.participantCount,
      liveResult.completedParticipantCount,
    ),
    groupLabel: getGroupScoreLabel(groupScore, pack.resultSemantics),
    groupScore,
    isFinal: snapshot.resultState === "final",
    pairCount: numericValue(snapshot.pairCount, liveResult.pairCount),
    pairResults,
  };
}

function computeRoomResult({
  itemKeyById,
  pack,
  participants,
  responseRows,
}: {
  itemKeyById: ReadonlyMap<string, string>;
  pack: BalancePack;
  participants: readonly ParticipantRow[];
  responseRows: readonly ResponseRow[];
}) {
  const completedParticipants = participants.filter(
    (participant) => participant.status === "completed",
  );
  if (completedParticipants.length < 2) return null;

  const questionByKey = new Map(
    pack.questions.map((question) => [question.id, question]),
  );
  const responsesByParticipant = new Map<string, BalanceResponse[]>();
  for (const participant of completedParticipants) {
    responsesByParticipant.set(participant.id, []);
  }
  for (const response of responseRows) {
    const questionKey = itemKeyById.get(response.item_id);
    const question = questionKey ? questionByKey.get(questionKey) : undefined;
    const bucket = responsesByParticipant.get(response.participant_id);
    if (!question || !bucket || response.option_key === "skipped") continue;
    bucket.push({
      clientSequence: response.client_sequence,
      itemId: question.id,
      optionId: optionIdForKey(question, response.option_key),
      participantId: response.participant_id,
    });
  }

  const group = scoreBalanceGroup(
    pack,
    completedParticipants.map((participant) => ({
      id: participant.id,
      responses: responsesByParticipant.get(participant.id) ?? [],
    })),
  );
  if (
    group.roundedScore === null ||
    group.rawScore === null ||
    group.pairs.some(
      (pair) => pair.rawScore === null || pair.roundedScore === null,
    )
  ) {
    return null;
  }
  return { completedParticipants, group, responsesByParticipant };
}

async function persistLatestResultSnapshot({
  client,
  pack,
  retryCount = 0,
  roomId,
}: {
  client: ServiceClient;
  pack: BalancePack;
  retryCount?: number;
  roomId: string;
}) {
  const [roomResult, participantsResult, responsesResult] = await Promise.all([
    client
      .schema("together_balance")
      .from("room")
      .select("result_status")
      .eq("id", roomId)
      .single(),
    client
      .schema("together_balance")
      .from("participant")
      .select(
        "id,room_id,account_id,nickname,status,joined_at,completed_at,created_at,pair_visibility_consent",
      )
      .eq("room_id", roomId)
      .eq("status", "completed")
      .order("created_at", { ascending: true }),
    client
      .schema("together_balance")
      .from("response")
      .select("participant_id,item_id,option_key,client_sequence")
      .eq("room_id", roomId),
  ]);
  if (roomResult.error) throw mapDatabaseError(roomResult.error);
  if (participantsResult.error)
    throw mapDatabaseError(participantsResult.error);
  if (responsesResult.error) throw mapDatabaseError(responsesResult.error);

  const participants = (participantsResult.data ?? []) as ParticipantRow[];
  if (participants.length < 2) return null;
  const responseRows = (responsesResult.data ?? []) as ResponseRow[];
  const responseItemIds = Array.from(
    new Set(responseRows.map((response) => response.item_id)),
  );
  const itemsResult = await client
    .schema("together_balance")
    .from("item")
    .select("id,item_key")
    .in("id", responseItemIds);
  if (itemsResult.error) throw mapDatabaseError(itemsResult.error);
  const itemKeyById = new Map(
    ((itemsResult.data ?? []) as ItemRow[]).map((item) => [
      item.id,
      item.item_key,
    ]),
  );
  const computation = computeRoomResult({
    itemKeyById,
    pack,
    participants,
    responseRows,
  });
  if (!computation) {
    throw new BalanceServerError(
      "storage_unavailable",
      "결과를 안전하게 저장하지 못했어요. 다시 시도해 주세요.",
      503,
      true,
    );
  }

  const { completedParticipants, group, responsesByParticipant } = computation;
  const resultState =
    roomResult.data.result_status === "final" ? "final" : "current";
  const participantSetHash = sha256Hex(
    completedParticipants
      .map((participant) => participant.id)
      .sort()
      .join("|"),
  );
  const questionResults = createQuestionResults({
    completedParticipants,
    pack,
    responsesByParticipant,
  });
  const highlights = questionResults
    .filter((question) => question.isUnanimous)
    .slice(0, 4)
    .map((question) => ({
      counts: question.counts.map((count) => ({
        count: count.count,
        optionText: count.optionText,
      })),
      itemKey: question.id,
      kind: "unanimous",
      prompt: question.prompt,
    }));

  const pairRows = group.pairs.map((pair) => {
    const [participantLowId, participantHighId] = [
      pair.participantAId,
      pair.participantBId,
    ].sort();
    return {
      compared_count: pair.comparedCount,
      highlights: [],
      match_count: pair.matchCount,
      participant_high_id: participantHighId,
      participant_low_id: participantLowId,
      raw_score: (pair.rawScore ?? 0) / 100,
      rounded_score: pair.roundedScore ?? 0,
      topic_scores: {},
    };
  });
  const publicScore = Math.round(group.rawScore ?? 0);
  const publicBody = `${pack.title}에서 우리 그룹의 ${getBalanceResultLabel(
    pack.resultSemantics,
  )}는 ${publicScore}점이었어요.`;
  const publicProjection = {
    completedCount: completedParticipants.length,
    highlight: readPublicSnapshotHighlight(highlights),
    packSlug: pack.slug,
    packTitle: pack.title,
    resultStatus: resultState,
    roomName: `${pack.title} 함께한 결과`,
    score: publicScore,
    scoreLabel: getGroupScoreLabel(publicScore, pack.resultSemantics),
  };
  const snapshotResult = await client
    .schema("together_balance")
    .rpc("store_result_snapshot", {
      p_answer_cutoff_at:
        completedParticipants
          .map((participant) => participant.completed_at)
          .filter((value): value is string => Boolean(value))
          .sort()
          .at(-1) ?? new Date().toISOString(),
      p_compared_count: group.pairs.reduce(
        (sum, pair) => sum + pair.comparedCount,
        0,
      ),
      p_group_score: group.rawScore,
      p_highlights: highlights,
      p_match_count: group.pairs.reduce(
        (sum, pair) => sum + pair.matchCount,
        0,
      ),
      p_pair_count: group.pairs.length,
      p_pair_results: pairRows,
      p_participant_count: completedParticipants.length,
      p_participant_ids: completedParticipants
        .map((participant) => participant.id)
        .sort(),
      p_participant_set_hash: participantSetHash,
      p_result_semantics_version: "pairwise_group_compatibility_v1",
      p_result_state: resultState,
      p_room_id: roomId,
      p_scoring_version: group.scoringVersion,
      p_public_body: publicBody,
      p_public_projection: publicProjection,
    });
  if (snapshotResult.error) {
    const message = databaseErrorMessage(snapshotResult.error);
    if (
      retryCount < 2 &&
      (message.includes("result_snapshot_stale") ||
        message.includes("result_state_mismatch"))
    ) {
      return persistLatestResultSnapshot({
        client,
        pack,
        retryCount: retryCount + 1,
        roomId,
      });
    }
    throw mapDatabaseError(snapshotResult.error);
  }
  if (typeof snapshotResult.data !== "string") {
    throw new BalanceServerError(
      "storage_unavailable",
      "결과를 안전하게 저장하지 못했어요. 다시 시도해 주세요.",
      503,
      true,
    );
  }
  const snapshotId = snapshotResult.data;

  try {
    await syncExistingResultFeedShare({
      client,
      completedCount: completedParticipants.length,
      highlight: publicProjection.highlight,
      pack,
      resultState,
      roomId,
      score: publicScore,
      snapshotId,
    });
  } catch (error) {
    console.error("[together-balance] result feed sync failed", {
      code:
        typeof error === "object" && error && "code" in error
          ? String(error.code)
          : "unknown",
      roomId,
    });
  }
  return snapshotId;
}

async function syncExistingResultFeedShare({
  client,
  completedCount,
  highlight,
  pack,
  resultState,
  roomId,
  score,
  snapshotId,
}: {
  client: ServiceClient;
  completedCount: number;
  highlight: string | null;
  pack: BalancePack;
  resultState: "current" | "final";
  roomId: string;
  score: number;
  snapshotId: string;
}) {
  const shareResult = await client
    .schema("together_balance")
    .from("feed_share")
    .select("id,feed_post_id")
    .eq("room_id", roomId)
    .eq("share_kind", "anonymous_result")
    .eq("status", "active")
    .is("deleted_at", null)
    .maybeSingle();
  if (shareResult.error) throw shareResult.error;
  if (!shareResult.data) return;

  const scoreLabel = getGroupScoreLabel(score, pack.resultSemantics);
  const body = `${pack.title}에서 우리 그룹의 ${getBalanceResultLabel(
    pack.resultSemantics,
  )}는 ${score}점이었어요.`;
  const updatePost = await client
    .schema("feed")
    .from("feed_post")
    .update({
      body,
      public_projection_payload: {
        completedCount,
        highlight,
        packSlug: pack.slug,
        packTitle: pack.title,
        resultStatus: resultState,
        roomName: `${pack.title} 함께한 결과`,
        score,
        scoreLabel,
      },
    })
    .eq("id", String(shareResult.data.feed_post_id));
  if (updatePost.error) throw updatePost.error;
  const updateShare = await client
    .schema("together_balance")
    .from("feed_share")
    .update({ snapshot_id: snapshotId })
    .eq("id", String(shareResult.data.id));
  if (updateShare.error) throw updateShare.error;
}

function createPairAnswerViews({
  otherParticipantId,
  pack,
  responsesByParticipant,
  viewerParticipantId,
}: {
  otherParticipantId: string;
  pack: BalancePack;
  responsesByParticipant: ReadonlyMap<string, readonly BalanceResponse[]>;
  viewerParticipantId: string;
}) {
  const mine = new Map(
    (responsesByParticipant.get(viewerParticipantId) ?? []).map((response) => [
      response.itemId,
      response.optionId,
    ]),
  );
  const other = new Map(
    (responsesByParticipant.get(otherParticipantId) ?? []).map((response) => [
      response.itemId,
      response.optionId,
    ]),
  );
  return pack.questions.flatMap((question) => {
    const myOptionId = mine.get(question.id);
    const otherOptionId = other.get(question.id);
    const myOption = question.options.find(
      (option) => option.id === myOptionId,
    );
    const otherOption = question.options.find(
      (option) => option.id === otherOptionId,
    );
    if (!myOption || !otherOption) return [];
    return [
      {
        id: question.id,
        isMatch: myOption.id === otherOption.id,
        myOptionText: myOption.text,
        otherOptionText: otherOption.text,
        prompt: question.prompt,
        subtopic: question.subtopic,
      },
    ];
  });
}

function createQuestionResults({
  completedParticipants,
  pack,
  responsesByParticipant,
}: {
  completedParticipants: readonly ParticipantRow[];
  pack: BalancePack;
  responsesByParticipant: ReadonlyMap<string, readonly BalanceResponse[]>;
}) {
  return pack.questions.flatMap<BalanceQuestionResultView>((question) => {
    const counts = question.options.map((option) => ({
      count: completedParticipants.reduce((total, participant) => {
        const answer = responsesByParticipant
          .get(participant.id)
          ?.find((response) => response.itemId === question.id);
        return total + (answer?.optionId === option.id ? 1 : 0);
      }, 0),
      optionId: option.id,
      optionText: option.text,
    }));
    const total = counts.reduce((sum, item) => sum + item.count, 0);
    if (total !== completedParticipants.length) return [];
    return [
      {
        counts,
        id: question.id,
        isUnanimous: counts.some(
          (item) => item.count === completedParticipants.length,
        ),
        prompt: question.prompt,
        subtopic: question.subtopic,
      },
    ];
  });
}

async function createAvailableNickname({
  client,
  nickname,
  roomCode,
}: {
  client: ServiceClient;
  nickname: string;
  roomCode: string;
}) {
  const roomResult = await client
    .schema("together_balance")
    .from("room")
    .select("id")
    .eq("join_code_hash", hashBalanceSecret(normalizeRoomCode(roomCode)))
    .maybeSingle();
  if (roomResult.error || !roomResult.data) {
    throw new BalanceServerError(
      "room_not_found",
      "초대 방을 찾지 못했어요.",
      404,
    );
  }
  const participantsResult = await client
    .schema("together_balance")
    .from("participant")
    .select("nickname")
    .eq("room_id", String(roomResult.data.id))
    .in("status", ["reserved", "joined", "completed"]);
  if (participantsResult.error)
    throw mapDatabaseError(participantsResult.error);
  const used = new Set(
    (participantsResult.data ?? []).map((item) =>
      String(item.nickname).trim().toLocaleLowerCase("ko-KR"),
    ),
  );
  const base = nickname.trim();
  if (!used.has(base.toLocaleLowerCase("ko-KR"))) return base;
  for (let suffix = 2; suffix <= 99; suffix += 1) {
    const candidate = `${base.slice(0, 13)} ${suffix}`;
    if (!used.has(candidate.toLocaleLowerCase("ko-KR"))) return candidate;
  }
  throw new BalanceServerError(
    "nickname_taken",
    "다른 닉네임을 입력해 주세요.",
    409,
  );
}

async function loadBalancePackFromDatabase(
  client: ServiceClient,
  templateVersionId: string,
): Promise<BalancePack | null> {
  const versionResult = await client
    .schema("together_balance")
    .from("template_version")
    .select("template_id,version,default_question_count,scoring_template")
    .eq("id", templateVersionId)
    .maybeSingle();
  if (versionResult.error) throw mapDatabaseError(versionResult.error);
  if (!versionResult.data) return null;

  const [templateResult, itemsResult] = await Promise.all([
    client
      .schema("together_balance")
      .from("template")
      .select("id,slug,title,scoring_template")
      .eq("id", String(versionResult.data.template_id))
      .maybeSingle(),
    client
      .schema("together_balance")
      .from("item")
      .select(
        "id,item_key,subtopic_id,meaning_code,prompt_role,prompt,option_a_text,option_b_text,scored,highlight_priority,conversation_value,sensitivity_level,intensity,audience",
      )
      .eq("template_version_id", templateVersionId)
      .order("item_key", { ascending: true }),
  ]);
  if (templateResult.error) throw mapDatabaseError(templateResult.error);
  if (itemsResult.error) throw mapDatabaseError(itemsResult.error);
  if (!templateResult.data || !itemsResult.data?.length) return null;

  const template = templateResult.data as {
    id: string;
    slug: string;
    title: string;
  };
  const scoringTemplate = String(
    versionResult.data.scoring_template,
  ) as BalancePack["scoringTemplate"];
  const storedItems = itemsResult.data as StoredItemRow[];
  const currentPack = PUBLIC_BALANCE_PACKS.find(
    (candidate) => candidate.slug === template.slug,
  );
  const contentVersion = Number(versionResult.data.version);
  const questions = storedItems.map<BalanceQuestion>((item, index) => {
    const ratio = index / storedItems.length;
    return {
      audience: "all",
      contentVersion,
      conversationValue: item.conversation_value,
      highlightPriority: item.highlight_priority,
      id: item.item_key,
      intensity:
        item.intensity === "serious"
          ? "deep"
          : item.intensity === "closer"
            ? "lively"
            : "light",
      meaningCode: item.meaning_code ?? undefined,
      options: [
        { id: `${item.item_key}:a`, text: item.option_a_text },
        { id: `${item.item_key}:b`, text: item.option_b_text },
      ],
      packId: template.slug,
      phase:
        ratio < 0.34 ? "familiar" : ratio < 0.68 ? "everyday" : "conversation",
      prompt: item.prompt,
      promptRole: item.prompt_role,
      scored: item.scored,
      sensitivity:
        item.sensitivity_level === "sensitive"
          ? "private"
          : item.sensitivity_level,
      subtopic: item.subtopic_id,
    };
  });

  return {
    contentPoolVersion: contentVersion,
    defaultQuestionCount: Number(
      versionResult.data.default_question_count,
    ) as BalancePack["defaultQuestionCount"],
    description:
      currentPack?.description ?? `${template.title} 밸런스 게임이에요.`,
    id: template.slug,
    questions,
    resultSemantics: resultSemanticsForScoringTemplate(scoringTemplate),
    roundSize: 8,
    scoringTemplate,
    slug: template.slug,
    supportedQuestionCounts: [8, 12, 16, 20, 24],
    title: template.title,
  };
}

function resultSemanticsForScoringTemplate(
  template: BalancePack["scoringTemplate"],
): BalancePack["resultSemantics"] {
  if (template === "relationship_standard") {
    return "relationship_standard_sync";
  }
  if (template === "ideal_preference") return "ideal_preference_similarity";
  if (template === "dilemma_fun") return "choice_chemistry";
  return template;
}

function optionIdForKey(
  question: BalanceQuestion,
  optionKey: "a" | "b" | "skipped",
) {
  return optionKey === "b" ? question.options[1].id : question.options[0].id;
}

function mapParticipantStatus(status: ParticipantRow["status"]) {
  if (status === "joined") return "active" as const;
  if (status === "expired") return "left" as const;
  return status;
}

function getGroupScoreLabel(
  score: number,
  semantics: BalancePack["resultSemantics"] = "taste_sync",
) {
  if (semantics === "ideal_preference_similarity") {
    if (score >= 80) return "끌리는 포인트가 많이 닮았어요";
    if (score >= 65) return "마음 가는 모습이 자주 겹쳐요";
    if (score >= 50) return "닮은 취향과 다른 취향이 함께 있어요";
    return "서로 다른 매력에 더 눈길이 가요";
  }
  if (semantics === "choice_chemistry") {
    if (score >= 80) return "극한 선택에서도 거의 한마음이에요";
    if (score >= 65) return "황당한 선택도 자주 통해요";
    if (score >= 50) return "통할 때와 갈릴 때가 반반이에요";
    return "서로의 예상 밖 선택이 재미있는 팀이에요";
  }
  if (score >= 80) return "거의 한마음인 팀";
  if (score >= 65) return "자주 통하는 팀";
  if (score >= 50) return "공통점도 개성도 있는 팀";
  return "선택이 뚜렷하게 갈리는 팀";
}

function readPublicSnapshotHighlight(value: unknown) {
  if (!Array.isArray(value)) return null;
  const first = value.find((item): item is { prompt: string } =>
    Boolean(
      item &&
      typeof item === "object" &&
      "prompt" in item &&
      typeof item.prompt === "string",
    ),
  );
  return first?.prompt.slice(0, 120) ?? null;
}

function splitDistance(question: BalanceQuestionResultView) {
  const [first, second] = question.counts;
  return Math.abs((first?.count ?? 0) - (second?.count ?? 0));
}

function getBalanceServiceClient() {
  const client = createSupabaseServiceClient();
  if (!client) {
    throw new BalanceServerError(
      "storage_unavailable",
      "함께하기 저장소 연결이 필요해요.",
      503,
      true,
    );
  }
  return client;
}

function hashBalanceSecret(secret: string) {
  const env = getSupabaseServiceEnv();
  if (!env) {
    throw new BalanceServerError(
      "storage_unavailable",
      "함께하기 저장소 연결이 필요해요.",
      503,
      true,
    );
  }
  return sha256Hex(`${env.shareTokenPepper}:${secret}`);
}

function balanceItemId(pack: BalancePack, questionId: string) {
  return deterministicUuid(
    `balance:template:${pack.id}:version:${pack.contentPoolVersion}:item:${questionId}`,
  );
}

function readBalanceNetworkScope(request: Request) {
  const forwarded =
    request.headers.get("cf-connecting-ip") ??
    request.headers.get("x-vercel-forwarded-for");
  const address = forwarded?.split(",")[0]?.trim().slice(0, 80);
  if (address) return `ip:${address}`;

  const userAgent = request.headers.get("user-agent")?.slice(0, 180) ?? "none";
  const language =
    request.headers.get("accept-language")?.slice(0, 80) ?? "none";
  return `unknown:${userAgent}:${language}`;
}

function createRoomCode(clientRequestId: string, attempt: number) {
  const bytes = Buffer.from(
    deriveBalanceSecret("create-room-code", `${clientRequestId}:${attempt}`),
    "hex",
  ).subarray(0, 6);
  return Array.from(
    bytes,
    (byte) => roomCodeAlphabet[byte % roomCodeAlphabet.length],
  ).join("");
}

function deriveBalanceSecret(label: string, value: string) {
  const env = getSupabaseServiceEnv();
  if (!env) {
    throw new BalanceServerError(
      "storage_unavailable",
      "함께하기 저장소 연결이 필요해요.",
      503,
      true,
    );
  }
  return sha256Hex(`${env.shareTokenPepper}:${label}:${value}`);
}

function deterministicUuid(value: string) {
  const hex = sha256Hex(value).slice(0, 32).split("");
  hex[12] = "5";
  hex[16] = ((Number.parseInt(hex[16], 16) & 0x3) | 0x8).toString(16);
  const joined = hex.join("");
  return `${joined.slice(0, 8)}-${joined.slice(8, 12)}-${joined.slice(
    12,
    16,
  )}-${joined.slice(16, 20)}-${joined.slice(20)}`;
}

function sha256Hex(value: string) {
  return createHash("sha256").update(value).digest("hex");
}

function normalizeRoomCode(value: string) {
  return value.trim().toUpperCase();
}

function normalizeJoinStatus(value: unknown) {
  if (value === "full" || value === "closed") return value;
  return "open" as const;
}

function numberValue(value: unknown, fallback = 0) {
  return typeof value === "number" && Number.isFinite(value) ? value : fallback;
}

function numericValue(value: unknown, fallback = 0) {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string") {
    const parsed = Number(value);
    if (Number.isFinite(parsed)) return parsed;
  }
  return fallback;
}

function stringValue(value: unknown, fallback = "") {
  return typeof value === "string" ? value : fallback;
}

function isUniqueViolation(error: unknown) {
  return (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    error.code === "23505"
  );
}

function mapDatabaseError(error: unknown) {
  const message = databaseErrorMessage(error);
  if (message.includes("rate_limited")) {
    return new BalanceServerError(
      "rate_limited",
      "요청이 잠시 몰렸어요. 조금 뒤 다시 시도해 주세요.",
      429,
      true,
    );
  }
  if (message.includes("room_not_found")) {
    return new BalanceServerError(
      "room_not_found",
      "초대 방을 찾지 못했어요.",
      404,
    );
  }
  if (message.includes("room_full")) {
    return new BalanceServerError("room_full", "이 방은 이미 다 찼어요.", 409);
  }
  if (
    message.includes("room_closed") ||
    message.includes("already_finalized")
  ) {
    return new BalanceServerError(
      "room_closed",
      "이 방의 참여가 마감됐어요.",
      409,
    );
  }
  if (message.includes("requires_account")) {
    return new BalanceServerError(
      "feed_auth_required",
      "이 방은 로그인한 사용자만 참여할 수 있어요.",
      401,
    );
  }
  if (message.includes("block_relationship")) {
    return new BalanceServerError(
      "room_closed",
      "이 방에는 참여할 수 없어요.",
      403,
    );
  }
  if (message.includes("already_joined")) {
    return new BalanceServerError(
      "request_conflict",
      "이미 참여 중인 방이에요.",
      409,
    );
  }
  if (
    message.includes("participant_removed") ||
    message.includes("reentry_blocked")
  ) {
    return new BalanceServerError(
      "participant_removed",
      "이 방에는 더 이상 참여할 수 없어요.",
      403,
    );
  }
  if (message.includes("participant_not_found")) {
    return new BalanceServerError(
      "participant_not_found",
      "내보낼 참여자를 찾지 못했어요.",
      404,
    );
  }
  if (message.includes("completed_participant_locked")) {
    return new BalanceServerError(
      "request_conflict",
      "이미 완료한 참여자는 결과에서 제외할 수 없어요.",
      409,
    );
  }
  if (
    message.includes("participant_authorization") ||
    message.includes("seat_confirmation")
  ) {
    return new BalanceServerError(
      "participant_unauthorized",
      "참여 정보를 다시 확인해 주세요.",
      401,
    );
  }
  if (
    message.includes("game_incomplete") ||
    message.includes("round_incomplete")
  ) {
    return new BalanceServerError(
      "incomplete_answers",
      "아직 고르지 않은 질문이 있어요.",
      409,
    );
  }
  if (
    message.includes("owner_authorization") ||
    message.includes("owner_removal_forbidden")
  ) {
    return new BalanceServerError("owner_only", "방장만 할 수 있어요.", 403);
  }
  if (message.includes("response_option")) {
    return new BalanceServerError(
      "option_not_found",
      "선택지를 확인하지 못했어요.",
      422,
    );
  }
  return new BalanceServerError(
    "storage_unavailable",
    "저장 중 문제가 생겼어요. 잠시 뒤 다시 시도해 주세요.",
    503,
    true,
  );
}

function databaseErrorMessage(error: unknown) {
  return typeof error === "object" &&
    error !== null &&
    "message" in error &&
    typeof error.message === "string"
    ? error.message
    : "";
}
