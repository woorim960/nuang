import crypto from "node:crypto";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { afterEach, describe, expect, it } from "vitest";

const projectRoot = process.cwd();
const generatedRoot = path.join(
  projectRoot,
  "docs",
  "research",
  "core-m04",
  "generated",
);
const validatorPath = path.join(
  projectRoot,
  "scripts",
  "check-core-expert-review-intake.mjs",
);
const analyzerPath = path.join(
  projectRoot,
  "scripts",
  "analyze-core-expert-review.mjs",
);
const temporaryRoots: string[] = [];

afterEach(() => {
  for (const root of temporaryRoots.splice(0)) {
    fs.rmSync(root, { force: true, recursive: true });
  }
});

describe("M04 expert review intake validator", () => {
  it("passes the generated packet preflight", () => {
    const result = runValidator();

    expect(result.status).toBe(0);
    expect(result.stdout).toContain('"stage1_packets_checked": 24');
    expect(result.stdout).toContain('"status": "PASS"');
  });

  it("accepts a valid, hash-locked partial Stage 1 intake", () => {
    const root = createIntakeRoot();
    updateRoster(root, (rows) => {
      findRosterRow(rows, "R01").status = "ACTIVE";
    });
    writeStage1Response(root, "R01", "W1");
    updateLockLog(root, (rows) => {
      const row = findLockRow(rows, "R01", "W1");
      row.stage1_response_sha256 = sha256File(
        path.join(root, "stage1", "R01_W1_stage1_response.csv"),
      );
      row.stage1_lock_verified_at = "2026-07-18T10:10:00+09:00";
    });

    const result = runValidator(root);

    expect(result.status).toBe(0);
    expect(result.stdout).toContain('"stage1_submissions_checked": 1');
    expect(result.stdout).toContain('"status": "PASS"');
  });

  it("rejects Stage 2 released before all three Stage 1 waves were locked", () => {
    const root = createIntakeRoot();
    updateRoster(root, (rows) => {
      findRosterRow(rows, "R01").status = "ACTIVE";
    });
    for (const waveId of ["W1", "W2", "W3"]) {
      writeStage1Response(root, "R01", waveId);
    }
    writeStage2Response(root, "R01", "W1");
    updateLockLog(root, (rows) => {
      for (const waveId of ["W1", "W2", "W3"]) {
        const row = findLockRow(rows, "R01", waveId);
        row.stage1_response_sha256 = sha256File(
          path.join(root, "stage1", `R01_${waveId}_stage1_response.csv`),
        );
        row.stage1_lock_verified_at = "2026-07-18T12:00:00+09:00";
        row.all_stage1_waves_locked_at = "2026-07-18T12:00:00+09:00";
      }
      const stage2Row = findLockRow(rows, "R01", "W1");
      stage2Row.stage2_response_sha256 = sha256File(
        path.join(root, "stage2", "R01_W1_stage2_response.csv"),
      );
      stage2Row.stage2_released_at = "2026-07-18T11:59:59+09:00";
      stage2Row.stage2_locked_at = "2026-07-18T12:30:00+09:00";
    });

    const result = runValidator(root);

    expect(result.status).toBe(1);
    expect(result.stderr).toContain(
      "Stage 2가 Stage 1 전체 잠금 전에 공개됐습니다",
    );
  });

  it("aggregates six complete reviewers without writing a final item decision", () => {
    const root = createIntakeRoot();
    const completeSlots = ["R01", "R02", "R03", "R04", "R05", "R06"];
    for (const reviewerSlot of completeSlots) {
      for (const waveId of ["W1", "W2", "W3"]) {
        writeStage1Response(root, reviewerSlot, waveId);
        writeStage2Response(root, reviewerSlot, waveId);
      }
    }
    updateRoster(root, (rows) => {
      completeSlots.forEach((reviewerSlot, index) => {
        const row = findRosterRow(rows, reviewerSlot);
        row.status = "COMPLETE";
        row.role_codes = `ROLE-${index + 1}`;
        row.psychometric_coverage = index < 2 ? "YES" : "NO";
        row.personality_coverage = index === 2 ? "YES" : "NO";
        row.korean_item_coverage = index === 3 ? "YES" : "NO";
        row.ux_2030_coverage = index === 4 ? "YES" : "NO";
        row.accessibility_or_bias_coverage = index === 5 ? "YES" : "NO";
        row.conflict_disclosure_status = "CLEARED";
        row.all_stage1_locked_at = "2026-07-18T12:00:00+09:00";
        row.all_stage2_locked_at = "2026-07-18T13:00:00+09:00";
      });
    });
    updateLockLog(root, (rows) => {
      for (const reviewerSlot of completeSlots) {
        for (const waveId of ["W1", "W2", "W3"]) {
          const row = findLockRow(rows, reviewerSlot, waveId);
          row.stage1_response_sha256 = sha256File(
            path.join(
              root,
              "stage1",
              `${reviewerSlot}_${waveId}_stage1_response.csv`,
            ),
          );
          row.stage1_lock_verified_at = "2026-07-18T11:59:00+09:00";
          row.all_stage1_waves_locked_at = "2026-07-18T12:00:00+09:00";
          row.stage2_response_sha256 = sha256File(
            path.join(
              root,
              "stage2",
              `${reviewerSlot}_${waveId}_stage2_response.csv`,
            ),
          );
          row.stage2_released_at = "2026-07-18T12:01:00+09:00";
          row.stage2_locked_at = "2026-07-18T13:00:00+09:00";
        }
      }
    });
    const outputRoot = path.join(root, "analysis-v1");

    const result = runAnalyzer(root, outputRoot);

    expect(result.status).toBe(0);
    const summary = JSON.parse(
      fs.readFileSync(path.join(outputRoot, "analysis_summary.json"), "utf8"),
    );
    expect(summary.reviewer_count).toBe(6);
    expect(summary.candidate_count).toBe(150);
    expect(summary.reviewer_role_gate_passed).toBe(true);
    expect(summary.stage1_response_rows).toBe(900);
    expect(summary.stage2_response_rows).toBe(900);
    expect(summary.total_stage_response_rows).toBe(1800);
    expect(summary).not.toHaveProperty("complete_response_rows");
    const metrics = fs.readFileSync(
      path.join(outputRoot, "item_metrics.csv"),
      "utf8",
    );
    expect(metrics).toContain("proposed_decision");
    expect(metrics).not.toContain("final_decision");
  });
});

