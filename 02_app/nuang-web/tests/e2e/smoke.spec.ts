import { expect, test } from "@playwright/test";

test("home renders the NUANG mobile shell", async ({ page }) => {
  await page.goto("/home");
  await expect(page.getByRole("heading", { name: /안녕하세요/ })).toBeVisible();
  await expect(page.getByRole("navigation", { name: "하단 주요 메뉴" })).toBeVisible();
});
