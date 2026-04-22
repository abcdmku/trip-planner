[CmdletBinding()]
param(
  [Parameter(ValueFromRemainingArguments = $true)]
  [string[]]$ClaudeArgs
)

$claude = Get-Command claude -ErrorAction Stop
$scriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$repoRoot = (Resolve-Path (Join-Path $scriptDir "..")).Path
$pluginDir = (Resolve-Path (Join-Path $repoRoot "plugins")).Path

$defaultArgs = @(
  "--model", "opus",
  "--effort", "max",
  "--plugin-dir", $pluginDir
)

& $claude.Source @defaultArgs @ClaudeArgs
exit $LASTEXITCODE
