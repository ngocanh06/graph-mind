@echo off
title Graph Mind - Fullstack Launch
echo ====================================================
echo Starting Graph Mind Fullstack (React + Python)
echo ====================================================
echo [1/2] Launching Python FastAPI Backend on port 5000...
start "Graph Mind Backend (Port 5000)" cmd /k "cd /d %~dp0backend && python -m uvicorn app.main:app --host 0.0.0.0 --port 5000 --reload"
timeout /t 2 >nul
echo [2/2] Launching React Frontend on port 5173...
start "Graph Mind React (Port 5173)" cmd /k "cd /d %~dp0frontend && npm run dev"
echo.
echo ====================================================
echo Graph Mind is running:
echo   - React Web App:  http://localhost:5173
echo   - Python API:     http://localhost:5000
echo   - Swagger Docs:   http://localhost:5000/docs
echo ====================================================
pause