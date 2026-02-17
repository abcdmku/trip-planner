import { describe, expect, it } from 'vitest';
import { parseSheetIdFromUrl } from '../utils/sheetUrl';

describe('parseSheetIdFromUrl', () => {
  it('extracts sheet id from docs URL', () => {
    const id = parseSheetIdFromUrl('https://docs.google.com/spreadsheets/d/abc123DEF456/edit#gid=0');
    expect(id).toBe('abc123DEF456');
  });

  it('accepts raw sheet id', () => {
    const id = parseSheetIdFromUrl('1A2B3C4D5E6F7G8H9I0J1K2L3M4N5O6P');
    expect(id).toBe('1A2B3C4D5E6F7G8H9I0J1K2L3M4N5O6P');
  });

  it('returns null for invalid input', () => {
    expect(parseSheetIdFromUrl('not-a-sheet-url')).toBeNull();
  });
});
