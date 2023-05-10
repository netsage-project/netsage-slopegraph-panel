import * as d3 from 'd3';

export default class SlopeGraph {
  constructor(id) {
    this.containerID = id;
  }

  /**
   * Renders the slope graph in the panel.
   *
   * @param parseData - the paresed data from parseData.js
   * @param header1, @param header2 - headers for the two x-axis labels, set in options panel
   * @param hoverColor - the color the lines will change to when hovering, set in options panel
   */

  renderGraph(parsedData, options, theme) {
    if (!parsedData) {
      return;
    }

    // SUPER IMPORTANT! This clears old chart before drawing new one...
    d3.select('#' + this.containerID)
      .select('svg')
      .remove();
    d3.select('#' + this.containerID)
      .select('.tooltip')
      .remove();
    // ----------------------------------------------------------

    // ------------- Variables ----------------- //
    const topPairs = parsedData.topPairs;
    const leftKeys = parsedData.leftKeys;
    const rightKeys = parsedData.rightKeys;
    const alpha = parsedData.alpha;
    const header1 = options.leftHeader;
    const header2 = options.rightHeader;
    const headerColor = theme.visualization.getColorByName(options.headerColor);
    const hoverColor = theme.visualization.getColorByName(options.hoverColor);
    const txtLength = options.txtLength;
    const fontSize = options.fontSize;
    const sideMargin = txtLength * fontSize * 0.75 + 15;

    //let min_value = topPairs[topPairs.length - 1][2]
    //let max_value = topPairs[0][2]

    console.log(options);

    let panelWidth = document.getElementById(this.containerID).offsetWidth;
    let panelHeight = document.getElementById(this.containerID).offsetHeight;

    // set the dimensions and margins of the graph
    const margin = { top: 50, right: sideMargin, bottom: 25, left: sideMargin },
      width = panelWidth - margin.left - margin.right,
      height = panelHeight - margin.top - margin.bottom;

    // append the svg object to the body of the page
    const svg = d3
      .select('#' + this.containerID)
      .append('svg')
      .attr('width', width + margin.left + margin.right)
      .attr('height', height + margin.top + margin.bottom)
      .append('g')
      .attr('transform', 'translate(' + margin.left + ',' + margin.top + ')');

    function truncateLabel(text, width) {
      text.each(function () {
        let label = d3.select(this).text();
        if (label.length > width) {
          label = label.slice(0, width) + '...';
        }
        d3.select(this).text(label);
      });
    }

    // Add X scale
    const x = d3.scaleLinear().domain([0, 1]).range([0, width]);

    // y scales
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
      .tickFormat((d) => {
        return leftKeys[d];
      });

    const rightAxis = d3
      .axisRight(yr)
      .tickSize(5)
      .ticks(rightKeys.length)
      .tickFormat((d) => {
        return rightKeys[d];
      });

    svg
      .append('g')
      .call(leftAxis)
      .attr('class', 'axis')
      .attr('margin', 10)
      .selectAll('.tick text')
      .call(truncateLabel, txtLength)
      .attr('font-size', 'fontSize')
      .attr('transform', 'translate(' + -10 + ',0)');

    svg
      .append('g')
      .attr('transform', 'translate(' + width + ',0)')
      .call(rightAxis)
      .attr('class', 'axis')
      .selectAll('.tick text')
      .call(truncateLabel, txtLength)
      .attr('font-size', 'fontSize')
      .attr('transform', 'translate(' + 10 + ',0)');

    // scale for width of lines
    const w = d3
      .scaleLinear()
      .domain([topPairs[topPairs.length - 1][2], topPairs[0][2]])
      .range([3, 15]);

    const div = d3
      .select('body')
      .append('div')
      .attr('class', 'tooltip')
      .style('opacity', 0)
      .style('background-color', theme.colors.background.primary)
      .style('font-family', theme.typography.fontFamily.sansSerif)
      .style('color', theme.colors.text.primary)
      .style('box-shadow', '3px 3px 6px lightgray')
      .style('padding', '5px');

    // Add the lines
    topPairs.forEach(function (element) {
      let value = element[2];

      svg
        .append('path')
        .datum(element.coords)
        .attr('fill', 'none')
        .attr('stroke', function (d) {
          return d[0].meta.color;
        })
        .attr('stroke-width', 8) // w(element[2]))
        .attr(
          'd',
          d3
            .line()
            .x(function (d) {
              return x(d.x);
            })
            .y(function (d) {
              if (d.x == 0) {
                return yl(d.y);
              } else {
                return yr(d.y);
              }
            })
        )
        .on('mouseover', function (event, d) {
          d3.select(this).attr('stroke', hoverColor).attr('class', 'path-hover');
          div.transition().duration(200).style('opacity', 0.9);
          div.html(() => {
            console.log(event);
            let text = `<b> ${header1}:</b> ${d[0].meta.label0} <br>
                <b> ${header2}:</b> ${d[0].meta.label1} <br>
                ${d[0].meta.displayValue.text} ${d[0].meta.displayValue.suffix ? d[0].meta.displayValue.suffix : ''}`;
            return text;
          });
          div
            .style('left', (event.pageX + 15) + 'px')
            .style('top', (event.pageY - 10) + 'px');
        })
        .on('mouseout', function (event, d) {
          div.transition().duration(500).style('opacity', 0).attr('transform', 'translate(0, 0)');
          d3.select(this).attr('stroke', () => {
            return d[0].meta.color;
          });
        });
    });

    // Add axis labels
    svg
      .append('text')
      .attr('class', 'header-text')
      .attr('transform', 'translate(' + -(margin.left / 2) + ',' + -(margin.top / 2) + ')') // above left axis
      .attr('text-anchor', 'center')
      .text(header1)
      .attr('fill', headerColor);

    svg
      .append('text')
      .attr('class', 'header-text')
      .attr('transform', 'translate(' + (width + margin.right / 5) + ',' + -(margin.top / 2) + ')') // above right axis
      .attr('text-anchor', 'center')
      .text(header2)
      .attr('fill', headerColor);
  }
}
