// Refactor: changed bare module imports ('types', 'parseData.js', 'components/Canvas')
// to explicit relative paths so they are not dependent on tsconfig baseUrl being set.
// Removed the `graphOptions = { ...options }` spread — creating a new object reference
// on every render caused Canvas's useEffect to fire even when option values were unchanged.
// parsedData is now explicitly typed as ParsedDataResult.
import React, { useMemo } from 'react';
import { PanelProps } from '@grafana/data';
import { SlopeGraphOptions, ParsedDataResult } from './types';
import { parseData } from './parseData';
import { Canvas } from './components/Canvas';

interface Props extends PanelProps<SlopeGraphOptions> {}

export const SlopeGraphPanel: React.FC<Props> = ({ options, data, width, height, id }) => {
  // Memoized so parsing only re-runs when the data or line count changes — not on
  // pure resizes (width/height changes), which previously re-parsed needlessly.
  const parsedData: ParsedDataResult = useMemo(() => {
    try {
      return parseData(data, options.numLines);
    } catch (error) {
      console.error('Parsing error : ', error);
      return { leftKeys: [], rightKeys: [], topPairs: [] };
    }
  }, [data, options.numLines]);

  // options passed directly — spreading into a new object on every render would
  // change the reference and cause Canvas's useEffect to fire unnecessarily.
  return <Canvas height={height} width={width} panelId={id} options={options} data={parsedData} />;
};
