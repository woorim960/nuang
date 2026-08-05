import { NextResponse } from "next/server";
import {
  handleBalanceRouteError,
  readBalanceParticipantToken,
  revalidateBalanceFeed,
  rejectCrossOriginBalanceMutation,
} from "@/app/api/together/balance-game/_shared";
import { finalizeBalanceRoomRequestSchema } from "@/features/together-balance/api-contract";
import { finalizeBalanceRoomOnServer } from "@/features/together-balance/server";
import { readValidatedJson } from "@/lib/api/request";

export async function POST(
  request: Request,
  context: { params: Promise<{ code: string }> },
) {
  const rejected = rejectCrossOriginBalanceMutation(request);
  if (rejected) return rejected;

  const payload = await readValidatedJson(
    request,
    finalizeBalanceRoomRequestSchema,
  );
  if (!payload.ok) return payload.response;
  const { code } = await context.params;

  try {
    const room = await finalizeBalanceRoomOnServer({
      participantToken: readBalanceParticipantToken(request),
      roomCode: code,
    });
    if (room.participationMode === "feed_group") {
      revalidateBalanceFeed();
    }
    return NextResponse.json({ ok: true, room });
  } catch (error) {
    return handleBalanceRouteError(error);
  }
}
