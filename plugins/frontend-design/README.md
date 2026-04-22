# Frontend Design Override

This repo-local Claude Code plugin provides a design-focused skill and is meant to be loaded with the local `claude` CLI.

It intentionally uses the plugin name `frontend-design` so it can override the broken marketplace install already present on this machine whenever Claude is started with:

```powershell
claude --model opus --effort max --plugin-dir .\plugins
```

## Quick start

From the repo root:

```powershell
.\scripts\run-claude-opus-design.ps1 "Design a bold Storybook-ready trip overview screen"
```

Or from `cmd.exe`:

```bat
scripts\run-claude-opus-design.cmd "Design a bold Storybook-ready trip overview screen"
```

## What the launcher does

- forces `--model opus`
- forces `--effort max`
- loads the repo-local plugin directory with `--plugin-dir`
- passes through the rest of your Claude CLI arguments unchanged

## Manual usage

You can also launch Claude directly and keep full control over flags:

```powershell
claude --model opus --effort max --plugin-dir .\plugins -p "Design a polished timeline view"
```
