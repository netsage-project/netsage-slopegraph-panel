import { TimeRange, dateTime, dateTimeParse, DisplayProcessor, Field, getDisplayProcessor, display } from '@grafana/data';
import { makeColorPalette } from 'colorPalette';

/**
 *
 * @param data - the data returned from Grafana panel query
 * @param numPairs - the number of lines to display, this is set in the options tab
 * @returns parsed data for RenderGraph.js to use to render slope graph
 */

export function parseData(data, numPairs, colorPalette, invertColorPalette) {

  // Find the number field and use for values.
  const valueField = data.series
    .map(series => series.fields.find(field => field.type === 'number'));
  let values = [];
  valueField[0].values.buffer.map(value => {
    values.push([value, valueField[0].display(value)]);
  })

  // series[0].fields[x].values.buffer gives data
  // x = 0: left column terms, 1: right column terms
  var extractedData = data.series[0].fields;
  var transformedData = [];

  for (var i = 0; i < extractedData[0].values.buffer.length; i++) {

    var row = [extractedData[0].values.buffer[i], extractedData[1].values.buffer[i], values[i][0], values[i][1]];
    transformedData.push(row);
  }

  let sortedPairs = transformedData.sort((a, b) => b[2] - a[2]);

  // topPairs is set by editor.  Default is 10.
  let topPairs = sortedPairs.slice(0, Math.min(numPairs, sortedPairs.length));

  // MAKE KEYS
  let leftKeys = [];
  let rightKeys = [];
  for (var i in topPairs) {
    let newLKey = topPairs[i][0];
    let newRKey = topPairs[i][1];
    let lAdded = false;
    let rAdded = false;
    topPairs[i].coords = [{
      meta: {
        value: topPairs[i][2],
        displayValue: topPairs[i][3],
        label0: newLKey,
        label1: newRKey
      },
      x: 0 // left side
    },
    { x: 1 } // right side
  ];
    for (var j in leftKeys) {
      if (leftKeys[j] == newLKey) {
        lAdded = true;
        topPairs[i].coords[0].y = parseInt(j);
        break;
      }
    }
    if (!lAdded) {
      leftKeys.push(newLKey);
      topPairs[i].coords[0].y = leftKeys.length - 1;
    }

    for (var j in rightKeys) {
      if (rightKeys[j] == newRKey) {
        rAdded = true;
        topPairs[i].coords[1].y = parseInt(j);
        break;
      }
    }
    if (!rAdded) {
      rightKeys.push(newRKey);
      topPairs[i].coords[1].y = rightKeys.length - 1;
    }
  }

  // tick marks at leftKeys & rightKeys,

  let maxValue = topPairs[0][2];
  let minValue = topPairs[topPairs.length - 1][2];
  // Create the scale we'll be using to map values to colors.
  let colorScale = invertColorPalette
    ? makeColorPalette(colorPalette, maxValue, minValue) : makeColorPalette(colorPalette, minValue, maxValue);

  for (var i = 0; i < topPairs.length; i++) {
    // add color to coords
    topPairs[i].coords[0].meta.color = colorScale(topPairs[i].coords[0].meta.value)
  }



  let objToReturn = {
    leftKeys: leftKeys,
    rightKeys: rightKeys,
    topPairs: topPairs
  };

  return objToReturn;
}
