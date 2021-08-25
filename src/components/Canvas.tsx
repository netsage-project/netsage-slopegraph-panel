import React, { useEffect } from 'react';
import SlopeGraph from './RenderGraph.js';
import '../css/styles.css';

export const Canvas = (props) => {
  useEffect(() => {
    const id = props.panelId;
    const chart = new SlopeGraph('Chart_' + id);

    chart.renderGraph(
      props.data,
      props.options.leftHeader,
      props.options.rightHeader,
      props.options.headerColor,
      props.options.hoverColor
    );
  });

  return <div id={'Chart_' + props.panelId} style={{ height: props.height, width: props.width }}></div>;
};
