[CmdletBinding()]
param(
  [Parameter(Position = 0)]
  [string]$Prompt,

  [ValidateSet("low", "medium", "high", "max")]
  [string]$Effort = "max",

  [string]$Model = "opus",

  [string]$PluginDir,

  [switch]$UseFrontendDesign,

  [switch]$AllowTools,

  [switch]$PrintCommand
)

$stdinPrompt = ""
if (-not $Prompt) {
  $stdinPrompt = [Console]::In.ReadToEnd()
  if ($stdinPrompt) {
    $Prompt = $stdinPrompt.TrimEnd("`r", "`n")
  }
}

if (-not $Prompt) {
  throw "Provide -Prompt or pipe prompt text to stdin."
}

$claude = Get-Command claude -ErrorAction Stop
$repoRoot = (Resolve-Path (Join-Path $PSScriptRoot "..\\..\\..\\..")).Path

if (-not $PluginDir) {
  $defaultPluginDir = Join-Path $repoRoot "plugins"
  if (Test-Path $defaultPluginDir) {
    $PluginDir = (Resolve-Path $defaultPluginDir).Path
  }
}

if ($UseFrontendDesign) {
  $Prompt = "/frontend-design $Prompt"
}

$arguments = @(
  "--print",
  "--model", $Model,
  "--effort", $Effort
)

if ($PluginDir) {
  $arguments += @("--plugin-dir", $PluginDir)
}

if (-not $AllowTools) {
  $arguments += @("--tools", "")
}

$arguments += @($Prompt)

if ($PrintCommand) {
  $rendered = @($claude.Source) + $arguments
  Write-Output ($rendered -join " ")
  exit 0
}

& $claude.Source @arguments
exit $LASTEXITCODE
