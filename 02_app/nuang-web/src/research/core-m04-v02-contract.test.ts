import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const contractRoot = path.join(
  process.cwd(),
  "docs",
  "research",
  "core-m04",
  "v0.2",
);

function readRows(fileName: string) {
  return fs
    .readFileSync(path.join(contractRoot, fileName), "utf8")
    .trim()
    .split("\n");
}

describe("M04 v0.2 patch contract", () => {
  it("defines one neutral HIGH/LOW anchor for all 12 facets", () => {
    const [header, ...rows] = readRows("02_DIRECTION_ANCHORS.csv");

    expect(header).toBe(
      "protocol_version,construct_code,target_facet,high_anchor_ko,low_anchor_ko,non_value_guardrail",
    );
    expect(rows).toHaveLength(12);

    const parsed = rows.map((row) => row.split(","));
    expect(new Set(parsed.map((row) => row[1])).size).toBe(12);
    expect(new Set(parsed.map((row) => row[2])).size).toBe(12);
    expect(parsed.every((row) => row.length === 6 && row.every(Boolean))).toBe(
      true,
    );

    const roEc = parsed.find((row) => row[1] === "RO_EC");
    expect(roEc?.[3]).toBe("상대의 마음·안녕에 주의가 먼저 간다");
    expect(roEc?.[4]).toBe("원인·사건·해결할 부분에 주의가 먼저 간다");
  });

  it("records all critical and seam items without duplicate lineage rows", () => {
    const [, ...rows] = readRows("03_ITEM_REVISION_REGISTER.csv");
    const parsed = rows.map((row) => row.split(",", 9));

    expect(parsed).toHaveLength(9);
    expect(new Set(parsed.map((row) => row[1])).size).toBe(9);
    expect(parsed.filter((row) => row[3] === "YES")).toHaveLength(5);
    expect(parsed.filter((row) => row[4] === "YES")).toHaveLength(6);
    expect(parsed.filter((row) => row[5] === "MAJOR_REVISION")).toHaveLength(7);
    expect(parsed.filter((row) => row[5].startsWith("RETIRE_"))).toHaveLength(
      2,
    );

    for (const candidateId of [
      "SMOS-C12",
      "ERWD-C06",
      "ROEC-P03-B",
      "RORN-P05-B",
      "SMOS-C10",
      "OEIE-C09",
      "OEIE-C10",
      "SMOS-C08",
      "SMRL-C11",
    ]) {
      expect(parsed.some((row) => row[1] === candidateId)).toBe(true);
    }
  });

  it("keeps v0.1 intact and exposes a separate targeted packet manifest", () => {
    const v01Manifest = JSON.parse(
      fs.readFileSync(
        path.join(
          process.cwd(),
          "docs",
          "research",
          "core-m04",
          "generated",
          "internal",
          "packet_manifest.json",
        ),
        "utf8",
      ),
    );
    const validation = JSON.parse(
      fs.readFileSync(
        path.join(
          contractRoot,
          "generated",
          "internal",
          "validation_report.json",
        ),
        "utf8",
      ),
    );

    expect(v01Manifest.protocol_version).toBe("m04-core-expert-kit.v0.1");
    expect(validation).toMatchObject({
      protocol_version: "m04-core-expert-kit.v0.2-targeted",
      purpose: "TARGETED_REVISION_REVIEW_NOT_FULL_M04",
      direction_anchor_count: 12,
      review_candidate_count: 8,
      major_revision_count: 7,
      new_candidate_count: 1,
      retired_no_replacement_count: 1,
      critical_decision_coverage: 5,
      seam_decision_coverage: 6,
      reviewer_count: 8,
      unique_reviewer_order_count: 8,
      stage1_target_metadata_leak: false,
      status: "PASS",
    });
  });
});
