const SHEET_ID_PATTERNS = [
  /\/spreadsheets\/d\/([a-zA-Z0-9-_]+)/,
  /[?&]id=([a-zA-Z0-9-_]+)/
];

export function parseSheetIdFromUrl(input: string): string | null {
  const trimmed = input.trim();

  for (const pattern of SHEET_ID_PATTERNS) {
    const match = trimmed.match(pattern);
    if (match?.[1]) {
      return match[1];
    }
  }

  if (/^[a-zA-Z0-9-_]{20,}$/.test(trimmed)) {
    return trimmed;
  }

  return null;
}
