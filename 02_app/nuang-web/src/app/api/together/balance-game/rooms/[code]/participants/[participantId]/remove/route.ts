import { NextResponse } from "next/server";
import {
  handleBalanceRouteError,
  readBalanceParticipantToken,
  revalidateBalanceFeed,
  rejectCrossOriginBalanceMutation,
} from "@/app/api/together/balance-game/_shared";
import { removeBalanceParticipantRequestSchema } from "@/features/together-balance/api-contract";
import { removeBalanceParticipantOnServer } from "@/features/together-balance/server";
import { readValidatedJson } from "@/lib/api/request";

export async function POST(
  request: Request,
  context: {
    params: Promise<{ code: string; participantId: string }>;
  },
) {
  const rejected = rejectCrossOriginBalanceMutation(request);
  if (rejected) return rejected;

  const payload = await readValidatedJson(
    request,
    removeBalanceParticipantRequestSchema,
  );
  if (!payload.ok) return payload.response;
  const { code, participantId } = await context.params;

  try {
    const room = await removeBalanceParticipantOnServer({
      participantToken: readBalanceParticipantToken(request),
      roomCode: code,
      targetParticipantId: participantId,
    });
    if (room.participationMode === "feed_group") {
      revalidateBalanceFeed();
    }
    return NextResponse.json({ ok: true, room });
  } catch (error) {
    return handleBalanceRouteError(error);
  }
}
