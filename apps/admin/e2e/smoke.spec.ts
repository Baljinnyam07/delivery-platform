import { expect, test } from "@playwright/test";

// Local seed account (supabase/seed.sql) — local development only.
const ADMIN = { email: "admin@delivery.test", password: "password123" };
const COURIER_NAME = "Tuya";

test("admin: login → create → assign → record payment", async ({ page }) => {
  const customer = `E2E ${Date.now()}`;

  // 1. Login
  await page.goto("/login");
  await page.getByLabel("И-мэйл").fill(ADMIN.email);
  await page.getByLabel("Нууц үг").fill(ADMIN.password);
  await page.getByRole("button", { name: "Нэвтрэх" }).click();
  await expect(page.getByRole("heading", { name: "Хянах самбар" })).toBeVisible();

  // 2. Create a delivery
  await page.goto("/deliveries");
  await page.getByRole("button", { name: "Шинэ хүргэлт" }).click();
  const sheet = page.getByRole("dialog");
  await sheet.getByLabel("Нэр").fill(customer);
  await sheet.getByLabel("Утас").fill("9988 7766");
  await sheet.getByLabel("Хүргэх хаяг").fill("СБД, 1-р хороо, E2E байр");
  await sheet.getByLabel("Барааны дүн (₮)").fill("15000");
  await sheet.getByLabel("Хүргэлтийн үнэ (₮)").fill("3000");
  await expect(sheet.getByTestId("total-amount")).toHaveText("18,000₮");
  await sheet.getByRole("button", { name: "Үүсгэх" }).click();
  await expect(page.getByText("Хүргэлт үүслээ.")).toBeVisible();

  // 3. Open it and assign a courier
  // The list's own search box (the top bar has a global "Хайх" too).
  await page.getByPlaceholder("Код, нэр, утас, хаяг…").fill(customer);
  // The search is debounced into the URL; wait for it so its router.replace
  // cannot supersede the click navigation below.
  await expect(page).toHaveURL(/[?&]q=/);
  const row = page.getByRole("row").filter({ hasText: customer });
  await expect(row).toHaveCount(1);
  await row.getByRole("link").first().click();
  // No products → brand letter D, e.g. D261109-001
  await expect(page.getByRole("heading", { name: /D\d{6}-\d{3}/ })).toBeVisible();

  await page.getByRole("button", { name: "Хуваарилах" }).click();
  const dialog = page.getByRole("dialog");
  await dialog.getByRole("combobox", { name: "Курьер" }).click();
  await page.getByRole("option", { name: new RegExp(COURIER_NAME) }).click();
  await dialog.getByRole("button", { name: "Хуваарилах" }).click();
  await expect(page.getByText("Хүргэлт хуваарилагдлаа.")).toBeVisible();
  await expect(page.getByRole("heading").getByText("Хуваарилсан")).toBeVisible();

  // 4. Record the full payment (admin may record on any non-cancelled delivery)
  await page.getByRole("button", { name: "Төлбөр бүртгэх" }).click();
  await page.getByRole("dialog").getByRole("button", { name: "Бүртгэх" }).click();
  await expect(page.getByText("Төлбөр бүртгэгдлээ.")).toBeVisible();
  await expect(page.getByRole("heading").getByText("Төлөгдсөн")).toBeVisible();

  // 5. The audit timeline shows the whole story
  await expect(page.getByText(`${COURIER_NAME}-д хуваарилсан`)).toBeVisible();
  await expect(page.getByText(/Төлбөр бүртгэгдсэн · 18,000₮/)).toBeVisible();
});

test("courier accounts cannot use the admin app", async ({ page }) => {
  await page.goto("/login");
  await page.getByLabel("И-мэйл").fill("bat@delivery.test");
  await page.getByLabel("Нууц үг").fill(ADMIN.password);
  await page.getByRole("button", { name: "Нэвтрэх" }).click();
  await expect(page.getByText("Зөвхөн админ эрхтэй хэрэглэгч нэвтрэх боломжтой.")).toBeVisible();
});
