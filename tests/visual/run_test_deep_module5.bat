@echo off
chcp 65001 >nul
title Graph Mind - Kiểm Thử Trực Quan Module 5 (Tìm Kiếm Thông Minh & Knowledge Explorer)
cls
echo ===============================================================================
echo          GRAPH MIND ENTERPRISE KNOWLEDGE PLATFORM - KIỂM THỬ MODULE 5
echo          (Tìm Kiếm Đa Chiều, Bộ Lọc Thực Thể, Triangulation & An Ninh BR-02)
echo ===============================================================================
echo.
echo  Đang khởi động trình duyệt Chrome hiển thị từng bước kiểm thử trên màn hình...
echo  Vui lòng quan sát cửa sổ Chrome vừa mở ra để theo dõi tiến trình tự động.
echo.
python test_deep_module5_visual.py
echo.
echo ===============================================================================
echo  Kiểm thử Module 5 hoàn tất. Nhấn phím bất kỳ để đóng cửa sổ.
pause >nul

