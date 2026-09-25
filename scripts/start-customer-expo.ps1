$Root = Split-Path -Parent $PSScriptRoot
Set-Location (Join-Path $Root "MAIN-customer-expo")
npm start
