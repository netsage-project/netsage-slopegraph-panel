[![CI](https://github.com/netsage-project/netsage-slopegraph-panel/actions/workflows/ci.yml/badge.svg)](https://github.com/netsage-project/netsage-slopegraph-panel/actions/workflows/ci.yml)

[![Release](https://github.com/netsage-project/netsage-slopegraph-panel/actions/workflows/release.yml/badge.svg)](https://github.com/netsage-project/netsage-slopegraph-panel/actions/workflows/release.yml)

# Slope Graph Panel

This panel produces a slope graph of pairs produced by the query.  It automatically sorts them in descending order by value. This type of slope graph is most useful for looking at the relationship between two categories.


## How it works

The Slope Graph Panel requires two columns of data a start and end for each path. 

![](https://github.com/netsage-project/netsage-slopegraph-panel/blob/master/src/img/slopegraph.png?raw=true)

#### Variables
The left axis will be drawn using the labels from the first column of data and the right will be drawn with the second column.
The **Number of lines to display** variable in the options panel allows you to display LESS data than you queried.  For example, if you wanted to show only the top 10 pairs of a set of data, you can query a large set, but only display the top 10 lines.  The panel will always sort by the metric value selected and display the top N lines as chosen.

The **Left column header** and **Right column header** will display at the top of the left and right axis and can be left blank if you do not want axis labels.  **Header color** sets the font color of these labels.

The **Color palette** variable allows you to choose the color palette to color the paths.  The panel chooses the color from the palette on a scale proportionate to the values returned by the query.  **Invert Color Palette** inverses the order of the colors in the palette.

Lastly, **Hover color** allows you to set the color the path will turn when hovered over with a mouse.

## Building Instructions

To build the code, Docker needs to be installed

1. `docker-compose build`
2. `docker-compose up --abort-on-container-exit`

This will generate the built binaries in the dist directory