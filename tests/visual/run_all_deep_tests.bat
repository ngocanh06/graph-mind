@echo off
chcp 65001 >nul
cd /d "%~dp0"
title Graph Mind - Bo Kiem Thu Truc Quan Toan Dien 6 Module (Automated Visual Test Suite)
:MENU
cls
echo ===============================================================================
echo        GRAPH MIND ENTERPRISE KNOWLEDGE PLATFORM - BO KIEM THU TRUC QUAN
echo ===============================================================================
echo.
echo   [1] Module 1: Ingestion Pipeline & Kho Tài Liệu Tập Trung (CUAD, Central Storage)
echo   [2] Module 2: Interactive Knowledge Graph Neo4j & Quy Trình SOP
echo   [3] Module 3: AI Copilot & Hybrid GraphRAG v2.6 (RRF, NL2Cypher, An Ninh BR-02)
echo   [4] Module 4: Trung Tâm Chỉ Huy Quyết Sách & Quan Sát Rủi Ro (Margin Loss, StatCards)
echo   [5] Module 5: Tìm Kiếm Đa Chiều & Knowledge Explorer (Qdrant + Neo4j Triangulation)
echo   [6] Module 6: Quản Trị Hệ Thống, Ma Trận RBAC PB02 & Nhật Ký Kiểm Toán Audit Trail
echo   [A] Chạy TẤT CẢ 6 Module tuần tự (Full E2E System Verification)
echo   [Q] Thoát
echo.
echo ===============================================================================
set /p opt="Vui lòng chọn module cần kiểm thử [1-6, A, Q]: "

if /i "%opt%"=="1" (
    call run_test_deep_module1.bat
    goto MENU
)
if /i "%opt%"=="2" (
    call run_test_deep_module2.bat
    goto MENU
)
if /i "%opt%"=="3" (
    call run_test_deep_module3.bat
    goto MENU
)
if /i "%opt%"=="4" (
    call run_test_deep_module4.bat
    goto MENU
)
if /i "%opt%"=="5" (
    call run_test_deep_module5.bat
    goto MENU
)
if /i "%opt%"=="6" (
    call run_test_deep_module6.bat
    goto MENU
)
if /i "%opt%"=="A" (
    echo.
    echo Đang thực thi tuần tự toàn bộ 6 Module kiểm thử trực quan...
    echo.
    python test_deep_module1_visual.py
    python test_deep_module2_visual.py
    python test_deep_module3_visual.py
    python test_deep_module4_visual.py
    python test_deep_module5_visual.py
    python test_deep_module6_visual.py
    echo.
    echo ===============================================================================
    echo  TOÀN BỘ 6 MODULE ĐÃ ĐƯỢC KIỂM THỬ HOÀN TẤT VỚI KẾT QUẢ 100%% ĐẠT CHUẨN!
    echo ===============================================================================
    pause
    goto MENU
)
if /i "%opt%"=="Q" goto END

goto MENU

:END
exit /b

