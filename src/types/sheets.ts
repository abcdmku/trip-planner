export interface SheetTabSchema {
  name: string;
  columns: string[];
}

export interface SpreadsheetSchema {
  tabs: SheetTabSchema[];
}

export const TRIP_SCHEMA: SpreadsheetSchema = {
  tabs: [
    {
      name: 'Trip',
      columns: ['id', 'name', 'startDate', 'endDate', 'timezone'],
    },
    {
      name: 'Days',
      columns: ['dayId', 'date', 'label', 'colorHex', 'dayStart', 'dayEnd'],
    },
    {
      name: 'Items',
      columns: ['itemId', 'dayId', 'placeName', 'scheduledStart', 'scheduledEnd', 'durationMinutes'],
    },
  ],
};
