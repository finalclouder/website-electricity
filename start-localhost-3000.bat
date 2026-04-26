@echo off
setlocal

cd /d "%~dp0"

set "PORT=3000"
set "NODE_ENV=development"
set "DISABLE_HMR=true"

echo Starting local server at http://localhost:%PORT%
echo.

where node >nul 2>nul
if errorlevel 1 (
  echo ERROR: Node.js is not installed or not available in PATH.
  echo Install Node.js, then run this file again.
  pause
  exit /b 1
)

if not exist "node_modules" (
  echo Installing dependencies...
  call npm install
  if errorlevel 1 (
    echo.
    echo ERROR: npm install failed.
    pause
    exit /b 1
  )
)

echo Checking ports 3000 and 24678...
powershell -NoProfile -ExecutionPolicy Bypass -Command "$ports=@(3000,24678); $nodeProcessIds=Get-NetTCPConnection -LocalPort $ports -ErrorAction SilentlyContinue | Select-Object -ExpandProperty OwningProcess -Unique; foreach($nodeProcessId in $nodeProcessIds){ if($nodeProcessId -and $nodeProcessId -ne 0){ $p=Get-Process -Id $nodeProcessId -ErrorAction SilentlyContinue; if($p -and $p.ProcessName -eq 'node'){ Write-Host ('Stopping old Node.js process PID ' + $nodeProcessId); Stop-Process -Id $nodeProcessId -Force } } }"

start "" "http://localhost:%PORT%"
call npm run dev

echo.
echo Server stopped.
pause
