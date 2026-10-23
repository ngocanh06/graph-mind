import React, { useState, useEffect } from "react";
import {
  Users, CheckCircle2, Clock, AlertTriangle, FileText,
  Sparkles, Download, ArrowUpRight, ShieldCheck, Send,
  RefreshCw, ChevronRight, Filter, Search, Award,
  Building2, BookOpen, Layers, BarChart3, Bot, Check,
  Copy, Printer, MessageSquare
} from "lucide-react";
import { Badge, Button, Modal } from "../../components/ui";
import {
  fetchDepartmentActivityReport,
  signoffDepartmentShiftReport,
  synthesizeDepartmentReport
} from "../../services/api";

const DEPT_OPTIONS = [
  { id: "sales", labelVi: "Kinh Doanh & Khách Hàng", labelEn: "Sales & Accounts", badge: "SALES", color: "#2563EB" },
  { id: "legal", labelVi: "Pháp Chế & Tuân Thủ", labelEn: "Legal & Compliance", badge: "LEGAL", color: "#7C3AED" },
  { id: "operations", labelVi: "Vận Hành & Kho Vận", labelEn: "Operations & Supply", badge: "OPS", color: "#059669" },
  { id: "it", labelVi: "Công Nghệ & An Toàn TT", labelEn: "IT & SecOps", badge: "IT", color: "#D97706" },
  { id: "hr", labelVi: "Nhân Sự & Đào Tạo", labelEn: "Human Resources", badge: "HR", color: "#DC2626" },
];

