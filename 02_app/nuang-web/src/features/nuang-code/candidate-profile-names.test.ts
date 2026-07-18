import { describe, expect, it } from "vitest";
import {
  candidateAxisCopy,
  candidateCodeSymbols,
  candidatePublicPairOrder,
  candidateProfileNameReleaseId,
  candidateProfileDefinitions,
  candidateProfileNames,
  getCandidateProfileDefinition,
} from "@/features/nuang-code/candidate-profile-names";

describe("candidate profile name release", () => {
  it("defines one unique, meaningful name for all 32 candidate codes", () => {
    const codes = Object.keys(candidateProfileDefinitions);
    const names = Object.values(candidateProfileNames);

    expect(codes).toHaveLength(32);
    expect(new Set(names)).toHaveLength(32);
    expect(candidateProfileNameReleaseId).toBe(
      "NUANG-PROFILE-NAME-CANDIDATE-1.1",
    );
    expect(names.every((name) => name.split(/\s+/).length <= 4)).toBe(true);
    expect(
      codes.every((code) =>
        code
          .split("")
          .every((symbol, index) =>
            candidateCodeSymbols[index].includes(symbol as never),
          ),
      ),
    ).toBe(true);
  });

  it("separates the approved role name, overview, and code tokens", () => {
    const profile = getCandidateProfileDefinition("ENAKQ");

    expect(profile).toMatchObject({
      displayName: "관계를 여는 지휘자",
      codeTokens: [
        "함께",
        "탐색",
        "상대 마음 살피기",
        "꾸준",
        "빠른 걱정·감정 반응",
      ],
    });
    expect(profile?.overview).toHaveLength(3);
    expect(profile?.summary).toContain("새로운 관점을 더 찾아봐요");
    expect(profile?.summary).toContain("상대가 어떤 마음인지");
    expect(profile?.summary).toContain("빠르게 커질 수 있어요");
    expect(profile?.preciseName).toContain("걱정·감정이 빨리 커짐");
    expect(profile?.summary).not.toContain("마음 먼저");
    expect(profile?.displayName).not.toMatch(/천재|완벽|치유|우월/);
  });

  it("ships a value-neutral guardrail for every axis", () => {
    expect(candidateAxisCopy).toHaveLength(5);
    expect(
      candidateAxisCopy.every(
        (axis) =>
          axis.guardrail.length > 20 && !axis.guardrail.includes("우수"),
      ),
    ).toBe(true);
    expect(candidateAxisCopy[4].guardrail).toContain("정신건강");
  });

  it("keeps the public pair order stable across every result", () => {
    expect(candidatePublicPairOrder).toEqual([
      ["E", "I"],
      ["R", "N"],
      ["G", "A"],
      ["K", "M"],
      ["C", "Q"],
    ]);
  });
});
