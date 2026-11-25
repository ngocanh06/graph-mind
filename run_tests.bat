@echo off
chcp 65001 >nul
title Graph Mind - Automated Test Suite Runner
cls

echo ==============================================================================
echo                      GRAPHMIND - HE THONG KIEM THU TU DONG
echo ==============================================================================
echo  [1] Chay Bo Kiem Thu Trực Quan 6 Module (Playwright Visual E2E - 36 Scenarios)
echo  [2] Chay Bo Kiem Thu Bien & Phan Vung Form (BVA & EP Field-Level - 35 Cases)
echo  [3] Mo Bao Cao HTML Kiem Thu BVA & EP tren Trinh Duyet
echo  [4] Mo Bao Cao HTML Robot Framework (tests\robot\results)
echo  [5] Thoat
echo ==============================================================================
set /p choice="Nhap lua chon cua ban [1-5]: "

if "%choice%"=="1" (
    cd /d "%~dp0tests\visual"
    call run_all_deep_tests.bat
) else if "%choice%"=="2" (
    cd /d "%~dp0tests\bva_ep"
    call run_bva_ep.bat
) else if "%choice%"=="3" (
    start "" "%~dp0tests\bva_ep\report_bva_ep.html"
) else if "%choice%"=="4" (
    start "" "%~dp0tests\robot\results\report.html"
    start "" "%~dp0tests\robot\results\log.html"
) else (
    echo Tam biet!
)
