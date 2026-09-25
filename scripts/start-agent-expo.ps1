$Root = Split-Path -Parent $PSScriptRoot
Set-Location (Join-Path $Root "MAIN-agent-expo")
npm start
