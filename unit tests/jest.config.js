// force timezone to UTC to allow tests to work regardless of local timezone
// generally used by snapshots, but can affect specific tests
process.env.TZ = 'UTC';

const base = require('../.config/jest.config');

module.exports = {
  // Jest configuration provided by Grafana scaffolding
  ...base,
  // This config lives in "unit tests/" but rootDir stays the project root so the managed
  // config's <rootDir>/src paths (modulePaths, testMatch, transforms) keep resolving.
  rootDir: '..',
  // jest-setup.js moved into this folder, so repoint setupFilesAfterEnv to it.
  setupFilesAfterEnv: ['<rootDir>/unit tests/jest-setup.js'],
  // Only pick up *.test.* files here. The Playwright e2e files (*.spec.ts / *.setup.ts)
  // live in this same folder and must NOT be run by Jest.
  testMatch: [...base.testMatch, '<rootDir>/unit tests/**/*.test.{js,jsx,ts,tsx}'],
};
