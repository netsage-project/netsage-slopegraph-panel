import React, { useEffect } from 'react';
import SlopeGraph from './RenderGraph.js';
import '../css/styles.css';
import { useTheme2 } from '@grafana/ui';

export const Canvas = (props) => {
  const theme = useTheme2();
  useEffect(() => {
    const id = props.panelId;
    const chart = new SlopeGraph('Chart_' + id);
    const headerColor = theme.visualization.getColorByName(props.options.headerColor);
    const hoverColor = theme.visualization.getColorByName(props.options.hoverColor);

    chart.renderGraph(
      props.data,
      props.options.leftHeader,
      props.options.rightHeader,
      headerColor,
      hoverColor
    );
  });

  return <div id={'Chart_' + props.panelId} style={{ height: props.height, width: props.width }}></div>;
};
