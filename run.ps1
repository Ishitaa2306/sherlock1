Write-Host "=======================================================" -ForegroundColor Cyan
Write-Host "         STARTING SHERLOCK AI INCIDENT PLATFORM        " -ForegroundColor Cyan
Write-Host "=======================================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "Starting Docker containers..." -ForegroundColor Yellow
docker compose up -d

Write-Host ""
Write-Host "=======================================================" -ForegroundColor Green
Write-Host "[SUCCESS] SHERLOCK is now LIVE!" -ForegroundColor Green
Write-Host ""
Write-Host "Dashboard UI:  http://localhost:5173" -ForegroundColor White
Write-Host "Grafana:       http://localhost:3001" -ForegroundColor White
Write-Host "=======================================================" -ForegroundColor Green
Write-Host ""
