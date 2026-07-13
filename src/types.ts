// Refactor: added ParsedDataMeta, ParsedDataCoord, ParsedDataRow, and ParsedDataResult
// interfaces to give the parsed data pipeline end-to-end type safety. Previously,
// parseData.js was plain JavaScript and returned untyped objects; Canvas.tsx accepted
// untyped props. Grafana's own DisplayValue type is imported directly rather than
// redefined, so the shape stays in sync with the Grafana API.
export interface SlopeGraphOptions {
  numLines: number;
  leftHeader: string;
  rightHeader: string;
  headerColor: string;
  hoverColor: string;
  txtLength: number;
  fontSize: number;
}

export interface ParsedDataMeta {
  value: number;
  displayValue: import('@grafana/data').DisplayValue;
  label0: string;
  label1: string;
  color: string;
}

export interface ParsedDataCoord {
  meta?: ParsedDataMeta;
  x: number;
  y?: number;
}

export interface ParsedDataRow {
  col1: string;
  col2: string;
  valueRaw: number;
  valueDisplay: import('@grafana/data').DisplayValue;
  coords: ParsedDataCoord[];
}

export interface ParsedDataResult {
  leftKeys: string[];
  rightKeys: string[];
  topPairs: ParsedDataRow[];
}

// Data passed from RenderGraph's D3 mouseover handler up to Canvas for rendering
// via VizTooltipContainer. header1/header2 are omitted here — they are read from
// options directly in Canvas.tsx.
export interface TooltipState {
  x: number;
  y: number;
  label0: string;
  label1: string;
  displayText: string;
  suffix: string;
}
