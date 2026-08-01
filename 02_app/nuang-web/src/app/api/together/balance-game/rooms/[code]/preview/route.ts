import { NextResponse } from "next/server";
import { handleBalanceRouteError } from "@/app/api/together/balance-game/_shared";
import {
  enforceBalanceRequestRateLimit,
  readBalanceRoomPreviewOnServer,
} from "@/features/together-balance/server";

export async function GET(
  request: Request,
  context: { params: Promise<{ code: string }> },
) {
  const { code } = await context.params;
  try {
    await enforceBalanceRequestRateLimit({
      action: "preview_room",
      request,
    });
    const room = await readBalanceRoomPreviewOnServer(code);
    return NextResponse.json({ ok: true, room });
  } catch (error) {
    return handleBalanceRouteError(error);
  }
}
