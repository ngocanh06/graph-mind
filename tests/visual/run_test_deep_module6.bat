@echo off
chcp 65001 >nul
title Graph Mind - Kiểm Thử Trực Quan Module 6 (Quản Trị Hệ Thống, Ma Trận RBAC & Nhật Ký Kiểm Toán)
cls
echo ===============================================================================
echo          GRAPH MIND ENTERPRISE KNOWLEDGE PLATFORM - KIỂM THỬ MODULE 6
echo          (Quản Trị Người Dùng, Ma Trận Phân Quyền PB02, Audit Trail & An Ninh)
echo ===============================================================================
echo.
echo  Đang khởi động trình duyệt Chrome hiển thị từng bước kiểm thử trên màn hình...
echo  Vui lòng quan sát cửa sổ Chrome vừa mở ra để theo dõi tiến trình tự động.
echo.
python test_deep_module6_visual.py
echo.
echo ===============================================================================
echo  Kiểm thử Module 6 hoàn tất. Nhấn phím bất kỳ để đóng cửa sổ.
pause >nul

