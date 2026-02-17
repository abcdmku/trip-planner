import type { TemplateValidationResult, TripWorkspace } from '../../types/domain';
import { createSeedWorkspace } from '../../data/seed';
import type { SavePayload, SheetsRepository } from './SheetsRepository';

const STORAGE_PREFIX = 'trip-planner-workspace:';

export class LocalSheetsRepository implements SheetsRepository {
  async createWorkspace(input: {
    tripName: string;
    timezone: string;
    actorEmail: string;
  }): Promise<TripWorkspace> {
    const workspace = createSeedWorkspace(`local-${Date.now()}`);
    workspace.trip.name = input.tripName;
    workspace.trip.baseTimezone = input.timezone;
    workspace.meta.lastUpdatedBy = input.actorEmail;
    await this.saveWorkspace(workspace.trip.sheetId, {
      trip: workspace.trip,
      days: workspace.days,
      items: workspace.items,
      legs: workspace.legs,
      meta: workspace.meta,
      historyEvents: workspace.history
    });
    return workspace;
  }

  async validateTemplate(sheetId: string): Promise<TemplateValidationResult> {
    const exists = localStorage.getItem(STORAGE_PREFIX + sheetId);
    if (!exists) {
      return {
        valid: false,
        missingTabs: ['local-storage-workspace-missing'],
        missingColumns: {}
      };
    }

    return {
      valid: true,
      missingTabs: [],
      missingColumns: {}
    };
  }

  async loadWorkspace(sheetId: string): Promise<TripWorkspace> {
    const value = localStorage.getItem(STORAGE_PREFIX + sheetId);
    if (!value) {
      throw new Error('Local workspace not found for that sheet id/url.');
    }
    return JSON.parse(value) as TripWorkspace;
  }

  async saveWorkspace(sheetId: string, payload: SavePayload): Promise<void> {
    const existing = localStorage.getItem(STORAGE_PREFIX + sheetId);
    const history = existing
      ? ([...((JSON.parse(existing) as TripWorkspace).history ?? []), ...payload.historyEvents] as TripWorkspace['history'])
      : payload.historyEvents;

    const workspace: TripWorkspace = {
      trip: payload.trip,
      days: payload.days,
      items: payload.items,
      legs: payload.legs,
      meta: payload.meta,
      history
    };

    localStorage.setItem(STORAGE_PREFIX + sheetId, JSON.stringify(workspace));
  }
}
