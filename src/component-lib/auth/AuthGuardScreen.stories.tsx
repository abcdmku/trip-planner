import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect, fn, userEvent, within } from 'storybook/test';
import { mobileStoryGlobals } from '@/storybook/viewports';
import { AuthGuardScreen } from './AuthGuardScreen';

const onLoginSpy = fn();

const meta = {
  title: 'Component Lib/Auth/AuthGuardScreen',
  component: AuthGuardScreen,
  tags: ['autodocs'],
  parameters: {
    layout: 'fullscreen',
    docs: {
      description: {
        component:
          'Full-screen auth threshold for the planner shell. Stories cover the atmospheric signed-out state, the loading handoff, custom copy, and a dedicated mobile viewport so the responsive spacing can be reviewed in isolation.',
      },
    },
  },
  args: {
    mode: 'signedOut',
    onLogin: onLoginSpy,
    isLoginLoading: false,
    appName: 'Trip Planner',
    heading: 'Trip Planner',
    description: 'Plan trips with shared editing, live presence, and a real database.',
    supportNote: 'Google sign-in is handled server-side',
  },
} satisfies Meta<typeof AuthGuardScreen>;

export default meta;

type Story = StoryObj<typeof meta>;

export const SignedOut: Story = {};

export const Loading: Story = {
  args: {
    mode: 'loading',
  },
};

export const CustomCopy: Story = {
  args: {
    appName: 'Trail Notes',
    heading: 'Trail Notes',
    description: 'A focused planning shell for shared hiking itineraries.',
    supportNote: 'Authentication happens through the backend session.',
  },
};

export const DarkSignedOut = {
  globals: {
    theme: 'dark',
  },
} as Story;

export const MobileSignedOut = {
  globals: mobileStoryGlobals,
} as Story;

export const SignInInteraction: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await userEvent.click(canvas.getByRole('button', { name: /sign in with google/i }));
    await expect(onLoginSpy).toHaveBeenCalledTimes(1);
  },
};
