import { NextResponse } from "next/server";
import {
  handleBalanceRouteError,
  revalidateBalanceFeed,
  rejectCrossOriginBalanceMutation,
} from "@/app/api/together/balance-game/_shared";
import { joinBalanceRoomRequestSchema } from "@/features/together-balance/api-contract";
import {
  enforceBalanceRequestRateLimit,
  joinBalanceRoomOnServer,
  readBalanceRequestAccountId,
  readBalanceRoomPreviewOnServer,
} from "@/features/together-balance/server";
import { readValidatedJson } from "@/lib/api/request";

export async function POST(
  request: Request,
  context: { params: Promise<{ code: string }> },
) {
  const rejected = rejectCrossOriginBalanceMutation(request);
  if (rejected) return rejected;

  const payload = await readValidatedJson(
    request,
    joinBalanceRoomRequestSchema,
  );
  if (!payload.ok) return payload.response;
  const { code } = await context.params;

  try {
    await enforceBalanceRequestRateLimit({
      action: "join_room",
      request,
    });
    const preview = await readBalanceRoomPreviewOnServer(code);
    const accountId = await readBalanceRequestAccountId(
      preview.participationMode === "feed_group",
    );
    const result = await joinBalanceRoomOnServer({
      accountId,
      answerRevealConsentVersion: payload.data.answerRevealConsentVersion,
      clientRequestId: payload.data.clientRequestId,
      nickname: payload.data.nickname,
      roomCode: code,
    });
    revalidateBalanceFeed();
    return NextResponse.json({ ok: true, ...result }, { status: 201 });
  } catch (error) {
    return handleBalanceRouteError(error);
  }
}
