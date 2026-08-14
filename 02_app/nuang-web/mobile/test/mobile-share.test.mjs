import assert from "node:assert/strict";
import test from "node:test";
import {
  createMobileReportShare,
  normalizePortableReportUrl,
} from "../src/mobile-share.js";

test("shares only a portable signed guest result through the native sheet", async () => {
  const calls = [];
  const shareReport = createMobileReportShare({
    share: { async share(options) { calls.push(options); } },
  });
  const url = "https://nuang.app/share/g1.payload.signature";

  assert.deepEqual(
    await shareReport({
      text: "내 사과 방식 결과를 확인해 보세요.",
      title: "뉴앙 사과 방식 결과",
      url,
    }),
    { ok: true, url },
  );
  assert.deepEqual(calls[0], {
    dialogTitle: "뉴앙 결과 공유",
    text: "내 사과 방식 결과를 확인해 보세요.",
    title: "뉴앙 사과 방식 결과",
    url,
  });
});

test("accepts an account public report but rejects local, external, and modified URLs", () => {
  assert.equal(
    normalizePortableReportUrl(
      "https://nuang.app/feed/profiles/profile-1/reports/topic_result-1",
    ),
    "https://nuang.app/feed/profiles/profile-1/reports/topic_result-1",
  );
  assert.equal(
    normalizePortableReportUrl("https://nuang.app/results/local/result-1"),
    null,
  );
  assert.equal(
    normalizePortableReportUrl("https://attacker.example/share/g1.payload.signature"),
    null,
  );
  assert.equal(
    normalizePortableReportUrl("https://nuang.app/share/g1.payload.signature?next=evil"),
    null,
  );
  assert.equal(
    normalizePortableReportUrl("https://nuang.app/share/g1.payload.signature#fragment"),
    null,
  );
});

test("does not invoke a platform share for unsafe copy or URL", async () => {
  let calls = 0;
  const shareReport = createMobileReportShare({
    share: { async share() { calls += 1; } },
  });

  assert.deepEqual(
    await shareReport({
      text: "결과",
      title: "뉴앙",
      url: "https://nuang.app/results/local/result-1",
    }),
    { error: "url_not_portable", ok: false },
  );
  assert.equal(calls, 0);
});
