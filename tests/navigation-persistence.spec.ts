import { test, expect } from '@playwright/test';

const adminEmail = process.env.PATCTC_ADMIN_EMAIL || 'admin@patctc.vn';
const adminPassword = process.env.PATCTC_ADMIN_PASSWORD || 'p@tctcAdmin2024!';

async function loginAsAdmin(page: import('@playwright/test').Page) {
  await page.goto('/');

  const loginHeading = page.getByRole('heading', { name: 'Chào mừng trở lại' });
  if (!(await loginHeading.isVisible().catch(() => false))) {
    await page.getByRole('button', { name: 'Đăng nhập', exact: true }).first().click();
    await expect(loginHeading).toBeVisible();
  }

  await page.locator('input[type="email"]').fill(adminEmail);
  await page.locator('input[type="password"]').fill(adminPassword);
  await page.getByRole('button', { name: 'Đăng nhập', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Cộng đồng', exact: true })).toBeVisible();
}

test('Reload keeps the current app tab', async ({ page }) => {
  await loginAsAdmin(page);

  await page.getByRole('button', { name: 'Cộng đồng', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Đăng bài', exact: true })).toBeVisible();
  await page.reload();
  await expect(page.getByRole('button', { name: 'Đăng bài', exact: true })).toBeVisible();

  await page.getByRole('button', { name: 'Tài liệu đã lưu', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Tài liệu đã lưu' })).toBeVisible();
  await page.reload();
  await expect(page.getByRole('heading', { name: 'Tài liệu đã lưu' })).toBeVisible();

  await page.getByLabel('Mở menu người dùng').click();
  await page.getByRole('button', { name: 'Hồ sơ cá nhân' }).click();
  await expect(page.getByRole('button', { name: 'Chỉnh sửa' })).toBeVisible();
  await page.reload();
  await expect(page.getByRole('button', { name: 'Chỉnh sửa' })).toBeVisible();
});