function createIntakeRoot() {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "nuang-m04-intake-"));
  temporaryRoots.push(root);
  fs.mkdirSync(path.join(root, "stage1"));
  fs.mkdirSync(path.join(root, "stage2"));
  fs.copyFileSync(
    path.join(generatedRoot, "internal", "reviewer_roster_template.csv"),
    path.join(root, "reviewer_roster.csv"),
  );
  fs.copyFileSync(
    path.join(generatedRoot, "internal", "packet_lock_log.csv"),
    path.join(root, "packet_lock_log.csv"),
  );
  return root;
}

function writeStage1Response(
  root: string,
  reviewerSlot: string,
  waveId: string,
) {
  const sourcePath = path.join(
    generatedRoot,
    "reviewer",
    `${reviewerSlot}_${waveId}_stage1_blind.csv`,
  );
  const rows = parseCsv(fs.readFileSync(sourcePath, "utf8"));
  const header = rows[0];
  for (const row of rows.slice(1)) {
    setCell(header, row, "first_construct_mapping", "SE_RE");
    setCell(header, row, "second_construct_mapping", "NONE");
    setCell(header, row, "direction_guess", "HIGH");
    setCell(header, row, "clarity_rating_1_4", "3");
    setCell(header, row, "single_response_rating_1_4", "3");
    setCell(header, row, "universality_rating_1_4", "3");
    setCell(header, row, "scale_fit_rating_1_4", "3");
    setCell(header, row, "desirable_direction_guess", "SIMILAR");
    setCell(header, row, "risk_flags", "NONE");
    setCell(header, row, "fatal_risk_note", "NONE");
  }
  fs.writeFileSync(
    path.join(root, "stage1", `${reviewerSlot}_${waveId}_stage1_response.csv`),
    toCsv(rows),
  );
}

function writeStage2Response(
  root: string,
  reviewerSlot: string,
  waveId: string,
) {
  const sourcePath = path.join(
    generatedRoot,
    "internal",
    `DO_NOT_RELEASE_UNTIL_ALL_STAGE1_LOCKED_${reviewerSlot}_${waveId}_stage2_target_reveal.csv`,
  );
  const rows = parseCsv(fs.readFileSync(sourcePath, "utf8"));
  const header = rows[0];
  for (const row of rows.slice(1)) {
    setCell(header, row, "target_relevance_rating_1_4", "3");
    setCell(header, row, "key_direction_fit_rating_1_4", "3");
    setCell(header, row, "coverage_contribution_rating", "SOME");
    setCell(header, row, "adjacent_separation_rating_1_4", "3");
    setCell(header, row, "recommendation", "KEEP");
    setCell(header, row, "final_rationale", "독립 검토 근거");
  }
  fs.writeFileSync(
    path.join(root, "stage2", `${reviewerSlot}_${waveId}_stage2_response.csv`),
    toCsv(rows),
  );
}

