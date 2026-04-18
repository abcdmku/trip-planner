param(
  [ValidateSet('prepare', 'build', 'up', 'config')]
  [string]$Action = 'prepare'
)

$ErrorActionPreference = 'Stop'

$repoRoot = Split-Path -Parent $PSScriptRoot
$stageRoot = Join-Path $env:TEMP 'trip-planner-docker-context'

$excludeDirs = @(
  '.git',
  '.github',
  'node_modules',
  'dist',
  'coverage'
)

$excludeFiles = @(
  '.env.local',
  'npm-debug.log'
)

if (Test-Path -LiteralPath $stageRoot) {
  Remove-Item -LiteralPath $stageRoot -Recurse -Force
}

New-Item -ItemType Directory -Path $stageRoot | Out-Null

$robocopyArgs = @(
  $repoRoot,
  $stageRoot,
  '/MIR',
  '/FFT',
  '/R:2',
  '/W:1',
  '/NFL',
  '/NDL',
  '/NJH',
  '/NJS',
  '/NP',
  '/XD'
) + ($excludeDirs | ForEach-Object { Join-Path $repoRoot $_ }) + @(
  '/XF'
) + ($excludeFiles | ForEach-Object { Join-Path $repoRoot $_ })

& robocopy @robocopyArgs | Out-Null

if ($LASTEXITCODE -ge 8) {
  throw "robocopy failed with exit code $LASTEXITCODE"
}

Write-Host "Staged Docker context at $stageRoot"

switch ($Action) {
  'prepare' {
    exit 0
  }
  'build' {
    & docker build -t trip-planner:local $stageRoot
    exit $LASTEXITCODE
  }
  'up' {
    Push-Location $stageRoot
    try {
      & docker compose up --build
      exit $LASTEXITCODE
    } finally {
      Pop-Location
    }
  }
  'config' {
    Push-Location $stageRoot
    try {
      & docker compose config
      exit $LASTEXITCODE
    } finally {
      Pop-Location
    }
  }
}
