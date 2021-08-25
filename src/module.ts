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
  .setPanelOptions((builder) => {
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
      .addColorPicker({
        path: 'hoverColor',
        name: 'Hover color',
        defaultValue: 'red',
      });
  });
