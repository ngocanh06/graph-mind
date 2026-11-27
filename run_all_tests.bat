@echo off
chcp 65001 >nul
title GraphMind - Run All Test Suites (115 Test Cases)

echo =====================================================================
echo  GRAPHMIND - CHẠY TOÀN BỘ CÁC BỘ KIỂM THỬ (FULL TEST SUITE)
echo =====================================================================
echo.
echo [*] Bắt đầu thực thi kiểm thử toàn bộ hệ thống (Sprint 1 - 4)...
echo [*] Bao gồm: Unit test, Integration test, DeepEval, RBAC, và E2E.
echo.

python -m pytest tests/ -v -o addopts="" --html=tests/full_test_report.html --self-contained-html

echo.
echo =====================================================================
echo [*] Kiểm thử hoàn tất!
if exist "tests\full_test_report.html" (
    echo [*] Đang mở báo cáo chi tiết HTML...
    start tests\full_test_report.html
)
echo =====================================================================
pause
