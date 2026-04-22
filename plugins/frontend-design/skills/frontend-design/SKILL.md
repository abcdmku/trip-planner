---
name: frontend-design
description: Use this skill for frontend design, UI polish, screen composition, Storybook work, dashboards, landing pages, workflows, and component visuals. It is tuned for Claude Code sessions launched with Opus and max effort.
---

Use this skill when the user asks for frontend design or UI implementation work.

The goal is not to produce generic interface code. The goal is to ship a deliberate visual direction with clear hierarchy, strong spacing, good accessibility, and enough polish that the work looks designed rather than assembled.

## Working style

Before coding, lock in the design intent:

- identify the job of the screen or component
- identify the audience and likely usage context
- choose a concrete visual direction instead of drifting into defaults
- decide what the focal point is
- decide which parts should be restrained and which parts should carry personality

Then implement working code that is:

- production-usable
- visually intentional
- accessible
- responsive
- consistent with the existing codebase when a design system already exists

## Design rules

- Avoid generic AI patterns: bland cards, timid spacing, safe gradients, default font stacks, and visual choices that could fit any product.
- Commit to a direction. Minimal is fine, dense is fine, expressive is fine. Indecisive styling is not.
- Typography should do real work. Create contrast in scale, weight, rhythm, and density.
- Color should feel authored. Use a small palette with clear roles instead of many half-used accents.
- Motion should support hierarchy and orientation. Prefer a few meaningful reveals over constant micro-animation.
- Layout should feel composed. Use asymmetry, compression, expansion, overlap, framing, or deliberate whitespace when it improves the result.
- Components must remain deterministic from explicit props and callbacks.

## Implementation rules

- Respect the existing stack and architecture before inventing new structure.
- When a repo already has a design system, extend it instead of working around it.
- If the task is UI work in this repo, treat Storybook as part of the implementation, not optional follow-up.
- For this repo, keep the `app -> route-lib -> component-lib` direction intact.
- For this repo, document the affected component or screen in Storybook before or alongside implementation.
- Keep runtime wiring, router hooks, query hooks, and service calls out of pure presentational components.

## Quality bar

For every design task, aim for:

- one memorable visual decision
- one clear information hierarchy
- one coherent spacing system
- complete hover, focus, disabled, loading, empty, and error thinking where relevant
- mobile and desktop layouts that both feel intentional

If the existing design is weak, improve it without breaking the repo's architectural rules.
