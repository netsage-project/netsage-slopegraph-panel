// Refactor changes in this file:
// - Removed dead code: unused `alpha` variable, commented-out min/max value lines,
//   unused `w` D3 scale (stroke-width scale that was defined but never activated),
//   unused `value` variable inside the forEach loop, invalid .attr('margin', 10) call
//   (margin is not an SVG attribute), and the unused `event` parameter in mouseout.
// - Bug fix: fixed .attr('font-size', 'fontSize') → .attr('font-size', fontSize) on
//   both axes; the string literal 'fontSize' was passed instead of the variable, so
//   SVG ignored it and tick labels had no font-size applied.
// - Bug fix: replaced d.x == 0 with d.x === 0 (strict equality).
// - Tooltip refactor: removed the custom D3 div tooltip appended to document.body.
//   renderGraph now accepts an onHover callback as its 6th argument. On mouseover it
//   calls onHover with the hovered data; on mouseout it calls onHover(null). Canvas.tsx
//   owns tooltip rendering via Grafana's VizTooltipContainer, keeping D3 concerns
//   (drawing, interaction) separate from React rendering concerns (tooltip UI).
// - Efficiency: truncateLabel promoted to a static class method so it is defined once
//   rather than being redefined as a closure on every call to renderGraph.
// - Efficiency: the D3 line generator is now created once before the forEach loop
//   rather than being instantiated anew for every path element.
// - Readability: consolidated the container DOM selection into a single `container`
//   variable; replaced string concatenation in SVG transform attributes with template
//   literals throughout. Extracted drawAxis/drawHeader helpers to remove the duplicate
//   left/right axis and header blocks.
// - Cleanup: set cursor on the base path instead of toggling a 'path-hover' class that
//   was added on mouseover but never removed.
import * as d3 from '../d3.min.js';

export default class SlopeGraph {
  constructor(id) {
    this.containerID = id;
  }

  // Moved out of renderGraph: was redefined on every call, allocating a new function each time.
  static truncateLabel(text, maxLen) {
    text.each(function () {
      let label = d3.select(this).text();
      if (label.length > maxLen) {
        label = label.slice(0, maxLen) + '...';
      }
      d3.select(this).text(label);
    });
  }

  // Draws one Y axis. Extracted to remove the near-duplicate left/right axis blocks.
  // `keys`/`labelKey`/`hoverColor`/`defaultColor` wire up the axis-label hover highlight:
  // each tick text is bound (via d3's axis generator) to its index into `keys`, so on hover
  // we look up the key and recolour every slope line that shares it (labelKey is 'label0'
  // for the left axis, 'label1' for the right). Truncated tick labels don't matter because
  // the match uses the bound index, not the rendered (possibly '...'-clipped) text.
  static drawAxis(svg, axis, { groupTransform, txtLength, fontSize, textTransform, keys, labelKey, hoverColor, defaultColor }) {
    const g = svg.append('g');
    if (groupTransform) {
      g.attr('transform', groupTransform);
    }
    g.call(axis)
      .attr('class', 'axis')
      .selectAll('.tick text')
      .call(SlopeGraph.truncateLabel, txtLength)
      // Fixed previously: variable fontSize, not the string literal 'fontSize'.
      .attr('font-size', fontSize)
      .attr('transform', textTransform)
      // pointer cursor signals the label is interactive (mirrors the slope lines).
      .style('cursor', 'pointer')
      .on('mouseover', function (event, d) {
        const key = keys[d];
        svg
          .selectAll('path.slope-line')
          .filter((coords) => coords[0].meta[labelKey] === key)
          .attr('stroke', hoverColor);
      })
      .on('mouseout', function (event, d) {
        const key = keys[d];
        // Reset only the lines this label highlighted, back to each line's own colour.
        svg
          .selectAll('path.slope-line')
          .filter((coords) => coords[0].meta[labelKey] === key)
          .attr('stroke', (coords) => coords[0].meta.color || defaultColor);
      });
  }

  // Draws one axis header label. Extracted to remove the duplicate header blocks.
  // text-anchor 'center' is intentionally preserved (a known no-op) to keep output identical.
  static drawHeader(svg, label, transform, color) {
    svg
      .append('text')
      .attr('class', 'header-text')
      .attr('transform', transform)
      .attr('text-anchor', 'center')
      .text(label)
      .attr('fill', color);
  }

