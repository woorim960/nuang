import { describe, expect, it } from "vitest";
import {
  adminActionLabel,
  adminTargetLabel,
} from "./admin-operation-copy";

describe("administrator operation copy", () => {
  it("explains safety and research actions in plain Korean", () => {
    expect(adminActionLabel("hide_reported_content")).toBe(
      "신고 콘텐츠 숨김",
    );
    expect(adminActionLabel("research_gate_c_item_revise")).toBe(
      "검사 문항 개선 결정",
    );
    expect(adminActionLabel("research_trait_map_section_keep")).toBe(
      "성향지도 문구 유지 결정",
    );
  });

  it("explains operation targets without exposing raw table names", () => {
    expect(adminTargetLabel("feed.content_report")).toBe("콘텐츠 신고");
    expect(
      adminTargetLabel("public.research_gate_c_item_decision"),
    ).toBe("검사 문항 운영 결정");
  });
});
