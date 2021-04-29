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

  renderGraph(parsedData, header1, header2, headerColor, hoverColor) {
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

    let topPairs = parsedData.topPairs;
    let leftKeys = parsedData.leftKeys;
    let rightKeys = parsedData.rightKeys;
    let alpha = parsedData.alpha;

    //let min_value = topPairs[topPairs.length - 1][2]
    //let max_value = topPairs[0][2]

    console.log('rendering Graph...');

    let panelWidth = document.getElementById(this.containerID).offsetWidth;
    let panelHeight = document.getElementById(this.containerID).offsetHeight;

    // set the dimensions and margins of the graph
    var margin = { top: 50, right: 400, bottom: 25, left: 400 },
      width = panelWidth - margin.left - margin.right,
      height = panelHeight - margin.top - margin.bottom;

    // append the svg object to the body of the page
    var svg = d3
      .select('#' + this.containerID)
      .append('svg')
      .attr('width', width + margin.left + margin.right)
      .attr('height', height + margin.top + margin.bottom)
      .append('g')
      .attr('transform', 'translate(' + margin.left + ',' + margin.top + ')');

    // function to wrap text!
    function wrap(text, width) {
      text.each(function() {
        var text = d3.select(this),
          words = text
            .text()
            .split(/\s+/)
            .reverse(),
          word,
          line = [],
          lineNumber = 0,
          lineHeight = 1.1, // ems
          y = text.attr('y'),
          dy = parseFloat(text.attr('dy')),
          tspan = text
            .text(null)
            .append('tspan')
            .attr('x', 0)
            .attr('y', y)
            .attr('dy', dy + 'em');
        while ((word = words.pop())) {
          line.push(word);
          tspan.text(line.join(' '));
          if (tspan.node().getComputedTextLength() > width) {
            line.pop();
            tspan.text(line.join(' '));
            line = [word];
            tspan = text
              .append('tspan')
              .attr('x', 0)
              .attr('y', y)
              .attr('dy', ++lineNumber * lineHeight + dy + 'em')
              .text(word);
          }
        }
      });
    }

    // Add X scale
    var x = d3
      .scaleLinear()
      .domain([0, 1])
      .range([0, width]);

    // y scales
    var yl = d3
      .scaleLinear()
      .domain([0, leftKeys.length - 1])
      .range([0, height]);

    var yr = d3
      .scaleLinear()
      .domain([0, rightKeys.length - 1])
      .range([0, height]);

    // Add Y axes
    var leftAxis = d3
      .axisLeft(yl)
      .tickSize(5)
      .ticks(leftKeys.length)
      .tickFormat(d => {
        return leftKeys[d];
      });

    var rightAxis = d3
      .axisRight(yr)
      .tickSize(5)
      .ticks(rightKeys.length)
      .tickFormat(d => {
        return rightKeys[d];
      });

    svg
      .append('g')
      .call(leftAxis)
      .attr('class', 'axis')
      .attr('margin', 10)
      .selectAll('.tick text')
      .call(wrap, margin.left - 50)
      .attr('transform', 'translate(' + -10 + ',0)');

    svg
      .append('g')
      .attr('transform', 'translate(' + width + ',0)')
      .call(rightAxis)
      .attr('class', 'axis')
      .selectAll('.tick text')
      .call(wrap, margin.right - 50)
      .attr('transform', 'translate(' + 10 + ',0)');

    // scale for width of lines
    var w = d3
      .scaleLinear()
      .domain([topPairs[topPairs.length - 1][2], topPairs[0][2]])
      .range([3, 15]);

    var div = d3
      .select('body')
      .append('div')
      .attr('class', 'tooltip')
      .style('opacity', 0);

    // Add the lines
    topPairs.forEach(function(element) {
      var value = element[2];

      svg
        .append('path')
        .datum(element.coords)
        .attr('fill', 'none')
        .attr('stroke', function(d) {
          return d[0].meta.color;
        })
        //() => {
        //     var alpha = 0.7; // w(element[2]) / 5;
        //     var color = "rgba(51, 102, 255," + alpha + ")";
        //     return color;
        // })
        .attr('stroke-width', 8) // w(element[2]))
        .attr(
          'd',
          d3
            .line()
            .x(function(d) {
              return x(d.x);
            })
            .y(function(d) {
              if (d.x == 0) {
                return yl(d.y);
              } else {
                return yr(d.y);
              }
            })
        )
        .on('mouseover', function(d) {
          d3.select(this)
            .attr('stroke', hoverColor)
            .attr('class', 'path-hover');
          div
            .transition()
            .duration(200)
            .style('opacity', 0.9);
          div
            .html(() => {
              var text =
                '<p><b>' +
                header1 +
                ': </b> ' +
                d[0].meta.label0 +
                '</p><p><b>' +
                header2 +
                ': </b> ' +
                d[0].meta.label1 +
                '</p><p>' +
                d[0].meta.displayValue.text +
                (d[0].meta.displayValue.suffix ? d[0].meta.displayValue.suffix : '');
              return text;
            })
            .style('left', d3.event.pageX + 'px')
            .style('top', d3.event.pageY - 28 + 'px');
        })
        .on('mouseout', function(d) {
          div
            .transition()
            .duration(500)
            .style('opacity', 0);
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
