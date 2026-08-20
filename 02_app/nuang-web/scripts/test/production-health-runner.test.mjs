import assert from "node:assert/strict";
import test from "node:test";
import { fileURLToPath } from "node:url";
import {
  DEFAULT_MONITOR_CHILD_TIMEOUT_MS,
  runProductionHealthMonitor,
} from "../lib/production-health-runner.mjs";

const fixturePath = fileURLToPath(
  new URL("./fixtures/production-health-runner-fixture.mjs", import.meta.url),
);

test("runner accepts a valid bounded monitor report", async () => {
  const result = await runFixture("valid");

  assert.equal(result.errorCode, null);
  assert.equal(result.report?.status, "pass");
});

test("runner reports its own deadline instead of a misleading SIGTERM", async () => {
  const result = await runFixture("slow", {
    terminationGraceMs: 25,
    timeoutMs: 25,
  });

  assert.equal(result.report, null);
  assert.equal(result.errorCode, "monitor_timeout");
});

test("runner reports output overflow separately and terminates the child", async () => {
  const result = await runFixture("large", {
    outputLimitBytes: 128,
    terminationGraceMs: 25,
    timeoutMs: 1_000,
  });

  assert.equal(result.report, null);
  assert.equal(result.errorCode, "monitor_output_too_large");
});

test("runner preserves an external child signal as a distinct error", async () => {
  const result = await runFixture("signal");

  assert.equal(result.report, null);
  assert.equal(result.errorCode, "monitor_signal_SIGTERM");
});

test("runner force-terminates a child that ignores the graceful deadline", async () => {
  const result = await runFixture("ignore-term", {
    terminationGraceMs: 25,
    timeoutMs: 25,
  });

  assert.equal(result.report, null);
  assert.equal(result.errorCode, "monitor_timeout");
});

test("default parent budget covers the documented monitor stage budget", () => {
  assert.equal(DEFAULT_MONITOR_CHILD_TIMEOUT_MS, 180_000);
});

function runFixture(mode, overrides = {}) {
  return runProductionHealthMonitor({
    env: {
      ...process.env,
      NUANG_MONITOR_RUNNER_FIXTURE_MODE: mode,
    },
    scriptPath: fixturePath,
    ...overrides,
  });
}
