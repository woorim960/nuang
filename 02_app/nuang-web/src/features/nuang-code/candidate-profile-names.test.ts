import { describe, expect, it } from "vitest";
import {
  candidateAxisCopy,
  candidateCodeSymbols,
  candidateProfileFamilies,
  candidateProfileNameCatalog,
  candidatePublicPairOrder,
  candidateSymbolLanguageReleaseId,
  candidateProfileNameReleaseId,
  candidateProfileDefinitions,
  candidateProfileNames,
  getCandidateProfileDefinition,
} from "@/features/nuang-code/candidate-profile-names";

describe("candidate profile name release", () => {
  it("defines one unique, meaningful name for all 32 candidate codes", () => {
    const codes = Object.keys(candidateProfileDefinitions);
    const names = Object.values(candidateProfileNames);
    const shortNames = Object.values(candidateProfileNameCatalog).map(
      (profile) => profile.shortName,
    );

    expect(codes).toHaveLength(32);
    expect(new Set(names)).toHaveLength(32);
    expect(new Set(shortNames)).toHaveLength(32);
    expect(candidateProfileNameReleaseId).toBe(
      "NUANG-PROFILE-NAME-CANDIDATE-3.0",
    );
    expect(names.every((name) => name.split(/\s+/).length <= 5)).toBe(true);
    expect(
      shortNames.every((name) => name.length >= 3 && name.length <= 6),
    ).toBe(true);
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

  it("groups the 32 names into four understandable families", () => {
    const familyCounts = Object.values(candidateProfileNameCatalog).reduce<
      Record<string, number>
    >((counts, profile) => {
      counts[profile.familyId] = (counts[profile.familyId] ?? 0) + 1;
      return counts;
    }, {});

    expect(Object.keys(candidateProfileFamilies)).toHaveLength(4);
    expect(Object.values(familyCounts)).toEqual([8, 8, 8, 8]);
    expect(
      Object.values(candidateProfileFamilies).every(
        (family) =>
          family.name.length >= 5 && family.description.endsWith("요."),
      ),
    ).toBe(true);
  });

  it("separates the approved role name, overview, and code tokens", () => {
    const profile = getCandidateProfileDefinition("ENAKQ");

    expect(profile).toMatchObject({
      displayName: "관계를 여는 선도자",
      shortName: "선도자",
      familyName: "관계 영감형",
      codeTokens: ["외향형", "가능성형", "마음형", "꾸준형", "빠른반응형"],
    });
    expect(profile?.overview).toHaveLength(3);
    expect(profile?.summary).toContain("새로운 관점을 더 찾아봐요");
    expect(profile?.summary).toContain("상대가 어떤 마음인지");
    expect(profile?.summary).toContain("빠르게 커질 수 있어요");
    expect(profile?.preciseName).toContain("걱정·감정이 빨리 커짐");
    expect(profile?.summary).not.toContain("마음 먼저");
    expect(profile?.displayName).not.toMatch(/천재|완벽|치유|우월/);
  });

  it("gives all ten symbols one memorable public type name", () => {
    expect(candidateSymbolLanguageReleaseId).toBe(
      "NUANG-CODE-SYMBOL-LANGUAGE-1.0",
    );
    expect(
      Object.fromEntries(
        candidateAxisCopy.flatMap((axis) =>
          Object.values(axis.directions).map((direction) => [
            direction.symbol,
            direction.publicTypeName,
          ]),
        ),
      ),
    ).toEqual({
      E: "외향형",
      I: "내향형",
      R: "현실형",
      N: "가능성형",
      G: "해결형",
      A: "마음형",
      K: "꾸준형",
      M: "상황형",
      C: "차분반응형",
      Q: "빠른반응형",
    });
    expect(
      new Set(
        candidateAxisCopy.flatMap((axis) =>
          Object.values(axis.directions).map(
            (direction) => direction.publicTypeName,
          ),
        ),
      ).size,
    ).toBe(10);
  });

  it("does not turn Q into prediction ability or guaranteed risk detection", () => {
    expect(candidateProfileNameCatalog.ERGKQ.displayName).toBe(
      "변수에 빠르게 답하는 해결사",
    );
    expect(candidateProfileNameCatalog.IRGKQ.displayName).toBe(
      "변수를 꼼꼼히 살피는 전략가",
    );
    expect(candidateProfileNameCatalog.IRGMQ.displayName).toBe(
      "변화의 원인을 좇는 추적자",
    );
    expect(candidateProfileNameCatalog.INGKQ).toMatchObject({
      shortName: "과학자",
      displayName: "가능성을 검증하는 과학자",
    });
    expect(Object.values(candidateProfileNameCatalog)).not.toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          displayName: expect.stringMatching(/예측|위험을 미리/),
        }),
      ]),
    );
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
