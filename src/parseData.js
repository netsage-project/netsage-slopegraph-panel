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

  // Custom NetSage Blues
  if (colorPalette == "customNetSage") {
    let alpha = 0.6
    let color_palette = [
        "rgba(196, 199, 254, " + alpha + ")",
        "rgba(171, 176, 253, " + alpha + ")",
        "rgba(146, 152, 248, " + alpha + ")",
        "rgba(122, 130, 246, " + alpha + ")",
        "rgba(106, 115, 245, " + alpha + ")",
        "rgba(85, 95, 244, " + alpha + ")",
        "rgba(56, 67, 241, " + alpha + ")",
        "rgba(23, 36, 238, " + alpha + ")",
        "rgba(2, 14, 202, " + alpha + ")",
        "rgba(3, 12, 158, " + alpha + ")"]

    let max_value = topPairs[0].coords[0].meta.value
    for (var i = 0; i < topPairs.length; i++) {
      let color_scale = Math.ceil(topPairs[i].coords[0].meta.value / max_value * 10)
        if (color_scale > 0) {
            color_scale--;
        }
      // add color to coords
      topPairs[i].coords[0].meta.color = color_palette[color_scale];
    }
  } else {
    let colorScale = invertColorPalette
    ? makeColorPalette(colorPalette, maxValue, minValue) : makeColorPalette(colorPalette, minValue, maxValue);
    for (var i = 0; i < topPairs.length; i++) {
      // add color to coords
      topPairs[i].coords[0].meta.color = colorScale(topPairs[i].coords[0].meta.value)
    }
  }


  let objToReturn = {
    leftKeys: leftKeys,
    rightKeys: rightKeys,
    topPairs: topPairs
  };

  return objToReturn;
}
