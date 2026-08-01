import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import {
  AssessmentReportRichText,
  parseLegacyReportBody,
} from "@/features/assessment/AssessmentReportRichText";

describe("AssessmentReportRichText", () => {
  it("turns consecutive numbered lines into an accessible ordered list", () => {
    const blocks = parseLegacyReportBody(
      "1. 첫 번째로 할 일\n2. 두 번째로 할 일\n3. 세 번째로 할 일",
    );

    render(
      <AssessmentReportRichText
        section={{
          blocks,
          body: "",
        }}
      />,
    );

    expect(screen.getByRole("list")).toBeInTheDocument();
    expect(screen.getAllByRole("listitem")).toHaveLength(3);
    expect(screen.getByText("첫 번째로 할 일")).toBeInTheDocument();
  });

  it("shows relationship-specific guidance as separate labeled rows", () => {
    render(
      <AssessmentReportRichText
        section={{
          blocks: [
            {
              items: [
                { label: "가족", text: "가족에게 맞는 안내" },
                { label: "친구", text: "친구에게 맞는 안내" },
                { label: "연인", text: "연인에게 맞는 안내" },
              ],
              kind: "labeled_list",
            },
          ],
          body: "",
        }}
      />,
    );

    expect(screen.getByText("가족")).toBeInTheDocument();
    expect(screen.getByText("친구에게 맞는 안내")).toBeInTheDocument();
    expect(screen.getByText("연인")).toBeInTheDocument();
  });
});
