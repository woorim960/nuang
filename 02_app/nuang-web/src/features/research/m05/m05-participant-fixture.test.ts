import { describe, expect, it } from "vitest";
import { m05ParticipantDefinition } from "@/features/research/m05/m05-participant-fixture";

describe("M05 participant fixture", () => {
  it("contains the five locked participant-facing items in order", () => {
    expect(m05ParticipantDefinition.items).toEqual([
      {
        opaqueItemId: "CIT-001",
        orderIndex: 1,
        contextLabel: "다른 사람과 함께할 일에서 내가 맡은 부분이 있을 때",
        promptText: "정한 때에 맞춰 내 부분을 끝낸다.",
      },
      {
        opaqueItemId: "CIT-002",
        orderIndex: 2,
        contextLabel: "내가 한 것을 다른 사람에게 보내거나 보여주기 전",
        promptText:
          "같은 걱정을 계속 되짚기보다, 필요한 부분을 확인한 뒤 마무리한다.",
      },
      {
        opaqueItemId: "CIT-003",
        orderIndex: 3,
        contextLabel:
          "가족, 친구, 연인이 각자 다르게 골라도 되는 사소한 선택을 할 때",
        promptText: "내가 정한 쪽으로 함께 맞추려 한다.",
      },
      {
        opaqueItemId: "CIT-004",
        orderIndex: 4,
        contextLabel:
          "이번 주 안에서 시간을 자유롭게 정할 수 있는 일이 생겼을 때",
        promptText: "언제 할지는 그날 상황을 보고 정한다.",
      },
      {
        opaqueItemId: "CIT-005",
        orderIndex: 5,
        contextLabel: "설명을 듣고 필요한 내용은 이해한 뒤",
        promptText: "거기서 멈추기보다, 이유나 배경을 더 알아본다.",
      },
    ]);
  });

  it("exposes participant fields only", () => {
    for (const item of m05ParticipantDefinition.items) {
      expect(Object.keys(item).sort()).toEqual([
        "contextLabel",
        "opaqueItemId",
        "orderIndex",
        "promptText",
      ]);
    }

    expect(JSON.stringify(m05ParticipantDefinition)).not.toMatch(
      /SM-RL|SM-EP|ER-WD|RO-RN|SM-OS|OE-IE|HIGH|LOW|probe|revision/i,
    );
  });
});
