import { NextResponse } from "next/server";
import {
  handleBalanceRouteError,
  readBalanceParticipantToken,
  rejectCrossOriginBalanceMutation,
} from "@/app/api/together/balance-game/_shared";
import { saveBalanceResponseRequestSchema } from "@/features/together-balance/api-contract";
import { saveBalanceResponseOnServer } from "@/features/together-balance/server";
import { readValidatedJson } from "@/lib/api/request";

export async function PUT(
  request: Request,
  context: { params: Promise<{ code: string; itemId: string }> },
) {
  const rejected = rejectCrossOriginBalanceMutation(request);
  if (rejected) return rejected;

  const payload = await readValidatedJson(
    request,
    saveBalanceResponseRequestSchema,
  );
  if (!payload.ok) return payload.response;
  const { code, itemId } = await context.params;

  try {
    const saved = await saveBalanceResponseOnServer({
      input: payload.data,
      itemKey: itemId,
      participantToken: readBalanceParticipantToken(request),
      roomCode: code,
    });
    return NextResponse.json({ ok: true, saved });
  } catch (error) {
    return handleBalanceRouteError(error);
  }
}
