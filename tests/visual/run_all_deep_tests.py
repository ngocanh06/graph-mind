"""
Graph Mind — Trình Điều Khiển Kiểm Thử Trực Quan 6 Module (Python Runner)
Cho phép chạy riêng từng Module hoặc chạy tự động toàn bộ 6 Module.
"""

import sys
import subprocess
import os

MODULES = {
    "1": ("Module 1: Ingestion Pipeline & Kho Tài Liệu Tập Trung", "test_deep_module1_visual.py"),
    "2": ("Module 2: Interactive Knowledge Graph Neo4j & Quy Trình SOP", "test_deep_module2_visual.py"),
    "3": ("Module 3: AI Copilot & Hybrid GraphRAG v2.6", "test_deep_module3_visual.py"),
    "4": ("Module 4: Trung Tâm Quyết Sách & Quan Sát Rủi Ro", "test_deep_module4_visual.py"),
    "5": ("Module 5: Tìm Kiếm Đa Chiều & Knowledge Explorer", "test_deep_module5_visual.py"),
    "6": ("Module 6: Quản Trị Hệ Thống, Ma Trận RBAC & Audit Trail", "test_deep_module6_visual.py"),
}

def run_script(script_name):
    script_dir = os.path.dirname(os.path.abspath(__file__))
    full_path = os.path.join(script_dir, script_name)
    print(f"\n[EXEC] Đang chạy {script_name} trên trình duyệt Chrome...\n")
    code = subprocess.call([sys.executable, full_path], cwd=script_dir)
    if code == 0:
        print(f"\n[OK] {script_name} hoàn tất thành công (100% PASS).\n")
    else:
        print(f"\n[FAIL] {script_name} kết thúc với mã lỗi {code}.\n")
    return code

def menu():
    while True:
        print("=" * 80)
        print("     GRAPH MIND ENTERPRISE KNOWLEDGE PLATFORM - BỘ KIỂM THỬ TRỰC QUAN")
        print("=" * 80)
        for k, (title, script) in MODULES.items():
            print(f"  [{k}] {title} ({script})")
        print("  [A] Chạy TẤT CẢ 6 Module tuần tự (Full E2E System Verification)")
        print("  [Q] Thoát")
        print("=" * 80)
        
        choice = input("Vui lòng chọn module cần kiểm thử [1-6, A, Q]: ").strip().upper()
        if choice == "Q":
            print("\nĐã thoát trình kiểm thử.")
            break
        elif choice == "A":
            print("\n>>> BẮT ĐẦU CHẠY TUẦN TỰ TOÀN BỘ 6 MODULE...\n")
            for k in sorted(MODULES.keys()):
                title, script = MODULES[k]
                run_script(script)
            print("\n" + "=" * 80)
            print("  TOÀN BỘ 6 MODULE ĐÃ HOÀN TẤT KIỂM THỬ!")
            print("=" * 80)
            input("\nNhấn Enter để quay lại menu...")
        elif choice in MODULES:
            title, script = MODULES[choice]
            run_script(script)
            input("\nNhấn Enter để quay lại menu...")
        else:
            print("\nLựa chọn không hợp lệ, vui lòng thử lại.\n")

if __name__ == "__main__":
    menu()

