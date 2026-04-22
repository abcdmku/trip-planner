---
name: claude
description: Proxy the current request to the locally installed Claude CLI and return Claude's answer. Use only when the user explicitly asks to run something through Claude, compare Codex with Claude, or invokes `/claude` or `$claude`. This skill shells out to the local `claude` executable with `--print --model opus --effort max`, can optionally activate the repo-local `frontend-design` Claude plugin for UI work, and keeps Claude text-only by default unless the user explicitly asks for a more autonomous Claude run.
---

# Claude

Use this skill only for explicit Claude delegation.

This skill does not tell Codex to imitate Claude. It tells Codex to call the locally installed `claude` CLI and return the result.

## Workflow

1. Derive the Claude task from the user's current request.
2. Remove the explicit skill mention itself from the task text when needed.
3. If Claude needs repo context, gather the minimum relevant context first using Codex tools.
4. Build a self-contained prompt for Claude instead of giving Claude uncontrolled workspace access by default.
5. Run [`scripts/invoke-claude.ps1`](./scripts/invoke-claude.ps1) to execute the prompt with `claude --print --model opus --effort max`.
6. Return Claude's response to the user and clearly label it as Claude output when useful.

## Prompt Construction

Prefer a compact, direct prompt.

If the task depends on local code or files:

- inspect the relevant files with Codex first
- include only the essential paths, excerpts, and constraints in the Claude prompt
- avoid dumping whole files unless the user explicitly wants that

Use this pattern:

```text
You are helping with this repository task:

[brief task summary]

Relevant context:
- [path]: [important excerpt or summary]
- [path]: [important excerpt or summary]

Please answer concisely and focus on:
- [required output]
- [constraints]
```

## Safety Default

Default to text-only Claude execution.

Do not give Claude autonomous tool access unless the user explicitly asks for Claude to inspect files or act more independently. The wrapper script disables Claude tools by default, which keeps this skill deterministic and prevents nested file edits.

## Frontend Design Mode

For frontend, design, or UI requests, prefer the repo-local Claude frontend design plugin.

When the request is clearly UI work, run the wrapper with `-UseFrontendDesign`. That prefixes the Claude prompt with `/frontend-design` and loads the repo `plugins` directory so Claude can use the local design skill.

## Script Usage

Basic call:

```powershell
& .\.agents\skills\claude\scripts\invoke-claude.ps1 -Prompt "Summarize this architecture tradeoff"
```

Frontend design call:

```powershell
& .\.agents\skills\claude\scripts\invoke-claude.ps1 -UseFrontendDesign -Prompt "Redesign the trip timeline screen"
```

If quoting becomes awkward, pipe the prompt in:

```powershell
@'
Summarize the pros and cons of this refactor.
Focus on risk, migration cost, and likely regressions.
'@ | .\.agents\skills\claude\scripts\invoke-claude.ps1
```

## Response Style

After Claude returns:

- summarize or relay the answer directly
- call out that the answer came from Claude when that distinction matters
- mention if you supplied extra repo context on Claude's behalf
- mention if frontend design mode was used
