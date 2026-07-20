import runnerFixture from "../../../../docs/research/enakq-map-v0.1/content-validity/gate-c-v0.1/generated/runner/gate-c-runner.json";
import {
  gateCFormIds,
  type GateCFormId,
  type GateCParticipantDefinition,
} from "@/features/research/gate-c/gate-c-study-contract";

if (runnerFixture.status !== "PREPARED_NOT_RUN_NOT_EXTERNAL_VALIDATION") {
  throw new Error(`Unexpected Gate C runner status: ${runnerFixture.status}`);
}

const definitions = runnerFixture.forms.map((form) => {
  if (!gateCFormIds.includes(form.formId as GateCFormId)) {
    throw new Error(`Unknown Gate C form: ${form.formId}`);
  }
  if (form.items.length !== 12) {
    throw new Error(`${form.formId}: expected 12 Gate C items`);
  }

  return {
    protocolVersion: runnerFixture.protocolVersion,
    candidateSetId: runnerFixture.candidateSetId,
    formId: form.formId as GateCFormId,
    responseFormatId: runnerFixture.responseFormatId,
    status: "PREPARED_NOT_RUN_NOT_EXTERNAL_VALIDATION" as const,
    items: form.items,
  } satisfies GateCParticipantDefinition;
});

export const gateCParticipantDefinitions = Object.fromEntries(
  definitions.map((definition) => [definition.formId, definition]),
) as Record<GateCFormId, GateCParticipantDefinition>;

export function getGateCParticipantDefinition(formId: GateCFormId) {
  return gateCParticipantDefinitions[formId];
}
