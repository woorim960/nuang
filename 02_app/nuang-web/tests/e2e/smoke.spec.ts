import { expect, test } from "@playwright/test";

test("a first visit completes onboarding before home becomes available", async ({
  page,
}) => {
  await page.goto("/home");
  await expect(page).toHaveURL(/\/onboarding$/);
  await expect(
    page.getByRole("region", {
      name: "좌우 방향키 또는 손가락으로 넘기는 서비스 가이드",
    }),
  ).toBeVisible();

  await page
    .getByRole("button", { name: "4번째 첫 검사 시작 안내 보기" })
    .click();
  await page.getByRole("button", { name: "내 뉴앙코드 알아보기" }).click();
  await expect(page).toHaveURL(/\/assessments\/nu-core-quick/);
  await expect(page.getByRole("radiogroup", { name: "응답 선택" })).toBeVisible(
    { timeout: 15_000 },
  );

  await page.goto("/home");
  await expect(
    page.getByRole("heading", {
      name: "나를 이해하고, 서로를 이해하는 성향 놀이터",
    }),
  ).toBeVisible();
  await expect(
    page.getByRole("link", { name: "1번부터 이어하기" }),
  ).toBeVisible();
  await expect(
    page.getByRole("navigation", { name: "하단 주요 메뉴" }),
  ).toBeVisible();
});

test("login keeps required consent before social auth entry", async ({
  page,
}) => {
  await page.goto("/login?next=/feed");

  await expect(
    page.getByRole("heading", { name: "로그인하고 뉴앙을 이어가요" }),
  ).toBeVisible();

  const kakaoButton = page.getByRole("button", { name: "카카오로 계속하기" });
  const googleButton = page.getByRole("button", { name: "Google로 계속하기" });

  await expect(kakaoButton).toBeDisabled();
  await expect(googleButton).toBeDisabled();
  await page.getByLabel("만 14세 이상이며, 사실대로 확인했어요").check();
  await page.getByLabel("이용약관에 동의해요").check();
  await page.getByLabel("개인정보 수집·이용에 동의해요").check();

  await expect(kakaoButton).toBeEnabled();
  await expect(googleButton).toBeEnabled();
  await expect(
    page.getByText("필수 항목에 동의하면 로그인할 수 있어요."),
  ).not.toBeVisible();
});

test("auth callback fails closed without a signed login intent", async ({
  page,
}) => {
  await page.goto("/auth/callback?next=/feed");

  await expect(page).toHaveURL(/\/login\?next=%2Fmy&auth=intent_missing$/);
  await expect(
    page.getByText("로그인 확인 정보가 없어 다시 시작이 필요해요."),
  ).toBeVisible();
});

test("auth callback rejects protocol-relative next paths", async ({ page }) => {
  await page.goto("/auth/callback?next=//evil.example");

  await expect(page).toHaveURL(/\/login\?next=%2Fmy&auth=intent_missing$/);
});

test("legacy together routes redirect to current product surfaces", async ({
  page,
}) => {
  await page.goto("/together");
  await expect(page).toHaveURL(/\/feed$/);

  await page.goto("/together/comparison-preview");
  await expect(page).toHaveURL(/\/my\/reports$/);

  await page.goto("/together/comparison-unavailable/stale");
  await expect(page).toHaveURL(/\/my\/reports$/);

  await page.goto("/together/comparison/33333333-3333-4333-8333-333333333333");
  await expect(page).toHaveURL(
    /\/reports\/comparison\/33333333-3333-4333-8333-333333333333$/,
  );
});

test("public and login-gated beta surfaces render without runtime or horizontal-overflow errors", async ({
  page,
}) => {
  const pageErrors: string[] = [];
  page.on("pageerror", (error) => pageErrors.push(error.message));
  await page.addInitScript(() => {
    window.localStorage.setItem(
      "nuang:onboarding:experience",
      JSON.stringify({
        completedAt: "2026-08-05T00:00:00.000Z",
        firstSeenAt: "2026-08-05T00:00:00.000Z",
        lastSeenGuideVersion: 3,
      }),
    );
  });

  const surfaces = [
    { path: "/home", text: "홈" },
    { path: "/feed", text: "커뮤니티" },
    { path: "/map", text: "성향지도" },
    { path: "/my", text: "마이" },
    { path: "/help", text: "도움받기" },
    { path: "/advertise", text: "서로를 이해하는 브랜드 경험" },
    {
      path: "/research",
      text: "검사 질문 리뷰는 로그인 후 참여할 수 있어요",
    },
    { path: "/policies/terms", text: "이용약관" },
    { path: "/policies/privacy", text: "개인정보 처리방침" },
    {
      path: "/assessments/together/balance-game",
      text: "밸런스 게임",
    },
    {
      path: "/assessments/together/balance-game/setup?pack=mixed-taste",
      text: "방 설정",
    },
  ] as const;

  for (const surface of surfaces) {
    const response = await page.goto(surface.path);
    expect(response?.status(), surface.path).toBeLessThan(400);
    await expect(page.locator("main").first()).toBeVisible();
    await expect(
      page.getByText(surface.text, { exact: false }).first(),
    ).toBeVisible();
    const hasHorizontalOverflow = await page.evaluate(
      () => document.documentElement.scrollWidth > window.innerWidth + 1,
    );
    expect(hasHorizontalOverflow, surface.path).toBe(false);
  }

  expect(pageErrors).toEqual([]);
});
