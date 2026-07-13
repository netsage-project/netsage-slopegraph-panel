import * as path from 'path';
import { defineConfig, devices } from '@playwright/test';
import type { PluginOptions } from '@grafana/plugin-e2e';

/**
 * Playwright config for the plugin's end-to-end tests (@grafana/plugin-e2e).
 *
 * Tests run against a LIVE Grafana — by default the local instance at
 * http://localhost:3000. Override with env vars:
 *   GRAFANA_URL             — base URL of the Grafana to test (default http://localhost:3000)
 *   GRAFANA_ADMIN_USER      — admin username (default 'admin')
 *   GRAFANA_ADMIN_PASSWORD  — admin password (default 'admin')
 *
 * Run from the project root (`npm run e2e`). Artifact/session paths are anchored to the
 * working directory so they land under <project root>/playwright regardless of this
 * config living in the "unit tests" folder.
 *
 * The `auth` project logs in once and saves the session to playwright/.auth/admin.json;
 * the `slopegraph` project reuses that session so individual tests don't re-authenticate.
 */
const authFile = path.join(process.cwd(), 'playwright/.auth/admin.json');

export default defineConfig<PluginOptions>({
  // Specs live alongside this config in the "unit tests" folder.
  testDir: '.',
  // Never load the Jest unit tests (*.test.ts) — they use Jest globals, not Playwright.
  testIgnore: '**/*.test.ts',
  outputDir: path.join(process.cwd(), 'playwright/test-results'),
  reporter: [
    ['html', { outputFolder: path.join(process.cwd(), 'playwright/report'), open: 'never' }],
    ['list'],
  ],
  /* Fail the build on CI if test.only is left in the source. */
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,

  use: {
    baseURL: process.env.GRAFANA_URL ?? 'http://localhost:3000',
    // Credentials come from the plugin-e2e `user` option, which defaults to admin/admin
    // (override via GRAFANA_ADMIN_USER / GRAFANA_ADMIN_PASSWORD).
    trace: 'on-first-retry',
  },

  projects: [
    // Logs in to Grafana via the API and stores the session.
    {
      name: 'auth',
      testMatch: /.*auth\.setup\.ts/,
    },
    // The actual panel tests, reusing the stored session.
    {
      name: 'slopegraph',
      use: {
        ...devices['Desktop Chrome'],
        storageState: authFile,
      },
      dependencies: ['auth'],
      testMatch: /.*\.spec\.ts/,
    },
  ],
});
