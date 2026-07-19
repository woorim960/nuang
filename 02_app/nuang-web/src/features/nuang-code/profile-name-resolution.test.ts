import { describe, expect, it } from "vitest";
import {
  getSupportedNuangProfileName,
  isSupportedNuangCode,
} from "@/features/nuang-code/profile-name-resolution";

describe("community Nuang profile name resolution", () => {
  it("recognizes the current 32-code system", () => {
    expect(isSupportedNuangCode("ENAKQ")).toBe(true);
    expect(getSupportedNuangProfileName("ENAKQ")).toBe("관계를 여는 지휘자");
  });

  it("keeps historical shared codes readable during migration", () => {
    expect(isSupportedNuangCode("TVOAE")).toBe(true);
    expect(getSupportedNuangProfileName("TVOAE")).toBe("불꽃의 온기 탐험가");
  });

  it("rejects malformed codes", () => {
    expect(isSupportedNuangCode("UNKNOWN")).toBe(false);
    expect(getSupportedNuangProfileName(null)).toBeNull();
  });
});
