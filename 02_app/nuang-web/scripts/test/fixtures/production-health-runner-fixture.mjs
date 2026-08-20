const mode = process.env.NUANG_MONITOR_RUNNER_FIXTURE_MODE ?? "valid";

if (mode === "valid") {
  console.log(
    JSON.stringify({
      checkedAt: "2026-08-21T00:00:00.000Z",
      checks: [
        {
          detail: "http=200 ttfb=10ms transfer=5ms total=15ms bytes=600",
          id: "http:landing",
          status: "pass",
          totalMs: 15,
        },
      ],
      counts: { fail: 0, pass: 1, warn: 0 },
      status: "pass",
    }),
  );
} else if (mode === "slow") {
  setTimeout(() => undefined, 10_000);
} else if (mode === "large") {
  process.stdout.write("x".repeat(8_192));
  setTimeout(() => undefined, 10_000);
} else if (mode === "signal") {
  process.kill(process.pid, "SIGTERM");
} else if (mode === "ignore-term") {
  process.on("SIGTERM", () => undefined);
  setTimeout(() => undefined, 10_000);
} else {
  process.exitCode = 7;
}
