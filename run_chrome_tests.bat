@echo off
chcp 65001 >nul
title GraphMind - Automated UI Playwright Testing on Chrome

echo =====================================================================
echo  GRAPHMIND - KIEM THU TU DONG GIAO DIEN TREN CHROME (PLAYWRIGHT)
echo =====================================================================
echo.

set TARGET=%1
if "%TARGET%"=="" set TARGET=all

echo [1/3] Kiem tra server Frontend (:5173)...
netstat -ano | findstr :5173 >nul
if %ERRORLEVEL% neq 0 (
    echo [*] Frontend chua chay, dang khoi dong npm run dev...
    start /b "" cmd /c "cd frontend && npm run dev"
    timeout /t 3 /nobreak >nul
) else (
    echo [v] Frontend dang chay san sang tren http://localhost:5173
)

echo.
echo [2/3] Bat dau chay kiem thu tu dong tren Chrome (Headed Mode)...
echo [*] Trinh duyet Chrome se tu dong mo len va thao tac truc tiep tren man hinh!
echo.

if "%TARGET%"=="sprint1" (
    echo [*] Chay bo UI Test Sprint 1 (7 test cases)...
    python -m pytest tests/sprint1/test_s1_ui_playwright.py -v --headed --slowmo 400 --html=tests/sprint1/reports/sprint1_playwright_report.html --self-contained-html
) else if "%TARGET%"=="sprint2" (
    echo [*] Chay bo UI Test Sprint 2 (5 test cases)...
    python -m pytest tests/sprint2/test_s2_ui_playwright.py -v --headed --slowmo 400 --html=tests/sprint2/reports/sprint2_playwright_report.html --self-contained-html
) else if "%TARGET%"=="sprint3" (
    echo [*] Chay bo UI Test Sprint 3 (4 test cases)...
    python -m pytest tests/sprint3/test_s3_ui_playwright.py -v --headed --slowmo 400 --html=tests/sprint3/reports/sprint3_playwright_report.html --self-contained-html
) else if "%TARGET%"=="sprint4" (
    echo [*] Chay bo UI Test Sprint 4 (4 test cases)...
    python -m pytest tests/sprint4/test_s4_ui_playwright.py -v --headed --slowmo 400 --html=tests/sprint4/reports/sprint4_playwright_report.html --self-contained-html
) else (
    echo [*] Chay toan bo 20 ca kiem thu giao dien Sprint 1 den Sprint 4...
    python -m pytest tests/sprint1/test_s1_ui_playwright.py tests/sprint2/test_s2_ui_playwright.py tests/sprint3/test_s3_ui_playwright.py tests/sprint4/test_s4_ui_playwright.py -v --headed --slowmo 350 --html=tests/playwright_chrome_report.html --self-contained-html
)

echo.
echo [3/3] Hoan tat kiem thu!
if exist "tests\playwright_chrome_report.html" (
    echo [*] Dang mo bao cao ket qua kiem thu HTML...
    start tests\playwright_chrome_report.html
)

pause
