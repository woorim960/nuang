import { expect, test } from "@playwright/test";

test("home renders the NUANG mobile shell", async ({ page }) => {
  await page.goto("/home");
  await expect(page.getByRole("heading", { name: /안녕하세요/ })).toBeVisible();
  await expect(
    page.getByRole("navigation", { name: "하단 주요 메뉴" }),
  ).toBeVisible();
});

test("login keeps required consent before social auth entry", async ({
  page,
}) => {
  await page.goto("/login?next=/feed");

  await expect(
    page.getByRole("heading", { name: "뉴앙에 로그인" }),
  ).toBeVisible();

  const kakaoButton = page.getByRole("button", { name: "카카오로 계속하기" });
  const googleButton = page.getByRole("button", { name: "Google로 계속하기" });

  await expect(kakaoButton).toBeDisabled();
  await expect(googleButton).toBeDisabled();
  await expect(page.getByText("네이버")).toBeVisible();
  await expect(page.getByText("준비 중")).toBeVisible();

  await page.getByLabel("이용약관에 동의합니다").check();
  await page.getByLabel("필수 개인정보 처리에 동의합니다").check();

  await expect(kakaoButton).toBeEnabled();
  await expect(googleButton).toBeEnabled();
  await expect(
    page.getByText("원하는 계정으로 안전하게 연결할 수 있어요."),
  ).toBeVisible();
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
