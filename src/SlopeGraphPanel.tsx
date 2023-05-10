import React from 'react';
import { PanelProps } from '@grafana/data';
import { SlopeGraphOptions } from 'types';
import { parseData } from 'parseData.js';
import { Canvas } from 'components/Canvas';

interface Props extends PanelProps<SlopeGraphOptions> {}

export const SlopeGraphPanel: React.FC<Props> = ({ options, data, width, height, id }) => {
  let graphOptions = {
    ...options,
  };

  let parsedData = {};
  try {
    parsedData = parseData(data, graphOptions.numLines);
  } catch (error) {
    console.error('Parsing error : ', error);
  }

  return <Canvas height={height} width={width} panelId={id} options={graphOptions} data={parsedData} />;
};
