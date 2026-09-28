param(
  [string]$Root = "C:\Users\HP\Downloads\Bhairava App\MAIN app",
  [string]$Stage = (Resolve-Path (Join-Path $PSScriptRoot "..")).Path
)
$ErrorActionPreference = "Stop"
$files = @(
  "src\lib\domain\plot-corner.ts",
  "src\lib\domain\plot-pricing.ts",
  "src\lib\domain\plot-transitions.ts",
  "src\lib\domain\project-permissions.ts",
  "src\lib\domain\index.ts",
  "src\lib\domain\__tests__\layout-domain.test.ts",
  "src\components\project-workspace\layout-tab.tsx"
)
foreach ($rel in $files) {
  $src = Join-Path $Stage $rel
  $dst = Join-Path $Root $rel
  if (-not (Test-Path $src)) { throw "Missing staged file: $src" }
  $dstDir = Split-Path $dst -Parent
  if (-not (Test-Path $dstDir)) { New-Item -ItemType Directory -Path $dstDir -Force | Out-Null }
  Copy-Item -Force $src $dst
  Write-Host "copied $rel"
}
Write-Host "Done. Next: wire projects.`$projectId.tsx (see wire-layout-route.diff.txt)."
