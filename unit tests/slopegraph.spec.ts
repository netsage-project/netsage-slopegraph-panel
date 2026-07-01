import { test, expect } from '@grafana/plugin-e2e';

/**
 * End-to-end tests for the Slope Graph Panel.
 *
 * Unlike the unit tests (which call parseData directly), these drive a REAL Grafana in a
 * real browser: they add the panel to a dashboard, feed it data, change its options, and
 * assert on what actually renders in the DOM. This is what catches integration failures a
 * unit test can't — the plugin not loading, options not wiring up, or the chart not drawing.
 *
 * Data is supplied with `mockQueryDataResponse`, which intercepts the `/api/ds/query` call
 * and returns a fixed result. That lets us assert on an exact, deterministic dataset
 * without depending on whatever a live data source would return.
 */

const PANEL = 'Slope Graph Panel';

// Builds a Grafana /api/ds/query response with the slope graph's expected shape:
// two string label columns (src, dst) + one numeric value column.
const queryResponse = (rows: Array<[string, string, number]>) => ({
  results: {
    A: {
      frames: [
        {
          schema: {
            refId: 'A',
            fields: [
              { name: 'src', type: 'string' },
              { name: 'dst', type: 'string' },
              { name: 'value', type: 'number' },
            ],
          },
          data: {
            values: [rows.map((r) => r[0]), rows.map((r) => r[1]), rows.map((r) => r[2])],
          },
        },
      ],
    },
  },
});

const THREE_ROWS: Array<[string, string, number]> = [
  ['chicago', 'denver', 30],
  ['chicago', 'austin', 20],
  ['seattle', 'austin', 10],
];

// The slope lines are the only <path> elements drawn with stroke-width 8 (axis domain
// lines are thinner), so this selector counts exactly the data lines.
const SLOPE_LINES = 'path[stroke-width="8"]';

test('loads in the panel editor without errors', async ({ panelEditPage }) => {
  // Selecting our visualization proves the plugin is installed, enabled, and registered.
  await panelEditPage.setVisualization(PANEL);

  await expect(panelEditPage.getVisualizationName()).toHaveText(PANEL);
  // No "panel plugin not found" / render-crash icon on the panel.
  await expect(panelEditPage.panel.getErrorIcon()).toBeHidden();
});

// Refreshes the panel and asserts the slope-line count, retrying the whole thing until it
// holds. This is deliberately resilient: the panel's first render uses real data from the
// default data source, and the mocked refresh has to win the race before we assert. toPass()
// keeps re-refreshing until the panel shows exactly our mocked data (or it times out).
const expectSlopeLines = async (panelEditPage: any, count: number) => {
  await expect(async () => {
    await panelEditPage.refreshPanel({ timeout: 3000 }).catch(() => undefined);
    await expect(panelEditPage.panel.locator.locator(SLOPE_LINES)).toHaveCount(count, {
      timeout: 3000,
    });
  }).toPass({ timeout: 20000 });
};

test('renders one slope line per data row', async ({ panelEditPage, createDataSource }) => {
  // A data source is needed so the panel issues a query; TestData is built into Grafana.
  // The actual query is intercepted by mockQueryDataResponse, so what TestData would return
  // doesn't matter — only that a /api/ds/query request fires for the mock to fulfill.
  const ds = await createDataSource({
    type: 'grafana-testdata-datasource',
    name: 'e2e-testdata-render',
  });
  await panelEditPage.mockQueryDataResponse(queryResponse(THREE_ROWS));
  await panelEditPage.setVisualization(PANEL);
  await panelEditPage.datasource.set(ds.name);

  // Three data rows → three slope lines drawn inside the panel.
  await expectSlopeLines(panelEditPage, 3);
  await expect(panelEditPage.panel.getErrorIcon()).toBeHidden();
});

test('respects the "Number of lines to display" option', async ({ panelEditPage, page, createDataSource }) => {
  const ds = await createDataSource({
    type: 'grafana-testdata-datasource',
    name: 'e2e-testdata-options',
  });
  await panelEditPage.mockQueryDataResponse(queryResponse(THREE_ROWS));
  await panelEditPage.setVisualization(PANEL);
  await panelEditPage.datasource.set(ds.name);

  // Limit to the top 2 of the 3 rows via the panel option.
  // getByRole('spinbutton') targets the numeric <input> specifically (getByLabel would
  // also match the wrapping field editor div).
  await page.getByRole('spinbutton', { name: 'Number of lines to display' }).fill('2');

  // Proves the option → parseData(numLines) → render path works end to end.
  await expectSlopeLines(panelEditPage, 2);
});

