import type { PrivateContactPayload } from "@/features/account/private-contact-contract";

export const accountEventEntryStatuses = [
  "entered",
  "winner",
  "not_selected",
  "contacted",
  "invalid",
  "withdrawn",
] as const;

export type AccountEventEntryStatus =
  (typeof accountEventEntryStatuses)[number];

export type AccountEventHistoryItem = {
  announcementLabel: string | null;
  canWithdraw: boolean;
  enteredAt: string;
  id: string;
  prize: string;
  status: AccountEventEntryStatus;
  title: string;
  updatedAt: string;
};

export type AccountEventHistoryPayload = {
  contact: PrivateContactPayload;
  events: AccountEventHistoryItem[];
  ok: true;
};
