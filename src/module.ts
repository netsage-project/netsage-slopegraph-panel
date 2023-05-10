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
      .addNumberInput({
        path: 'txtLength',
        name: 'Label Text Length',
        description: 'Labels longer than this will be truncated',
        defaultValue: 20,
      })
      .addNumberInput({
        path: 'fontSize',
        name: 'Label Font Size',
        defaultValue: 12,
      })
      .addColorPicker({
        path: 'headerColor',
        name: 'Header color',
        defaultValue: 'text',
      })
      .addColorPicker({
        path: 'hoverColor',
        name: 'Hover color',
        defaultValue: 'red',
      });
  });

