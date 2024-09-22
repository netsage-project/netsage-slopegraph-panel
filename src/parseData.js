import { DataFrameView } from '@grafana/data';

/**
 *
 * @param data - the data returned from Grafana panel query
 * @param numPairs - the number of lines to display, this is set in the options tab
 * @returns parsed data for RenderGraph.js to use to render slope graph
 */

export function parseData(data, numPairs) {
  let dataSeries = data.series;
  if (dataSeries.length == 0) {
    console.error('no data');
    return [];
  }

// extract all data
  var transformedData = [];
  dataSeries.forEach((series) => {
    const thisFrame = new DataFrameView(series);
    const thisName = thisFrame.data.name ? thisFrame.data.name : thisFrame.data.refId;
    const thisValueField = thisFrame.data.fields.find((field) => field.type === 'number');
    let thisValues = [];
    thisFrame.forEach((row) => {
      transformedData.push({
        col1: row[0],
        col2: row[1],
        valueRaw: row[thisValueField.name],
        valueDisplay: thisValueField.display(row[thisValueField.name]),
      });
    });
  });

  // sort all pairs and take top n (set by options panel)
  let sortedPairs = transformedData.sort((a, b) => b.valueRaw - a.valueRaw);
  let topPairs = sortedPairs.slice(0, Math.min(numPairs, sortedPairs.length));

  // MAKE KEYS and add meta data
  let leftKeys = [];
  let rightKeys = [];
  for (var i in topPairs) {
    let newLKey = topPairs[i].col1;
    let newRKey = topPairs[i].col2;
    let lAdded = false;
    let rAdded = false;
    topPairs[i].coords = [
      {
        meta: {
          value: topPairs[i].valueRaw,
          displayValue: topPairs[i].valueDisplay,
          label0: newLKey,
          label1: newRKey,
          color: topPairs[i].valueDisplay.color,
        },
        x: 0, // left side
      },
      { x: 1 }, // right side
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

  let objToReturn = {
    leftKeys: leftKeys,
    rightKeys: rightKeys,
    topPairs: topPairs,
  };

  return objToReturn;
}
