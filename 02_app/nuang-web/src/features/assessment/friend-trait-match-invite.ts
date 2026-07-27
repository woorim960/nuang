export const friendTraitMatchChoiceIds = ["plan", "listen"] as const;

export type FriendTraitMatchChoiceId =
  (typeof friendTraitMatchChoiceIds)[number];

export type FriendTraitMatchInviteState =
  | { status: "sender" }
  | {
      expiresAt: number;
      guess: FriendTraitMatchChoiceId;
      mine: FriendTraitMatchChoiceId;
      status: "ready";
    }
  | { status: "expired" }
  | { status: "invalid" };

type FriendTraitMatchSearchParams = Record<
  string,
  string | string[] | undefined
>;

const inviteKind = "friend-view";
const inviteVersion = "1";
const inviteLifetimeMs = 14 * 24 * 60 * 60 * 1_000;
const allowedClockSkewMs = 5 * 60 * 1_000;

export function createFriendTraitMatchInviteUrl({
  guess,
  mine,
  now = Date.now(),
  origin,
}: {
  guess: FriendTraitMatchChoiceId;
  mine: FriendTraitMatchChoiceId;
  now?: number;
  origin: string;
}) {
  const inviteUrl = new URL("/assessments/friend-match", origin);
  inviteUrl.searchParams.set("invite", inviteKind);
  inviteUrl.searchParams.set("v", inviteVersion);
  inviteUrl.searchParams.set("mine", mine);
  inviteUrl.searchParams.set("guess", guess);
  inviteUrl.searchParams.set("issued", String(now));
  inviteUrl.searchParams.set("expires", String(now + inviteLifetimeMs));
  return inviteUrl.toString();
}

export function parseFriendTraitMatchInvite(
  searchParams: FriendTraitMatchSearchParams,
  now = Date.now(),
): FriendTraitMatchInviteState {
  const invite = readSingleValue(searchParams.invite);
  if (!invite) {
    const hasInviteData = ["v", "mine", "guess", "issued", "expires"].some(
      (key) => searchParams[key] !== undefined,
    );
    return hasInviteData ? { status: "invalid" } : { status: "sender" };
  }

  const version = readSingleValue(searchParams.v);
  const mine = readChoice(searchParams.mine);
  const guess = readChoice(searchParams.guess);
  const issuedAt = readTimestamp(searchParams.issued);
  const expiresAt = readTimestamp(searchParams.expires);

  if (
    invite !== inviteKind ||
    version !== inviteVersion ||
    !mine ||
    !guess ||
    issuedAt === null ||
    expiresAt === null ||
    issuedAt > now + allowedClockSkewMs ||
    expiresAt - issuedAt !== inviteLifetimeMs
  ) {
    return { status: "invalid" };
  }

  if (expiresAt <= now) {
    return { status: "expired" };
  }

  return {
    expiresAt,
    guess,
    mine,
    status: "ready",
  };
}

function readChoice(value: string | string[] | undefined) {
  const singleValue = readSingleValue(value);
  return friendTraitMatchChoiceIds.find((choice) => choice === singleValue);
}

function readSingleValue(value: string | string[] | undefined) {
  return typeof value === "string" && value.length > 0 ? value : null;
}

function readTimestamp(value: string | string[] | undefined) {
  const singleValue = readSingleValue(value);
  if (!singleValue || !/^\d{13}$/.test(singleValue)) return null;

  const timestamp = Number(singleValue);
  return Number.isSafeInteger(timestamp) ? timestamp : null;
}
