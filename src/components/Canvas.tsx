import React, { useEffect } from 'react';
import SlopeGraph from './RenderGraph.js';
import '../css/styles.css';
import { useTheme2 } from '@grafana/ui';

export const Canvas = (props) => {
  const theme = useTheme2();
  useEffect(() => {
    const id = props.panelId;
    const chart = new SlopeGraph('Chart_' + id);

    chart.renderGraph(props.data, props.width, props.height, props.options, theme);
  });

  return <div id={'Chart_' + props.panelId} style={{ height: props.height, width: props.width }}></div>;
};
