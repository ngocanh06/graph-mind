import React, { useEffect, useState } from "react";
import {
  fetchMyShiftReports,
  saveShiftReport,
  submitShiftReport,
} from "../../services/api";

const EMPTY = { summary: "", cases: [], proposals: "" };
const EMPTY_CASE = { time: "", customer: "", issue: "", solution: "", ref: "", status: "" };

const STATUS = {
  DRAFT: { vi: "Bản nháp", en: "Draft", color: "#64748b" },
  SUBMITTED: { vi: "Chờ Trưởng phòng duyệt", en: "Pending review", color: "#d97706" },
  APPROVED: { vi: "Đã duyệt & ký số", en: "Approved", color: "#059669" },
  REJECTED: { vi: "Bị từ chối — cần sửa", en: "Rejected — revise", color: "#dc2626" },
};

const esc = (s) =>
  String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));

const box = { background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 14, padding: "18px 22px" };
const input = {
  width: "100%", boxSizing: "border-box", padding: "8px 10px", borderRadius: 8,
  border: "1px solid var(--border)", background: "var(--surface)", color: "var(--text-1)", fontSize: 13,
};
const btn = (primary) => ({
  padding: "8px 16px", borderRadius: 10, fontSize: 13, fontWeight: 700, cursor: "pointer",
  border: primary ? "none" : "1px solid var(--border)",
  background: primary ? "linear-gradient(135deg,#0284c7,#2563eb)" : "var(--surface)",
  color: primary ? "#fff" : "var(--text-1)",
});

