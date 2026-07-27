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
    .getByRole("button", { name: "4번째 빠른 코어 검사 안내 보기" })
    .click();
  await page
    .getByRole("button", { name: "빠른 코어 검사 시작하기" })
    .click();
  await expect(page).toHaveURL(/\/assessments\/nu-core-quick/);

  await page.goto("/home");
  await expect(
    page.getByRole("heading", { name: "홈", exact: true }),
  ).toBeVisible();
  await expect(
    page.getByRole("link", { name: "첫 성향 검사 시작하기" }),
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
  await page.getByLabel("만 14세 이상이에요").check();
  await page.getByLabel("이용약관에 동의해요").check();
  await page.getByLabel("개인정보 처리방침에 동의해요").check();

  await expect(kakaoButton).toBeEnabled();
  await expect(googleButton).toBeEnabled();
  await expect(
    page.getByText("필수 항목에 동의하면 로그인할 수 있어요."),
  ).not.toBeVisible();
});

test("auth callback redirects safely without an OAuth code", async ({
  page,
}) => {
  await page.goto("/auth/callback?next=/feed");

  await expect(page).toHaveURL(/\/feed\?auth=missing_code$/);
});

test("auth callback rejects protocol-relative next paths", async ({ page }) => {
  await page.goto("/auth/callback?next=//evil.example");

  await expect(page).toHaveURL(/\/my\?auth=missing_code$/);
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
