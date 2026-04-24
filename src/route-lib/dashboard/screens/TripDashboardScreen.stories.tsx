import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect, fn, userEvent, within } from 'storybook/test';
import { TripDashboardScreen } from './TripDashboardScreen';
import type { TripListItem } from '@/types/api';

const demoTrips: TripListItem[] = [
  {
    id: 'trip-a',
    name: 'Chicago Food Weekend',
    baseTimezone: 'America/Chicago',
    startDate: '2026-05-12',
    endDate: '2026-05-15',
    role: 'owner',
    updatedAt: '2026-05-10T17:00:00.000Z',
  },
  {
    id: 'trip-b',
    name: 'Lakefront Sprint',
    baseTimezone: 'America/Chicago',
    startDate: '2026-06-01',
    endDate: '2026-06-03',
    role: 'editor',
    updatedAt: '2026-05-09T13:30:00.000Z',
  },
];
const dashboardCreateSpy = fn();

const meta = {
  title: 'Route Lib/Dashboard/TripDashboardScreen',
  component: TripDashboardScreen,
  tags: ['autodocs'],
  args: {
    trips: demoTrips,
    isLoadingTrips: false,
    tripsError: null,
    onCreateTrip: fn(),
    onOpenTrip: fn(),
  },
} satisfies Meta<typeof TripDashboardScreen>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const Empty: Story = {
  args: {
    trips: [],
  },
};

export const Loading: Story = {
  args: {
    trips: [],
    isLoadingTrips: true,
  },
};

export const Error: Story = {
  args: {
    trips: [],
    tripsError: 'Failed to load trips',
  },
};

export const DarkTheme: Story = {
  globals: {
    theme: 'dark',
  },
} as Story;

export const OpensCreateDialog: Story = {
  args: {
    onCreateTrip: dashboardCreateSpy,
  },
  play: async ({ canvasElement }) => {
    dashboardCreateSpy.mockClear();

    const canvas = within(canvasElement);
    await userEvent.click(canvas.getByRole('button', { name: 'Create New Trip' }));
    await expect(canvas.getByRole('dialog')).toBeInTheDocument();

    await userEvent.type(canvas.getByLabelText('Trip Name'), 'Storybook Sprint');
    await userEvent.type(canvas.getByLabelText('Start Date'), '2026-05-12');
    await userEvent.type(canvas.getByLabelText('End Date'), '2026-05-15');
    await userEvent.click(canvas.getByRole('button', { name: 'Create Trip' }));

    await expect(dashboardCreateSpy).toHaveBeenCalled();
  },
};
