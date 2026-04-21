import path from 'node:path';
import { fileURLToPath } from 'node:url';
import type { StorybookConfig } from '@storybook/react-vite';
import { mergeConfig } from 'vite';

const storybookDir = path.dirname(fileURLToPath(import.meta.url));

const STORYBOOK_SHIM_FALLBACKS = new Map<string, string>([
  [
    '/node_modules/@storybook/global-dom-shim/dist/react-16.mjs',
    '/node_modules/@storybook/react-dom-shim/dist/react-16.mjs',
  ],
  [
    '/node_modules/@storybook/global-dom-shim/dist/react-18.mjs',
    '/node_modules/@storybook/react-dom-shim/dist/react-18.mjs',
  ],
]);

const config: StorybookConfig = {
  stories: ['../src/**/*.mdx', '../src/**/*.stories.@(ts|tsx)'],
  addons: [
    '@storybook/addon-docs',
    '@storybook/addon-a11y',
    '@storybook/addon-mcp',
    '@storybook/addon-vitest',
  ],
  framework: {
    name: '@storybook/react-vite',
    options: {},
  },
  docs: {
    autodocs: 'tag',
  },
  staticDirs: ['../public'],
  async viteFinal(config) {
    return mergeConfig(config, {
      plugins: [
        {
          name: 'storybook-global-dom-shim-fallback',
          configureServer(server) {
            server.middlewares.use((req, _res, next) => {
              const requestUrl = req.url;
              if (!requestUrl) {
                next();
                return;
              }

              const [pathname, query = ''] = requestUrl.split('?');
              const fallback = STORYBOOK_SHIM_FALLBACKS.get(pathname);
              if (!fallback) {
                next();
                return;
              }

              req.url = query ? `${fallback}?${query}` : fallback;
              next();
            });
          },
        },
      ],
      resolve: {
        alias: {
          '@': path.resolve(storybookDir, '../src'),
          '@app': path.resolve(storybookDir, '../src/app'),
          '@route-lib': path.resolve(storybookDir, '../src/route-lib'),
          '@component-lib': path.resolve(storybookDir, '../src/component-lib'),
          // Storybook 9 can request the legacy global-dom shim path on Windows.
          '@storybook/global-dom-shim/dist/react-16.mjs': path.resolve(
            storybookDir,
            '../node_modules/@storybook/react-dom-shim/dist/react-16.mjs',
          ),
          '@storybook/global-dom-shim/dist/react-18.mjs': path.resolve(
            storybookDir,
            '../node_modules/@storybook/react-dom-shim/dist/react-18.mjs',
          ),
          '@storybook/global-dom-shim': path.resolve(
            storybookDir,
            '../node_modules/@storybook/react-dom-shim',
          ),
        },
      },
    });
  },
};

export default config;
