import { toDataFrame, FieldType, DataFrame } from '@grafana/data';
import { parseData } from '../src/parseData';

/**
 * parseData() is the pure data-transformation core of the plugin: it takes Grafana's
 * query result (PanelData) and produces the {leftKeys, rightKeys, topPairs} structure
 * the D3 renderer draws from. It has no DOM or React dependencies, which makes it the
 * single most valuable thing to unit test — every rendering bug ultimately traces back
 * to the shape of this output.
 *
 * Test strategy: build real DataFrames with `toDataFrame` (the same helper Grafana uses
 * internally), feed them through parseData, and assert on the returned structure. Using
 * real DataFrames — rather than hand-rolled mocks — means the tests exercise the actual
 * DataFrameView row-access path (numeric indexing `row[0]`/`row[1]` and by-name access),
 * so they would catch a regression if that Grafana behavior ever changed.
 */

// Standard layout: two string label columns (src, dst) + one numeric value column.
// Returns a PanelData-like object with a single series.
const makeData = (rows: Array<[string, string, number]>) => ({
  series: [
    toDataFrame({
      fields: [
        { name: 'src', type: FieldType.string, values: rows.map((r) => r[0]) },
        { name: 'dst', type: FieldType.string, values: rows.map((r) => r[1]) },
        { name: 'value', type: FieldType.number, values: rows.map((r) => r[2]) },
      ],
    }),
  ],
});

// A series containing only string fields — no numeric column for parseData to chart.
const stringOnlyFrame = (): DataFrame =>
  toDataFrame({
    fields: [
      { name: 'src', type: FieldType.string, values: ['a'] },
      { name: 'dst', type: FieldType.string, values: ['x'] },
    ],
  });

describe('parseData — empty / no data', () => {
  // Why: the panel renders before a query returns, and queries can legitimately return
  // nothing. parseData must yield an empty-but-valid structure, never throw.
  it('returns an empty result when there are no series', () => {
    expect(parseData({ series: [] }, 10)).toEqual({ leftKeys: [], rightKeys: [], topPairs: [] });
  });

  // Why: a series with rows but no numeric field can't be charted. The series should be
  // skipped (logged), leaving an empty result rather than crashing on a missing field.
  it('skips a series that has no numeric field', () => {
    expect(parseData({ series: [stringOnlyFrame()] }, 10)).toEqual({
      leftKeys: [],
      rightKeys: [],
      topPairs: [],
    });
  });

  // Why: zero rows of data is distinct from zero series — exercise the no-rows path.
  it('returns an empty result when a series has no rows', () => {
    expect(parseData(makeData([]), 10)).toEqual({ leftKeys: [], rightKeys: [], topPairs: [] });
  });
});

describe('parseData — sorting and top-N selection', () => {
  // Why: the panel's entire purpose is "show the top N flows", so the descending sort and
  // the slice are core behavior. Values are deliberately out of order in the input.
  it('sorts by value descending and keeps only the top N', () => {
    const result = parseData(
      makeData([
        ['a', 'x', 1],
        ['b', 'y', 3],
        ['c', 'z', 2],
      ]),
      2
    );
    expect(result.topPairs).toHaveLength(2);
    expect(result.topPairs.map((p) => p.valueRaw)).toEqual([3, 2]);
  });

  // Why: boundary case. numPairs === 0 must yield nothing, not "all" or a crash.
  it('returns nothing when numPairs is 0', () => {
    expect(parseData(makeData([['a', 'x', 1]]), 0).topPairs).toHaveLength(0);
  });

  // Why: asking for more lines than exist must clamp to what's available (Math.min),
  // not over-read the array or pad with undefined.
  it('returns all rows when numPairs exceeds the row count', () => {
    const result = parseData(
      makeData([
        ['a', 'x', 1],
        ['b', 'y', 2],
      ]),
      99
    );
    expect(result.topPairs).toHaveLength(2);
  });

  // Why: regression guard for the bug fixed earlier — a negative numPairs previously hit
  // slice(0, -n), which counts from the END of the array and returned a wrong subset.
  it('treats a negative numPairs as zero rather than slicing from the end', () => {
    const result = parseData(
      makeData([
        ['a', 'x', 1],
        ['b', 'y', 2],
      ]),
      -1
    );
    expect(result.topPairs).toHaveLength(0);
  });

  // Why: equal values must not drop rows — both ties should survive the sort/slice.
  it('keeps tied values', () => {
    const result = parseData(
      makeData([
        ['a', 'x', 5],
        ['b', 'y', 5],
      ]),
      10
    );
    expect(result.topPairs).toHaveLength(2);
    expect(result.topPairs.map((p) => p.valueRaw)).toEqual([5, 5]);
  });
});

