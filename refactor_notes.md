# Refactor Notes — netsage-slopegraph-panel

## Overview

Bug fixes, type safety, dead-code removal, and efficiency work on the slope graph panel — **no change to visual output, no new features.** The plugin was scaffolded on Grafana 9.3 tooling but its managed `.config/` had moved to Grafana 13 standards, leaving broken builds and latent bugs. Detailed reasoning lives in inline code comments; this file is the high-level record.

## Build / tooling

- **`package.json`** — `glob` `^10 → ^11` (the managed webpack entry scanner needs v11 absolute-path globs; without it `module.js` was never emitted), `copy-webpack-plugin` `^11 → ^14`, `fork-ts-checker-webpack-plugin` `^7 → ^9`, `css-loader` `^6 → ^7`, `eslint-webpack-plugin` `^5 → ^4` (v5 needs ESLint 9; project is on 8), removed unused `emotion`.
- **`tsconfig.json`** — added `"ignoreDeprecations": "6.0"` to silence the TS6 `baseUrl` deprecation (JSON can't hold a comment, hence this note).
- **`src/declarations.d.ts`** *(new)* — declares `*.css` so the side-effect CSS import type-checks under TS6.

## Code changes by file

- **`src/types.ts`** — added `ParsedDataMeta`, `ParsedDataCoord`, `ParsedDataRow`, `ParsedDataResult` (reusing Grafana's `DisplayValue`), and `TooltipState` (typed hover payload D3 → React).
- **`src/parseData.js` → `.ts`** — converted to TypeScript; reads fields from `series.fields` (not the private `DataFrameView.data`); guards a missing numeric field and a missing `display` processor; `for...in` loops → `forEach` + `findIndex`; `var`→`let`/`const`; strict equality; removed unused vars (`thisValues`, `maxValue`, `minValue`).
- **`src/components/RenderGraph.js`** — fixed `font-size` (string literal `'fontSize'` → variable) and `d.x === 0`; removed dead code (`alpha`, unused `w` scale, stray `value`, invalid `.attr('margin', 10)`); `truncateLabel` and the line generator created once instead of per-render/per-path; template-literal transforms; extracted `drawAxis`/`drawHeader` helpers; tooltip handed off to React via an `onHover` callback (no more D3 `div` on `document.body`); cursor set on the base path instead of a never-removed `path-hover` class.
- **`src/components/Canvas.tsx`** — typed `CanvasProps`; `useEffect` dependency array (drops redundant redraws); tooltip rendered with Grafana's `VizTooltipContainer` from `useState`/`useCallback`; cleanup clears the tooltip on redraw/unmount.
- **`src/SlopeGraphPanel.tsx`** — relative imports; `parseData` wrapped in `useMemo([data, options.numLines])` so resizes don't re-parse; `options` passed directly (no per-render spread).
- **`src/module.ts`** — dropped the `: any` return annotation on `buildStandardOptions`.
- **`unit tests/parseData.test.ts`** *(new, replaces the placeholder stub)* — 18-test suite for the parsing core (see **Testing** below).
- **All test files live in `unit tests/`** — unit tests, e2e specs, and their configs (`jest.config.js`, `jest-setup.js`, `playwright.config.ts`, `tsconfig.json`). The npm scripts point Jest/Playwright at these relocated configs via `-c`. Jest only matches `*.test.*` and Playwright ignores `*.test.ts`, so the two runners don't pick up each other's files despite sharing a folder.

## Functional bugs fixed (post-review)

1. **Stale tooltip after redraw** (`Canvas.tsx`) — removed SVG meant `mouseout` never fired; `useEffect` cleanup now clears tooltip state.
2. **`display` could throw** (`parseData.ts`) — `!` assertion replaced with a fallback display function.
3. **Empty color → invisible line** (`RenderGraph.js`) — fall back to `theme.colors.text.primary`.
4. **Tooltip mispositioned when scrolled** (`RenderGraph.js`) — `pageX/pageY` → `clientX/clientY` (VizTooltipContainer is `position: fixed`).
5. **Negative `numLines`** (`parseData.ts`) — clamped with `Math.max(0, …)` so `slice` can't count from the end.

## Known issue left as-is

Axis headers use `text-anchor: 'center'`, which is invalid SVG (valid: `start`/`middle`/`end`) and silently falls back to `start`. Switching to `'middle'` would shift header positions, so it's left unchanged to preserve output.

## Testing

Two layers: **unit tests** (Jest) for the data logic, and **end-to-end tests** (Playwright
via `@grafana/plugin-e2e`) that drive a real Grafana to verify the panel renders.

### How to run

All commands run from the project root (`netsage-slopegraph-panel/`). The npm scripts point
Jest and Playwright at their relocated configs in `unit tests/` via `-c`. The two runners
never pick up each other's files: Jest only matches `*.test.*`, and the Playwright config
`testIgnore`s `**/*.test.ts`.

**Unit tests (Jest — no Grafana required):**

```bash
npm run test:ci      # run all 18 once and exit (CI uses this)
npm test             # watch mode — re-runs only changed tests while editing
```

Run a subset:

```bash
npm run test:ci -- -t "sorting"     # only tests whose name matches "sorting"
```

> The `console.error` lines (`no data`, `No numeric field found`) are expected — the
> empty-data and no-numeric-field tests deliberately exercise those guard paths and Jest
> echoes anything the code logs. They are not failures.

**End-to-end tests (Playwright — requires a live Grafana):**

```bash
# one-time setup
npm run build                     # build the plugin so Grafana can load it
npm run server                    # docker-compose up --build → Grafana at http://localhost:3000
npx playwright install chromium   # first run only

# run them
npm run e2e                       # all 5 (1 auth + 4 panel)
npm run e2e:ui                    # interactive UI runner (best for debugging the hover test)
npm run e2e -- -g "tooltip"       # a single test by name
```

Target and credentials default to `http://localhost:3000` and `admin/admin`; override with
env vars:

```bash
GRAFANA_URL=http://localhost:3000 GRAFANA_ADMIN_USER=admin GRAFANA_ADMIN_PASSWORD=yourpw npm run e2e
```

The HTML report is written to `playwright/report/index.html`. See the note at the end of
this file if `admin/admin` is rejected.

### Unit tests (`unit tests/parseData.test.ts`)

These target `parseData()` — the pure data-transformation core that turns Grafana's
`PanelData` into the `{leftKeys, rightKeys, topPairs}` structure the D3 renderer consumes.
It's the highest-value unit to test because it has no DOM/React dependencies and every
rendering bug traces back to the shape of its output.

**How the tests work:** each test builds a real `DataFrame` with Grafana's own
`toDataFrame` helper, runs it through `parseData`, and asserts on the returned structure.
Using real DataFrames (not hand-rolled mocks) means the tests exercise the actual
`DataFrameView` row-access path — numeric indexing (`row[0]`/`row[1]`) and by-name access —
so they'd catch a regression if that Grafana behavior ever changed.

**What's covered (18 tests, grouped):**

- *Empty / no data* — no series, a series with no numeric field, and a series with zero
  rows. Why: the panel renders before/around empty queries; these must return an
  empty-but-valid result, never throw.
- *Sorting & top-N* — descending sort, `numPairs` of 0, `numPairs` larger than the row
  count (clamp), negative `numPairs` (regression guard for the `slice` bug), and tied
  values. Why: "show the top N" is the panel's whole job, and the boundaries are where it broke.
- *Axis keys & dedup* — repeated left key, repeated right key, fully duplicated pairs, and
  a single row. Why: shared nodes must collapse to one axis key with a shared index, or the
  slope lines originate/terminate from the wrong place.
- *Coordinate metadata* — left endpoint `x=0` / right `x=1` with meta on the left; color +
  formatted text passed through from a display processor; and the empty-color fallback when
  no processor is present (regression guard for the `display` fix). Why: the renderer relies
  on this exact shape for line endpoints, stroke color, and tooltip text.
- *Multiple series & field selection* — rows combined across series before ranking, valid
  series processed while invalid ones are skipped, and "first numeric field wins" when
  several exist. Why: Grafana commonly returns multiple series, and partial data should beat
  total failure.

Several tests double as **regression guards** for bugs fixed in earlier rounds (negative
`numPairs`, the `display` fallback), so those fixes can't silently regress.

### End-to-end tests (`unit tests/*.spec.ts`, Playwright + `@grafana/plugin-e2e`)

Unit tests prove the data logic; e2e tests prove the panel actually works *inside Grafana*.
They run against a live Grafana (the local one at `localhost:3000` by default), in a real
Chromium browser: each adds the panel to a dashboard, supplies data, and asserts on the
rendered DOM.

- `auth.setup.ts` — logs in once via the `login` fixture and saves the session; the tests
  reuse it (credentials default to `admin/admin`, override with `GRAFANA_ADMIN_USER` /
  `GRAFANA_ADMIN_PASSWORD`).
- `slopegraph.spec.ts` — four tests:
  1. **Loads in the panel editor** — selecting "Slope Graph Panel" proves the plugin is
     installed/registered, and the panel shows no error icon.
  2. **Renders one slope line per data row** — feeds three rows via `mockQueryDataResponse`
     (which intercepts `/api/ds/query`) and asserts exactly three slope lines (`path`
     elements with `stroke-width="8"`) are drawn.
  3. **Respects the "Number of lines to display" option** — sets the option to 2 and asserts
     only two lines render, proving the option → `parseData(numLines)` → render path end to end.
  4. **Shows a tooltip on hover and clears it on mouse-out** — hovers the top slope line,
     asserts the `VizTooltipContainer` appears with that line's source/dest, then moves the
     cursor away and asserts the tooltip is hidden. This is the integration guard for the
     D3→React tooltip rebuild; the mouse-out assertion is the regression guard for the
     stale-tooltip-after-redraw bug (functional bug #1). The tooltip is matched by its
     "Left Title:" label, which is unique to the tooltip — the SVG column header renders the
     same words without a colon, and scoping to the tooltip div avoids colliding with the
     identical axis tick labels in the SVG.

**Implementation notes:** data is supplied by mocking the query response rather than
provisioning a real query, so the dataset is deterministic. The data assertions use
Playwright's `expect(...).toPass()` to re-refresh until the mocked data is what's shown —
the panel's first paint uses the default data source, and this makes the mocked refresh win
the race reliably (verified stable across repeated runs).

Tooling: `@grafana/plugin-e2e` + `@playwright/test` (the legacy Cypress `@grafana/e2e`
scripts were removed); config in `playwright.config.ts`; run with `npm run e2e`.

## Verification

- `npm run build` — 0 errors (only asset-size warnings for the bundled `d3.min.js`/screenshot).
- `npm run typecheck` — passes (the `unit tests/` dir sits outside `rootDir`, so it doesn't affect `tsc`).
- `npm run test:ci` — 18/18 unit tests pass. The `console.error` lines in the output (`no data`, `No numeric field found`) are expected: the empty-data and no-numeric-field tests deliberately exercise those guards, and Jest echoes anything the code logs. They are not failures.
- `npm run e2e` — 5/5 (1 auth + 4 panel) pass against the local Grafana; stable across repeated runs. Requires Grafana running with the plugin loaded and valid admin credentials (defaults to `admin/admin`).
- In Grafana: add a **Slope Graph Panel**, confirm slopes/labels render, tooltips track the cursor (incl. when scrolled) and clear on refresh.

> Note: running e2e needs admin login. If `admin/admin` is rejected, reset it locally with
> `grafana cli --homepath <homepath> --configOverrides "cfg:default.paths.data=<datadir>" admin reset-admin-password admin`,
> or pass the real password via `GRAFANA_ADMIN_PASSWORD`.
