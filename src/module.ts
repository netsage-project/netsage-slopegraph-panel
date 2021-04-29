import { FieldConfigProperty, PanelPlugin } from '@grafana/data';
import { SlopeGraphOptions } from './types';
import { SlopeGraphPanel } from './SlopeGraphPanel';
import { standardOptionsCompat } from 'grafana-plugin-support';

const buildStandardOptions = (): any => {
  const options = [FieldConfigProperty.Unit, FieldConfigProperty.Color];
  return standardOptionsCompat(options);
};

export const plugin = new PanelPlugin<SlopeGraphOptions>(SlopeGraphPanel)
  .useFieldConfig({
    standardOptions: buildStandardOptions(),
  })
  .setPanelOptions(builder => {
    return builder
      .addNumberInput({
        path: 'numLines',
        name: 'Number of lines to display',
        defaultValue: 10,
      })
      .addTextInput({
        path: 'leftHeader',
        name: 'Left column header',
        defaultValue: 'Left Title',
      })
      .addTextInput({
        path: 'rightHeader',
        name: 'Right column header',
        defaultValue: 'Right Title',
      })
      .addColorPicker({
        path: 'headerColor',
        name: 'Header color',
        defaultValue: 'black',
      })
      .addSelect({
        path: 'colorPalette',
        name: 'Color palette',
        settings: {
          options: colorPalettes,
        },
        defaultValue: 'interpolateBlues',
      })
      .addBooleanSwitch({
        path: 'invertColorPalette',
        name: 'Invert color palette',
        defaultValue: false,
      })
      .addColorPicker({
        path: 'hoverColor',
        name: 'Hover color',
        defaultValue: 'red',
      });
  });

const colorPalettes = [
  { label: 'Blues', value: 'interpolateBlues' },
  { label: 'Greens', value: 'interpolateGreens' },
  { label: 'Greys', value: 'interpolateGreys' },
  { label: 'Oranges', value: 'interpolateOranges' },
  { label: 'Purples', value: 'interpolatePurples' },
  { label: 'Reds', value: 'interpolateReds' },
  { label: 'BuGn', value: 'interpolateBuGn' },
  { label: 'BuPu', value: 'interpolateBuPu' },
  { label: 'GnBu', value: 'interpolateGnBu' },
  { label: 'OrRd', value: 'interpolateOrRd' },
  { label: 'PuBuGn', value: 'interpolatePuBuGn' },
  { label: 'PuBu', value: 'interpolatePuBu' },
  { label: 'PuRd', value: 'interpolatePuRd' },
  { label: 'RdPu', value: 'interpolateRdPu' },
  { label: 'YlGnBu', value: 'interpolateYlGnBu' },
  { label: 'YlGn', value: 'interpolateYlGn' },
  { label: 'YlOrBr', value: 'interpolateYlOrBr' },
  { label: 'YlOrRd', value: 'interpolateYlOrRd' },
];
