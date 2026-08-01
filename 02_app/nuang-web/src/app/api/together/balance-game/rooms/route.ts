import { NextResponse } from "next/server";
import {
  rejectCrossOriginBalanceMutation,
  handleBalanceRouteError,
  revalidateBalanceFeed,
} from "@/app/api/together/balance-game/_shared";
import { createBalanceRoomRequestSchema } from "@/features/together-balance/api-contract";
import {
  createBalanceRoomOnServer,
  enforceBalanceRequestRateLimit,
  readBalanceRequestAccountId,
} from "@/features/together-balance/server";
import { readValidatedJson } from "@/lib/api/request";

export async function POST(request: Request) {
  const rejected = rejectCrossOriginBalanceMutation(request);
  if (rejected) return rejected;

  const payload = await readValidatedJson(
    request,
    createBalanceRoomRequestSchema,
  );
  if (!payload.ok) return payload.response;

  try {
    await enforceBalanceRequestRateLimit({
      action: "create_room",
      request,
    });
    const accountId = await readBalanceRequestAccountId(
      payload.data.participationMode === "feed_group",
    );
    const result = await createBalanceRoomOnServer({
      accountId,
      input: payload.data,
    });
    if (payload.data.participationMode === "feed_group") {
      revalidateBalanceFeed();
    }
    return NextResponse.json({ ok: true, ...result }, { status: 201 });
  } catch (error) {
    return handleBalanceRouteError(error);
  }
}