function updateLockLog(
  root: string,
  update: (rows: Array<Record<string, string>>) => void,
) {
  const filePath = path.join(root, "packet_lock_log.csv");
  const rows = parseCsv(fs.readFileSync(filePath, "utf8"));
  const [header, ...dataRows] = rows;
  const objects = dataRows.map((row) =>
    Object.fromEntries(
      header.map((column, index) => [column, row[index] ?? ""]),
    ),
  );
  update(objects);
  fs.writeFileSync(
    filePath,
    toCsv([
      header,
      ...objects.map((row) => header.map((column) => row[column] ?? "")),
    ]),
  );
}

function updateRoster(
  root: string,
  update: (rows: Array<Record<string, string>>) => void,
) {
  const filePath = path.join(root, "reviewer_roster.csv");
  const rows = parseCsv(fs.readFileSync(filePath, "utf8"));
  const [header, ...dataRows] = rows;
  const objects = dataRows.map((row) =>
    Object.fromEntries(
      header.map((column, index) => [column, row[index] ?? ""]),
    ),
  );
  update(objects);
  fs.writeFileSync(
    filePath,
    toCsv([
      header,
      ...objects.map((row) => header.map((column) => row[column] ?? "")),
    ]),
  );
}

function findLockRow(
  rows: Array<Record<string, string>>,
  reviewerSlot: string,
  waveId: string,
) {
  const row = rows.find(
    (candidate) =>
      candidate.reviewer_slot === reviewerSlot && candidate.wave_id === waveId,
  );
  if (!row) throw new Error(`Missing lock row: ${reviewerSlot}-${waveId}`);
  return row;
}

function findRosterRow(
  rows: Array<Record<string, string>>,
  reviewerSlot: string,
) {
  const row = rows.find(
    (candidate) => candidate.reviewer_slot === reviewerSlot,
  );
  if (!row) throw new Error(`Missing roster row: ${reviewerSlot}`);
  return row;
}

function runValidator(intakeRoot?: string) {
  const args = [validatorPath];
  if (intakeRoot) args.push("--intake-root", intakeRoot);
  return spawnSync(process.execPath, args, {
    cwd: projectRoot,
    encoding: "utf8",
  });
}

function runAnalyzer(intakeRoot: string, outputRoot: string) {
  return spawnSync(
    process.execPath,
    [analyzerPath, "--intake-root", intakeRoot, "--output-root", outputRoot],
    { cwd: projectRoot, encoding: "utf8" },
  );
}

function setCell(
  header: string[],
  row: string[],
  column: string,
  value: string,
) {
  const index = header.indexOf(column);
  if (index < 0) throw new Error(`Missing column: ${column}`);
  row[index] = value;
}

function sha256File(filePath: string) {
  return crypto
    .createHash("sha256")
    .update(fs.readFileSync(filePath))
    .digest("hex");
}

function toCsv(rows: string[][]) {
  return `${rows
    .map((row) =>
      row
        .map((cell) =>
          /[",\n\r]/.test(cell) ? `"${cell.replaceAll('"', '""')}"` : cell,
        )
        .join(","),
    )
    .join("\n")}\n`;
}

function parseCsv(content: string) {
  const rows: string[][] = [];
  let row: string[] = [];
  let cell = "";
  let quoted = false;
  for (let index = 0; index < content.length; index += 1) {
    const character = content[index];
    if (quoted) {
      if (character === '"' && content[index + 1] === '"') {
        cell += '"';
        index += 1;
      } else if (character === '"') quoted = false;
      else cell += character;
    } else if (character === '"') quoted = true;
    else if (character === ",") {
      row.push(cell);
      cell = "";
    } else if (character === "\n") {
      row.push(cell.replace(/\r$/, ""));
      rows.push(row);
      row = [];
      cell = "";
    } else cell += character;
  }
  return rows.filter((candidate) => candidate.some((value) => value !== ""));
}
