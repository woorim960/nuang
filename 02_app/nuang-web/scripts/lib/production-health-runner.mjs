import { spawn } from "node:child_process";
import { resolve } from "node:path";
import { parseProductionHealthReport } from "./production-health-email.mjs";

export const DEFAULT_MONITOR_CHILD_TIMEOUT_MS = 180_000;
export const DEFAULT_MONITOR_OUTPUT_LIMIT_BYTES = 1_000_000;
export const DEFAULT_MONITOR_TERMINATION_GRACE_MS = 5_000;

export function runProductionHealthMonitor({
  clearTimeoutImpl = clearTimeout,
  cwd = process.cwd(),
  env = process.env,
  execPath = process.execPath,
  outputLimitBytes = DEFAULT_MONITOR_OUTPUT_LIMIT_BYTES,
  scriptPath = resolve("scripts/check-production-health.mjs"),
  setTimeoutImpl = setTimeout,
  spawnImpl = spawn,
  terminationGraceMs = DEFAULT_MONITOR_TERMINATION_GRACE_MS,
  timeoutMs = DEFAULT_MONITOR_CHILD_TIMEOUT_MS,
} = {}) {
  assertPositiveInteger(timeoutMs, "monitor_timeout_invalid");
  assertPositiveInteger(outputLimitBytes, "monitor_output_limit_invalid");
  assertPositiveInteger(terminationGraceMs, "monitor_grace_invalid");

  return new Promise((resolveRun) => {
    let child;
    try {
      child = spawnImpl(execPath, [scriptPath, "--json"], {
        cwd,
        env,
        stdio: ["ignore", "pipe", "pipe"],
      });
    } catch (error) {
      resolveRun({ errorCode: safeProcessErrorCode(error), report: null });
      return;
    }

    let forceKillTimer = null;
    let settled = false;
    let stdout = "";
    let stdoutBytes = 0;
    let terminationReason = null;

    const timeoutTimer = setTimeoutImpl(() => {
      terminateChild("monitor_timeout");
    }, timeoutMs);

    function cleanup() {
      clearTimeoutImpl(timeoutTimer);
      if (forceKillTimer !== null) clearTimeoutImpl(forceKillTimer);
    }

    function finish(result) {
      if (settled) return;
      settled = true;
      cleanup();
      resolveRun(result);
    }

    function terminateChild(reason) {
      if (settled || terminationReason) return;
      terminationReason = reason;
      child.kill("SIGTERM");
      forceKillTimer = setTimeoutImpl(() => {
        if (!settled) child.kill("SIGKILL");
      }, terminationGraceMs);
    }

    child.stdout.on("data", (chunk) => {
      const bytes = Buffer.isBuffer(chunk)
        ? chunk.length
        : Buffer.byteLength(String(chunk));
      stdoutBytes += bytes;
      if (stdoutBytes > outputLimitBytes) {
        terminateChild("monitor_output_too_large");
        return;
      }
      stdout += chunk.toString("utf8");
    });
    child.stderr.resume();
    child.on("error", (error) => {
      finish({ errorCode: safeProcessErrorCode(error), report: null });
    });
    child.on("close", (code, signal) => {
      const report = parseMonitorReport(stdout);
      finish({
        errorCode: report
          ? null
          : (terminationReason ??
            (signal
              ? `monitor_signal_${safeSignal(signal)}`
              : `monitor_exit_${safeExitCode(code)}`)),
        report,
      });
    });
  });
}

function parseMonitorReport(output) {
  try {
    return parseProductionHealthReport(JSON.parse(output.trim()));
  } catch {
    return null;
  }
}

function safeProcessErrorCode(error) {
  if (typeof error?.code === "string" && /^[A-Za-z0-9_]+$/.test(error.code)) {
    return `monitor_spawn_${error.code}`;
  }
  return "monitor_spawn_unavailable";
}

function safeSignal(value) {
  return /^[A-Z0-9]+$/.test(String(value)) ? value : "unknown";
}

function safeExitCode(value) {
  return Number.isInteger(value) ? value : "unknown";
}

function assertPositiveInteger(value, code) {
  if (!Number.isSafeInteger(value) || value <= 0) throw new Error(code);
}
