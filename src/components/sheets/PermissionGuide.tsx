import { Shield, ExternalLink } from 'lucide-react';

interface PermissionGuideProps {
  spreadsheetId?: string;
}

export function PermissionGuide({ spreadsheetId }: PermissionGuideProps) {
  const sheetUrl = spreadsheetId
    ? `https://docs.google.com/spreadsheets/d/${spreadsheetId}`
    : null;

  return (
    <div className="rounded-xl border border-blue-200 bg-blue-50 p-4">
      <div className="flex items-center gap-2 text-sm font-semibold text-blue-800">
        <Shield className="h-4 w-4" />
        Permissions Required
      </div>
      <ul className="mt-2 space-y-1.5 text-xs text-blue-700">
        <li className="flex items-start gap-2">
          <span className="mt-0.5 h-1.5 w-1.5 flex-shrink-0 rounded-full bg-blue-400" />
          The app needs edit access to your Google Sheet to save itinerary data
        </li>
        <li className="flex items-start gap-2">
          <span className="mt-0.5 h-1.5 w-1.5 flex-shrink-0 rounded-full bg-blue-400" />
          Make sure the Sheet is shared with your Google account (the one you signed in with)
        </li>
        <li className="flex items-start gap-2">
          <span className="mt-0.5 h-1.5 w-1.5 flex-shrink-0 rounded-full bg-blue-400" />
          To share with others, give them editor access to the same Sheet
        </li>
      </ul>
      {sheetUrl && (
        <a
          href={sheetUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="mt-3 inline-flex items-center gap-1 text-xs font-medium text-blue-600 hover:text-blue-800"
        >
          Open Sheet
          <ExternalLink className="h-3 w-3" />
        </a>
      )}
    </div>
  );
}
