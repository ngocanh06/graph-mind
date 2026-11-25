@echo off
chcp 65001 >nul
cd /d "%~dp0"
echo ============================================================================
echo   GRAPHMIND — KIỂM THỬ SÂU CHỨC NĂNG NGHIỆP VỤ: MODULE 3 (AI COPILOT)
echo ============================================================================
echo Đang mở Google Chrome để bạn trực tiếp theo dõi quá trình test sâu...
echo.
python test_deep_module3_visual.py
pause

