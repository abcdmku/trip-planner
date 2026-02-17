import { useState, useCallback } from 'react';
import { Check, AlertCircle, Clipboard, Link2, Loader2 } from 'lucide-react';

interface SheetUrlInputProps {
  onSubmit: (spreadsheetId: string) => void;
  isLoading?: boolean;
}

const SHEET_URL_RE = /\/spreadsheets\/d\/([a-zA-Z0-9_-]+)/;

function extractSpreadsheetId(url: string): string | null {
  const match = url.match(SHEET_URL_RE);
  return match ? match[1] : null;
}

export function SheetUrlInput({ onSubmit, isLoading = false }: SheetUrlInputProps) {
  const [url, setUrl] = useState('');
  const [touched, setTouched] = useState(false);

  const spreadsheetId = extractSpreadsheetId(url);
  const isValid = spreadsheetId !== null;
  const showError = touched && url.length > 0 && !isValid;

  const handlePaste = useCallback(async () => {
    try {
      const text = await navigator.clipboard.readText();
      setUrl(text);
      setTouched(true);
    } catch {
      // Clipboard not available
    }
  }, []);

  const handleSubmit = () => {
    if (spreadsheetId) {
      onSubmit(spreadsheetId);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && isValid) {
      handleSubmit();
    }
  };

  return (
    <div className="w-full max-w-lg">
      <label className="mb-2 block text-sm font-medium text-stone-600">
        Google Sheet URL
      </label>
      <div className="relative">
        <div className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2">
          <Link2 className="h-4 w-4 text-stone-300" />
        </div>
        <input
          type="url"
          value={url}
          onChange={(e) => {
            setUrl(e.target.value);
            setTouched(true);
          }}
          onKeyDown={handleKeyDown}
          placeholder="https://docs.google.com/spreadsheets/d/..."
          className={`w-full rounded-xl border bg-white py-3 pl-10 pr-24 text-sm text-stone-800 placeholder-stone-300 shadow-sm outline-none transition-all focus:ring-2 ${
            showError
              ? 'border-red-300 focus:border-red-400 focus:ring-red-100'
              : isValid && touched
                ? 'border-emerald-300 focus:border-emerald-400 focus:ring-emerald-100'
                : 'border-stone-200 focus:border-amber-400 focus:ring-amber-100'
          }`}
          aria-invalid={showError}
          aria-describedby={showError ? 'sheet-url-error' : undefined}
        />
        <div className="absolute right-2 top-1/2 flex -translate-y-1/2 items-center gap-1">
          {isValid && touched && (
            <Check className="h-4 w-4 text-emerald-500" aria-label="Valid URL" />
          )}
          {showError && (
            <AlertCircle className="h-4 w-4 text-red-400" aria-label="Invalid URL" />
          )}
          <button
            type="button"
            onClick={handlePaste}
            className="rounded-lg p-1.5 text-stone-300 transition-colors hover:bg-stone-100 hover:text-stone-500"
            title="Paste from clipboard"
            aria-label="Paste from clipboard"
          >
            <Clipboard className="h-4 w-4" />
          </button>
        </div>
      </div>

      {showError && (
        <p id="sheet-url-error" className="mt-1.5 text-xs text-red-400">
          Enter a valid Google Sheets URL
        </p>
      )}

      <button
        onClick={handleSubmit}
        disabled={!isValid || isLoading}
        className="mt-3 flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition-all hover:shadow-md hover:shadow-amber-200/50 disabled:opacity-40 disabled:shadow-none"
      >
        {isLoading ? (
          <>
            <Loader2 className="h-4 w-4 animate-spin" />
            Connecting...
          </>
        ) : (
          'Connect Sheet'
        )}
      </button>
    </div>
  );
}
