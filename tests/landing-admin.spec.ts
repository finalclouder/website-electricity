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
  await expect(page.getByLabel('Mở menu người dùng')).toBeVisible();
}

test('Admin landing save persists footer text after reload', async ({ page }) => {
  const marker = `Claude footer ${Date.now()}`;

  await loginAsAdmin(page);

  await page.getByLabel('Mở menu người dùng').click();
  await page.getByRole('button', { name: 'Quản trị hệ thống' }).click();
  await page.getByRole('button', { name: 'Quản lý trang chủ' }).click();
  await page.getByRole('button', { name: 'Footer' }).click();

  const developerInput = page.locator('label:has-text("Nhà phát triển")').locator('xpath=following-sibling::input[1]');
  const originalValue = await developerInput.inputValue();

  try {
    await developerInput.fill(marker);

    const saveButton = page.getByRole('button', { name: 'Đồng bộ & Lưu Web' });
    await expect(saveButton).toBeEnabled();
    await saveButton.click();

    await expect(page.getByText('Đã lưu và đồng bộ thay đổi lên máy chủ thành công!')).toBeVisible();
    await expect(saveButton).toBeDisabled();

    await page.reload();
    await page.getByRole('button', { name: 'Quản lý trang chủ' }).click();
    await page.getByRole('button', { name: 'Footer' }).click();

    await expect(page.locator('label:has-text("Nhà phát triển")').locator('xpath=following-sibling::input[1]')).toHaveValue(marker);
  } finally {
    await page.locator('label:has-text("Nhà phát triển")').locator('xpath=following-sibling::input[1]').fill(originalValue);
    const saveButton = page.getByRole('button', { name: 'Đồng bộ & Lưu Web' });
    if (await saveButton.isEnabled()) {
      await saveButton.click();
      await expect(page.getByText('Đã lưu và đồng bộ thay đổi lên máy chủ thành công!')).toBeVisible();
    }
  }
});
