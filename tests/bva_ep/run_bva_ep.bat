@echo off
chcp 65001 > nul
title Graph Mind - BVA & EP Field-Level Test Suite
cls
echo ==============================================================================
echo   GRAPHMIND - BO KIEM THU HOP DEN: GIA TRI BIEN (BVA) & PHAN VUNG TUONG DUONG (EP)
echo   Chay kiem thu 35 Test Cases chi tiet tung truong tren cac Form he thong
echo ==============================================================================
echo.

python "%~dp0test_bva_ep_forms.py"

if %ERRORLEVEL% EQU 0 (
    echo.
    echo [*] Mo bao cao HTML tren trinh duyet...
    start "" "%~dp0report_bva_ep.html"
) else (
    echo.
    echo [!] Kiem thu gap loi. Vui long kiem tra backend FastAPI da chay o cong 5000 chua.
)

pause

