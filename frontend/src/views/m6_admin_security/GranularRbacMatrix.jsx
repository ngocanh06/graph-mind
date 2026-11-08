import React, { useState, useEffect, useMemo, useCallback } from "react";
import {
  ShoppingCart, Building2,
  Scale, RotateCcw, Save, Shield, CheckCircle2,
  Lock, AlertTriangle, Info, Sliders, Edit3, Cpu, FlaskConical, UploadCloud,
  Layers, Check
} from "lucide-react";
import {
  fetchGranularRbacMatrix,
  updateGranularRbacMatrix,
  resetGranularRbacMatrix
} from "./adminApi";

// 5 cột phòng ban thực tế trong kho tài liệu chuẩn
const RESOURCE_META = {
  SALES: {
    label: "Kinh doanh (Sales)",
    shortLabel: "Kinh doanh",
    icon: ShoppingCart,
    desc: "Phòng Kinh doanh: Khách hàng CRM, đơn hàng ERP & báo giá",
    color: "#059669",
    bg: "rgba(5, 150, 105, 0.08)",
  },
  LEGAL: {
    label: "Pháp chế (Legal)",
    shortLabel: "Pháp chế",
    icon: Scale,
    desc: "Phòng Pháp chế: Hợp đồng CUAD, điều khoản pháp lý & NDA",
    color: "#4f46e5",
    bg: "rgba(79, 70, 229, 0.08)",
  },
  ACCOUNTING_PROCUREMENT: {
    label: "Kế toán / Thu mua",
    shortLabel: "Kế toán / Thu mua",
    icon: Building2,
    desc: "Phòng Kế toán & Thu mua: Hóa đơn, nhà cung cấp & công nợ",
    color: "#d97706",
    bg: "rgba(217, 119, 6, 0.08)",
  },
  IT: {
    label: "Công nghệ / IT",
    shortLabel: "Công nghệ / IT",
    icon: Cpu,
    desc: "Phòng Công nghệ / IT: Hạ tầng hệ thống, bảo mật SecOps & SOP kỹ thuật",
    color: "#2563eb",
    bg: "rgba(37, 99, 235, 0.08)",
  },
  RND: {
    label: "R&D",
    shortLabel: "R&D",
    icon: FlaskConical,
    desc: "Phòng Nghiên cứu & Phát triển: Sản phẩm & tài liệu kỹ thuật",
    color: "#7c3aed",
    bg: "rgba(124, 58, 237, 0.08)",
  },
};

// Danh sách lựa chọn Ngữ cảnh Phòng ban (Department Scope)
const DEPT_SCOPE_OPTIONS = [
  { id: "SALES", label: "Kinh doanh (Sales)", color: "#059669" },
  { id: "LEGAL", label: "Pháp chế (Legal)", color: "#4f46e5" },
  { id: "ACCOUNTING_PROCUREMENT", label: "Kế toán / Thu mua", color: "#d97706" },
  { id: "IT", label: "Công nghệ / IT", color: "#2563eb" },
  { id: "RND", label: "R&D", color: "#7c3aed" },
];

