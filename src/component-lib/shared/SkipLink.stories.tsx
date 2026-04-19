import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect, userEvent, within } from 'storybook/test';
import { SkipLink } from './SkipLink';

function SkipLinkStoryHarness() {
  return (
    <div className="min-h-[420px] bg-theme text-theme-primary">
      <SkipLink />

      <header className="border-b border-theme bg-theme-elevated/60 px-4 py-4">
        <div className="mx-auto max-w-3xl space-y-2">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-theme-tertiary">
            Accessibility utility
          </p>
          <div className="space-y-1">
            <h1 className="text-2xl font-semibold">Skip link preview</h1>
            <p className="text-sm text-theme-secondary">
              Press Tab in the canvas to reveal the link and verify keyboard
              users can jump directly to the main content landmark.
            </p>
          </div>
        </div>
      </header>

      <main
        id="main-content"
        tabIndex={-1}
        className="mx-auto max-w-3xl px-4 py-10"
      >
        <section className="rounded-2xl border border-theme bg-theme-elevated p-6 shadow-sm">
          <h2 className="text-lg font-semibold">Main content target</h2>
          <p className="mt-2 text-sm text-theme-secondary">
            Storybook provides the required <code>#main-content</code> anchor so
            the skip link can be reviewed in isolation.
          </p>
        </section>
      </main>
    </div>
  );
}

const meta: Meta<typeof SkipLink> = {
  title: 'Component Lib/Shared/SkipLink',
  component: SkipLink,
  tags: ['autodocs'],
  parameters: {
    layout: 'fullscreen',
    docs: {
      description: {
        component:
          'Keyboard-accessible skip link that targets `#main-content`. Stories include the required anchor target so focus and navigation behavior can be reviewed in isolation.',
      },
    },
  },
  render: () => <SkipLinkStoryHarness />,
};

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const KeyboardReveal: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const skipLink = canvas.getByRole('link', { name: 'Skip to main content' });

    await expect(skipLink).toHaveAttribute('href', '#main-content');
    await userEvent.tab();
    await expect(skipLink).toHaveFocus();
    await expect(skipLink).toBeVisible();
  },
};
