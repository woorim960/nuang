import { describe, expect, it } from "vitest";
import { enakqCustomerGuideV2 } from "@/features/nuang-code/enakq-customer-guide-v2";
import {
  traitMapCustomerGuideChapterSlots,
  traitMapCustomerGuideSchema,
} from "@/features/nuang-code/trait-map-customer-guide-contract";

describe("traitMapCustomerGuideSchema", () => {
  it("accepts the published ENAKQ customer guide", () => {
    const result = traitMapCustomerGuideSchema.safeParse(enakqCustomerGuideV2);

    expect(result.success).toBe(true);
    expect(
      enakqCustomerGuideV2.chapters.map((chapter) => chapter.slot),
    ).toEqual(traitMapCustomerGuideChapterSlots);
  });

  it("rejects a guide when a relationship chapter is replaced", () => {
    const guide = structuredClone(enakqCustomerGuideV2);
    guide.chapters[9].slot = "daily_life";

    const result = traitMapCustomerGuideSchema.safeParse(guide);

    expect(result.success).toBe(false);
    expect(
      result.error?.issues.some(
        (issue) => issue.path.join(".") === "chapters.9.slot",
      ),
    ).toBe(true);
  });

  it("rejects stale character counts and insufficient evidence", () => {
    const guide = structuredClone(enakqCustomerGuideV2);
    guide.totalCharacters += 1;
    guide.chapters[14].references = guide.chapters[14].references?.slice(0, 3);

    const result = traitMapCustomerGuideSchema.safeParse(guide);

    expect(result.success).toBe(false);
    expect(result.error?.issues.map((issue) => issue.path.join("."))).toEqual(
      expect.arrayContaining(["totalCharacters", "chapters.14.references"]),
    );
  });

  it("rejects repeated evasive language and internal research wording", () => {
    const guide = structuredClone(enakqCustomerGuideV2);
    guide.chapters[0].sections[0].paragraphs[0] =
      "이 코드만으로는 단정할 수 없고, 알 수 없으며, 상황에 따라 다를 수 있어요. 내부 검토가 더 필요하다는 표현을 고객에게 그대로 보여주는 문장입니다.";

    const result = traitMapCustomerGuideSchema.safeParse(guide);
    const messages = result.error?.issues.map((issue) => issue.message) ?? [];

    expect(result.success).toBe(false);
    expect(messages.some((message) => message.includes("내부 연구 표현"))).toBe(
      true,
    );
    expect(messages.some((message) => message.includes("회피성 표현"))).toBe(
      true,
    );
  });
});