  renderGraph(parsedData, panelWidth, panelHeight, options, theme, onHover) {
    const topPairs = parsedData?.topPairs;
    const leftKeys = parsedData?.leftKeys;
    const rightKeys = parsedData?.rightKeys;

    // Guard against missing or empty data before any array access
    if (!topPairs?.length || !leftKeys?.length || !rightKeys?.length) {
      return;
    }

    // Clear previous SVG before drawing.
    const container = d3.select('#' + this.containerID);
    container.select('svg').remove();

    // ------------- Variables ----------------- //
    const header1 = options.leftHeader;
    const header2 = options.rightHeader;
    const headerColor = theme.visualization.getColorByName(options.headerColor);
    const hoverColor = theme.visualization.getColorByName(options.hoverColor);
    // Fallback stroke for the rare case a data point has no assigned color — an empty
    // string would render the line invisible (SVG draws no stroke).
    const defaultColor = theme.colors.text.primary;
    const txtLength = options.txtLength;
    const fontSize = options.fontSize;
    const sideMargin = txtLength * fontSize * 0.75 + 15;

    // Set the dimensions and margins of the graph
    const margin = { top: 50, right: sideMargin, bottom: 25, left: sideMargin };
    const width = panelWidth - margin.left - margin.right;
    const height = panelHeight - margin.top - margin.bottom;

    // Append the svg object to the panel container
    const svg = container
      .append('svg')
      .attr('width', width + margin.left + margin.right)
      .attr('height', height + margin.top + margin.bottom)
      .append('g')
      .attr('transform', `translate(${margin.left},${margin.top})`);

    // Add X scale
    const x = d3.scaleLinear().domain([0, 1]).range([0, width]);

    // Y scales (one per axis)
    const yl = d3
      .scaleLinear()
      .domain([0, leftKeys.length - 1])
      .range([0, height]);

    const yr = d3
      .scaleLinear()
      .domain([0, rightKeys.length - 1])
      .range([0, height]);

    // Add Y axes
    const leftAxis = d3
      .axisLeft(yl)
      .tickSize(5)
      .ticks(leftKeys.length)
      .tickFormat((d) => leftKeys[d]);

    const rightAxis = d3
      .axisRight(yr)
      .tickSize(5)
      .ticks(rightKeys.length)
      .tickFormat((d) => rightKeys[d]);

    SlopeGraph.drawAxis(svg, leftAxis, {
      txtLength,
      fontSize,
      textTransform: `translate(-10,0)`,
      keys: leftKeys,
      labelKey: 'label0',
      hoverColor,
      defaultColor,
    });
    SlopeGraph.drawAxis(svg, rightAxis, {
      groupTransform: `translate(${width},0)`,
      txtLength,
      fontSize,
      textTransform: `translate(10,0)`,
      keys: rightKeys,
      labelKey: 'label1',
      hoverColor,
      defaultColor,
    });

    // Line generator defined once outside the loop — previously recreated for every
    // path element, which allocates a new D3 function object per data row.
    const lineGenerator = d3
      .line()
      .x((d) => x(d.x))
      .y((d) => (d.x === 0 ? yl(d.y) : yr(d.y)));

    // Add the lines
    topPairs.forEach(function (element) {
      svg
        .append('path')
        .datum(element.coords)
        // 'slope-line' scopes the axis-label hover highlight (drawAxis) to data lines,
        // excluding the axis domain <path>s.
        .attr('class', 'slope-line')
        .attr('fill', 'none')
        .attr('stroke', (d) => d[0].meta.color || defaultColor)
        .attr('stroke-width', 8)
        // cursor set on the base path instead of toggling a never-removed 'path-hover'
        // class on mouseover; same effective behavior (pointer when over a line).
        .style('cursor', 'pointer')
        .attr('d', lineGenerator)
        .on('mouseover', function (event, d) {
          // Keep stroke color change in D3 — it is a direct SVG attribute update.
          // Tooltip rendering is delegated to React via the onHover callback.
          d3.select(this).attr('stroke', hoverColor);
          onHover({
            // clientX/clientY (viewport-relative), not pageX/pageY (document-relative):
            // VizTooltipContainer renders position:fixed, so it expects viewport coords.
            // Using pageX/pageY would offset the tooltip by the scroll amount.
            x: event.clientX,
            y: event.clientY,
            label0: d[0].meta.label0,
            label1: d[0].meta.label1,
            displayText: d[0].meta.displayValue.text,
            suffix: d[0].meta.displayValue.suffix ?? '',
          });
        })
        .on('mouseout', function (_, d) {
          d3.select(this).attr('stroke', () => d[0].meta.color || defaultColor);
          // Signal to React that the tooltip should be hidden.
          onHover(null);
        });
    });

    // Add axis labels
    SlopeGraph.drawHeader(svg, header1, `translate(${-(margin.left / 2)},${-(margin.top / 2)})`, headerColor);
    SlopeGraph.drawHeader(
      svg,
      header2,
      `translate(${width + margin.right / 5},${-(margin.top / 2)})`,
      headerColor
    );
  }
}
