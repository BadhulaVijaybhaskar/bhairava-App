# Windows helper for pg_dump when Postgres client tools are on PATH
param(
  [string]$OutDir = ".\backups"
)
$ErrorActionPreference = "Stop"
if (-not $env:DATABASE_URL) { throw "DATABASE_URL is required" }
New-Item -ItemType Directory -Force -Path $OutDir | Out-Null
$stamp = Get-Date -Format "yyyyMMdd_HHmmss"
$file = Join-Path $OutDir "bhairava_pg_$stamp.dump"
Write-Host "Dumping to $file"
& pg_dump --format=custom --no-owner --no-acl --file=$file $env:DATABASE_URL
Write-Host "OK $file"
