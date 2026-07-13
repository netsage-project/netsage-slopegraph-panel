// Refactor: converted from parseData.js (plain JavaScript) to parseData.ts (TypeScript).
// Key changes: added return type and DataFrame types; replaced for...in array loops with
// forEach + findIndex (for...in iterates prototype properties and is non-idiomatic for
// arrays); added a null guard on thisValueField so the plugin does not crash when a data
// series has no numeric column; removed unused variables (thisValues, maxValue, minValue);
// fixed loose equality (== → ===); fields are now read directly from the DataFrame rather
// than through DataFrameView.data, which is a private property.
import { DataFrame, FieldType, DataFrameView } from '@grafana/data';
import { ParsedDataRow, ParsedDataResult } from './types';

export function parseData(data: any, numPairs: number): ParsedDataResult {
  const dataSeries: DataFrame[] = data.series;
  if (dataSeries.length === 0) {
    console.error('no data');
    return { leftKeys: [], rightKeys: [], topPairs: [] };
  }

  const transformedData: ParsedDataRow[] = [];
  dataSeries.forEach((series) => {
    // Access fields directly on the DataFrame — DataFrameView.data is private.
    const thisValueField = series.fields.find((field) => field.type === FieldType.number);

    // Guard: crash would occur below if no numeric field exists in this series.
    if (!thisValueField) {
      console.error('No numeric field found in series:', series.name);
      return;
    }

    // Guard: a field may reach the panel without a display processor. Fall back to a
    // minimal DisplayValue so the `!` non-null assertion can be dropped and parsing
    // never throws on `display is not a function`.
    const display =
      thisValueField.display ?? ((v: unknown) => ({ text: String(v), numeric: Number(v) }));

    const thisFrame = new DataFrameView(series);
    thisFrame.forEach((row: any) => {
      transformedData.push({
        col1: row[0],
        col2: row[1],
        valueRaw: row[thisValueField.name],
        valueDisplay: display(row[thisValueField.name]),
        coords: [],
      });
    });
  });

  // Sort all pairs and take top n (set by options panel). Math.max(0, ...) guards
  // against a negative numPairs, which would make slice(0, -n) return an unexpected
  // subset ("all but the last n") instead of an empty result.
  const sortedPairs = transformedData.sort((a, b) => b.valueRaw - a.valueRaw);
  const count = Math.min(Math.max(0, numPairs), sortedPairs.length);
  const topPairs = sortedPairs.slice(0, count);

  // Build axis key lists and attach coordinate metadata to each pair.
  // Replaced for...in loops (non-idiomatic for arrays; iterates prototype properties)
  // with forEach + findIndex, which also eliminates the need for parseInt().
  const leftKeys: string[] = [];
  const rightKeys: string[] = [];

  topPairs.forEach((pair) => {
    const newLKey = pair.col1;
    const newRKey = pair.col2;

    pair.coords = [
      {
        meta: {
          value: pair.valueRaw,
          displayValue: pair.valueDisplay,
          label0: newLKey,
          label1: newRKey,
          color: pair.valueDisplay.color ?? '',
        },
        x: 0,
      },
      { x: 1 },
    ];

    const lIdx = leftKeys.findIndex((k) => k === newLKey);
    if (lIdx !== -1) {
      pair.coords[0].y = lIdx;
    } else {
      leftKeys.push(newLKey);
      pair.coords[0].y = leftKeys.length - 1;
    }

    const rIdx = rightKeys.findIndex((k) => k === newRKey);
    if (rIdx !== -1) {
      pair.coords[1].y = rIdx;
    } else {
      rightKeys.push(newRKey);
      pair.coords[1].y = rightKeys.length - 1;
    }
  });

  return { leftKeys, rightKeys, topPairs };
}
