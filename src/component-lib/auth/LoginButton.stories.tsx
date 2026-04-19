import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect, fn, userEvent, within } from 'storybook/test';
import { LoginButton, type LoginButtonProps } from './LoginButton';

const onClickSpy = fn();

const meta = {
  title: 'Component Lib/Auth/LoginButton',
  component: LoginButton,
  tags: ['autodocs'],
  parameters: {
    docs: {
      description: {
        component:
          'Google sign-in action used by the auth guard. Stories cover the default label and the loading-disabled state, with interaction verification on the primary button.',
      },
    },
  },
  args: {
    onClick: onClickSpy,
    isLoading: false,
  },
} satisfies Meta<typeof LoginButton>;

export default meta;

type Story = StoryObj<LoginButtonProps>;

export const Default: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await userEvent.click(canvas.getByRole('button', { name: /sign in with google/i }));
    await expect(onClickSpy).toHaveBeenCalledTimes(1);
  },
};

export const Loading: Story = {
  args: {
    isLoading: true,
  },
};
