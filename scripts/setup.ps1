# PowerShell Setup Script for Textile POS
Write-Host "=========================================" -ForegroundColor Cyan
Write-Host "Textile POS - Setup Script" -ForegroundColor Cyan
Write-Host "=========================================" -ForegroundColor Cyan
Write-Host ""

# Check for Node.js
try {
     = node --version 2>
    Write-Host "✅ Node.js detected: " -ForegroundColor Green
} catch {
    Write-Host "❌ Node.js not found. Please install Node.js v18+" -ForegroundColor Red
    exit 1
}

# Install backend dependencies
Write-Host ""
Write-Host "📦 Installing backend dependencies..." -ForegroundColor Yellow
Set-Location backend
npm install
if ( -eq 0) {
    Write-Host "✅ Backend dependencies installed" -ForegroundColor Green
} else {
    Write-Host "❌ Failed to install backend dependencies" -ForegroundColor Red
    exit 1
}
Set-Location ..

# Install frontend dependencies
Write-Host ""
Write-Host "📦 Installing frontend dependencies..." -ForegroundColor Yellow
Set-Location frontend
npm install
if ( -eq 0) {
    Write-Host "✅ Frontend dependencies installed" -ForegroundColor Green
} else {
    Write-Host "❌ Failed to install frontend dependencies" -ForegroundColor Red
    exit 1
}
Set-Location ..

Write-Host ""
Write-Host "=========================================" -ForegroundColor Green
Write-Host "✅ Setup Complete!" -ForegroundColor Green
Write-Host "=========================================" -ForegroundColor Green
Write-Host ""
Write-Host "Next Steps:"
Write-Host "  1. Configure environment variables in backend\.env"
Write-Host "  2. Configure environment variables in frontend\.env"
Write-Host "  3. Start development servers:"
Write-Host "     - Run: scripts\start-dev.bat"
Write-Host "     - Or manually: cd backend && npm run dev"
Write-Host "                    cd frontend && npm run dev"
Write-Host ""
Write-Host "Access the application:"
Write-Host "  Frontend: http://localhost:3000"
Write-Host "  Backend API: http://localhost:5000"
Write-Host ""
Write-Host "Happy Coding! 🎉" -ForegroundColor Green
