// Refactor: added CanvasProps interface so all props are explicitly typed rather than
// implicitly `any`; destructured props in the function signature for clarity. Added a
// dependency array to useEffect (previously missing — caused redundant D3 redraws on
// every React render). Tooltip rendering migrated from a custom D3 div appended to
// document.body to Grafana's VizTooltipContainer: RenderGraph fires an onHover callback
// with hovered data, and Canvas renders the tooltip as a React component. This removes
// the DOM leak that existed when tooltip divs were never cleaned up between re-renders.
import React, { useCallback, useEffect, useState } from 'react';
import SlopeGraph from './RenderGraph.js';
import '../css/styles.css';
import { useTheme2, VizTooltipContainer, Portal } from '@grafana/ui';
import { SlopeGraphOptions, ParsedDataResult, TooltipState } from '../types';

interface CanvasProps {
  panelId: number;
  data: ParsedDataResult;
  width: number;
  height: number;
  options: SlopeGraphOptions;
}

export const Canvas = ({ panelId, data, width, height, options }: CanvasProps) => {
  const theme = useTheme2();
  const [tooltip, setTooltip] = useState<TooltipState | null>(null);

  // Stable callback passed to RenderGraph so D3 event handlers can update React state.
  // useCallback with empty deps ensures the reference never changes between renders,
  // keeping it safe to include in the useEffect dependency array without triggering
  // unnecessary graph redraws.
  const handleHover = useCallback((state: TooltipState | null) => {
    setTooltip(state);
  }, []);

  // Dependency array added: without it useEffect ran on every React render regardless
  // of whether the data or dimensions actually changed, causing redundant D3 redraws.
  useEffect(() => {
    const chart = new SlopeGraph('Chart_' + panelId);
    chart.renderGraph(data, width, height, options, theme, handleHover);

    // Hide any visible tooltip before the next redraw and on unmount. When the graph
    // is redrawn (data refresh, resize, time-range change) the old SVG paths are
    // removed, so their mouseout never fires — without this the tooltip would stay
    // frozen on screen showing stale data until the user hovered and left again.
    return () => setTooltip(null);
  }, [panelId, data, width, height, options, theme, handleHover]);

  return (
    <>
      <div id={'Chart_' + panelId} style={{ height, width }} />
      {tooltip && (
        // Portal renders the tooltip into #grafana-portal-container (document.body), outside
        // this panel's react-grid-layout wrapper. That wrapper uses a CSS transform, which
        // would otherwise make VizTooltipContainer's position:fixed resolve relative to the
        // panel corner instead of the viewport — displacing the tooltip far from the cursor.
        // Matches Grafana core's own uPlot TooltipPlugin (Portal + VizTooltipContainer).
        <Portal>
          <VizTooltipContainer position={{ x: tooltip.x, y: tooltip.y }} offset={{ x: 15, y: -10 }}>
            <div>
              <div>
                <b>{options.leftHeader}:</b> {tooltip.label0}
              </div>
              <div>
                <b>{options.rightHeader}:</b> {tooltip.label1}
              </div>
              <div>
                {tooltip.displayText} {tooltip.suffix}
              </div>
            </div>
          </VizTooltipContainer>
        </Portal>
      )}
    </>
  );
};
