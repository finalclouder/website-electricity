import { test, expect } from '@playwright/test';

test('Luồng Đăng ký user mới và kiểm duyệt', async ({ page }) => {
  const timestamp = Date.now();
  const name = `Test User ${timestamp}`;
  const email = `testuser_${timestamp}@example.com`;
  const password = 'Password123!';

  await page.goto('/');

  await page.getByRole('button', { name: 'Đăng ký', exact: true }).first().click();
  await expect(page.getByRole('heading', { name: 'Tạo tài khoản' })).toBeVisible();

  await page.getByPlaceholder('Nguyễn Văn A').fill(name);
  await page.locator('input[type="email"]').fill(email);
  await page.locator('input[type="password"]').fill(password);

  const dialogPromise = page.waitForEvent('dialog');
  await page.getByRole('button', { name: 'Tạo tài khoản' }).click();

  const dialog = await dialogPromise;
  expect(dialog.message()).toMatch(/Đăng ký thành công! Vui lòng chờ (Admin|quản trị viên) phê duyệt/);
  await dialog.accept();

  await expect(page.getByText('Chào mừng trở lại')).toBeVisible();

  await page.locator('input[type="email"]').fill(email);
  await page.locator('input[type="password"]').fill(password);
  await page.getByRole('button', { name: 'Đăng nhập' }).click();

  await expect(page.getByText('Tài khoản của bạn đang chờ Admin duyệt')).toBeVisible();
});
