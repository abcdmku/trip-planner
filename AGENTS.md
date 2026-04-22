# AGENTS

## Purpose

This repo must use Storybook as the default workflow for all UI work. UI changes are not complete until the relevant component or screen is documented, isolated, and reviewable in Storybook.

Storybook references:

- https://storybook.js.org/docs/
- https://storybook.js.org/docs/writing-stories/build-pages-with-storybook
- https://storybook.js.org/docs/writing-stories/typescript
- https://storybook.js.org/docs/writing-tests/interaction-testing
- https://storybook.js.org/docs/writing-stories/mocking-data-and-modules/mocking-network-requests
- https://storybook.js.org/docs/writing-docs/autodocs
- https://storybook.js.org/docs/writing-docs
- https://storybook.js.org/docs/ai/mcp/overview

## Non-negotiable architecture

The frontend must converge on this dependency chain:

`app -> route-lib -> component-lib`

Reverse imports are not allowed.

### `app`

The app layer is a thin runtime shell.

Allowed responsibilities:

- bootstrapping React
- provider wiring
- query client wiring
- auth, realtime, and theme provider setup
- router mounting
- environment and runtime setup
- global CSS and top-level Storybook-compatible decorators

Not allowed:

- page-specific orchestration
- feature state machines
- business-specific view logic
- direct rendering of feature screens outside route entrypoints
- direct imports of leaf components except app-wide providers or route-lib entrypoints

### `route-lib`

The route lib owns route definitions and connected screen composition.

Allowed responsibilities:

- route configuration
- route-level hooks, loaders, actions, and adapters
- react-query wiring
- context-to-prop adapters
- mapping domain models into UI view models
- composing `component-lib` pieces into screens
- providing mocked route-level states for Storybook

Not allowed:

- low-level visual primitives that should live in `component-lib`
- app bootstrap concerns
- implicit coupling back to `app`

### `component-lib`

The component lib owns isolated UI components and design-system-backed composites.

Allowed responsibilities:

- visual primitives
- reusable composites
- accessibility behavior
- local presentational state
- explicit callback interfaces
- design tokens and shared UI helpers
- story fixtures, docs, and interaction stories

Not allowed:

- router hooks
- react-query hooks
- direct API or repository calls
- direct app context reads
- websocket setup
- auth/session orchestration
- hidden runtime dependencies

If a component needs app data, route context, query state, or service calls, create a route-lib container or adapter for it.

## Storybook-first UI workflow

For any UI-related change:

1. Start by identifying the affected component-lib component or route-lib screen.
2. Add or update Storybook stories before or alongside the implementation.
3. Build the UI in isolation first, then wire it into route-lib, then mount it through the thin app shell.
4. Keep runtime-specific wiring out of component stories by using decorators, loaders, args, and mocks.
5. If Storybook MCP is configured and available, use it before making UI changes so the current stories and docs drive the implementation.

For responsive and mobile UI work:

- use Storybook viewport support as the source of truth for mobile rendering
- prefer shared viewport presets and story-level `globals.viewport` configuration for mobile variants
- do not fake mobile behavior with canvas width hacks, breakpoint-bypassing CSS overrides, or desktop-only wrappers when the goal is to verify responsive breakpoints
- only use width-constraining wrappers for natural content framing, not to force `sm`/`md`/`lg` state changes that should come from the actual viewport

## Story requirements

Every component-lib component and every route-lib screen must have typed Storybook stories in TypeScript.

At minimum, stories must cover the relevant set of:

- default state
- empty state
- loading state
- error state
- success state
- disabled/read-only state
- selected/active/focused state
- edge-case content
- responsive layout changes
- theme variants when applicable
- collaborative/presence states when applicable

Use Storybook `args` to represent variants instead of duplicating similar story implementations.

When a story is meant to represent a mobile-specific or responsive breakpoint state, the story must activate that state through Storybook viewport configuration instead of relying on ad hoc container widths alone.

Use `play` functions for user interaction coverage whenever behavior depends on clicks, typing, keyboard flow, drag state, popovers, dialogs, or async transitions.

Use mocked data for all external interactions. Network-bound screens and components must use Storybook-friendly mocks, preferably MSW-based request handlers, instead of real backend calls.

## Documentation requirements

Components must document:

- supported variants
- prop contract
- required accessibility behavior
- interactive states
- empty/loading/error expectations
- responsive behavior
- design token usage
- any route-lib adapter needed to connect the component to live data

Use autodocs by default. Add MDX docs when usage rules, anatomy, or design-system guidance needs prose beyond the generated docs page.

## Design system rules

Follow standard design-system discipline:

- compose from reusable primitives instead of duplicating markup
- prefer explicit variants over ad hoc boolean styling branches scattered across screens
- use shared tokens for color, spacing, typography, radius, elevation, and motion
- keep naming stable and predictable
- make visual states testable and story-driven
- design for accessibility first, not as a cleanup step
- keep components deterministic from props plus explicit callbacks
- keep domain formatting and data adaptation outside pure presentational components

Do not introduce one-off visual patterns in route modules when they belong in the shared component library.

## Repo-specific guardrails

This repo currently violates the target pattern in a few places. Going forward:

- Do not add new UI work directly to `src/App.tsx`.
- Move router creation out of `src/App.tsx` into the thin app layer plus route-lib modules.
- Keep `src/main.tsx` and its replacement app entry focused on providers and router mounting only.
- Treat `AppShell` as controlled chrome. It should receive active tab, layout mode, widths, scroll positions, and slot content as props instead of owning route-level workspace state through app hooks.
- Treat large connected files such as `src/components/items/AddItemDialog.tsx`, `src/components/items/ItemDetailCard.tsx`, `src/components/map/MapShell.tsx`, and `src/components/timeline/vertical/VerticalTimelineRoot.tsx` as extraction targets, not permanent architecture.
- Keep realtime, auth, query, and repository concerns in app or route-lib adapters.
- Reuse the existing theme token system from `src/index.css` and expose it through Storybook decorators.

## Definition of done for UI work

A UI change is done only when all of the following are true:

- the thin app / route-lib / component-lib boundary is respected
- the affected component or screen is isolated in Storybook
- all relevant variants are documented
- all relevant interactions are mocked and demonstrated
- accessibility-critical behavior is covered
- the app integration only wires existing route-lib and component-lib pieces together
