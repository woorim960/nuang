export type M05ScaleValue = 1 | 2 | 3 | 4 | 5;

export type M05UnsureReason =
  | "NO_EXPERIENCE"
  | "CONTEXT_VARIES"
  | "WORDING_UNCLEAR"
  | "PREFER_NOT_TO_ANSWER";

export type M05ResponseChoice =
  | { kind: "scale"; value: M05ScaleValue }
  | { kind: "unsure"; reason: M05UnsureReason };

export type M05ParticipantItem = {
  opaqueItemId: string;
  orderIndex: number;
  contextLabel: string;
  promptText: string;
};

export type M05ParticipantDefinition = {
  kind: "cognitive-study";
  protocolVersion: string;
  formId: string;
  responseFormatId: string;
  items: M05ParticipantItem[];
};

export type M05ResponseRecord = {
  firstChoice: M05ResponseChoice;
  currentChoice: M05ResponseChoice;
  responseChanged: boolean;
  firstAnsweredElapsedMs: number;
};

export type M05ParticipantSession = {
  formId: string;
  responses: Record<string, M05ResponseRecord>;
};
