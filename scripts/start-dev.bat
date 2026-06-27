@echo off
echo Starting Textile POS Development Environment...
echo.

start "Backend Server" cmd /k "cd backend && npm run dev"
timeout /t 2 /nobreak >nul
start "Frontend Server" cmd /k "cd frontend && npm run dev"

echo.
echo Servers started!
echo Backend: http://localhost:5000
echo Frontend: http://localhost:3000
echo.
echo Press any key to stop servers...
pause >nul

taskkill /F /IM node.exe /FI "WINDOWTITLE eq Backend Server*" 2>nul
taskkill /F /IM node.exe /FI "WINDOWTITLE eq Frontend Server*" 2>nul
echo Servers stopped.
pause
