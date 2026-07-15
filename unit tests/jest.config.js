// force timezone to UTC to allow tests to work regardless of local timezone
// generally used by snapshots, but can affect specific tests
process.env.TZ = 'UTC';

const { grafanaESModules, nodeModulesToTransform } = require('../.config/jest/utils');
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
  // @grafana/data pulls in `marked` (ESM-only) plus its own nested, newer d3-* copies under
  // @grafana/data/node_modules (since our top-level d3 range doesn't satisfy its peer range).
  // The scaffolded grafanaESModules list predates @grafana/data 13, so extend it per
  // ./.config/README.md#esm-errors-with-jest. Whitelisting the @grafana/data path segment
  // itself (rather than each nested d3-* name) is required because nodeModulesToTransform's
  // regex only inspects the segment immediately after the outermost "node_modules/".
  transformIgnorePatterns: [nodeModulesToTransform([...grafanaESModules, 'marked', '@grafana/data'])],
};
