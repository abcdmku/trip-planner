import { INITIAL_VIEWPORTS, type ViewportMap } from 'storybook/viewport';

export const MOBILE_VIEWPORT_KEY = 'plannerMobile';

export const storybookViewportOptions = {
  ...INITIAL_VIEWPORTS,
  [MOBILE_VIEWPORT_KEY]: {
    name: 'Trip Planner Mobile',
    styles: {
      width: '390px',
      height: '844px',
    },
    type: 'mobile',
  },
} satisfies ViewportMap;

export const mobileStoryGlobals = {
  viewport: {
    value: MOBILE_VIEWPORT_KEY,
    isRotated: false,
  },
} as const;
