import { NextResponse } from "next/server";
import {
  apiClosedStates,
  createApiClosedPayload,
  type ApiClosedStateId,
} from "@/lib/api/closed-state-data";

export { apiClosedStates, createApiClosedPayload, type ApiClosedStateId };

export function createApiClosedResponse(stateId: ApiClosedStateId) {
  return NextResponse.json(createApiClosedPayload(stateId), {
    status: apiClosedStates[stateId].httpStatus,
  });
}
