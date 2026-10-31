import React, { useState, useEffect, useMemo, useCallback } from "react";
import {
  ShoppingCart, Building2, UserCheck,
  Scale, RotateCcw, Save, Shield, CheckCircle2,
  Lock, AlertTriangle, Info, Sliders, Edit3, Cpu, FlaskConical, Crown
} from "lucide-react";
import {
  fetchGranularRbacMatrix,
  updateGranularRbacMatrix,
  resetGranularRbacMatrix
} from "./adminApi";

// 7 cột bên phải: 5 phòng ban + Nhân viên + Ban lãnh đạo
const RESOURCE_META = {
  LEGAL: {
    label: "Pháp chế (Legal)",
    icon: Scale,
    desc: "Phòng Pháp chế: Hợp đồng CUAD, điều khoản pháp lý & NDA",
    color: "#4f46e5",
    bg: "rgba(79, 70, 229, 0.08)",
  },
  SALES: {
    label: "Kinh doanh (Sales)",
    icon: ShoppingCart,
    desc: "Phòng Kinh doanh: Khách hàng CRM, đơn hàng ERP & báo giá",
    color: "#059669",
    bg: "rgba(5, 150, 105, 0.08)",
  },
  ACCOUNTING_PROCUREMENT: {
    label: "Kế toán / Thu mua",
    icon: Building2,
    desc: "Phòng Kế toán & Thu mua: Hóa đơn, nhà cung cấp & công nợ",
    color: "#d97706",
    bg: "rgba(217, 119, 6, 0.08)",
  },
  IT: {
    label: "Công nghệ / IT",
    icon: Cpu,
    desc: "Phòng Công nghệ / IT: Hạ tầng hệ thống, bảo mật SecOps & SOP kỹ thuật",
    color: "#2563eb",
    bg: "rgba(37, 99, 235, 0.08)",
  },
  RND: {
    label: "R&D",
    icon: FlaskConical,
    desc: "Phòng Nghiên cứu & Phát triển: Sản phẩm & tài liệu kỹ thuật",
    color: "#7c3aed",
    bg: "rgba(124, 58, 237, 0.08)",
  },
  EMPLOYEE: {
    label: "Nhân viên",
    icon: UserCheck,
    desc: "Dữ liệu Nhân viên: Hồ sơ nhân sự, KPI & báo cáo ca làm việc",
    color: "#0891b2",
    bg: "rgba(8, 145, 178, 0.08)",
  },
  EXECUTIVE_BOARD: {
    label: "Ban lãnh đạo",
    icon: Crown,
    desc: "Dữ liệu Ban lãnh đạo: Báo cáo chiến lược & điều hành C-Level",
    color: "#db2777",
    bg: "rgba(219, 39, 119, 0.08)",
  },
};

// Cột bên trái: 4 Role chuẩn của dự án
const ROW_GROUPS = [
  {
    role_code: "ADMIN",
    department_code: "ALL",
    name: "Admin hệ thống (SecOps / IT)",
    scopeLabel: "Toàn công ty",
    scopeType: "ALL_DEPARTMENTS",
    isFull: true,
  },
  {
    role_code: "EXECUTIVE",
    department_code: "ALL",
    name: "Ban lãnh đạo (Executive Director)",
    scopeLabel: "Toàn công ty",
    scopeType: "ALL_DEPARTMENTS",
    isFull: true,
  },
  {
    role_code: "DEPARTMENT_MANAGER",
    department_code: "ALL",
    name: "Trưởng phòng (Department Manager)",
    scopeLabel: "Nội bộ phòng ban",
    scopeType: "OWN_DEPARTMENT",
    isFull: false,
  },
  {
    role_code: "STANDARD_USER",
    department_code: "ALL",
    name: "Chuyên viên (Standard User)",
    scopeLabel: "Nội bộ phòng ban",
    scopeType: "OWN_DEPARTMENT",
    isFull: false,
  },
];