test('shows a tooltip on hover and clears it on mouse-out', async ({ panelEditPage, page, createDataSource }) => {
  // This is the integration-level guard for the tooltip rebuild: the refactor moved the
  // tooltip from a D3 <div> on document.body to Grafana's VizTooltipContainer rendered by
  // React via an onHover callback. The two bugs that fix introduced/closed are exactly the
  // kind a unit test can't see — the tooltip must (a) appear with the hovered line's data on
  // mouseover, and (b) disappear on mouseout. (b) is the regression guard for the
  // "stale tooltip after redraw / never-cleared" bug.
  const ds = await createDataSource({
    type: 'grafana-testdata-datasource',
    name: 'e2e-testdata-tooltip',
  });
  await panelEditPage.mockQueryDataResponse(queryResponse(THREE_ROWS));
  await panelEditPage.setVisualization(PANEL);
  await panelEditPage.datasource.set(ds.name);

  // Settle on the mocked data first, so the line we hover belongs to THREE_ROWS and a stray
  // refresh can't redraw (and clear the tooltip) mid-hover.
  await expectSlopeLines(panelEditPage, 3);

  // The first <path> is the highest-value pair (parseData sorts descending): chicago → denver.
  // A straight diagonal line passes through the centre of its own bounding box, which is where
  // Playwright aims a hover, so the 8px-wide stroke is a reliable hover target.
  const firstLine = panelEditPage.panel.locator.locator(SLOPE_LINES).first();

  // The tooltip's label text ("Left Title:") is unique to the tooltip — the SVG column header
  // renders the same words WITHOUT a colon, so this matches the tooltip and not the header.
  // Scoping to the div that holds both labels lets us assert the row values without colliding
  // with the identical axis tick labels ("chicago"/"denver") drawn in the SVG.
  const tooltip = page.locator('div').filter({ hasText: 'Left Title:' }).filter({ hasText: 'Right Title:' }).last();

  // Hover wrapped in toPass: hovering re-dispatches if a late redraw briefly steals the line.
  await expect(async () => {
    await firstLine.hover({ force: true });
    await expect(tooltip).toBeVisible({ timeout: 2000 });
  }).toPass({ timeout: 15000 });

  // The tooltip reflects the hovered line's data, not some other row's.
  await expect(tooltip).toContainText('chicago'); // source (left header value)
  await expect(tooltip).toContainText('denver'); // destination (right header value)

  // Move off the line → mouseout → React clears the tooltip. Before the refactor the SVG was
  // removed on redraw without firing mouseout, so the tooltip stuck on screen; this asserts
  // it goes away.
  await page.mouse.move(0, 0);
  await expect(tooltip).toBeHidden();
});

test('highlights all associated lines when hovering an axis label', async ({ panelEditPage, page, createDataSource }) => {
  // Integration guard for the axis-label hover-highlight feature. THREE_ROWS shares the
  // left key 'chicago' across two rows (chicago→denver, chicago→austin), so hovering the
  // 'chicago' tick must recolour BOTH of those lines to the hover colour while leaving the
  // third (seattle→austin) untouched.
  const ds = await createDataSource({
    type: 'grafana-testdata-datasource',
    name: 'e2e-testdata-axis-hover',
  });
  await panelEditPage.mockQueryDataResponse(queryResponse(THREE_ROWS));
  await panelEditPage.setVisualization(PANEL);
  await panelEditPage.datasource.set(ds.name);

  // Settle on the mocked data so the axis ticks/lines belong to THREE_ROWS.
  await expectSlopeLines(panelEditPage, 3);

  const lines = panelEditPage.panel.locator.locator(SLOPE_LINES);
  // Read each line's resting stroke so we can detect which ones change on hover, without
  // hard-coding the theme's default colour.
  const baseStrokes = await lines.evaluateAll((els) => els.map((el) => el.getAttribute('stroke')));

  // The left axis tick label for the shared key. Axis tick text is inside <g class="tick">;
  // the SVG renders 'chicago' (no colon) as its own tick — the tooltip uses a colon, so this
  // targets the tick, not a tooltip.
  const chicagoTick = panelEditPage.panel.locator.locator('g.tick').filter({ hasText: 'chicago' }).first();

  // Hover the label and assert exactly the two chicago-origin lines changed stroke. Wrapped in
  // toPass to tolerate a late refresh re-dispatching the hover.
  await expect(async () => {
    await chicagoTick.hover({ force: true });
    const hoverStrokes = await lines.evaluateAll((els) => els.map((el) => el.getAttribute('stroke')));
    // Two of the three lines (the chicago-origin ones) must have changed colour.
    const changed = hoverStrokes.filter((s, i) => s !== baseStrokes[i]).length;
    expect(changed).toBe(2);
  }).toPass({ timeout: 15000 });

  // Move away → mouseout → the highlighted lines return to their resting strokes.
  await page.mouse.move(0, 0);
  await expect(async () => {
    const resetStrokes = await lines.evaluateAll((els) => els.map((el) => el.getAttribute('stroke')));
    expect(resetStrokes).toEqual(baseStrokes);
  }).toPass({ timeout: 5000 });
});
