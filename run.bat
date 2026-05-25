@echo off
echo =======================================================
echo          STARTING SHERLOCK AI INCIDENT PLATFORM
echo =======================================================
echo.
echo Starting Docker containers...
docker compose up -d

echo.
echo =======================================================
echo [SUCCESS] SHERLOCK is now LIVE!
echo.
echo Dashboard UI:  http://localhost:5173
echo Grafana:       http://localhost:3001
echo =======================================================
echo.
