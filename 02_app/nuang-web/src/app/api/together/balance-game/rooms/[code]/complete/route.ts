import { NextResponse } from "next/server";
import {
  handleBalanceRouteError,
  readBalanceParticipantToken,
  revalidateBalanceFeed,
  rejectCrossOriginBalanceMutation,
} from "@/app/api/together/balance-game/_shared";
import { completeBalanceRoomRequestSchema } from "@/features/together-balance/api-contract";
import { completeBalanceRoomOnServer } from "@/features/together-balance/server";
import { readValidatedJson } from "@/lib/api/request";

export async function POST(
  request: Request,
  context: { params: Promise<{ code: string }> },
) {
  const rejected = rejectCrossOriginBalanceMutation(request);
  if (rejected) return rejected;

  const payload = await readValidatedJson(
    request,
    completeBalanceRoomRequestSchema,
  );
  if (!payload.ok) return payload.response;
  const { code } = await context.params;

  try {
    const room = await completeBalanceRoomOnServer({
      participantToken: readBalanceParticipantToken(request),
      roomCode: code,
    });
    revalidateBalanceFeed();
    return NextResponse.json({ ok: true, room });
  } catch (error) {
    return handleBalanceRouteError(error);
  }
}
