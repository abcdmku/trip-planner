# Trip Planner V1

React + Tailwind + Vite trip planning app with Google Maps + Google Sheets.

## Features

- Google OAuth sign-in and sheet-backed workspace lifecycle (create/load/save).
- Strict template schema for tabs: `Trip`, `Days`, `Items`, `Legs`, `History`, `Meta`.
- Place search and URL import helper using Google Maps data.
- Interactive map with markers and street-following route paths.
- Per-day timeline chart with drag-to-shift time ranges.
- Inline detail editing for notes (Markdown), photos, time windows, priority, and optional stops.
- Two optimizer modes:
  - `maximize_available_activities`
  - `minimize_travel_time`
- Last-write-wins persistence model with append-only history events.
- Day filtering, mobile tabbed views, sync and API usage indicators.

## Environment

Copy `.env.example` to `.env` and fill values:

- `VITE_GOOGLE_OAUTH_CLIENT_ID`
- `VITE_GOOGLE_MAPS_API_KEY`
- `VITE_GOOGLE_SHEETS_SCOPES`
- `VITE_APP_BASE_PATH`

If OAuth is not configured, the app runs with local demo storage for development.

## Scripts

- `npm run dev`
- `npm run lint`
- `npm run typecheck`
- `npm run test`
- `npm run build`

## Deployment

GitHub Actions includes:

- `ci.yml` for lint/typecheck/test/build.
- `deploy.yml` for GitHub Pages deployment.

For repository names other than `trip-planner`, update `VITE_APP_BASE_PATH` in `.env` and the deploy workflow.