describe('parseData — axis key construction & dedup', () => {
  // Why: a repeated left label (one source fanning out to many dests) must collapse to a
  // single left-axis key shared by every pair, so the slope lines originate from one node.
  it('deduplicates a repeated left key and shares its index', () => {
    const result = parseData(
      makeData([
        ['a', 'x', 5],
        ['a', 'y', 4],
      ]),
      10
    );
    expect(result.leftKeys).toEqual(['a']);
    expect(result.rightKeys).toEqual(['x', 'y']);
    expect(result.topPairs[0].coords[0].y).toBe(0);
    expect(result.topPairs[1].coords[0].y).toBe(0);
    expect(result.topPairs[1].coords[1].y).toBe(1);
  });

  // Why: the symmetric case — many sources converging on one destination must collapse to
  // a single right-axis key. Guards against the dedup only working on one side.
  it('deduplicates a repeated right key and shares its index', () => {
    const result = parseData(
      makeData([
        ['a', 'z', 5],
        ['b', 'z', 4],
      ]),
      10
    );
    expect(result.leftKeys).toEqual(['a', 'b']);
    expect(result.rightKeys).toEqual(['z']);
    expect(result.topPairs[0].coords[1].y).toBe(0);
    expect(result.topPairs[1].coords[1].y).toBe(0);
  });

  // Why: a fully duplicated pair must collapse on BOTH axes — single left key, single
  // right key — with both lines sharing the same endpoints.
  it('collapses fully duplicated pairs on both axes', () => {
    const result = parseData(
      makeData([
        ['a', 'x', 5],
        ['a', 'x', 3],
      ]),
      10
    );
    expect(result.leftKeys).toEqual(['a']);
    expect(result.rightKeys).toEqual(['x']);
    expect(result.topPairs.every((p) => p.coords[0].y === 0 && p.coords[1].y === 0)).toBe(true);
  });

  // Why: smallest possible non-empty input — one row should yield exactly one key per axis
  // at index 0. Catches off-by-one errors in the dedup indexing.
  it('handles a single row', () => {
    const result = parseData(makeData([['a', 'x', 1]]), 10);
    expect(result.leftKeys).toEqual(['a']);
    expect(result.rightKeys).toEqual(['x']);
    expect(result.topPairs[0].coords[0].y).toBe(0);
    expect(result.topPairs[0].coords[1].y).toBe(0);
  });
});

describe('parseData — coordinate metadata', () => {
  // Why: the renderer reads x=0 for the left endpoint and x=1 for the right; meta (labels,
  // value, color) is attached only to the left endpoint. Lock that contract down.
  it('builds left (x=0) and right (x=1) coordinates with meta on the left endpoint', () => {
    const { topPairs } = parseData(makeData([['a', 'x', 7]]), 10);
    const coords = topPairs[0].coords;
    expect(coords[0].x).toBe(0);
    expect(coords[1].x).toBe(1);
    expect(coords[0].meta).toMatchObject({ value: 7, label0: 'a', label1: 'x' });
  });

  // Why: when the field has a display processor, parseData must pass through its formatted
  // text and color (used for the line stroke and the tooltip). Override display to assert it.
  it('passes through formatted text and color from the display processor', () => {
    const frame = toDataFrame({
      fields: [
        { name: 'src', type: FieldType.string, values: ['a'] },
        { name: 'dst', type: FieldType.string, values: ['x'] },
        { name: 'value', type: FieldType.number, values: [5] },
      ],
    });
    const valueField = frame.fields.find((f) => f.type === FieldType.number)!;
    valueField.display = (v) => ({ text: `${v} bps`, numeric: Number(v), color: '#ff0000' });

    const { topPairs } = parseData({ series: [frame] }, 10);
    expect(topPairs[0].coords[0].meta!.color).toBe('#ff0000');
    expect(topPairs[0].coords[0].meta!.displayValue.text).toBe('5 bps');
  });

  // Why: regression guard for the "no display processor" fix. Without a processor parseData
  // falls back to a minimal DisplayValue (text/numeric, no color), so meta.color is ''.
  it('falls back to an empty color when no display processor is present', () => {
    const { topPairs } = parseData(makeData([['a', 'x', 5]]), 10);
    expect(topPairs[0].coords[0].meta!.color).toBe('');
    expect(topPairs[0].coords[0].meta!.displayValue.text).toBe('5');
  });
});

describe('parseData — multiple series and field selection', () => {
  // Why: Grafana can return several series; parseData must combine their rows before
  // ranking, not just read the first series.
  it('combines rows across multiple series before selecting the top N', () => {
    const data = {
      series: [
        toDataFrame({
          fields: [
            { name: 'src', type: FieldType.string, values: ['a'] },
            { name: 'dst', type: FieldType.string, values: ['x'] },
            { name: 'value', type: FieldType.number, values: [1] },
          ],
        }),
        toDataFrame({
          fields: [
            { name: 'src', type: FieldType.string, values: ['b'] },
            { name: 'dst', type: FieldType.string, values: ['y'] },
            { name: 'value', type: FieldType.number, values: [9] },
          ],
        }),
      ],
    };
    const result = parseData(data, 10);
    expect(result.topPairs).toHaveLength(2);
    expect(result.topPairs[0].valueRaw).toBe(9); // higher value sorted first
  });

  // Why: a mix of a chartable series and an unchartable one should process the good series
  // and silently skip the bad one — partial data is better than total failure.
  it('processes valid series and skips ones with no numeric field', () => {
    const data = { series: [makeData([['a', 'x', 4]]).series[0], stringOnlyFrame()] };
    const result = parseData(data, 10);
    expect(result.topPairs).toHaveLength(1);
    expect(result.topPairs[0].valueRaw).toBe(4);
  });

  // Why: documents how the value column is chosen — the FIRST numeric field. With two
  // numeric columns, parseData must read 'value', not 'value2'.
  it('selects the first numeric field when several are present', () => {
    const frame = toDataFrame({
      fields: [
        { name: 'src', type: FieldType.string, values: ['a'] },
        { name: 'dst', type: FieldType.string, values: ['x'] },
        { name: 'value', type: FieldType.number, values: [10] },
        { name: 'value2', type: FieldType.number, values: [99] },
      ],
    });
    const { topPairs } = parseData({ series: [frame] }, 10);
    expect(topPairs[0].valueRaw).toBe(10);
  });
});