export default function DepartmentReportView({
  onNavigate,
  t = {},
  lang = "vi",
  role = "knowledge_manager",
  currentUser,
}) {
  const isVi = lang === "vi";
  const isExecOrAdmin = role === "executive" || role === "it_admin";
  const isManager = role === "knowledge_manager";
  const isSpecialist = role === "standard";

  // Derive initial department based on current user's profile
  const userDeptKey = (() => {
    const raw = (currentUser?.department || currentUser?.departmentEn || "").toLowerCase();
    if (raw.includes("kinh doanh") || raw.includes("sales")) return "sales";
    if (raw.includes("pháp chế") || raw.includes("legal")) return "legal";
    if (raw.includes("vận hành") || raw.includes("operations") || raw.includes("ops")) return "operations";
    if (raw.includes("công nghệ") || raw.includes("it") || raw.includes("admin")) return "it";
    if (raw.includes("nhân sự") || raw.includes("hr")) return "hr";
    return "sales";
  })();

  const [activeDept, setActiveDept] = useState(userDeptKey);
  const [timeframe, setTimeframe] = useState("today");
  const [activeTab, setActiveTab] = useState("submissions"); // 'submissions' | 'activity' | 'sops' | 'dossier'
  const [loading, setLoading] = useState(true);
  const [reportData, setReportData] = useState(null);
  const [toastMsg, setToastMsg] = useState("");
  const [errorMsg, setErrorMsg] = useState("");

  // Sign-off Modal state
  const [signoffModalOpen, setSignoffModalOpen] = useState(false);
  const [targetSubmission, setTargetSubmission] = useState(null);
  const [managerComment, setManagerComment] = useState("");
  const [isSigning, setIsSigning] = useState(false);

  // AI Synthesis state
  const [isSynthesizing, setIsSynthesizing] = useState(false);
  const [liveSynthesis, setLiveSynthesis] = useState("");

  // Escalation to Board state
  const [escalateModalOpen, setEscalateModalOpen] = useState(false);
  const [isEscalating, setIsEscalating] = useState(false);

  const showToast = (msg) => {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(""), 3500);
  };

  // Load department report from API
  const loadReport = async (deptToFetch, tfToFetch) => {
    setLoading(true);
    setErrorMsg("");
    try {
      const res = await fetchDepartmentActivityReport(deptToFetch, tfToFetch, currentUser);
      if (res && res.success) {
        setReportData(res);
      } else if (res && res.status === 403) {
        setErrorMsg(res.detail || (isVi ? "Bạn không có quyền truy cập phạm vi phòng ban này (BR-02/BR-04)." : "Access denied for this department scope (BR-02/BR-04)."));
      } else {
        setErrorMsg(isVi ? "Không thể tải dữ liệu báo cáo phòng ban. Vui lòng thử lại sau." : "Failed to load department report.");
      }
    } catch (e) {
      console.warn("[DepartmentReportView] fetch error:", e);
      setErrorMsg(e.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadReport(activeDept, timeframe);
  }, [activeDept, timeframe]);

  // Handle department switch
  const handleSelectDept = (deptId) => {
    if (!isExecOrAdmin && deptId !== userDeptKey) {
      showToast(isVi ? "Trưởng phòng chỉ được xem báo cáo thuộc phòng ban mình phụ trách (BR-04)!" : "Department Managers are restricted to their own department (BR-04)!");
      return;
    }
    setActiveDept(deptId);
  };

  // Handle shift report signoff
  const handleOpenSignoff = (sub) => {
    if (isSpecialist) {
      showToast(isVi ? "Chuyên viên không có quyền phê duyệt báo cáo ca (BR-04)!" : "Only Department Managers can sign off on shift reports (BR-04)!");
      return;
    }
    setTargetSubmission(sub);
    setManagerComment(isVi ? "Đã xem và phê duyệt toàn bộ nội dung ca làm việc. Đánh giá cao tinh thần chủ động." : "Reviewed and approved shift dossier. Excellent initiative.");
    setSignoffModalOpen(true);
  };

  const handleConfirmSignoff = async () => {
    if (!targetSubmission) return;
    setIsSigning(true);
    try {
      const res = await signoffDepartmentShiftReport(targetSubmission.id, managerComment, currentUser);
      if (res && res.success) {
        showToast(isVi ? `Đã phê duyệt & ký số thành công báo cáo ca của ${targetSubmission.specialistName}!` : `Successfully signed off on ${targetSubmission.specialistName}'s shift report!`);
        setSignoffModalOpen(false);
        // Refresh local submissions state
        setReportData((prev) => {
          if (!prev) return prev;
          const updatedSubs = prev.submissions.map((s) => {
            if (s.id === targetSubmission.id) {
              return {
                ...s,
                status: "APPROVED",
                signedBy: currentUser?.name || "Trần M. Anh (Trưởng phòng)",
                signedAt: new Date().toISOString(),
                managerComment: managerComment,
              };
            }
            return s;
          });
          return { ...prev, submissions: updatedSubs };
        });
      } else {
        showToast(res?.detail || (isVi ? "Phê duyệt thất bại." : "Signoff failed."));
      }
    } catch (err) {
      showToast(err.message);
    } finally {
      setIsSigning(false);
    }
  };

  // Handle AI synthesis
  const handleSynthesize = async () => {
    setIsSynthesizing(true);
    showToast(isVi ? "Trợ lý AI đang quét và tổng hợp dữ liệu toàn bộ ca trong phòng ban..." : "AI scanning and synthesizing department activity logs...");
    try {
      const res = await synthesizeDepartmentReport(activeDept, timeframe, currentUser);
      if (res && res.success && res.synthesis) {
        setLiveSynthesis(res.synthesis);
        setActiveTab("dossier");
        showToast(isVi ? "Đã tổng hợp thành công Báo cáo hoạt động phòng ban!" : "Department activity synthesized successfully!");
      }
    } catch (e) {
      console.warn("[DepartmentReportView] synthesis error:", e);
    } finally {
      setIsSynthesizing(false);
    }
  };

  // Handle formal escalation to C-Level
  const handleEscalateToCLevel = () => {
    setIsEscalating(true);
    setTimeout(() => {
      setIsEscalating(false);
      setEscalateModalOpen(false);
      showToast(isVi ? "Đã đệ trình báo cáo tổng hợp phòng ban lên Ban Giám Đốc (Mã hồ sơ: #BGD-ESC-2026-92)!" : "Dossier formally transmitted to the Executive Board (File #BGD-ESC-2026-92)!");
    }, 1200);
  };

  const handleCopySummary = () => {
    const textToCopy = liveSynthesis || (reportData?.escalations ? reportData.escalations.map(e => `• [${e.priority}] ${e.title}: ${e.description}`).join("\n") : "");
    navigator.clipboard?.writeText(textToCopy);
    showToast(isVi ? "Đã sao chép nội dung báo cáo vào bộ nhớ tạm!" : "Report summary copied to clipboard!");
  };

  const currentProfile = reportData?.profile || {};
  const kpis = reportData?.kpis || {};
  const submissions = reportData?.submissions || [];
  const activityStream = reportData?.activityStream || [];
  const sops = reportData?.sops || [];
  const escalations = reportData?.escalations || [];

  return (
    <div className="view active dept-report-container" style={{ overflowY: "auto", maxHeight: "100%", padding: "16px 24px 64px 24px" }}>
      {/* ── HIGH-END CSS STYLESHEET ─────────────────────────────────────────── */}
      <style>{`
        .dept-report-container {
          max-width: 1440px;
          margin: 0 auto;
          display: flex;
          flex-direction: column;
          gap: 20px;
          font-family: var(--f-body, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif);
          color: var(--text-1);
        }

        /* HERO CARD */
        .dept-hero {
          background: linear-gradient(135deg, var(--surface) 0%, var(--surface-2) 100%);
          border: 1px solid var(--border);
          border-radius: 16px;
          padding: 24px 28px;
          box-shadow: 0 4px 24px rgba(0, 0, 0, 0.04);
          position: relative;
          overflow: hidden;
          display: flex;
          flex-direction: column;
          gap: 18px;
        }
        .dept-hero-glow {
          position: absolute;
          top: -50px;
          right: -40px;
          width: 320px;
          height: 320px;
          background: radial-gradient(circle, rgba(5, 150, 105, 0.12) 0%, rgba(37, 99, 235, 0.08) 50%, transparent 70%);
          pointer-events: none;
          filter: blur(35px);
        }

        /* PILLS & BADGES */
        .dept-tag {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          padding: 4px 10px;
          border-radius: 20px;
          font-size: 11.5px;
          font-weight: 700;
          letter-spacing: 0.02em;
        }
        .dept-tag-green {
          background: rgba(16, 185, 129, 0.1);
          color: #059669;
          border: 1px solid rgba(16, 185, 129, 0.25);
        }
        .dept-tag-blue {
          background: rgba(37, 99, 235, 0.08);
          color: #2563eb;
          border: 1px solid rgba(37, 99, 235, 0.2);
        }
        .dept-tag-purple {
          background: rgba(124, 58, 237, 0.08);
          color: #7c3aed;
          border: 1px solid rgba(124, 58, 237, 0.2);
        }
        .dept-tag-neutral {
          background: var(--surface-2);
          color: var(--text-3);
          border: 1px solid var(--border);
        }

        /* KPI MATRIX */
        .dept-kpi-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(260px, 1fr));
          gap: 14px;
        }
        .dept-kpi-card {
          background: var(--surface);
          border: 1px solid var(--border);
          border-radius: 14px;
          padding: 18px 20px;
          display: flex;
          flex-direction: column;
          justify-content: space-between;
          gap: 12px;
          transition: all 0.2s ease;
          box-shadow: 0 2px 8px rgba(0,0,0,0.02);
        }
        .dept-kpi-card:hover {
          transform: translateY(-2px);
          box-shadow: 0 6px 20px rgba(0,0,0,0.06);
          border-color: var(--border-focus, #3b82f6);
        }
        .dept-kpi-val {
          font-size: 26px;
          font-weight: 800;
          color: var(--text-1);
          font-family: var(--f-display, inherit);
          display: flex;
          align-items: baseline;
          gap: 8px;
        }

        /* TAB BAR */
        .dept-tab-bar {
          display: flex;
          align-items: center;
          gap: 8px;
          border-bottom: 1px solid var(--border);
          padding-bottom: 2px;
          overflow-x: auto;
        }
        .dept-tab-btn {
          display: inline-flex;
          align-items: center;
          gap: 8px;
          padding: 10px 18px;
          border-radius: 8px 8px 0 0;
          font-size: 13px;
          font-weight: 700;
          cursor: pointer;
          border: 1px solid transparent;
          border-bottom: none;
          background: transparent;
          color: var(--text-3);
          transition: all 0.15s ease;
          white-space: nowrap;
        }
        .dept-tab-btn.active {
          color: #2563eb;
          background: var(--surface);
          border-color: var(--border);
          box-shadow: 0 -2px 8px rgba(0,0,0,0.03);
          position: relative;
        }
        .dept-tab-btn.active::after {
          content: '';
          position: absolute;
          bottom: -1px;
          left: 0;
          right: 0;
          height: 2px;
          background: #2563eb;
        }

        /* DATA TABLE */
        .dept-table {
          width: 100%;
          border-collapse: collapse;
          font-size: 13px;
          text-align: left;
        }
        .dept-table th {
          background: var(--surface-2);
          color: var(--text-3);
          font-weight: 700;
          padding: 12px 14px;
          border-bottom: 1px solid var(--border);
          text-transform: uppercase;
          font-size: 11px;
          letter-spacing: 0.04em;
        }
        .dept-table td {
          padding: 14px;
          border-bottom: 1px solid var(--border-soft);
          vertical-align: middle;
        }
        .dept-table tr:hover td {
          background: rgba(37, 99, 235, 0.02);
        }

        /* BUTTONS */
        .btn-magic {
          background: linear-gradient(135deg, #7c3aed 0%, #2563eb 100%);
          color: #ffffff;
          border: none;
          box-shadow: 0 4px 14px rgba(124, 58, 237, 0.25);
        }
        .btn-magic:hover {
          filter: brightness(1.08);
          transform: translateY(-1px);
        }
        .btn-emerald {
          background: linear-gradient(135deg, #059669 0%, #10b981 100%);
          color: #ffffff;
          border: none;
          box-shadow: 0 4px 14px rgba(16, 185, 129, 0.25);
        }
        .btn-emerald:hover {
          filter: brightness(1.08);
        }

        /* OFFICIAL MEMO DOSSIER */
        .memo-dossier {
          background: var(--surface);
          border: 1px solid var(--border);
          border-radius: 16px;
          padding: 32px 36px;
          box-shadow: 0 4px 20px rgba(0,0,0,0.04);
          position: relative;
          overflow: hidden;
          display: flex;
          flex-direction: column;
          gap: 22px;
        }
        .memo-stripe {
          position: absolute;
          top: 0; left: 0; right: 0; height: 5px;
          background: linear-gradient(90deg, #059669 0%, #0284c7 40%, #7c3aed 80%, #f59e0b 100%);
        }
        .memo-sign-cert {
          background: linear-gradient(135deg, rgba(16, 185, 129, 0.05) 0%, rgba(37, 99, 235, 0.02) 100%);
          border: 1.5px dashed rgba(16, 185, 129, 0.4);
          border-radius: 12px;
          padding: 18px 22px;
          display: flex;
          align-items: center;
          justify-content: space-between;
          flex-wrap: wrap;
          gap: 16px;
        }
      `}</style>

      {/* ── TOAST NOTIFICATION ────────────────────────────────────────────── */}
      {toastMsg && (
        <div
          style={{
            position: "fixed",
            bottom: "28px",
            right: "28px",
            zIndex: 9999,
            background: "var(--surface)",
            border: "1px solid #3b82f6",
            padding: "12px 20px",
            borderRadius: "12px",
            boxShadow: "0 12px 32px rgba(0,0,0,0.18)",
            display: "flex",
            alignItems: "center",
            gap: "12px",
            animation: "slideIn 0.25s ease",
            backdropFilter: "blur(12px)",
          }}
        >
          <div style={{ width: 28, height: 28, borderRadius: "50%", background: "#ecfdf5", color: "#059669", display: "flex", alignItems: "center", justifyContent: "center" }}>
            <Check size={16} />
          </div>
          <span style={{ fontSize: "13.5px", fontWeight: "600", color: "var(--text-1)" }}>{toastMsg}</span>
        </div>
      )}

      {/* ── 1. HERO HEADER CARD ────────────────────────────────────────────── */}
      <section className="dept-hero">
        <div className="dept-hero-glow"></div>

        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: "16px" }}>
          <div>
            {/* Tag strip */}
            <div style={{ display: "flex", alignItems: "center", gap: "8px", flexWrap: "wrap", marginBottom: "10px" }}>
              <span className="dept-tag dept-tag-green">
                <ShieldCheck size={14} />
                {isVi ? "Báo Cáo Tổng Hợp Cấp Phòng Ban (BR-02 / BR-04)" : "Aggregated Department Report (BR-02 / BR-04)"}
              </span>
              <span className="dept-tag dept-tag-blue">
                <Building2 size={14} />
                {currentProfile.nameVi || (isVi ? "Khối Kinh Doanh & Vận Hành" : "Commercial Operations")}
              </span>
              <span className="dept-tag dept-tag-neutral">
                <Users size={14} />
                {isVi ? `Quản lý: ${currentProfile.managerName || "Trần M. Anh"}` : `Manager: ${currentProfile.managerName || "Tran M. Anh"}`}
              </span>
              <span className="dept-tag dept-tag-purple">
                <Award size={14} />
                {isVi ? "SLA Hoàn tất 100%" : "100% SLA"}
              </span>
            </div>

            <h1 style={{ fontSize: "24px", fontWeight: "800", color: "var(--text-1)", margin: "0 0 6px 0", letterSpacing: "-0.02em" }}>
              {isVi ? "Báo Cáo Tổng Hợp Hoạt Động & Ca Tác Nghiệp Phòng Ban" : "Aggregated Department Activity & Operations Report"}
            </h1>
            <p style={{ fontSize: "13.5px", color: "var(--text-3)", margin: 0, lineHeight: 1.5, maxWidth: "780px" }}>
              {isVi
                ? `Hệ thống giám sát và phê duyệt ca làm việc của đội ngũ chuyên viên, tổng hợp kết quả bảo vệ hợp đồng, tình hình áp dụng quy trình chuẩn SOP và kiến nghị điều hành gửi Ban Giám Đốc.`
                : `Supervision and shift sign-off dashboard for department specialists, synthesizing protected contracts, SOP compliance, and executive escalations.`}
            </p>
          </div>

          {/* Action Cluster */}
          <div style={{ display: "flex", alignItems: "center", gap: "10px", flexWrap: "wrap" }}>
            <button
              onClick={() => onNavigate("sop")}
              style={{
                display: "inline-flex", alignItems: "center", gap: "6px",
                padding: "8px 14px", borderRadius: "8px", border: "1px solid var(--border)",
                background: "var(--surface)", color: "var(--text-2)", fontSize: "13px", fontWeight: "600", cursor: "pointer"
              }}
              title={isVi ? "Mở trình biên soạn SOP phòng ban" : "Open SOP Editor"}
            >
              <BookOpen size={15} />
              <span>{isVi ? "Quy Trình SOP" : "SOP Hub"}</span>
            </button>

            <button
              onClick={handleSynthesize}
              disabled={isSynthesizing}
              className="btn-magic"
              style={{
                display: "inline-flex", alignItems: "center", gap: "6px",
                padding: "8px 16px", borderRadius: "8px", fontSize: "13px", fontWeight: "700", cursor: "pointer"
              }}
              title={isVi ? "AI tự động phân tích và lập báo cáo tổng hợp" : "AI auto-synthesize department activity"}
            >
              <Sparkles size={15} />
              <span>{isSynthesizing ? (isVi ? "AI Đang Tổng Hợp..." : "Synthesizing...") : (isVi ? "AI Tổng Hợp Hoạt Động" : "AI Synthesize Report")}</span>
            </button>

            <button
              onClick={() => setEscalateModalOpen(true)}
              className="btn-emerald"
              style={{
                display: "inline-flex", alignItems: "center", gap: "6px",
                padding: "8px 16px", borderRadius: "8px", fontSize: "13px", fontWeight: "700", cursor: "pointer"
              }}
              title={isVi ? "Đệ trình báo cáo lên Ban Giám Đốc" : "Escalate Report to Executive Board"}
            >
              <Send size={15} />
              <span>{isVi ? "Trình Ban Giám Đốc" : "Escalate to Board"}</span>
            </button>
          </div>
        </div>

        {/* ── DEPARTMENT SWITCHER & TIMEFRAME FILTERS ───────────────────────── */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "12px", borderTop: "1px solid var(--border)", paddingTop: "14px" }}>
          {/* Department selector (unlocked for Exec/Admin, locked with scope badge for Manager) */}
          <div style={{ display: "flex", alignItems: "center", gap: "8px", flexWrap: "wrap" }}>
            <span style={{ fontSize: "12px", fontWeight: "700", color: "var(--text-4)", textTransform: "uppercase", letterSpacing: "0.04em" }}>
              {isVi ? "PHÒNG BAN:" : "DEPARTMENT:"}
            </span>
            {isExecOrAdmin ? (
              <div style={{ display: "flex", alignItems: "center", gap: "6px", flexWrap: "wrap" }}>
                {DEPT_OPTIONS.map((opt) => (
                  <button
                    key={opt.id}
                    onClick={() => handleSelectDept(opt.id)}
                    style={{
                      padding: "5px 12px",
                      borderRadius: "6px",
                      fontSize: "12.5px",
                      fontWeight: activeDept === opt.id ? "700" : "500",
                      border: "1px solid",
                      borderColor: activeDept === opt.id ? opt.color : "var(--border)",
                      background: activeDept === opt.id ? `${opt.color}15` : "var(--surface)",
                      color: activeDept === opt.id ? opt.color : "var(--text-3)",
                      cursor: "pointer",
                      transition: "all 0.15s ease"
                    }}
                  >
                    {isVi ? opt.labelVi : opt.labelEn}
                  </button>
                ))}
              </div>
            ) : (
              <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                <span style={{ padding: "5px 12px", borderRadius: "6px", fontSize: "12.5px", fontWeight: "700", background: "rgba(37, 99, 235, 0.1)", color: "#2563eb", border: "1px solid rgba(37, 99, 235, 0.25)" }}>
                  {currentProfile.nameVi || (isVi ? "Phòng Kinh Doanh & Khách Hàng Doanh Nghiệp" : "Corporate Sales")}
                </span>
                <span style={{ fontSize: "11.5px", color: "var(--text-4)", fontStyle: "italic" }}>
                  {isVi ? "(Phạm vi cố định theo phân quyền BR-04)" : "(Scope enforced via BR-04)"}
                </span>
              </div>
            )}
          </div>

          {/* Timeframe selector */}
          <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
            <span style={{ fontSize: "12px", fontWeight: "700", color: "var(--text-4)", textTransform: "uppercase", letterSpacing: "0.04em" }}>
              {isVi ? "KỲ BÁO CÁO:" : "TIMEFRAME:"}
            </span>
            {[
              { id: "today", labelVi: "Hôm nay (Ca làm)", labelEn: "Today (Shift)" },
              { id: "7d", labelVi: "7 ngày qua", labelEn: "Last 7d" },
              { id: "month", labelVi: "Tháng này", labelEn: "This Month" },
              { id: "quarter", labelVi: "Quý 3/2026", labelEn: "Q3 2026" },
            ].map((tf) => (
              <button
                key={tf.id}
                onClick={() => setTimeframe(tf.id)}
                style={{
                  padding: "4px 10px",
                  borderRadius: "6px",
                  fontSize: "12px",
                  fontWeight: timeframe === tf.id ? "700" : "500",
                  border: "1px solid",
                  borderColor: timeframe === tf.id ? "#2563eb" : "var(--border)",
                  background: timeframe === tf.id ? "#2563eb" : "var(--surface)",
                  color: timeframe === tf.id ? "#ffffff" : "var(--text-3)",
                  cursor: "pointer",
                }}
              >
                {isVi ? tf.labelVi : tf.labelEn}
              </button>
            ))}
          </div>
        </div>
      </section>

      {/* ── 2. ERROR / RESTRICTION ALERT (IF ANY) ─────────────────────────── */}
      {errorMsg && (
        <div style={{ background: "rgba(220, 38, 38, 0.08)", border: "1px solid rgba(220, 38, 38, 0.3)", borderRadius: "12px", padding: "16px 20px", display: "flex", alignItems: "center", gap: "12px", color: "#dc2626" }}>
          <AlertTriangle size={20} />
          <div>
            <div style={{ fontWeight: "700", fontSize: "14px" }}>{isVi ? "Giới hạn phạm vi phòng ban (RBAC Scope Restriction)" : "Department Scope Restriction"}</div>
            <div style={{ fontSize: "13px", opacity: 0.9 }}>{errorMsg}</div>
          </div>
          <button
            onClick={() => setActiveDept(userDeptKey)}
            style={{ marginLeft: "auto", padding: "6px 12px", borderRadius: "6px", background: "#dc2626", color: "#fff", border: "none", fontSize: "12px", fontWeight: "700", cursor: "pointer" }}
          >
            {isVi ? "Về phòng ban của tôi" : "Return to My Department"}
          </button>
        </div>
      )}

      {/* ── 3. KPI BENCHMARK MATRIX (4 DATA-DENSE CARDS) ─────────────────── */}
      <section className="dept-kpi-grid">
        {/* KPI 1 */}
        <div className="dept-kpi-card">
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
            <span style={{ fontSize: "12px", fontWeight: "700", color: "var(--text-3)", textTransform: "uppercase", letterSpacing: "0.04em" }}>
              {isVi ? "Tiến Độ Ca & Tuân Thủ SLA" : "Shift Completion & SLA"}
            </span>
            <div style={{ width: 32, height: 32, borderRadius: 8, background: "rgba(16, 185, 129, 0.1)", color: "#059669", display: "flex", alignItems: "center", justifyContent: "center" }}>
              <CheckCircle2 size={16} />
            </div>
          </div>
          <div>
            <div className="dept-kpi-val">
              {kpis.slaComplianceRate || 100}%
              <span style={{ fontSize: "12.5px", fontWeight: "700", color: "#059669", background: "rgba(16, 185, 129, 0.1)", padding: "2px 8px", borderRadius: "12px" }}>
                {isVi ? "100% SLA" : "100% SLA"}
              </span>
            </div>
            <div style={{ height: 4, background: "var(--border)", borderRadius: 2, marginTop: 8, overflow: "hidden" }}>
              <div style={{ width: "100%", height: "100%", background: "linear-gradient(90deg, #10b981, #059669)" }}></div>
            </div>
            <div style={{ fontSize: "12px", color: "var(--text-4)", marginTop: "6px", display: "flex", alignItems: "center", gap: "6px" }}>
              <Clock size={12} />
              <span>{isVi ? `Xử lý TB: ${kpis.avgTurnaroundMinutes || 12} phút/ca · 8/8 chuyên viên hoàn tất` : `Avg turnaround: ${kpis.avgTurnaroundMinutes || 12}m/case · 8/8 filed`}</span>
            </div>
          </div>
        </div>

        {/* KPI 2 */}
        <div className="dept-kpi-card">
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
            <span style={{ fontSize: "12px", fontWeight: "700", color: "var(--text-3)", textTransform: "uppercase", letterSpacing: "0.04em" }}>
              {isVi ? "Quy Chế & SOP Nội Bộ (BR-04)" : "Internal SOPs & Policies"}
            </span>
            <div style={{ width: 32, height: 32, borderRadius: 8, background: "rgba(124, 58, 237, 0.1)", color: "#7c3aed", display: "flex", alignItems: "center", justifyContent: "center" }}>
              <BookOpen size={16} />
            </div>
          </div>
          <div>
            <div className="dept-kpi-val">
              {kpis.activeSopCount || 6}
              <span style={{ fontSize: "13px", fontWeight: "600", color: "var(--text-3)" }}>
                {isVi ? "Quy trình chuẩn" : "SOP Documents"}
              </span>
            </div>
            <div style={{ height: 4, background: "var(--border)", borderRadius: 2, marginTop: 8, overflow: "hidden" }}>
              <div style={{ width: "80%", height: "100%", background: "linear-gradient(90deg, #7c3aed, #a855f7)" }}></div>
            </div>
            <div style={{ fontSize: "12px", color: "var(--text-4)", marginTop: "6px", display: "flex", alignItems: "center", gap: "6px" }}>
              <ShieldCheck size={12} />
              <span>{isVi ? "4 Đã ban hành · 2 Bản thảo đang rà soát" : "4 Published · 2 Drafts in review"}</span>
            </div>
          </div>
        </div>

        {/* KPI 3 */}
        <div className="dept-kpi-card">
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
            <span style={{ fontSize: "12px", fontWeight: "700", color: "var(--text-3)", textTransform: "uppercase", letterSpacing: "0.04em" }}>
              {isVi ? "Doanh Số & Hợp Đồng Bảo Vệ" : "Protected Pipeline Value"}
            </span>
            <div style={{ width: 32, height: 32, borderRadius: 8, background: "rgba(37, 99, 235, 0.1)", color: "#2563eb", display: "flex", alignItems: "center", justifyContent: "center" }}>
              <BarChart3 size={16} />
            </div>
          </div>
          <div>
            <div className="dept-kpi-val" style={{ color: "#2563eb" }}>
              {kpis.protectedPipelineFormatted || "4.1 Tỷ VND"}
            </div>
            <div style={{ height: 4, background: "var(--border)", borderRadius: 2, marginTop: 8, overflow: "hidden" }}>
              <div style={{ width: "92%", height: "100%", background: "linear-gradient(90deg, #2563eb, #60a5fa)" }}></div>
            </div>
            <div style={{ fontSize: "12px", color: "var(--text-4)", marginTop: "6px", display: "flex", alignItems: "center", gap: "6px" }}>
              <Award size={12} />
              <span>{isVi ? `${kpis.casesResolvedCount || 13} Ca cảnh báo rủi ro khách hàng đã xử lý` : `${kpis.casesResolvedCount || 13} Priority cases resolved`}</span>
            </div>
          </div>
        </div>

        {/* KPI 4 */}
        <div className="dept-kpi-card">
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
            <span style={{ fontSize: "12px", fontWeight: "700", color: "var(--text-3)", textTransform: "uppercase", letterSpacing: "0.04em" }}>
              {isVi ? "Trợ Lý AI Copilot Phòng Ban" : "Dept AI Copilot Utilization"}
            </span>
            <div style={{ width: 32, height: 32, borderRadius: 8, background: "rgba(217, 119, 6, 0.1)", color: "#d97706", display: "flex", alignItems: "center", justifyContent: "center" }}>
              <Bot size={16} />
            </div>
          </div>
          <div>
            <div className="dept-kpi-val">
              {kpis.copilotQueriesCount || 142}
              <span style={{ fontSize: "13px", fontWeight: "600", color: "var(--text-3)" }}>
                {isVi ? "Truy vấn/ca" : "Queries/shift"}
              </span>
            </div>
            <div style={{ height: 4, background: "var(--border)", borderRadius: 2, marginTop: 8, overflow: "hidden" }}>
              <div style={{ width: "95%", height: "100%", background: "linear-gradient(90deg, #d97706, #f59e0b)" }}></div>
            </div>
            <div style={{ fontSize: "12px", color: "var(--text-4)", marginTop: "6px", display: "flex", alignItems: "center", gap: "6px" }}>
              <Sparkles size={12} />
              <span>{isVi ? `Độ chính xác trích dẫn: ${kpis.citationPrecisionRate || 94.2}%` : `Citation Precision: ${kpis.citationPrecisionRate || 94.2}%`}</span>
            </div>
          </div>
        </div>
      </section>

      {/* ── 4. MULTI-TAB WORKSPACE NAVIGATION ─────────────────────────────── */}
      <div className="dept-tab-bar">
        <button
          onClick={() => setActiveTab("submissions")}
          className={`dept-tab-btn ${activeTab === "submissions" ? "active" : ""}`}
        >
          <Users size={15} />
          <span>{isVi ? "Báo Cáo Ca của Đội Ngũ & Phê Duyệt" : "Team Shift Submissions & Approval"}</span>
          <span style={{ fontSize: "11px", padding: "1px 6px", borderRadius: "10px", background: "rgba(37,99,235,0.1)", color: "#2563eb" }}>
            {submissions.length}
          </span>
        </button>

        <button
          onClick={() => setActiveTab("activity")}
          className={`dept-tab-btn ${activeTab === "activity" ? "active" : ""}`}
        >
          <Clock size={15} />
          <span>{isVi ? "Dòng Hoạt Động Tổng Hợp Thời Gian Thực" : "Aggregated Activity Stream"}</span>
        </button>

        <button
          onClick={() => setActiveTab("sops")}
          className={`dept-tab-btn ${activeTab === "sops" ? "active" : ""}`}
        >
          <BookOpen size={15} />
          <span>{isVi ? "Quy Trình Chuẩn (SOP) & Tài Liệu Bộ Phận" : "Department SOPs & Documents"}</span>
        </button>

        <button
          onClick={() => setActiveTab("dossier")}
          className={`dept-tab-btn ${activeTab === "dossier" ? "active" : ""}`}
        >
          <FileText size={15} />
          <span>{isVi ? "Văn Bản Tổng Hợp Trình Ban Giám Đốc" : "Official Executive Dossier"}</span>
          <span style={{ fontSize: "11px", padding: "1px 6px", borderRadius: "10px", background: "rgba(16,185,129,0.1)", color: "#059669" }}>
            MEMO
          </span>
        </button>
      </div>

      {/* ── TAB 1: TEAM SHIFT SUBMISSIONS & MANAGER APPROVAL ──────────────── */}
      {activeTab === "submissions" && (
        <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "12px" }}>
            <div>
              <h3 style={{ fontSize: "16px", fontWeight: "800", color: "var(--text-1)", margin: "0 0 4px 0" }}>
                {isVi ? "Danh Sách Báo Cáo Ca Của Chuyên Viên Trong Phòng Ban" : "Specialist Shift Submissions Roster"}
              </h3>
              <p style={{ fontSize: "12.5px", color: "var(--text-3)", margin: 0 }}>
                {isVi
                  ? "Trưởng phòng xem xét chi tiết kết quả xử lý, các phát sinh nghiệp vụ và ký số phê duyệt báo cáo ca."
                  : "Review specialist operational highlights, protected revenues, and execute digital manager sign-off."}
              </p>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
              <span style={{ fontSize: "12px", color: "var(--text-3)" }}>
                {isVi ? "Tiến độ duyệt:" : "Approval progress:"} <b>{submissions.filter(s => s.status === "APPROVED").length}/{submissions.length} ca</b>
              </span>
            </div>
          </div>

          <div style={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: "14px", overflow: "hidden", boxShadow: "0 2px 10px rgba(0,0,0,0.02)" }}>
            <table className="dept-table">
              <thead>
                <tr>
                  <th>{isVi ? "Chuyên Viên / Vị Trí" : "Specialist / Role"}</th>
                  <th>{isVi ? "Thời Gian Nộp" : "Timestamp"}</th>
                  <th>{isVi ? "Ca Xử Lý / SLA" : "Cases / SLA"}</th>
                  <th>{isVi ? "Doanh Số Bảo Vệ" : "Protected Value"}</th>
                  <th>{isVi ? "Chứng Từ Phát Hành" : "Documents"}</th>
                  <th>{isVi ? "Trạng Thái & Phê Duyệt" : "Sign-off Status"}</th>
                  <th style={{ textAlign: "right" }}>{isVi ? "Thao Tác" : "Actions"}</th>
                </tr>
              </thead>
              <tbody>
                {submissions.map((sub) => {
                  const isApproved = sub.status === "APPROVED";
                  return (
                    <tr key={sub.id}>
                      <td>
                        <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                          <div style={{ width: 34, height: 34, borderRadius: "50%", background: "linear-gradient(135deg, #2563eb, #3b82f6)", color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "12px", fontWeight: "800" }}>
                            {sub.avatar || sub.specialistName?.substring(0, 2) || "NV"}
                          </div>
                          <div>
                            <div style={{ fontWeight: "700", fontSize: "13.5px", color: "var(--text-1)" }}>{sub.specialistName}</div>
                            <div style={{ fontSize: "11px", color: "var(--text-4)" }}>@{sub.username} · {sub.roleTitle}</div>
                          </div>
                        </div>
                      </td>
                      <td style={{ fontSize: "12px", color: "var(--text-3)", whiteSpace: "nowrap" }}>
                        {sub.submissionTime}
                      </td>
                      <td>
                        <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                          <span style={{ fontWeight: "700", color: "var(--text-1)" }}>{sub.casesHandled} {isVi ? "ca" : "cases"}</span>
                          <span style={{ fontSize: "10.5px", fontWeight: "700", color: "#059669", background: "rgba(16,185,129,0.1)", padding: "1px 6px", borderRadius: "10px" }}>
                            {sub.slaRate}
                          </span>
                        </div>
                        <div style={{ fontSize: "11px", color: "var(--text-4)", marginTop: "2px" }}>{sub.avgTurnaround}</div>
                      </td>
                      <td>
                        <span style={{ fontWeight: "800", color: "#2563eb", fontSize: "13.5px" }}>
                          {sub.pipelineValue}
                        </span>
                      </td>
                      <td>
                        <div style={{ display: "flex", flexDirection: "column", gap: "2px" }}>
                          {sub.documentsDispatched?.slice(0, 2).map((doc, idx) => (
                            <span key={idx} style={{ fontSize: "11px", color: "var(--text-2)", fontFamily: "var(--f-mono, monospace)" }}>
                              {doc}
                            </span>
                          ))}
                        </div>
                      </td>
                      <td>
                        {isApproved ? (
                          <div style={{ display: "flex", flexDirection: "column", gap: "2px" }}>
                            <span style={{ display: "inline-flex", alignItems: "center", gap: "4px", fontSize: "11.5px", fontWeight: "700", color: "#059669", background: "rgba(16,185,129,0.1)", padding: "3px 8px", borderRadius: "6px", width: "fit-content" }}>
                              <CheckCircle2 size={13} />
                              {isVi ? "ĐÃ DUYỆT & KÝ SỐ" : "APPROVED"}
                            </span>
                            <span style={{ fontSize: "10.5px", color: "var(--text-4)" }}>
                              {isVi ? "Bởi:" : "By:"} {sub.signedBy || "Trần M. Anh"}
                            </span>
                          </div>
                        ) : (
                          <span style={{ display: "inline-flex", alignItems: "center", gap: "4px", fontSize: "11.5px", fontWeight: "700", color: "#d97706", background: "rgba(217,119,6,0.1)", padding: "3px 8px", borderRadius: "6px", width: "fit-content" }}>
                            <Clock size={13} />
                            {isVi ? "CHỜ TRƯỞNG PHÒNG DUYỆT" : "PENDING REVIEW"}
                          </span>
                        )}
                      </td>
                      <td style={{ textAlign: "right" }}>
                        {isApproved ? (
                          <button
                            onClick={() => {
                              setTargetSubmission(sub);
                              setSignoffModalOpen(true);
                            }}
                            style={{ padding: "6px 12px", borderRadius: "6px", border: "1px solid var(--border)", background: "var(--surface)", color: "var(--text-2)", fontSize: "12px", fontWeight: "600", cursor: "pointer" }}
                          >
                            {isVi ? "Xem chứng thư" : "View Sign-off"}
                          </button>
                        ) : (
                          <button
                            onClick={() => handleOpenSignoff(sub)}
                            className="btn-emerald"
                            style={{ padding: "6px 14px", borderRadius: "6px", fontSize: "12px", fontWeight: "700", cursor: "pointer", display: "inline-flex", alignItems: "center", gap: "5px" }}
                          >
                            <CheckCircle2 size={14} />
                            <span>{isVi ? "Phê Duyệt & Ký Số" : "Sign Off"}</span>
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Expanded Submission Detail Preview */}
          <div style={{ background: "var(--surface-2)", border: "1px solid var(--border)", borderRadius: "12px", padding: "18px 20px" }}>
            <div style={{ fontSize: "12px", fontWeight: "800", color: "#2563eb", textTransform: "uppercase", letterSpacing: "0.04em", display: "flex", alignItems: "center", gap: "6px", marginBottom: "8px" }}>
              <Award size={15} />
              {isVi ? "ĐIỂM NỔI BẬT & ĐỀ XUẤT CỦA CÁC CHUYÊN VIÊN TRONG CA" : "SHIFT HIGHLIGHTS & ESCALATIONS SUMMARY"}
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))", gap: "12px" }}>
              {submissions.map((s) => (
                <div key={s.id} style={{ background: "var(--surface)", border: "1px solid var(--border-soft)", borderRadius: "10px", padding: "12px 14px", display: "flex", flexDirection: "column", gap: "6px" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <span style={{ fontWeight: "700", fontSize: "13px", color: "var(--text-1)" }}>{s.specialistName}</span>
                    <span style={{ fontSize: "11px", fontWeight: "700", color: "#2563eb" }}>{s.pipelineValue}</span>
                  </div>
                  <p style={{ fontSize: "12px", color: "var(--text-2)", margin: 0, lineHeight: 1.45 }}>
                    {s.summary}
                  </p>
                  {s.escalation && (
                    <div style={{ fontSize: "11.5px", color: "#d97706", background: "rgba(217,119,6,0.06)", padding: "6px 8px", borderRadius: "6px", marginTop: "4px" }}>
                      <b>{isVi ? "Đề xuất Trưởng phòng:" : "Escalation:"}</b> {s.escalation}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ── TAB 2: AGGREGATED REAL-TIME ACTIVITY STREAM ────────────────────── */}
      {activeTab === "activity" && (
        <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
          <div>
            <h3 style={{ fontSize: "16px", fontWeight: "800", color: "var(--text-1)", margin: "0 0 4px 0" }}>
              {isVi ? "Dòng Sự Kiện Tác Nghiệp Tổng Hợp Của Phòng Ban" : "Department Real-time Operational Stream"}
            </h3>
            <p style={{ fontSize: "12.5px", color: "var(--text-3)", margin: 0 }}>
              {isVi
                ? "Nhật ký kiểm toán (audit trail) ghi nhận toàn bộ hoạt động: ký duyệt ca, cập nhật SOP, giải quyết rủi ro hợp đồng và đồng bộ tài liệu."
                : "Real-time audit log tracking shift approvals, SOP publications, contract risk actions, and document ingestions."}
            </p>
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
            {activityStream.map((item) => (
              <div
                key={item.id}
                style={{
                  background: "var(--surface)",
                  border: "1px solid var(--border)",
                  borderRadius: "12px",
                  padding: "14px 18px",
                  display: "flex",
                  alignItems: "flex-start",
                  gap: "14px",
                  boxShadow: "0 1px 4px rgba(0,0,0,0.02)"
                }}
              >
                <div style={{ width: 36, height: 36, borderRadius: "50%", background: "rgba(37, 99, 235, 0.08)", color: "#2563eb", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, marginTop: "2px" }}>
                  <Clock size={16} />
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: "10px" }}>
                    <div style={{ fontWeight: "700", fontSize: "14px", color: "var(--text-1)" }}>{item.title}</div>
                    <span style={{ fontSize: "11.5px", color: "var(--text-4)", whiteSpace: "nowrap" }}>{item.timestamp}</span>
                  </div>
                  <div style={{ fontSize: "12.5px", color: "var(--text-2)", marginTop: "4px", lineHeight: 1.45 }}>
                    {item.details}
                  </div>
                  <div style={{ fontSize: "11px", color: "var(--text-4)", marginTop: "6px" }}>
                    {isVi ? "Thực hiện bởi:" : "Actor:"} <b>{item.actor}</b>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── TAB 3: DEPARTMENT SOPS & INTERNAL KNOWLEDGE ───────────────────── */}
      {activeTab === "sops" && (
        <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "12px" }}>
            <div>
              <h3 style={{ fontSize: "16px", fontWeight: "800", color: "var(--text-1)", margin: "0 0 4px 0" }}>
                {isVi ? "Quy Trình Chuẩn (SOP) Phục Vụ Ca Tác Nghiệp (FR26 / BR-04)" : "Standard Operating Procedures (SOPs) & Internal Policies"}
              </h3>
              <p style={{ fontSize: "12.5px", color: "var(--text-3)", margin: 0 }}>
                {isVi
                  ? "Các tài liệu hướng dẫn và quy chế do Trưởng phòng ban hành để đội ngũ nhân sự tuân thủ nghiêm ngặt trong ca làm việc."
                  : "Operational guidelines and compliance procedures authored and enforced by the Department Manager."}
              </p>
            </div>
            <button
              onClick={() => onNavigate("sop")}
              className="btn-magic"
              style={{ padding: "8px 16px", borderRadius: "8px", fontSize: "13px", fontWeight: "700", cursor: "pointer", display: "inline-flex", alignItems: "center", gap: "6px" }}
            >
              <BookOpen size={15} />
              <span>{isVi ? "Soạn & Xuất Bản SOP Mới" : "Author New SOP"}</span>
            </button>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))", gap: "14px" }}>
            {sops.map((sop) => (
              <div
                key={sop.id}
                style={{
                  background: "var(--surface)",
                  border: "1px solid var(--border)",
                  borderRadius: "12px",
                  padding: "18px 20px",
                  display: "flex",
                  flexDirection: "column",
                  justifyContent: "space-between",
                  gap: "12px",
                  boxShadow: "0 2px 8px rgba(0,0,0,0.02)"
                }}
              >
                <div>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "8px" }}>
                    <span style={{ fontFamily: "var(--f-mono)", fontSize: "11.5px", fontWeight: "700", color: "#2563eb", background: "rgba(37,99,235,0.08)", padding: "2px 8px", borderRadius: "4px" }}>
                      {sop.code}
                    </span>
                    <span style={{ fontSize: "11px", fontWeight: "700", color: sop.status === "PUBLISHED" ? "#059669" : "#d97706", background: sop.status === "PUBLISHED" ? "rgba(16,185,129,0.1)" : "rgba(217,119,6,0.1)", padding: "2px 8px", borderRadius: "10px" }}>
                      {sop.status}
                    </span>
                  </div>
                  <h4 style={{ fontSize: "14px", fontWeight: "700", color: "var(--text-1)", margin: "0 0 6px 0", lineHeight: 1.4 }}>
                    {sop.title}
                  </h4>
                  <div style={{ fontSize: "12px", color: "var(--text-3)" }}>
                    {isVi ? "Ban hành bởi:" : "Author:"} <b>{sop.author}</b> · {sop.version}
                  </div>
                </div>

                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", borderTop: "1px solid var(--border-soft)", paddingTop: "10px" }}>
                  <span style={{ fontSize: "11px", color: "var(--text-4)" }}>
                    {isVi ? "Cập nhật:" : "Updated:"} {sop.updatedAt}
                  </span>
                  <button
                    onClick={() => onNavigate("sop")}
                    style={{ fontSize: "12px", fontWeight: "700", color: "#2563eb", background: "transparent", border: "none", cursor: "pointer", display: "inline-flex", alignItems: "center", gap: "4px" }}
                  >
                    <span>{isVi ? "Xem chi tiết" : "View"}</span>
                    <ArrowUpRight size={13} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── TAB 4: OFFICIAL EXECUTIVE DOSSIER ──────────────────────────────── */}
      {activeTab === "dossier" && (
        <div className="memo-dossier">
          <div className="memo-stripe"></div>

          {/* Dossier Header */}
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: "16px", borderBottom: "1px solid var(--border)", paddingBottom: "18px" }}>
            <div>
              <div style={{ fontSize: "12px", fontWeight: "800", color: "#133e70", textTransform: "uppercase", letterSpacing: "0.06em", display: "flex", alignItems: "center", gap: "8px" }}>
                <img src="/logo-icon.svg" alt="GraphMind Logo" style={{ width: 20, height: 20, borderRadius: 4, objectFit: "contain" }} />
                GRAPH MIND · {currentProfile.nameVi ? currentProfile.nameVi.toUpperCase() : "KHỐI QUẢN LÝ PHÒNG BAN & BỘ PHẬN"}
              </div>
              <h2 style={{ fontSize: "22px", fontWeight: "800", color: "var(--text-1)", margin: "6px 0 4px 0", letterSpacing: "-0.01em" }}>
                {isVi ? "Văn Bản Báo Cáo Tổng Hợp Hoạt Động & Đề Xuất Điều Hành" : "Aggregated Department Performance Memo & Strategic Escalations"}
              </h2>
              <div style={{ fontSize: "12.5px", color: "var(--text-3)" }}>
                {isVi ? "Người lập báo cáo:" : "Prepared by:"} <b style={{ color: "var(--text-1)" }}>{currentProfile.managerName || "Trần M. Anh"} ({isVi ? "Trưởng phòng" : "Dept Manager"})</b> · {isVi ? "Kỳ báo cáo:" : "Timeframe:"} {timeframe === "today" ? (isVi ? "Hôm nay, ca tác nghiệp" : "Today, live shift") : timeframe} · {isVi ? "Trích xuất:" : "Generated:"} {new Date().toLocaleDateString(isVi ? "vi-VN" : "en-GB")}
              </div>
            </div>

            <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
              <button
                onClick={handleCopySummary}
                style={{ padding: "8px 14px", borderRadius: "8px", border: "1px solid var(--border)", background: "var(--surface)", color: "var(--text-2)", fontSize: "12.5px", fontWeight: "600", cursor: "pointer", display: "inline-flex", alignItems: "center", gap: "6px" }}
              >
                <Copy size={14} />
                <span>{isVi ? "Sao chép" : "Copy"}</span>
              </button>
              <button
                onClick={() => showToast(isVi ? "Đang xuất bản in PDF chất lượng cao..." : "Exporting PDF Memo...")}
                style={{ padding: "8px 14px", borderRadius: "8px", border: "1px solid var(--border)", background: "var(--surface)", color: "var(--text-2)", fontSize: "12.5px", fontWeight: "600", cursor: "pointer", display: "inline-flex", alignItems: "center", gap: "6px" }}
              >
                <Printer size={14} />
                <span>{isVi ? "In / Xuất PDF" : "Print PDF"}</span>
              </button>
            </div>
          </div>

          {/* Section 1: Executive Summary */}
          <div>
            <div style={{ fontSize: "13.5px", fontWeight: "800", color: "#2563eb", textTransform: "uppercase", letterSpacing: "0.04em", display: "flex", alignItems: "center", gap: "8px", marginBottom: "10px" }}>
              <Award size={16} />
              I. {isVi ? "TỔNG QUAN HIỆU SUẤT TÁC NGHIỆP CỦA PHÒNG BAN" : "EXECUTIVE SUMMARY & OPERATIONAL PERFORMANCE"}
            </div>
            <div style={{ background: "var(--surface-2)", padding: "18px 22px", borderRadius: "12px", border: "1px solid var(--border-soft)", fontSize: "13.5px", lineHeight: "1.7", color: "var(--text-1)", whiteSpace: "pre-line" }}>
              {liveSynthesis ? liveSynthesis : (
                isVi
                  ? `Trong ca làm việc hôm nay, toàn thể 8/8 chuyên viên thuộc Phòng Kinh Doanh & Khách Hàng Doanh Nghiệp đã hoàn thành ca làm việc đúng hạn, đạt 100% cam kết thời gian phản hồi SLA (trung bình 12 phút/ca).
Đội ngũ đã tiếp nhận và giải quyết dứt điểm 13 ca cảnh báo rủi ro khách hàng phát hiện từ đồ thị tri thức Neo4j, bảo vệ thành công 4.1 Tỷ VND doanh số tái ký hợp đồng (tiêu biểu: ABC Corporation 1.2B và Delta Trading Ltd 2.9B). Toàn bộ chứng từ phát hành (#BG-2026-09, EDR #8821, Phụ lục PL #44) đều được lưu trữ và kiểm soát chặt chẽ theo phân quyền RBAC.`
                  : `During today's operational cycle, all 8 specialists fulfilled shift requirements with 100% SLA compliance (avg 12m turnaround). Handled 13 high-priority account alerts, protecting $4.1B VND in contract renewals (ABC Corp $1.2B, Delta Trading $2.9B). All outbound transaction annexes were validated under strict RBAC governance.`
              )}
            </div>
          </div>

          {/* Section 2: Key Escalations to Board of Directors */}
          <div>
            <div style={{ fontSize: "13.5px", fontWeight: "800", color: "#2563eb", textTransform: "uppercase", letterSpacing: "0.04em", display: "flex", alignItems: "center", gap: "8px", marginBottom: "10px" }}>
              <Send size={16} />
              II. {isVi ? "CÁC ĐỀ XUẤT & KIẾN NGHỊ ĐIỀU HÀNH GỬI BAN GIÁM ĐỐC" : "MANAGERIAL ESCALATIONS TO THE EXECUTIVE BOARD"}
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
              {escalations.map((esc, i) => (
                <div key={esc.id || i} style={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: "10px", padding: "14px 18px", display: "flex", alignItems: "flex-start", gap: "12px" }}>
                  <div style={{ width: 26, height: 26, borderRadius: "50%", background: esc.priority === "HIGH" ? "rgba(220, 38, 38, 0.1)" : "rgba(37, 99, 235, 0.1)", color: esc.priority === "HIGH" ? "#dc2626" : "#2563eb", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "12px", fontWeight: "800", shrink: 0, marginTop: "2px" }}>
                    {i + 1}
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: "8px", flexWrap: "wrap" }}>
                      <span style={{ fontWeight: "700", fontSize: "13.5px", color: "var(--text-1)" }}>{esc.title}</span>
                      <span style={{ fontSize: "10.5px", fontWeight: "700", color: esc.priority === "HIGH" ? "#dc2626" : "#2563eb", background: esc.priority === "HIGH" ? "rgba(220,38,38,0.1)" : "rgba(37,99,235,0.1)", padding: "1px 6px", borderRadius: "8px" }}>
                        {esc.priority}
                      </span>
                      <span style={{ fontSize: "11px", color: "var(--text-4)" }}>
                        {isVi ? "Kính gửi:" : "Target:"} <b>{esc.target}</b>
                      </span>
                    </div>
                    <p style={{ fontSize: "13px", color: "var(--text-2)", margin: "4px 0 0 0", lineHeight: 1.5 }}>
                      {esc.description}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Section 3: Digital Sign-off & Verification Seal */}
          <div className="memo-sign-cert">
            <div style={{ display: "flex", alignItems: "center", gap: "14px" }}>
              <div style={{ width: 46, height: 46, borderRadius: "12px", background: "linear-gradient(135deg, #059669 0%, #10b981 100%)", color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "16px", fontWeight: "800", boxShadow: "0 4px 14px rgba(16, 185, 129, 0.3)" }}>
                TA
              </div>
              <div>
                <div style={{ display: "flex", alignItems: "center", gap: "8px", flexWrap: "wrap" }}>
                  <span style={{ fontSize: "14.5px", fontWeight: "800", color: "var(--text-1)" }}>
                    {currentProfile.managerName || "Trần M. Anh"} · {isVi ? "Trưởng Phòng Quản Lý Cấp Trung" : "Department Head"}
                  </span>
                  <span style={{ fontSize: "11px", fontWeight: "700", color: "#059669", background: "rgba(16,185,129,0.15)", padding: "2px 8px", borderRadius: "12px" }}>
                    <ShieldCheck size={12} style={{ display: "inline", marginRight: 3, verticalAlign: "-2px" }} />
                    {isVi ? "ĐÃ XÁC THỰC KÝ SỐ NỘI BỘ" : "CRYPTOGRAPHICALLY VERIFIED"}
                  </span>
                </div>
                <div style={{ fontSize: "12px", color: "var(--text-3)", marginTop: "4px" }}>
                  {isVi ? "Chữ ký số xác nhận tính trung thực và toàn vẹn của số liệu ca tác nghiệp phòng ban." : "Verified digital seal certifying the accuracy of aggregated shift telemetry."}
                </div>
                <div style={{ fontSize: "11px", color: "var(--text-4)", fontFamily: "var(--f-mono)", marginTop: "3px" }}>
                  TOKEN: SHA256:7f89b2c418...e094 · GraphMind EKMP Department Gateway
                </div>
              </div>
            </div>

            <button
              onClick={() => setEscalateModalOpen(true)}
              className="btn-emerald"
              style={{ padding: "10px 20px", borderRadius: "8px", fontSize: "13px", fontWeight: "700", cursor: "pointer", display: "inline-flex", alignItems: "center", gap: "6px" }}
            >
              <Send size={15} />
              <span>{isVi ? "Đệ Trình Lên Ban Giám Đốc" : "Transmit to Board"}</span>
            </button>
          </div>
        </div>
      )}

      {/* ── MODAL: SHIFT REPORT SIGNOFF ───────────────────────────────────── */}
      {signoffModalOpen && targetSubmission && (
        <Modal
          isOpen={signoffModalOpen}
          onClose={() => setSignoffModalOpen(false)}
          title={isVi ? `Phê Duyệt Báo Cáo Ca: ${targetSubmission.specialistName}` : `Sign Off Shift Dossier: ${targetSubmission.specialistName}`}
        >
          <div style={{ display: "flex", flexDirection: "column", gap: "16px", padding: "6px 0" }}>
            <div style={{ background: "var(--surface-2)", padding: "14px", borderRadius: "10px", fontSize: "13px", lineHeight: "1.5" }}>
              <div style={{ fontWeight: "700", color: "var(--text-1)", marginBottom: "4px" }}>
                {targetSubmission.specialistName} (@{targetSubmission.username}) · {targetSubmission.roleTitle}
              </div>
              <div style={{ color: "var(--text-3)" }}>
                {targetSubmission.summary}
              </div>
              <div style={{ marginTop: "6px", color: "#2563eb", fontWeight: "700" }}>
                {isVi ? "Doanh số bảo vệ:" : "Protected pipeline:"} {targetSubmission.pipelineValue} · {targetSubmission.slaRate}
              </div>
            </div>

            <div>
              <label style={{ display: "block", fontSize: "12.5px", fontWeight: "700", color: "var(--text-2)", marginBottom: "6px" }}>
                {isVi ? "Ý kiến phê duyệt của Trưởng phòng:" : "Manager Approval & Direction:"}
              </label>
              <textarea
                value={managerComment}
                onChange={(e) => setManagerComment(e.target.value)}
                rows={3}
                style={{
                  width: "100%",
                  padding: "10px",
                  borderRadius: "8px",
                  border: "1px solid var(--border)",
                  background: "var(--surface)",
                  color: "var(--text-1)",
                  fontSize: "13px",
                  resize: "vertical",
                  boxSizing: "border-box"
                }}
                placeholder={isVi ? "Nhập chỉ đạo hoặc đánh giá của Trưởng phòng..." : "Enter managerial sign-off directions..."}
              />
            </div>

            <div style={{ display: "flex", justifyContent: "flex-end", gap: "10px", marginTop: "8px" }}>
              <button
                onClick={() => setSignoffModalOpen(false)}
                style={{ padding: "8px 16px", borderRadius: "8px", border: "1px solid var(--border)", background: "var(--surface)", color: "var(--text-2)", fontSize: "13px", fontWeight: "600", cursor: "pointer" }}
              >
                {isVi ? "Hủy" : "Cancel"}
              </button>
              <button
                onClick={handleConfirmSignoff}
                disabled={isSigning}
                className="btn-emerald"
                style={{ padding: "8px 18px", borderRadius: "8px", fontSize: "13px", fontWeight: "700", cursor: "pointer", display: "inline-flex", alignItems: "center", gap: "6px" }}
              >
                <CheckCircle2 size={16} />
                <span>{isSigning ? (isVi ? "Đang ký số..." : "Signing...") : (isVi ? "Xác Nhận & Ký Số Phê Duyệt" : "Confirm & Sign Off")}</span>
              </button>
            </div>
          </div>
        </Modal>
      )}

      {/* ── MODAL: ESCALATE TO BOARD OF DIRECTORS ─────────────────────────── */}
      {escalateModalOpen && (
        <Modal
          isOpen={escalateModalOpen}
          onClose={() => setEscalateModalOpen(false)}
          title={isVi ? "Đệ Trình Báo Cáo Phòng Ban Lên Ban Giám Đốc" : "Escalate Department Dossier to Executive Board"}
        >
          <div style={{ display: "flex", flexDirection: "column", gap: "16px", padding: "6px 0" }}>
            <div style={{ background: "rgba(37, 99, 235, 0.06)", border: "1px solid rgba(37, 99, 235, 0.2)", padding: "14px", borderRadius: "10px", fontSize: "13px", lineHeight: "1.5" }}>
              <div style={{ fontWeight: "700", color: "#2563eb", marginBottom: "4px" }}>
                {isVi ? "Kính gửi Ban Giám Đốc (CEO & Hội Đồng Quản Trị):" : "To the Board of Directors & C-Suite:"}
              </div>
              <p style={{ margin: 0, color: "var(--text-2)" }}>
                {isVi
                  ? `Báo cáo tổng hợp hoạt động ca làm việc của ${currentProfile.nameVi || "Phòng Kinh Doanh"} kèm các kiến nghị quan trọng về hạn mức chiết khấu 10%-12% và đôn đốc bảo lãnh thanh toán sẽ được chuyển trực tiếp vào hộp thư điều hành của Tổng Giám Đốc.`
                  : `Aggregated shift telemetry and critical escalations will be dispatched to the Executive Director's priority briefing queue.`}
              </p>
            </div>

            <div style={{ display: "flex", justifyContent: "flex-end", gap: "10px", marginTop: "8px" }}>
              <button
                onClick={() => setEscalateModalOpen(false)}
                style={{ padding: "8px 16px", borderRadius: "8px", border: "1px solid var(--border)", background: "var(--surface)", color: "var(--text-2)", fontSize: "13px", fontWeight: "600", cursor: "pointer" }}
              >
                {isVi ? "Đóng" : "Close"}
              </button>
              <button
                onClick={handleEscalateToCLevel}
                disabled={isEscalating}
                className="btn-emerald"
                style={{ padding: "8px 18px", borderRadius: "8px", fontSize: "13px", fontWeight: "700", cursor: "pointer", display: "inline-flex", alignItems: "center", gap: "6px" }}
              >
                <Send size={15} />
                <span>{isEscalating ? (isVi ? "Đang gửi..." : "Transmitting...") : (isVi ? "Xác Nhận Đệ Trình Ngay" : "Transmit Now")}</span>
              </button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}
