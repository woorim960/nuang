import participantForm from "../../../../docs/research/core-m04/v0.2/post-adjudication/generated/m05/reviewer/02_TARGETED_ITEM_FORM.json";
import type { M05ParticipantDefinition } from "@/features/research/m05/m05-participant-contract";

export const m05ParticipantDefinition: M05ParticipantDefinition = {
  kind: "cognitive-study",
  protocolVersion: participantForm.protocolVersion,
  formId: participantForm.formId,
  responseFormatId: participantForm.responseFormatId,
  items: participantForm.items,
};
