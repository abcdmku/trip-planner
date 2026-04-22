import type { Preview } from '@storybook/react-vite';
import { withAppProviders } from '../src/app/storybook/decorators';
import { storybookViewportOptions } from '../src/storybook/viewports';
import '../src/index.css';

const preview: Preview = {
  decorators: [withAppProviders],
  globalTypes: {
    theme: {
      description: 'Global theme for stories',
      toolbar: {
        title: 'Theme',
        icon: 'mirror',
        items: [
          { value: 'light', title: 'Light' },
          { value: 'dark', title: 'Dark' },
          { value: 'system', title: 'System' },
        ],
      },
    },
  },
  initialGlobals: {
    theme: 'light',
  },
  parameters: {
    controls: {
      matchers: {
        color: /(background|color)$/i,
        date: /Date$/i,
      },
    },
    a11y: {
      test: 'todo',
    },
    layout: 'fullscreen',
    viewport: {
      options: storybookViewportOptions,
    },
  },
};

export default preview;
