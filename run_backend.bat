@echo off
title Graph Mind - Python FastAPI Backend
cd /d "%~dp0backend"
echo Starting Graph Mind Python Backend on http://localhost:5000 ...
py -m uvicorn main:app --host 0.0.0.0 --port 5000 --reload
pause