import { NextResponse } from "next/server";
import {
  handleBalanceRouteError,
  readBalanceParticipantToken,
  revalidateBalanceFeed,
  rejectCrossOriginBalanceMutation,
} from "@/app/api/together/balance-game/_shared";
import { createBalanceFeedShareRequestSchema } from "@/features/together-balance/api-contract";
import {
  readBalanceRequestAccountId,
  shareBalanceResultToFeedOnServer,
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
    createBalanceFeedShareRequestSchema,
  );
  if (!payload.ok) return payload.response;
  const { code } = await context.params;

  try {
    const accountId = await readBalanceRequestAccountId(true);
    if (!accountId) {
      throw new Error("Authenticated account could not be resolved.");
    }
    const room = await shareBalanceResultToFeedOnServer({
      accountId,
      participantToken: readBalanceParticipantToken(request),
      roomCode: code,
    });
    revalidateBalanceFeed();
    return NextResponse.json({ ok: true, room });
  } catch (error) {
    return handleBalanceRouteError(error);
  }
}
