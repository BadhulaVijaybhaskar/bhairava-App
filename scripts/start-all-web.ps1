# Bhairava client-test local launch (Windows)
# Ports: MAIN :3000 | Agent :5174 | Customer :5175
$ErrorActionPreference = "Stop"
$Root = Split-Path -Parent $PSScriptRoot
if (-not $Root) { $Root = (Get-Location).Path }
Write-Host "Bhairava root: $Root"
Write-Host "LAN tip: use http://192.168.31.35:<port> from phones on same Wi-Fi (verify IP with ipconfig)."

$jobs = @()
$jobs += Start-Process -PassThru -NoNewWindow -FilePath "npm" -ArgumentList @("run","dev","--","--host","0.0.0.0","--port","3000") -WorkingDirectory (Join-Path $Root "MAIN app")
Start-Sleep -Seconds 2
$jobs += Start-Process -PassThru -NoNewWindow -FilePath "npm" -ArgumentList @("run","dev","--","--host","0.0.0.0") -WorkingDirectory (Join-Path $Root "MAIN-agent")
Start-Sleep -Seconds 1
$jobs += Start-Process -PassThru -NoNewWindow -FilePath "npm" -ArgumentList @("run","dev","--","--host","0.0.0.0") -WorkingDirectory (Join-Path $Root "MAIN-customer")

Start-Sleep -Seconds 4
Start-Process "http://localhost:3000/login"
Start-Process "http://localhost:5174/login"
Start-Process "http://localhost:5175/login"

Write-Host "Started MAIN :3000, Agent :5174, Customer :5175"
Write-Host "PIDs: $($jobs.Id -join ', ')"
Write-Host "Press Ctrl+C in each terminal or stop these PIDs to shut down."