/** Soạn / sửa / gửi báo cáo ca của chuyên viên (BR-02: chỉ báo cáo của chính mình). */
export default function ShiftReportEditor({ isVi, currentUser, onNavigate }) {
  const [reports, setReports] = useState([]);
  const [activeId, setActiveId] = useState(null); // null = báo cáo mới
  const [form, setForm] = useState(EMPTY);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState("");

  const active = reports.find((r) => r.id === activeId);
  const status = active?.status || "DRAFT";
  const editable = status === "DRAFT" || status === "REJECTED";

  const load = async (selectId) => {
    const res = await fetchMyShiftReports(currentUser);
    if (res?.success) {
      setReports(res.reports);
      const pick = res.reports.find((r) => r.id === (selectId ?? activeId)) || null;
      setActiveId(pick?.id || null);
      setForm(pick ? { summary: pick.summary, cases: pick.cases, proposals: pick.proposals } : EMPTY);
    } else if (res) {
      setMsg(res.detail);
    }
  };
  useEffect(() => { load(null); }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const select = (r) => {
    setActiveId(r?.id || null);
    setForm(r ? { summary: r.summary, cases: r.cases, proposals: r.proposals } : EMPTY);
    setMsg("");
  };

  const setCase = (i, k, v) =>
    setForm((f) => ({ ...f, cases: f.cases.map((c, j) => (j === i ? { ...c, [k]: v } : c)) }));

  const save = async () => {
    const res = await saveShiftReport(activeId, form, currentUser);
    if (!res.success) { setMsg(res.detail); return null; }
    await load(res.report.id);
    return res.report;
  };

  const run = async (fn, okMsg) => {
    setBusy(true);
    setMsg("");
    try {
      const r = await fn();
      if (r) setMsg(okMsg);
    } finally {
      setBusy(false);
    }
  };

  const onSave = () => run(save, isVi ? "Đã lưu bản nháp." : "Draft saved.");
  const onSubmit = () =>
    run(async () => {
      const r = await save();
      if (!r) return null;
      const res = await submitShiftReport(r.id, currentUser);
      if (!res.success) { setMsg(res.detail); return null; }
      await load(r.id);
      return res;
    }, isVi ? "Đã gửi báo cáo tới Trưởng phòng." : "Submitted to your manager.");

  const exportWord = () => {
    const rows = form.cases.map((c) =>
      `<tr>${["time", "customer", "issue", "solution", "ref", "status"].map((k) => `<td>${esc(c[k])}</td>`).join("")}</tr>`).join("");
    const html = `<html><head><meta charset="utf-8"></head><body>
      <h1>${isVi ? "BÁO CÁO CA TÁC NGHIỆP" : "SHIFT REPORT"}</h1>
      <p>${esc(currentUser?.name || currentUser?.username)} — ${esc(STATUS[status][isVi ? "vi" : "en"])}</p>
      <h2>${isVi ? "Tóm tắt" : "Summary"}</h2><p>${esc(form.summary).replace(/\n/g, "<br>")}</p>
      <h2>${isVi ? "Nhật ký ca" : "Cases"}</h2>
      <table border="1" cellpadding="4"><tr><th>Time</th><th>Customer</th><th>Issue</th><th>Solution</th><th>Ref</th><th>Status</th></tr>${rows}</table>
      <h2>${isVi ? "Kiến nghị" : "Proposals"}</h2><p>${esc(form.proposals).replace(/\n/g, "<br>")}</p></body></html>`;
    const url = URL.createObjectURL(new Blob([html], { type: "application/msword;charset=utf-8" }));
    const a = Object.assign(document.createElement("a"), { href: url, download: `Bao_Cao_Ca_${new Date().toISOString().slice(0, 10)}.doc` });
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="view active" style={{ overflowY: "auto", maxHeight: "100%", padding: "16px 20px 48px" }}>
      <div style={{ maxWidth: 1200, margin: "0 auto", display: "flex", flexDirection: "column", gap: 16 }}>
        <div style={{ ...box, display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 12 }}>
          <div>
            <h1 style={{ fontSize: 22, fontWeight: 800, margin: 0, color: "var(--text-1)" }}>
              {isVi ? "Báo Cáo Công Việc Ca" : "Shift Work Report"}
            </h1>
            <div style={{ fontSize: 12.5, color: "var(--text-3)", marginTop: 4 }}>
              {currentUser?.name || currentUser?.username} · {isVi ? "Phạm vi: cá nhân (BR-02)" : "Scope: personal (BR-02)"}
            </div>
          </div>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
            <span style={{ fontWeight: 700, fontSize: 12.5, color: STATUS[status].color }}>
              ● {STATUS[status][isVi ? "vi" : "en"]}
            </span>
            <button style={btn(false)} onClick={() => onNavigate("search")}>{isVi ? "Bàn làm việc" : "Hub"}</button>
            <button style={btn(false)} onClick={exportWord}>Word</button>
            <button style={btn(false)} onClick={() => window.print()}>PDF</button>
          </div>
        </div>

        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          <button style={btn(!activeId)} onClick={() => select(null)}>+ {isVi ? "Báo cáo mới" : "New report"}</button>
          {reports.map((r) => (
            <button key={r.id} style={btn(r.id === activeId)} onClick={() => select(r)}>
              {new Date(r.updatedAt).toLocaleDateString(isVi ? "vi-VN" : "en-GB")} · {STATUS[r.status][isVi ? "vi" : "en"]}
            </button>
          ))}
        </div>

        {active?.managerComment && (
          <div style={{ ...box, borderColor: STATUS[status].color }}>
            <b>{active.signedBy}</b> ({isVi ? "Trưởng phòng" : "Manager"}): {active.managerComment}
          </div>
        )}

        <div style={box}>
          <label style={{ fontWeight: 700, fontSize: 13 }}>{isVi ? "Tóm tắt kết quả ca" : "Shift summary"}</label>
          <textarea
            style={{ ...input, marginTop: 6, resize: "vertical" }} rows={4} maxLength={5000}
            disabled={!editable || busy} value={form.summary}
            onChange={(e) => setForm({ ...form, summary: e.target.value })}
          />
        </div>

        <div style={box}>
          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8 }}>
            <b style={{ fontSize: 13 }}>{isVi ? "Nhật ký các ca đã xử lý" : "Handled cases"}</b>
            {editable && form.cases.length < 50 && (
              <button style={btn(false)} onClick={() => setForm({ ...form, cases: [...form.cases, { ...EMPTY_CASE }] })}>
                + {isVi ? "Thêm dòng" : "Add row"}
              </button>
            )}
          </div>
          {form.cases.length === 0 && <div style={{ color: "var(--text-4)", fontSize: 12.5 }}>{isVi ? "Chưa có dòng nào." : "No rows yet."}</div>}
          {form.cases.map((c, i) => (
            <div key={i} style={{ display: "grid", gridTemplateColumns: "80px 1.2fr 1.6fr 1.6fr 100px 110px auto", gap: 6, marginBottom: 6 }}>
              {[["time", "09:15"], ["customer", isVi ? "Khách hàng" : "Customer"], ["issue", isVi ? "Sự việc" : "Issue"],
                ["solution", isVi ? "Giải pháp" : "Solution"], ["ref", isVi ? "Mã chứng từ" : "Ref"], ["status", isVi ? "Trạng thái" : "Status"]].map(([k, ph]) => (
                <input key={k} style={input} placeholder={ph} disabled={!editable || busy} value={c[k]}
                  onChange={(e) => setCase(i, k, e.target.value)} />
              ))}
              {editable && (
                <button style={btn(false)} title={isVi ? "Xóa dòng" : "Remove"}
                  onClick={() => setForm({ ...form, cases: form.cases.filter((_, j) => j !== i) })}>✕</button>
              )}
            </div>
          ))}
        </div>

        <div style={box}>
          <label style={{ fontWeight: 700, fontSize: 13 }}>{isVi ? "Đề xuất & kiến nghị gửi Trưởng phòng" : "Proposals to manager"}</label>
          <textarea
            style={{ ...input, marginTop: 6, resize: "vertical" }} rows={3} maxLength={3000}
            disabled={!editable || busy} value={form.proposals}
            onChange={(e) => setForm({ ...form, proposals: e.target.value })}
          />
        </div>

        <div style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
          {editable ? (
            <>
              <button style={btn(false)} disabled={busy} onClick={onSave}>{isVi ? "Lưu bản nháp" : "Save draft"}</button>
              <button style={btn(true)} disabled={busy || !form.summary.trim()} onClick={onSubmit}>
                {status === "REJECTED" ? (isVi ? "Gửi lại Trưởng phòng" : "Resubmit") : (isVi ? "Gửi Trưởng phòng duyệt" : "Submit to manager")}
              </button>
            </>
          ) : (
            <span style={{ fontSize: 12.5, color: "var(--text-3)" }}>
              {isVi ? "Báo cáo đã khóa, không thể chỉnh sửa." : "Report is locked."}
            </span>
          )}
          {msg && <span role="status" style={{ fontSize: 13, fontWeight: 600, color: "var(--text-2)" }}>{msg}</span>}
        </div>
      </div>
    </div>
  );
}
