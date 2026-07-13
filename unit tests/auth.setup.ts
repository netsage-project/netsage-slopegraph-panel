import { test as setup } from '@grafana/plugin-e2e';

/**
 * Authentication setup — runs once before the test project (see playwright.config.ts).
 * The `login` fixture POSTs to Grafana's /login endpoint using the credentials from
 * httpCredentials (GRAFANA_USER / GRAFANA_PASSWORD) and saves the resulting session to
 * playwright/.auth/user.json. Every test then reuses that session instead of logging in
 * again, which keeps the suite fast and avoids hammering the login form.
 */
setup('authenticate', async ({ login }) => {
  await login();
});
