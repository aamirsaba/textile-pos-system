@echo off
echo Setting up Textile POS...
echo.

echo Installing backend dependencies...
cd backend
call npm install
cd ..

echo Installing frontend dependencies...
cd frontend
call npm install
cd ..

echo.
echo Setup complete!
echo.
echo To start development servers:
echo   Backend: cd backend && npm run dev
echo   Frontend: cd frontend && npm run dev
echo.
pause
