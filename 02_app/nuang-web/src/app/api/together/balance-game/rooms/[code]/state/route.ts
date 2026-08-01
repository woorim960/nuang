import { NextResponse } from "next/server";
import {
  handleBalanceRouteError,
  readBalanceParticipantToken,
} from "@/app/api/together/balance-game/_shared";
import { readBalanceRoomStateOnServer } from "@/features/together-balance/server";

export async function GET(
  request: Request,
  context: { params: Promise<{ code: string }> },
) {
  const { code } = await context.params;
  try {
    const room = await readBalanceRoomStateOnServer({
      participantToken: readBalanceParticipantToken(request),
      roomCode: code,
    });
    return NextResponse.json({ ok: true, room });
  } catch (error) {
    return handleBalanceRouteError(error);
  }
}
