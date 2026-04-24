import { useCallback, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import type { DataTransferStatus } from '@component-lib/layout/DataTransferMenu';
import { restoreTripSnapshot } from '@/services/api-client';
import { getTripQueryKey } from '@/stores/trip-store';
import type { TripData } from '@/types/trip';
import {
  buildTripDataExportFile,
  createTripDataFilename,
  parseTripDataImport,
} from '../helpers/tripDataTransfer';

interface UseTripDataTransferParams {
  tripId: string;
  tripData: TripData | null;
  tripName?: string | null;
}

interface TripDataTransferState {
  status: DataTransferStatus;
  message: string | null;
}

function getErrorMessage(error: unknown): string {
  return error instanceof Error ? error.message : 'Unable to update data.';
}

function downloadJsonFile(payload: unknown, filename: string): void {
  const blob = new Blob([JSON.stringify(payload, null, 2)], {
    type: 'application/json;charset=utf-8',
  });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');

  link.href = url;
  link.download = filename;
  link.rel = 'noopener';
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

export function useTripDataTransfer({ tripId, tripData, tripName }: UseTripDataTransferParams) {
  const queryClient = useQueryClient();
  const [state, setState] = useState<TripDataTransferState>({
    status: 'idle',
    message: null,
  });

  const exportData = useCallback(() => {
    if (!tripData) {
      setState({
        status: 'error',
        message: 'Trip data is still loading.',
      });
      return;
    }

    setState({ status: 'exporting', message: null });

    try {
      const exportFile = buildTripDataExportFile(tripData);
      downloadJsonFile(exportFile, createTripDataFilename(tripName ?? tripData.trip.name));
      setState({
        status: 'success',
        message: 'Exported data.',
      });
    } catch (error) {
      setState({
        status: 'error',
        message: getErrorMessage(error),
      });
    }
  }, [tripData, tripName]);

  const loadData = useCallback(
    async (file: File) => {
      try {
        const jsonText = await file.text();
        const snapshot = parseTripDataImport(jsonText, tripId);
        const confirmed =
          typeof window === 'undefined' ||
          window.confirm('Load this file and replace the current trip data?');

        if (!confirmed) {
          setState({ status: 'idle', message: null });
          return;
        }

        setState({ status: 'loading', message: null });
        const restored = await restoreTripSnapshot(tripId, snapshot);
        queryClient.setQueryData(getTripQueryKey(tripId), restored);
        setState({
          status: 'success',
          message: 'Loaded data.',
        });
      } catch (error) {
        setState({
          status: 'error',
          message: getErrorMessage(error),
        });
      }
    },
    [queryClient, tripId],
  );

  return {
    status: state.status,
    message: state.message,
    isBusy: state.status === 'exporting' || state.status === 'loading',
    exportData,
    loadData,
  };
}
