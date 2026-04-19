import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect, fn, userEvent, within } from 'storybook/test';
import { ErrorRecovery, type ErrorRecoveryProps } from './ErrorRecovery';

const onRetrySpy = fn();
const onLogoutSpy = fn();
const onDismissSpy = fn();

const meta = {
  title: 'Component Lib/Sync/ErrorRecovery',
  component: ErrorRecovery,
  tags: ['autodocs'],
  parameters: {
    docs: {
      description: {
        component:
          'Recovery panel for generic failures and expired auth sessions. Stories cover both branches and the action buttons that route-lib would wire to retry or log out.',
      },
    },
  },
  args: {
    error: new Error('Unable to load trip data.'),
    onRetry: onRetrySpy,
    onLogout: onLogoutSpy,
    onDismiss: onDismissSpy,
  },
} satisfies Meta<typeof ErrorRecovery>;

export default meta;

type Story = StoryObj<ErrorRecoveryProps>;

export const GenericError: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await userEvent.click(canvas.getByRole('button', { name: /retry/i }));
    await userEvent.click(canvas.getByRole('button', { name: /dismiss/i }));
    await expect(onRetrySpy).toHaveBeenCalledTimes(1);
    await expect(onDismissSpy).toHaveBeenCalledTimes(1);
  },
};

export const SessionExpired: Story = {
  args: {
    error: new Error('401 token expired while syncing the workbook.'),
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await userEvent.click(canvas.getByRole('button', { name: /sign in again/i }));
    await expect(onLogoutSpy).toHaveBeenCalledTimes(1);
  },
};
