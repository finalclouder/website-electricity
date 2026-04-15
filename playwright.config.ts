import { defineConfig, devices } from '@playwright/test';

const port = process.env.PORT || '3000';
const baseURL = process.env.BASE_URL || `http://localhost:${port}`;
const webServerCommand = process.platform === 'win32'
  ? `set PORT=${port}&& npm run start`
  : `PORT=${port} npm run start`;

export default defineConfig({
  testDir: './tests',
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: 1,
  reporter: 'html',
  use: {
    baseURL,
    trace: 'on-first-retry',
  },
  projects: [
    {
      name: 'chromium',
      use: {
        ...devices['Desktop Chrome'],
        channel: process.platform === 'win32' ? 'chrome' : undefined,
      },
    },
  ],
  webServer: {
    command: webServerCommand,
    url: baseURL,
    reuseExistingServer: true,
    timeout: 120 * 1000,
  },
});