export default function GranularRbacMatrix() {
  const [policies, setPolicies] = useState({});
  const [initialPolicies, setInitialPolicies] = useState({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState(null);
  const [roleFilter, setRoleFilter] = useState("ALL");
  const [selectedDeptScope, setSelectedDeptScope] = useState("SALES");

  const showToast = (message, type = "success") => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 4500);
  };

  const makeKey = (role, dept, res) => `${role}___${dept}___${res}`;

  // Hàm sinh cấu hình mặc định chuẩn doanh nghiệp theo Ngữ cảnh Phòng ban
  const getPresetPolicies = useCallback((deptScope) => {
    const defaults = {};
    const resKeys = Object.keys(RESOURCE_META);

    // 1. Admin hệ thống (BR-03): Toàn công ty, bật 5/5 phòng, có Biên tập & Tải lên, chỉ bật Nhạy cảm ở IT
    resKeys.forEach((res) => {
      defaults[makeKey("ADMIN", "ALL", res)] = {
        role_code: "ADMIN",
        department_code: "ALL",
        resource_type: res,
        can_query: true,
        can_view_citation: true,
        can_edit: true,
        can_upload: true,
        can_view_sensitive: res === "IT",
        data_scope: "ALL_DEPARTMENTS",
      };
    });

    // 2. Ban lãnh đạo - Executive (BR-05): Toàn công ty, bật 5/5 phòng, bật Nhạy cảm cả 5 phòng, TẮT Biên tập & Tải lên (Read-only)
    resKeys.forEach((res) => {
      defaults[makeKey("EXECUTIVE", "ALL", res)] = {
        role_code: "EXECUTIVE",
        department_code: "ALL",
        resource_type: res,
        can_query: true,
        can_view_citation: true,
        can_edit: false,
        can_upload: false,
        can_view_sensitive: true,
        data_scope: "ALL_DEPARTMENTS",
      };
    });

    // 3. Trưởng phòng (BR-04): Theo phòng ban chủ quản, chỉ bật đúng phòng ban chọn (đủ 3 quyền: Nhạy cảm, Biên tập, Tải lên). 4 phòng còn lại TẮT
    resKeys.forEach((res) => {
      const isMatch = res === deptScope;
      defaults[makeKey("DEPARTMENT_MANAGER", "ALL", res)] = {
        role_code: "DEPARTMENT_MANAGER",
        department_code: "ALL",
        resource_type: res,
        can_query: isMatch,
        can_view_citation: isMatch,
        can_edit: isMatch,
        can_upload: isMatch,
        can_view_sensitive: isMatch,
        data_scope: isMatch ? "OWN_DEPARTMENT" : "NONE",
      };
    });

    // 4. Chuyên viên (BR-02): Theo phòng ban chủ quản, chỉ bật đúng phòng ban chọn (bật Biên tập, Tải lên; TẮT Nhạy cảm). 4 phòng còn lại TẮT
    resKeys.forEach((res) => {
      const isMatch = res === deptScope;
      defaults[makeKey("STANDARD_USER", "ALL", res)] = {
        role_code: "STANDARD_USER",
        department_code: "ALL",
        resource_type: res,
        can_query: isMatch,
        can_view_citation: isMatch,
        can_edit: isMatch,
        can_upload: isMatch,
        can_view_sensitive: false,
        data_scope: isMatch ? "OWN_DEPARTMENT" : "NONE",
      };
    });

    return defaults;
  }, []);

  // Tải ma trận từ máy chủ
  const loadMatrix = useCallback(async () => {
    setLoading(true);
    try {
      const data = await fetchGranularRbacMatrix();
      const map = {};
      (data.policies || []).forEach((p) => {
        const k = makeKey(p.role_code, p.department_code, p.resource_type);
        map[k] = { ...p };
      });

      if (Object.keys(map).length > 0) {
        setPolicies(map);
        setInitialPolicies(JSON.parse(JSON.stringify(map)));
      } else {
        const def = getPresetPolicies("SALES");
        setPolicies(def);
        setInitialPolicies(JSON.parse(JSON.stringify(def)));
      }
    } catch (err) {
      const def = getPresetPolicies("SALES");
      setPolicies(def);
      setInitialPolicies(JSON.parse(JSON.stringify(def)));
      showToast("Đang hiển thị cấu hình phân quyền đề xuất mặc định.", "info");
    } finally {
      setLoading(false);
    }
  }, [getPresetPolicies]);

  useEffect(() => {
    loadMatrix();
  }, [loadMatrix]);

  // Đếm số lượng ô đã thay đổi so với ban đầu
  const changedKeys = useMemo(() => {
    const list = [];
    Object.keys(policies).forEach((k) => {
      const cur = policies[k];
      const init = initialPolicies[k];
      if (!init) {
        list.push(k);
        return;
      }
      if (
        cur.can_query !== init.can_query ||
        cur.can_view_citation !== init.can_view_citation ||
        cur.can_edit !== init.can_edit ||
        cur.can_upload !== init.can_upload ||
        cur.can_view_sensitive !== init.can_view_sensitive ||
        cur.data_scope !== init.data_scope
      ) {
        list.push(k);
      }
    });
    return list;
  }, [policies, initialPolicies]);

  // Chuyển đổi Ngữ cảnh Phòng ban: Cập nhật preset hàng Trưởng phòng & Chuyên viên tương ứng
  const handleSelectDeptScope = (newDept) => {
    setSelectedDeptScope(newDept);
    setPolicies((prev) => {
      const next = { ...prev };
      const resKeys = Object.keys(RESOURCE_META);

      // Cập nhật Manager theo phòng ban chủ quản mới
      resKeys.forEach((res) => {
        const k = makeKey("DEPARTMENT_MANAGER", "ALL", res);
        const isMatch = res === newDept;
        next[k] = {
          role_code: "DEPARTMENT_MANAGER",
          department_code: "ALL",
          resource_type: res,
          can_query: isMatch,
          can_view_citation: isMatch,
          can_edit: isMatch,
          can_upload: isMatch,
          can_view_sensitive: isMatch,
          data_scope: isMatch ? "OWN_DEPARTMENT" : "NONE",
        };
      });

      // Cập nhật Chuyên viên theo phòng ban mới
      resKeys.forEach((res) => {
        const k = makeKey("STANDARD_USER", "ALL", res);
        const isMatch = res === newDept;
        next[k] = {
          role_code: "STANDARD_USER",
          department_code: "ALL",
          resource_type: res,
          can_query: isMatch,
          can_view_citation: isMatch,
          can_edit: isMatch,
          can_upload: isMatch,
          can_view_sensitive: false,
          data_scope: isMatch ? "OWN_DEPARTMENT" : "NONE",
        };
      });

      return next;
    });
  };

  // Toggle nhanh quyền Query & Citation
  const toggleQuery = (role, dept, res) => {
    const k = makeKey(role, dept, res);
    setPolicies((prev) => {
      const cur = prev[k] || {
        role_code: role,
        department_code: dept,
        resource_type: res,
        can_query: false,
        can_view_citation: false,
        can_edit: false,
        can_upload: false,
        can_view_sensitive: false,
        data_scope: "NONE",
      };
      const nextQuery = !cur.can_query;
      return {
        ...prev,
        [k]: {
          ...cur,
          can_query: nextQuery,
          can_view_citation: nextQuery,
          data_scope: nextQuery
            ? (role === "ADMIN" || role === "EXECUTIVE" ? "ALL_DEPARTMENTS" : "OWN_DEPARTMENT")
            : "NONE",
        },
      };
    });
  };

  // Cập nhật chi tiết ô (sensitive, edit, upload)
  const updateCellField = (role, dept, res, field, val) => {
    const k = makeKey(role, dept, res);
    setPolicies((prev) => {
      const cur = prev[k] || {
        role_code: role,
        department_code: dept,
        resource_type: res,
        can_query: false,
        can_view_citation: false,
        can_edit: false,
        can_upload: false,
        can_view_sensitive: false,
        data_scope: "NONE",
      };
      return {
        ...prev,
        [k]: {
          ...cur,
          [field]: val,
        },
      };
    });
  };

  // Lưu thay đổi
  const handleSave = async () => {
    if (changedKeys.length === 0) return;
    setSaving(true);
    try {
      const payload = changedKeys.map((k) => policies[k]);
      await updateGranularRbacMatrix(payload);
      setInitialPolicies(JSON.parse(JSON.stringify(policies)));
      showToast(
        `Đã lưu thành công ${payload.length} ô quyền. Thay đổi đã được ghi vào Nhật ký Kiểm toán (Audit Log)!`,
        "success"
      );
    } catch (err) {
      showToast(err.message || "Lỗi khi lưu cấu hình ma trận", "error");
    } finally {
      setSaving(false);
    }
  };

  // Khôi phục mặc định theo Ngữ cảnh Phòng ban hiện tại
  const handleReset = async () => {
    const deptInfo = RESOURCE_META[selectedDeptScope]?.label || selectedDeptScope;
    if (!window.confirm(`Bạn có chắc chắn muốn khôi phục Ma trận Phân quyền Tri thức về cấu hình chuẩn mặc định (Ngữ cảnh: ${deptInfo})? Thao tác này sẽ được ghi vào Audit Log.`)) {
      return;
    }
    setSaving(true);
    try {
      await resetGranularRbacMatrix(selectedDeptScope);
      const defaults = getPresetPolicies(selectedDeptScope);
      setPolicies(defaults);
      setInitialPolicies(JSON.parse(JSON.stringify(defaults)));
      showToast(`Đã khôi phục ma trận về cấu hình chuẩn mặc định theo ngữ cảnh ${deptInfo}!`, "success");
    } catch (err) {
      showToast(err.message || "Không thể khôi phục mặc định", "error");
    } finally {
      setSaving(false);
    }
  };

  // Định nghĩa động 4 hàng vai trò theo Ngữ cảnh phòng ban đang chọn
  const rowGroups = useMemo(() => {
    const activeDeptLabel = RESOURCE_META[selectedDeptScope]?.shortLabel || "Kinh doanh";
    return [
      {
        role_code: "ADMIN",
        department_code: "ALL",
        name: "Admin hệ thống (SecOps / IT)",
        scopeLabel: "Toàn công ty (BR-03)",
        scopeType: "ALL_DEPARTMENTS",
        isFull: true,
      },
      {
        role_code: "EXECUTIVE",
        department_code: "ALL",
        name: "Ban lãnh đạo (Executive Director)",
        scopeLabel: "Toàn công ty (BR-05)",
        scopeType: "ALL_DEPARTMENTS",
        isFull: true,
      },
      {
        role_code: "DEPARTMENT_MANAGER",
        department_code: "ALL",
        name: "Trưởng phòng (Department Manager)",
        scopeLabel: "Theo phòng ban chủ quản (BR-04)",
        scopeType: "OWN_DEPARTMENT",
        isFull: false,
      },
      {
        role_code: "STANDARD_USER",
        department_code: "ALL",
        name: "Chuyên viên (Standard User)",
        scopeLabel: `Phòng ${activeDeptLabel} (BR-02)`,
        scopeType: "OWN_DEPARTMENT",
        isFull: false,
      },
    ];
  }, [selectedDeptScope]);

  // Lọc vai trò hiển thị
  const filteredRows = useMemo(() => {
    if (roleFilter === "ALL") return rowGroups;
    return rowGroups.filter((r) => r.role_code === roleFilter);
  }, [roleFilter, rowGroups]);

  return (
    <div
      style={{
        background: "var(--surface)",
        border: "1px solid var(--border)",
        borderRadius: "var(--r-lg, 12px)",
        padding: "24px",
        color: "var(--text-1)",
        boxShadow: "var(--shadow-sm)",
      }}
    >
      {/* Toast Notification */}
      {toast && (
        <div
          style={{
            position: "fixed",
            top: 24,
            right: 24,
            zIndex: 9999,
            display: "flex",
            alignItems: "center",
            gap: 10,
            padding: "14px 20px",
            borderRadius: "var(--r-md, 8px)",
            background: toast.type === "error" ? "var(--red, #dc2626)" : toast.type === "info" ? "var(--blue, #2563eb)" : "var(--green, #059669)",
            color: "#ffffff",
            boxShadow: "var(--shadow-xl)",
            fontWeight: 600,
            fontSize: "13.5px",
            animation: "slideIn 0.3s ease",
          }}
        >
          {toast.type === "error" ? <AlertTriangle size={18} /> : toast.type === "info" ? <Info size={18} /> : <CheckCircle2 size={18} />}
          <span>{toast.message}</span>
        </div>
      )}

      {/* Header & Subtitle */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 18, flexWrap: "wrap", gap: 14 }}>
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <div
              style={{
                width: 40,
                height: 40,
                borderRadius: "var(--r-md, 8px)",
                background: "var(--blue-soft, rgba(37, 99, 235, 0.08))",
                border: "1px solid rgba(37, 99, 235, 0.2)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <Shield size={22} color="var(--blue, #2563eb)" />
            </div>
            <div>
              <h2 style={{ fontSize: "17px", fontWeight: 700, margin: 0, color: "var(--text-1)", letterSpacing: "-0.01em" }}>
                Ma trận Phân quyền Tri thức chi tiết (Granular RBAC)
              </h2>
              <p style={{ margin: "4px 0 0", fontSize: "12.5px", color: "var(--text-3)" }}>
                Cô lập quyền truy cập tài liệu 5 phòng ban theo nguyên tắc Tối thiểu quyền hạn (Least Privilege) & Độc lập phòng ban
              </p>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
          <button
            type="button"
            onClick={handleReset}
            disabled={saving || loading}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 6,
              padding: "8px 14px",
              background: "var(--surface-2)",
              border: "1px solid var(--border)",
              borderRadius: "var(--r-sm, 6px)",
              color: "var(--text-2)",
              fontSize: "12.5px",
              fontWeight: 600,
              cursor: saving || loading ? "not-allowed" : "pointer",
              transition: "all var(--transition-fast)",
            }}
          >
            <RotateCcw size={14} />
            <span>Khôi phục mặc định</span>
          </button>

          <button
            type="button"
            onClick={handleSave}
            disabled={changedKeys.length === 0 || saving || loading}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 8,
              padding: "8px 18px",
              background: changedKeys.length > 0 ? "var(--blue, #2563eb)" : "var(--surface-3)",
              border: changedKeys.length > 0 ? "1px solid var(--blue, #2563eb)" : "1px solid var(--border)",
              borderRadius: "var(--r-sm, 6px)",
              color: changedKeys.length > 0 ? "#ffffff" : "var(--text-4)",
              fontSize: "12.5px",
              fontWeight: 700,
              cursor: changedKeys.length > 0 && !saving ? "pointer" : "not-allowed",
              boxShadow: changedKeys.length > 0 ? "0 2px 8px rgba(37, 99, 235, 0.3)" : "none",
              transition: "all var(--transition-fast)",
            }}
          >
            <Save size={15} />
            <span>Lưu thay đổi</span>
            {changedKeys.length > 0 && (
              <span
                style={{
                  background: "var(--red, #dc2626)",
                  color: "#ffffff",
                  fontSize: "11px",
                  padding: "1px 6px",
                  borderRadius: "10px",
                  fontWeight: 700,
                }}
              >
                {changedKeys.length}
              </span>
            )}
          </button>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* THANH BỘ CHỌN: NGỮ CẢNH PHÒNG BAN (DEPARTMENT SCOPE SELECTOR)             */}
      {/* ========================================================================= */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 12,
          marginBottom: 14,
          padding: "10px 14px",
          background: "var(--surface-2)",
          border: "1px solid var(--border)",
          borderRadius: "var(--r-md, 8px)",
          flexWrap: "wrap",
        }}
      >
        <span
          style={{
            fontSize: "12px",
            color: "var(--text-1)",
            fontWeight: 700,
            display: "flex",
            alignItems: "center",
            gap: 6,
          }}
        >
          <Building2 size={15} color="var(--blue, #2563eb)" />
          Ngữ cảnh Phòng ban (Department Scope):
        </span>
        <div style={{ display: "flex", gap: 6, flexWrap: "wrap", alignItems: "center" }}>
          {DEPT_SCOPE_OPTIONS.map((dept) => {
            const active = selectedDeptScope === dept.id;
            return (
              <button
                key={dept.id}
                type="button"
                onClick={() => handleSelectDeptScope(dept.id)}
                style={{
                  padding: "5px 12px",
                  borderRadius: "var(--r-sm, 6px)",
                  fontSize: "11.5px",
                  fontWeight: active ? 700 : 500,
                  background: active ? dept.color : "var(--surface)",
                  color: active ? "#ffffff" : "var(--text-2)",
                  border: active ? `1px solid ${dept.color}` : "1px solid var(--border)",
                  cursor: "pointer",
                  boxShadow: active ? `0 2px 6px ${dept.color}40` : "none",
                  transition: "all var(--transition-fast)",
                  display: "flex",
                  alignItems: "center",
                  gap: 6,
                }}
              >
                <span
                  style={{
                    width: 7,
                    height: 7,
                    borderRadius: "50%",
                    background: active ? "#ffffff" : dept.color,
                  }}
                />
                <span>{dept.label}</span>
                {dept.id === "SALES" && (
                  <span style={{ fontSize: "10px", opacity: active ? 0.9 : 0.6, fontWeight: 600 }}>
                    [Mặc định]
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Filter Bar cho 4 Role của dự án */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 6,
          marginBottom: 16,
          padding: "6px 10px",
          background: "var(--surface-2)",
          border: "1px solid var(--border-soft)",
          borderRadius: "var(--r-md, 8px)",
          overflowX: "auto",
        }}
      >
        <span style={{ fontSize: "12px", color: "var(--text-3)", fontWeight: 600, display: "flex", alignItems: "center", gap: 5, marginRight: 4 }}>
          <Sliders size={13} /> Lọc vai trò:
        </span>
        {[
          { id: "ALL", label: "Tất cả vai trò" },
          { id: "ADMIN", label: "Admin hệ thống" },
          { id: "EXECUTIVE", label: "Ban lãnh đạo (Executive)" },
          { id: "DEPARTMENT_MANAGER", label: "Trưởng phòng (Manager)" },
          { id: "STANDARD_USER", label: "Chuyên viên (Standard User)" },
        ].map((f) => {
          const active = roleFilter === f.id;
          return (
            <button
              key={f.id}
              type="button"
              onClick={() => setRoleFilter(f.id)}
              style={{
                padding: "4px 10px",
                borderRadius: "var(--r-xs, 4px)",
                fontSize: "11.5px",
                fontWeight: active ? 700 : 500,
                background: active ? "var(--surface)" : "transparent",
                border: active ? "1px solid var(--border)" : "1px solid transparent",
                color: active ? "var(--blue, #2563eb)" : "var(--text-3)",
                boxShadow: active ? "var(--shadow-xs)" : "none",
                cursor: "pointer",
                whiteSpace: "nowrap",
                transition: "all var(--transition-fast)",
              }}
            >
              {f.label}
            </button>
          );
        })}
      </div>

      {/* Interactive Matrix Grid Table */}
      <div
        style={{
          overflowX: "auto",
          border: "1px solid var(--border)",
          borderRadius: "var(--r-lg, 12px)",
          background: "var(--surface)",
        }}
      >
        <table style={{ width: "100%", borderCollapse: "collapse", textAlign: "left", fontSize: "12px" }}>
          <thead>
            <tr style={{ background: "var(--surface-2)", borderBottom: "1px solid var(--border)" }}>
              {/* Sticky Column: 4 Vai trò của dự án */}
              <th
                style={{
                  position: "sticky",
                  left: 0,
                  zIndex: 2,
                  minWidth: 260,
                  maxWidth: 260,
                  padding: "14px 16px",
                  background: "var(--surface-2)",
                  color: "var(--text-2)",
                  fontWeight: 700,
                  fontSize: "11px",
                  textTransform: "uppercase",
                  letterSpacing: "0.05em",
                  borderRight: "1px solid var(--border)",
                }}
              >
                Vai trò / Phạm vi phòng ban
              </th>

              {/* 5 Columns: 5 phòng ban kho tài liệu */}
              {Object.keys(RESOURCE_META).map((resKey) => {
                const item = RESOURCE_META[resKey];
                const Icon = item.icon;
                const isSelectedDept = resKey === selectedDeptScope;

                return (
                  <th
                    key={resKey}
                    title={item.desc}
                    style={{
                      minWidth: 155,
                      padding: "12px 10px",
                      textAlign: "center",
                      color: "var(--text-1)",
                      fontWeight: 700,
                      borderRight: "1px solid var(--border-soft)",
                      background: isSelectedDept ? "rgba(5, 150, 105, 0.04)" : "transparent",
                    }}
                  >
                    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 5 }}>
                      <div
                        style={{
                          width: 28,
                          height: 28,
                          borderRadius: "var(--r-sm, 6px)",
                          background: item.bg,
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                        }}
                      >
                        <Icon size={15} color={item.color} />
                      </div>
                      <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
                        <span style={{ fontSize: "11px", fontWeight: 700, color: "var(--text-1)" }}>{item.label}</span>
                        {isSelectedDept && (
                          <span
                            style={{
                              width: 6,
                              height: 6,
                              borderRadius: "50%",
                              background: item.color,
                              display: "inline-block",
                            }}
                            title="Ngữ cảnh phòng ban đang chọn"
                          />
                        )}
                      </div>
                    </div>
                  </th>
                );
              })}
            </tr>
          </thead>

          <tbody>
            {filteredRows.map((row, idx) => {
              const isEven = idx % 2 === 0;
              const isFullAccess = row.isFull;

              return (
                <tr
                  key={`${row.role_code}_${row.department_code}`}
                  style={{
                    background: isEven ? "var(--surface)" : "var(--surface-2)",
                    borderBottom: "1px solid var(--border-soft)",
                    transition: "background var(--transition-fast)",
                  }}
                >
                  {/* Sticky First Column: 4 Roles */}
                  <td
                    style={{
                      position: "sticky",
                      left: 0,
                      zIndex: 1,
                      padding: "14px 16px",
                      background: isEven ? "var(--surface)" : "var(--surface-2)",
                      borderRight: "1px solid var(--border)",
                    }}
                  >
                    <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                      <span style={{ fontWeight: 700, color: "var(--text-1)", fontSize: "12.5px" }}>
                        {row.name}
                      </span>
                      <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                        <span
                          style={{
                            fontSize: "10.5px",
                            padding: "1px 7px",
                            borderRadius: "var(--r-xs, 4px)",
                            fontWeight: 600,
                            background: row.scopeType === "ALL_DEPARTMENTS" ? "var(--green-soft)" : "var(--blue-soft)",
                            color: row.scopeType === "ALL_DEPARTMENTS" ? "var(--green)" : "var(--blue)",
                            border: row.scopeType === "ALL_DEPARTMENTS" ? "1px solid rgba(5, 150, 105, 0.2)" : "1px solid rgba(37, 99, 235, 0.2)",
                          }}
                        >
                          {row.scopeLabel}
                        </span>
                        {isFullAccess && (
                          <span
                            style={{
                              fontSize: "10px",
                              color: "var(--amber, #d97706)",
                              fontWeight: 700,
                              background: "var(--amber-soft)",
                              padding: "1px 6px",
                              borderRadius: "var(--r-xs, 4px)",
                              border: "1px solid rgba(217, 119, 6, 0.25)",
                            }}
                          >
                            GLOBAL SCOPE
                          </span>
                        )}
                        {!isFullAccess && (
                          <span
                            style={{
                              fontSize: "10px",
                              color: "var(--blue, #2563eb)",
                              fontWeight: 700,
                              background: "rgba(37, 99, 235, 0.08)",
                              padding: "1px 6px",
                              borderRadius: "var(--r-xs, 4px)",
                              border: "1px solid rgba(37, 99, 235, 0.25)",
                            }}
                          >
                            DEPT SCOPE
                          </span>
                        )}
                      </div>
                    </div>
                  </td>

                  {/* 5 Department Resource Cells */}
                  {Object.keys(RESOURCE_META).map((resKey) => {
                    const k = makeKey(row.role_code, row.department_code, resKey);
                    const policy = policies[k] || {
                      can_query: false,
                      can_view_citation: false,
                      can_edit: false,
                      can_upload: false,
                      can_view_sensitive: false,
                      data_scope: "NONE",
                    };

                    const isChanged = changedKeys.includes(k);
                    const isSelectedDept = resKey === selectedDeptScope;

                    return (
                      <td
                        key={resKey}
                        style={{
                          padding: "12px 10px",
                          textAlign: "center",
                          verticalAlign: "middle",
                          borderRight: "1px solid var(--border-soft)",
                          background: isChanged
                            ? "var(--blue-soft, rgba(37, 99, 235, 0.05))"
                            : isSelectedDept
                            ? "rgba(5, 150, 105, 0.02)"
                            : "transparent",
                          position: "relative",
                        }}
                      >
                        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 6 }}>
                          {/* Toggle Switch */}
                          <button
                            type="button"
                            onClick={() => toggleQuery(row.role_code, row.department_code, resKey)}
                            title={policy.can_query ? "Đang cho phép truy vấn & xem trích dẫn (Bấm để tắt)" : "Đang từ chối truy vấn (Bấm để bật)"}
                            style={{
                              width: 38,
                              height: 20,
                              borderRadius: 12,
                              background: policy.can_query ? "var(--blue, #2563eb)" : "var(--border-strong, #cbd5e1)",
                              border: "none",
                              cursor: "pointer",
                              position: "relative",
                              transition: "background var(--transition-fast)",
                              boxShadow: policy.can_query ? "0 1px 4px rgba(37, 99, 235, 0.4)" : "none",
                            }}
                          >
                            <span
                              style={{
                                width: 14,
                                height: 14,
                                borderRadius: "50%",
                                background: "#ffffff",
                                position: "absolute",
                                top: 3,
                                left: policy.can_query ? 21 : 3,
                                transition: "left var(--transition-fast)",
                                boxShadow: "0 1px 2px rgba(0,0,0,0.2)",
                              }}
                            />
                          </button>

                          {/* Extra Badges / Advanced permissions indicators */}
                          <div style={{ display: "flex", gap: 4, alignItems: "center", minHeight: 18, flexWrap: "wrap", justifyContent: "center" }}>
                            {/* Sensitive badge toggle (Nhạy cảm) */}
                            <button
                              type="button"
                              onClick={() => updateCellField(row.role_code, row.department_code, resKey, "can_view_sensitive", !policy.can_view_sensitive)}
                              title={policy.can_view_sensitive ? "Được xem dữ liệu nhạy cảm (Bấm để tắt)" : "Không được xem dữ liệu nhạy cảm (Bấm để bật)"}
                              style={{
                                background: policy.can_view_sensitive ? "var(--red-soft, rgba(220, 38, 38, 0.09))" : "var(--surface-3, #edf2f7)",
                                border: policy.can_view_sensitive ? "1px solid rgba(220, 38, 38, 0.25)" : "1px solid var(--border-soft)",
                                borderRadius: 4,
                                padding: "2px 5px",
                                cursor: "pointer",
                                display: "flex",
                                alignItems: "center",
                                gap: 2,
                                color: policy.can_view_sensitive ? "var(--red, #dc2626)" : "var(--text-4, #94a3b8)",
                                fontSize: "9.5px",
                                fontWeight: 600,
                                opacity: policy.can_query ? 1 : 0.5,
                                transition: "all var(--transition-fast)",
                              }}
                            >
                              <Lock size={9} />
                              <span>Nhạy cảm</span>
                            </button>

                            {/* Edit badge toggle (Biên tập) */}
                            <button
                              type="button"
                              onClick={() => updateCellField(row.role_code, row.department_code, resKey, "can_edit", !policy.can_edit)}
                              title={policy.can_edit ? "Có quyền biên tập tài liệu phòng ban (Bấm để tắt)" : "Không có quyền biên tập (Bấm để bật)"}
                              style={{
                                background: policy.can_edit ? "var(--green-soft, rgba(5, 150, 105, 0.09))" : "var(--surface-3, #edf2f7)",
                                border: policy.can_edit ? "1px solid rgba(5, 150, 105, 0.25)" : "1px solid var(--border-soft)",
                                borderRadius: 4,
                                padding: "2px 5px",
                                cursor: "pointer",
                                display: "flex",
                                alignItems: "center",
                                gap: 2,
                                color: policy.can_edit ? "var(--green, #059669)" : "var(--text-4, #94a3b8)",
                                fontSize: "9.5px",
                                fontWeight: 600,
                                opacity: policy.can_query ? 1 : 0.5,
                                transition: "all var(--transition-fast)",
                              }}
                            >
                              <Edit3 size={9} />
                              <span>Biên tập</span>
                            </button>

                            {/* Upload badge toggle (Tải lên) */}
                            <button
                              type="button"
                              onClick={() => updateCellField(row.role_code, row.department_code, resKey, "can_upload", !(policy.can_upload ?? policy.can_edit))}
                              title={(policy.can_upload ?? policy.can_edit) ? "Có quyền gửi tài liệu tải lên (Bấm để tắt)" : "Không có quyền gửi tài liệu tải lên (Bấm để bật)"}
                              style={{
                                background: (policy.can_upload ?? policy.can_edit) ? "var(--blue-soft, rgba(37, 99, 235, 0.09))" : "var(--surface-3, #edf2f7)",
                                border: (policy.can_upload ?? policy.can_edit) ? "1px solid rgba(37, 99, 235, 0.25)" : "1px solid var(--border-soft)",
                                borderRadius: 4,
                                padding: "2px 5px",
                                cursor: "pointer",
                                display: "flex",
                                alignItems: "center",
                                gap: 2,
                                color: (policy.can_upload ?? policy.can_edit) ? "var(--blue, #2563eb)" : "var(--text-4, #94a3b8)",
                                fontSize: "9.5px",
                                fontWeight: 600,
                                opacity: policy.can_query ? 1 : 0.5,
                                transition: "all var(--transition-fast)",
                              }}
                            >
                              <UploadCloud size={9} />
                              <span>Tải lên</span>
                            </button>
                          </div>
                        </div>
                      </td>
                    );
                  })}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Footer Info & Audit notice */}
      <div
        style={{
          marginTop: 16,
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          fontSize: "12px",
          color: "var(--text-3)",
          paddingTop: 12,
          borderTop: "1px solid var(--border-soft)",
          flexWrap: "wrap",
          gap: 10,
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
          <Info size={14} color="var(--blue, #2563eb)" />
          <span>
            <strong>Nguyên tắc mặc định từ chối (Default Deny):</strong> Mọi thực thể tri thức chưa được cấp quyền sẽ bị hệ thống tự động lọc bỏ khi truy vấn AI Copilot & Smart Search.
          </span>
        </div>
        <div style={{ color: "var(--text-4)", fontSize: "11.5px" }}>
          Lưu vết bảo mật: Mọi hành động cập nhật ma trận được tự động ghi vào <strong>Nhật ký Kiểm toán (Action: RBAC_MATRIX_UPDATE)</strong>.
        </div>
      </div>
    </div>
  );
}
