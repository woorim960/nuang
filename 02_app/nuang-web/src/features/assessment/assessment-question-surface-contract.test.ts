import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const sharedControlConsumers = [
  "src/features/assessment/AssessmentRunner.tsx",
  "src/features/assessment/FreeTopicRunner.tsx",
  "src/features/lab/LabRunner.tsx",
  "src/features/research/gate-c/GateCPublicStudy.tsx",
  "src/features/research/gate-c/GateCStudyRunner.tsx",
  "src/features/research/m05/M05ParticipantRunner.tsx",
  "src/features/assessment/FriendTraitMatch.tsx",
] as const;

function source(path: string) {
  return readFileSync(resolve(process.cwd(), path), "utf8");
}

describe("assessment question surface contract", () => {
  it.each(sharedControlConsumers)(
    "%s imports the shared assessment question primitives",
    (path) => {
      expect(source(path)).toContain("AssessmentQuestionControls");
    },
  );

  it("keeps question surface styling in one dedicated CSS module", () => {
    const controls = source(
      "src/features/assessment/AssessmentQuestionControls.tsx",
    );
    expect(controls).toContain("./AssessmentQuestionSurface.module.css");

    for (const path of sharedControlConsumers) {
      expect(source(path)).not.toContain("AssessmentRunner.module.css");
    }
  });

  it("does not reintroduce local bottom-sheet copies in research runners", () => {
    for (const path of [
      "src/features/research/gate-c/GateCStudyRunner.tsx",
      "src/features/research/m05/M05ParticipantRunner.tsx",
    ]) {
      expect(source(path)).not.toMatch(/function BottomSheet\s*\(/);
      expect(source(path)).toContain("AssessmentBottomSheet");
    }
  });
});
