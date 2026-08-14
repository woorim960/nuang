import { describe, expect, it } from "vitest";
import { buildResultSaveLoginHref } from "./result-continuity";

describe("result continuity login return", () => {
  it("keeps the exact local result route for the OAuth return", () => {
    expect(
      buildResultSaveLoginHref(
        "/assessments/topics/apology-style/result/topic_123?share=1",
      ),
    ).toBe(
      "/login?reason=result_save&next=%2Fassessments%2Ftopics%2Fapology-style%2Fresult%2Ftopic_123%3Fshare%3D1",
    );
  });
});
