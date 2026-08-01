import "server-only";

import { createHmac, randomUUID } from "node:crypto";

export const advertisingSessionCookieName = "nuang_ad_session";

export function resolveAdvertisingServerSession(request: Request) {
  const cookieHeader = request.headers.get("cookie") ?? "";
  const cookieValue = cookieHeader
    .split(";")
    .map((part) => part.trim())
    .find((part) => part.startsWith(`${advertisingSessionCookieName}=`))
    ?.slice(advertisingSessionCookieName.length + 1);
  const sessionId =
    cookieValue && /^[0-9a-f-]{36}$/i.test(cookieValue)
      ? cookieValue
      : randomUUID();
  const pepper = process.env.AD_EVENT_SESSION_PEPPER?.trim();
  if (!pepper) throw new Error("AD_EVENT_SESSION_PEPPER is required");
  return {
    hash: createHmac("sha256", pepper)
      .update(`advertising-session:${sessionId}`)
      .digest("hex"),
    sessionId,
  };
}
