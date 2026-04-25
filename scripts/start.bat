@echo off
echo Starting MLB StatTracker...

echo.
echo [1/2] Starting Backend (FastAPI)...
start "MLB Backend" cmd /k "cd /d %~dp0..\backend && pip install -r requirements.txt && uvicorn main:app --reload --port 8000"

timeout /t 3 /nobreak >nul

echo [2/2] Starting Frontend (Vite)...
start "MLB Frontend" cmd /k "cd /d %~dp0..\frontend && npm run dev"

echo.
echo Backend: http://localhost:8000
echo Frontend: http://localhost:5173
echo API Docs: http://localhost:8000/docs
