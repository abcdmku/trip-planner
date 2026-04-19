import type { Decorator } from '@storybook/react';
import { SkipLink } from '@/component-lib/shared/SkipLink';
import {
  StorybookAppProviders,
  type StorybookAppContextOverrides,
} from './preview-helpers';

export const withAppProviders: Decorator = (Story, context) => {
  const theme = (context.globals.theme ?? 'light') as 'light' | 'dark' | 'system';
  const overrides = (context.parameters.appContext ?? {}) as StorybookAppContextOverrides;

  return (
    <StorybookAppProviders theme={theme} overrides={overrides}>
      <SkipLink />
      <Story />
    </StorybookAppProviders>
  );
};