export default function GranularRbacMatrix() {
  const [policies, setPolicies] = useState({});
  const [initialPolicies, setInitialPolicies] = useState({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState(null);
  const [roleFilter, setRoleFilter] = useState("ALL");

  const showToast = (message, type = "success") => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 4500);
  };

  const makeKey = (role, dept, res) => `${role}___${dept}___${res}`;

  const loadMatrix = useCallback(async () => {
    setLoading(true);
    try {
      const data = await fetchGranularRbacMatrix();
      const map = {};
      (data.policies || []).forEach((p) => {
        const k = makeKey(p.role_code, p.department_code, p.resource_type);
        map[k] = { ...p };
      });
      setPolicies(map);
      setInitialPolicies(JSON.parse(JSON.stringify(map)));
    } catch (err) {
      showToast(err.message || "Không thể tải ma trận phân quyền", "error");
    } finally {
      setLoading(false);
    }
  }, []);

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
        cur.can_view_sensitive !== init.can_view_sensitive ||
        cur.data_scope !== init.data_scope
      ) {
        list.push(k);
      }
    });
    return list;
  }, [policies, initialPolicies]);

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

  // Cập nhật chi tiết ô (sensitive, edit)
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

  // Khôi phục mặc định
  const handleReset = async () => {
    if (!window.confirm("Bạn có chắc chắn muốn khôi phục Ma trận Phân quyền Tri thức về cấu hình chuẩn mặc định? Thao tác này sẽ được ghi vào Audit Log.")) {
      return;
    }
    setSaving(true);
    try {
      await resetGranularRbacMatrix();
      await loadMatrix();
      showToast("Đã khôi phục ma trận về cấu hình chuẩn mặc định thành công!", "success");
    } catch (err) {
      showToast(err.message || "Không thể khôi phục mặc định", "error");
    } finally {
      setSaving(false);
    }
  };

  // Lọc 4 vai trò hiển thị
  const filteredRows = useMemo(() => {
    if (roleFilter === "ALL") return ROW_GROUPS;
    return ROW_GROUPS.filter((r) => r.role_code === roleFilter);
  }, [roleFilter]);

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
            background: toast.type === "error" ? "var(--red, #dc2626)" : "var(--green, #059669)",
            color: "#ffffff",
            boxShadow: "var(--shadow-xl)",
            fontWeight: 600,
            fontSize: "13.5px",
            animation: "slideIn 0.3s ease",
          }}
        >
          {toast.type === "error" ? <AlertTriangle size={18} /> : <CheckCircle2 size={18} />}
          <span>{toast.message}</span>
        </div>
      )}

      {/* Header & Subtitle */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 20, flexWrap: "wrap", gap: 14 }}>
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
                Cấu hình phân quyền hỏi đáp AI Copilot, tra cứu Knowledge Graph & xem trích dẫn dữ liệu nguồn theo vai trò và phòng ban
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
          <Sliders size={13} /> Lọc nhanh:
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

              {/* 7 Columns: 5 phòng ban + Nhân viên + Ban lãnh đạo */}
              {Object.keys(RESOURCE_META).map((resKey) => {
                const item = RESOURCE_META[resKey];
                const Icon = item.icon;
                return (
                  <th
                    key={resKey}
                    title={item.desc}
                    style={{
                      minWidth: 140,
                      padding: "12px 10px",
                      textAlign: "center",
                      color: "var(--text-1)",
                      fontWeight: 700,
                      borderRight: "1px solid var(--border-soft)",
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
                      <span style={{ fontSize: "11px", fontWeight: 700, color: "var(--text-1)" }}>{item.label}</span>
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
                    <div style={{ display: "flex", flexDirection: "column", gap: 3 }}>
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
                            FULL ACCESS
                          </span>
                        )}
                      </div>
                    </div>
                  </td>

                  {/* 7 Resource Cells */}
                  {Object.keys(RESOURCE_META).map((resKey) => {
                    const k = makeKey(row.role_code, row.department_code, resKey);
                    const defaultAllowed = isFullAccess || resKey !== "EXECUTIVE_BOARD";
                    const policy = policies[k] || {
                      can_query: defaultAllowed,
                      can_view_citation: defaultAllowed,
                      can_edit: row.role_code === "ADMIN" || (row.role_code === "DEPARTMENT_MANAGER" && resKey !== "EMPLOYEE" && resKey !== "EXECUTIVE_BOARD"),
                      can_view_sensitive: isFullAccess,
                      data_scope: defaultAllowed ? row.scopeType : "NONE",
                    };

                    const isChanged = changedKeys.includes(k);
                    const canEditSupported = resKey !== "EXECUTIVE_BOARD" || row.role_code === "ADMIN";
                    const isSensitiveSupported = resKey === "LEGAL" || resKey === "EMPLOYEE" || resKey === "EXECUTIVE_BOARD";

                    return (
                      <td
                        key={resKey}
                        style={{
                          padding: "12px 10px",
                          textAlign: "center",
                          verticalAlign: "middle",
                          borderRight: "1px solid var(--border-soft)",
                          background: isChanged ? "var(--blue-soft, rgba(37, 99, 235, 0.05))" : "transparent",
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
                          <div style={{ display: "flex", gap: 4, alignItems: "center", minHeight: 18 }}>
                            {/* Sensitive badge toggle */}
                            {isSensitiveSupported && (
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
                                  transition: "all var(--transition-fast)",
                                }}
                              >
                                <Lock size={9} />
                                <span>Nhạy cảm</span>
                              </button>
                            )}

                            {/* Edit badge toggle */}
                            {canEditSupported && (
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
                                  transition: "all var(--transition-fast)",
                                }}
                              >
                                <Edit3 size={9} />
                                <span>Biên tập</span>
                              </button>
                            )}
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
