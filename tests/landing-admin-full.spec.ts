import { test, expect, type Page, type BrowserContext, type Browser } from '@playwright/test';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const adminEmail = process.env.PATCTC_ADMIN_EMAIL || 'admin@patctc.vn';
const adminPassword = process.env.PATCTC_ADMIN_PASSWORD || 'p@tctcAdmin2024!';

// ============ SHARED BROWSER CONTEXT ============
// We share a single browser context across all UI tests to avoid
// repeated logins (which trigger Supabase auth rate limits).

let sharedContext: BrowserContext;
let sharedPage: Page;

test.describe('Landing Admin Tests', () => {
  test.describe.configure({ mode: 'serial' });

  test.beforeAll(async ({ browser }) => {
    sharedContext = await browser.newContext();
    sharedPage = await sharedContext.newPage();

    // Login once
    await sharedPage.goto('/');
    await sharedPage.waitForLoadState('networkidle');

    // Check if already logged in
    const userMenu = sharedPage.getByLabel('Mở menu người dùng');
    if (!(await userMenu.isVisible().catch(() => false))) {
      const loginHeading = sharedPage.getByRole('heading', { name: 'Chào mừng trở lại' });
      if (!(await loginHeading.isVisible().catch(() => false))) {
        const loginBtn = sharedPage.getByRole('button', { name: 'Đăng nhập', exact: true }).first();
        if (await loginBtn.isVisible().catch(() => false)) {
          await loginBtn.click();
        }
        await expect(loginHeading).toBeVisible({ timeout: 10000 });
      }

      await sharedPage.locator('input[type="email"]').fill(adminEmail);
      await sharedPage.locator('input[type="password"]').fill(adminPassword);
      await sharedPage.getByRole('button', { name: 'Đăng nhập', exact: true }).click();
      await expect(sharedPage.getByLabel('Mở menu người dùng')).toBeVisible({ timeout: 20000 });
    }

    console.log('✅ Logged in as admin (shared context)');
  });

  test.afterAll(async () => {
    await sharedContext?.close();
  });

  async function goToLandingEditor() {
    // Navigate to admin landing editor from any authenticated state
    await sharedPage.goto('/');
    await sharedPage.waitForLoadState('networkidle');

    // After reload, app reads token from localStorage and calls /auth/me.
    // If token is still valid, user menu appears. If not, we re-login.
    const userMenu = sharedPage.getByLabel('Mở menu người dùng');
    const isLoggedIn = await userMenu.isVisible().catch(() => false)
      || await userMenu.waitFor({ state: 'visible', timeout: 20000 }).then(() => true).catch(() => false);

    if (!isLoggedIn) {
      // Token expired or became invalid — re-login
      console.log('⚠️ Session expired after reload, re-logging in...');
      const loginHeading = sharedPage.getByRole('heading', { name: 'Chào mừng trở lại' });
      if (!(await loginHeading.isVisible().catch(() => false))) {
        const loginBtn = sharedPage.getByRole('button', { name: 'Đăng nhập', exact: true }).first();
        if (await loginBtn.isVisible().catch(() => false)) {
          await loginBtn.click();
        }
        await expect(loginHeading).toBeVisible({ timeout: 10000 });
      }
      await sharedPage.locator('input[type="email"]').fill(adminEmail);
      await sharedPage.locator('input[type="password"]').fill(adminPassword);
      await sharedPage.getByRole('button', { name: 'Đăng nhập', exact: true }).click();
      await expect(userMenu).toBeVisible({ timeout: 20000 });
    }

    await sharedPage.getByLabel('Mở menu người dùng').click();
    await sharedPage.getByRole('button', { name: 'Quản trị hệ thống' }).click();
    await sharedPage.getByRole('button', { name: 'Quản lý trang chủ' }).click();
  }

  // ============ TEST 1: Image upload to server (not base64) ============
  test('Upload image goes to server, returns URL path (not base64)', async () => {
    await goToLandingEditor();

    // Go to Hero Banner section
    await sharedPage.getByRole('button', { name: 'Hero Banner' }).click();
    await sharedPage.waitForTimeout(500);

    // Find the URL input for first slide
    const firstImageInput = sharedPage.locator('input[placeholder="https://..."]').first();
    await expect(firstImageInput).toBeVisible({ timeout: 5000 });
    const originalUrl = await firstImageInput.inputValue();

    // Create a small test image file (1x1 pixel JPEG)
    const testImagePath = path.join(__dirname, 'test-upload.jpg');
    const jpegBytes = Buffer.from(
      '/9j/4AAQSkZJRgABAQAAAQABAAD/2wBDAAMCAgMCAgMDAwMEAwMEBQgFBQQEBQoHBwYIDAoMCwsKCwsM' +
      'DhEQDQ4RDgsLEBYQERMUFRUVDA8XGBYUGBIUFRT/2wBDAQMEBAUEBQkFBQkUDQsNFBQUFBQUFBQUFBQU' +
      'FBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBT/wAARCAABAAEDASIAAhEBAxEB/8QAFAABAAAAAAAAAAAAAAAAAAAACf/EABQQAQAAAAAAAAAAAAAAAAAAAAD/xAAUAQEAAAAAAAAAAAAAAAAAAAAA/8QAFBEBAAAAAAAAAAAAAAAAAAAAAP/aAAwDAQACEQMRAD8AKwA//9k=',
      'base64'
    );
    fs.writeFileSync(testImagePath, jpegBytes);

    try {
      const uploadBtn = sharedPage.getByRole('button', { name: 'Tải ảnh lên' }).first();
      await expect(uploadBtn).toBeVisible();

      // Listen for filechooser before clicking
      const fileChooserPromise = sharedPage.waitForEvent('filechooser');
      await uploadBtn.click();
      const fileChooser = await fileChooserPromise;
      await fileChooser.setFiles(testImagePath);

      // Wait for upload to complete
      await expect(uploadBtn).not.toBeDisabled({ timeout: 15000 });
      await sharedPage.waitForTimeout(1000);

      // Check the input value — should be a server path, NOT base64
      const newUrl = await firstImageInput.inputValue();
      expect(newUrl).toMatch(/^\/uploads\/landing\/images\//);
      expect(newUrl).not.toContain('data:image');
      expect(newUrl).not.toContain('base64');

      console.log('✅ Image uploaded to server:', newUrl);
    } finally {
      // Restore original URL
      try { await firstImageInput.fill(originalUrl); } catch { /* */ }
      // Clean up test file
      try { if (fs.existsSync(testImagePath)) fs.unlinkSync(testImagePath); } catch { /* */ }
    }
  });

  // ============ TEST 2: Save config persists after reload ============
  test('Save config persists hero slide title after reload', async () => {
    const marker = `Test-Hero-${Date.now()}`;

    await goToLandingEditor();
    await sharedPage.getByRole('button', { name: 'Hero Banner' }).click();

    // Find first slide title input
    const titleInput = sharedPage.locator('label:has-text("Tiêu đề")').first().locator('xpath=following-sibling::input[1]');
    const originalTitle = await titleInput.inputValue();

    try {
      await titleInput.fill(marker);

      // Save
      const saveButton = sharedPage.getByRole('button', { name: 'Đồng bộ & Lưu Web' });
      await expect(saveButton).toBeEnabled();
      await saveButton.click();
      await expect(sharedPage.getByText('Đã lưu và đồng bộ thay đổi lên máy chủ thành công!')).toBeVisible({ timeout: 10000 });

      // Reload page (shared context preserves auth via localStorage)
      await sharedPage.reload();
      await sharedPage.waitForLoadState('networkidle');

      // After reload with localStorage auth, should still be logged in
      await expect(sharedPage.getByLabel('Mở menu người dùng')).toBeVisible({ timeout: 15000 });

      // Navigate back to editor
      await sharedPage.getByLabel('Mở menu người dùng').click();
      await sharedPage.getByRole('button', { name: 'Quản trị hệ thống' }).click();
      await sharedPage.getByRole('button', { name: 'Quản lý trang chủ' }).click();
      await sharedPage.getByRole('button', { name: 'Hero Banner' }).click();

      // Verify title persisted
      const afterReloadTitle = sharedPage.locator('label:has-text("Tiêu đề")').first().locator('xpath=following-sibling::input[1]');
      await expect(afterReloadTitle).toHaveValue(marker, { timeout: 10000 });
      console.log('✅ Config persisted after reload');
    } finally {
      try {
        const titleInputRestore = sharedPage.locator('label:has-text("Tiêu đề")').first().locator('xpath=following-sibling::input[1]');
        await titleInputRestore.fill(originalTitle);
        const saveButton = sharedPage.getByRole('button', { name: 'Đồng bộ & Lưu Web' });
        if (await saveButton.isEnabled()) {
          await saveButton.click();
          await expect(sharedPage.getByText('Đã lưu và đồng bộ thay đổi lên máy chủ thành công!')).toBeVisible({ timeout: 10000 });
        }
      } catch { /* cleanup best-effort */ }
    }
  });

  // ============ TEST 3: Preview renders LandingPage (not iframe) ============
  test('Preview button shows landing page content without iframe', async () => {
    await goToLandingEditor();

    // Click preview button
    const previewBtn = sharedPage.getByRole('button', { name: 'Xem trước' });
    await previewBtn.click();

    // Should see landing page preview area
    const previewContainer = sharedPage.locator('text=Xem trước trang chủ (Live Preview)');
    await expect(previewContainer).toBeVisible();

    // Verify no iframe exists (we render component directly)
    const iframes = sharedPage.locator('iframe[title="Landing Page Preview"]');
    await expect(iframes).toHaveCount(0);

    // Close preview
    await sharedPage.getByRole('button', { name: 'Đóng xem trước' }).click();
    await expect(previewContainer).not.toBeVisible();

    // Verify we're still logged in
    await expect(sharedPage.getByLabel('Mở menu người dùng')).toBeVisible();
    console.log('✅ Preview works without iframe, no auth issues');
  });

  // ============ TEST 4: Add new hero slide ============
  test('Add new hero slide and verify it appears', async () => {
    await goToLandingEditor();
    await sharedPage.getByRole('button', { name: 'Hero Banner' }).click();

    // Count existing slides
    const slidesBefore = await sharedPage.locator('text=/^Slide \\d+$/').count();

    // Add new slide
    await sharedPage.getByRole('button', { name: 'Thêm slide mới' }).click();

    // Verify new slide appeared
    const slidesAfter = await sharedPage.locator('text=/^Slide \\d+$/').count();
    expect(slidesAfter).toBe(slidesBefore + 1);

    // Verify new slide has default content
    const newSlideTitle = sharedPage.locator('input[value="Tiêu đề slide mới"]');
    await expect(newSlideTitle).toBeVisible();

    console.log(`✅ Added slide: ${slidesBefore} → ${slidesAfter}`);

    // Save, reload, verify persistence
    const saveButton = sharedPage.getByRole('button', { name: 'Đồng bộ & Lưu Web' });
    await saveButton.click();
    await expect(sharedPage.getByText('Đã lưu và đồng bộ thay đổi lên máy chủ thành công!')).toBeVisible({ timeout: 10000 });

    await sharedPage.reload();
    await sharedPage.waitForLoadState('networkidle');
    await expect(sharedPage.getByLabel('Mở menu người dùng')).toBeVisible({ timeout: 15000 });

    await sharedPage.getByLabel('Mở menu người dùng').click();
    await sharedPage.getByRole('button', { name: 'Quản trị hệ thống' }).click();
    await sharedPage.getByRole('button', { name: 'Quản lý trang chủ' }).click();
    await sharedPage.getByRole('button', { name: 'Hero Banner' }).click();

    const slidesAfterReload = await sharedPage.locator('text=/^Slide \\d+$/').count();
    expect(slidesAfterReload).toBe(slidesAfter);
    console.log('✅ New slide persisted after reload');

    // Cleanup: remove the added slide
    try {
      const lastSlideContainer = sharedPage.locator('.bg-white.rounded-xl.border').last();
      const trashBtn = lastSlideContainer.locator('button:has(svg)').first();
      if (await trashBtn.isVisible()) {
        await trashBtn.click();
        const saveBtn2 = sharedPage.getByRole('button', { name: 'Đồng bộ & Lưu Web' });
        if (await saveBtn2.isEnabled()) {
          await saveBtn2.click();
          await expect(sharedPage.getByText('Đã lưu và đồng bộ thay đổi lên máy chủ thành công!')).toBeVisible({ timeout: 10000 });
        }
      }
    } catch {
      console.log('⚠️ Cleanup of added slide failed (non-critical)');
    }
  });

  // ============ TEST 7: Footer text persists ============
  test('Footer text change persists after reload', async () => {
    const marker = `Footer-Test-${Date.now()}`;

    await goToLandingEditor();
    await sharedPage.getByRole('button', { name: 'Footer' }).click();

    const copyrightInput = sharedPage.locator('label:has-text("Copyright")').locator('xpath=following-sibling::input[1]');
    const originalValue = await copyrightInput.inputValue();

    try {
      await copyrightInput.fill(marker);

      const saveButton = sharedPage.getByRole('button', { name: 'Đồng bộ & Lưu Web' });
      await expect(saveButton).toBeEnabled();
      await saveButton.click();
      await expect(sharedPage.getByText('Đã lưu và đồng bộ thay đổi lên máy chủ thành công!')).toBeVisible({ timeout: 10000 });
      await expect(saveButton).toBeDisabled();

      // Reload and verify
      await sharedPage.reload();
      await sharedPage.waitForLoadState('networkidle');
      await expect(sharedPage.getByLabel('Mở menu người dùng')).toBeVisible({ timeout: 15000 });

      await sharedPage.getByLabel('Mở menu người dùng').click();
      await sharedPage.getByRole('button', { name: 'Quản trị hệ thống' }).click();
      await sharedPage.getByRole('button', { name: 'Quản lý trang chủ' }).click();
      await sharedPage.getByRole('button', { name: 'Footer' }).click();

      await expect(
        sharedPage.locator('label:has-text("Copyright")').locator('xpath=following-sibling::input[1]')
      ).toHaveValue(marker, { timeout: 10000 });
      console.log('✅ Footer text persisted');
    } finally {
      try {
        await sharedPage.locator('label:has-text("Copyright")').locator('xpath=following-sibling::input[1]').fill(originalValue);
        const saveButton = sharedPage.getByRole('button', { name: 'Đồng bộ & Lưu Web' });
        if (await saveButton.isEnabled()) {
          await saveButton.click();
          await expect(sharedPage.getByText('Đã lưu và đồng bộ thay đổi lên máy chủ thành công!')).toBeVisible({ timeout: 10000 });
        }
      } catch { /* cleanup best-effort */ }
    }
  });
});

// ============ API tests (no login required) ============
test('GET /api/landing returns config JSON', async ({ request }) => {
  const response = await request.get('/api/landing');
  expect(response.status()).toBe(200);

  const body = await response.json();
  expect(body).toHaveProperty('config');

  if (body.config !== null) {
    expect(body.config).toHaveProperty('heroSlides');
    expect(body.config).toHaveProperty('features');
    expect(body.config).toHaveProperty('contact');
    expect(Array.isArray(body.config.heroSlides)).toBe(true);
    console.log(`✅ GET /api/landing returned config with ${body.config.heroSlides.length} hero slides`);
  } else {
    console.log('⚠️ GET /api/landing returned null config (table may not exist)');
  }
});

test('POST /api/landing/image requires admin auth', async ({ request }) => {
  const response = await request.post('/api/landing/image', {
    multipart: {
      file: {
        name: 'test.jpg',
        mimeType: 'image/jpeg',
        buffer: Buffer.from([0xFF, 0xD8, 0xFF, 0xE0]),
      },
    },
  });
  expect(response.status()).toBe(401);
  console.log('✅ Image upload requires authentication');
});
