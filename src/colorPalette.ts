import * as d3 from 'd3';

type Interpolator = (t: number) => string;

interface FindColorPalette {
    [name: string]: Interpolator;
}

const interpolators: FindColorPalette = {
    // D3 interpolators
    interpolateBlues: d3.interpolateBlues,
    interpolateGreens: d3.interpolateGreens,
    interpolateGreys: d3.interpolateGreys,
    interpolateOranges: d3.interpolateOranges,
    interpolatePurples: d3.interpolatePurples,
    interpolateReds: d3.interpolateReds,
    interpolateBuGn: d3.interpolateBuGn,
    interpolateBuPu: d3.interpolateBuPu,
    interpolateGnBu: d3.interpolateGnBu,
    interpolateOrRd: d3.interpolateOrRd,
    interpolatePuBuGn: d3.interpolatePuBuGn,
    interpolatePuBu: d3.interpolatePuBu,
    interpolatePuRd: d3.interpolatePuRd,
    interpolateRdPu: d3.interpolateRdPu,
    interpolateYlGnBu: d3.interpolateYlGnBu,
    interpolateYlGn: d3.interpolateYlGn,
    interpolateYlOrBr: d3.interpolateYlOrBr,
    interpolateYlOrRd: d3.interpolateYlOrRd,
};

// makeColorPalette returns the color scale with the given min and max
export const makeColorPalette = (colorPalette: string, min: number, max: number): d3.ScaleSequential<string> => {
    return d3.scaleSequential(interpolators[colorPalette]).domain([min, max]);
};