/**
 * ForgotPasswordPage — Wizard 3 bước khôi phục mật khẩu (M6 - PB43)
 * Bước 1: Nhập email → gửi OTP
 * Bước 2: Nhập OTP 6 số + countdown 5 phút
 * Bước 3: Nhập mật khẩu mới → redirect về Login
 *
 * KHÔNG chạm luồng JWT/OAuth cũ. Hoàn toàn tách biệt.
 */
import React, { useState, useEffect, useRef } from "react";

const API = "/api/v1/auth";

async function post(path, body) {
  const res = await fetch(`${API}${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const data = await res.json().catch(() => ({ detail: res.statusText }));
  if (!res.ok) throw Object.assign(new Error(data.detail || "Lỗi không xác định"), { status: res.status });
  return data;
}

// ── Countdown hook ──────────────────────────────────────────────────────────
function useCountdown(initialSeconds) {
  const [seconds, setSeconds] = useState(initialSeconds);
  const ref = useRef(null);

  const start = (s = initialSeconds) => {
    setSeconds(s);
    clearInterval(ref.current);
    ref.current = setInterval(() => {
      setSeconds(prev => {
        if (prev <= 1) { clearInterval(ref.current); return 0; }
        return prev - 1;
      });
    }, 1000);
  };

  useEffect(() => () => clearInterval(ref.current), []);

  const fmt = (s) => `${String(Math.floor(s / 60)).padStart(2, "0")}:${String(s % 60).padStart(2, "0")}`;
  return { seconds, fmt: fmt(seconds), start, expired: seconds === 0 };
}

// ── Shared input style ───────────────────────────────────────────────────────
const INPUT_STYLE = {
  width: "100%", boxSizing: "border-box", padding: "11px 14px",
  borderRadius: "8px", border: "1.5px solid #cbd5e1",
  fontSize: 14, color: "#0f172a", outline: "none",
  transition: "border-color 0.15s ease", background: "#fff",
};

// ── Step indicator ───────────────────────────────────────────────────────────
function StepIndicator({ step }) {
  const steps = ["Xác thực Email", "Nhập mã OTP", "Đặt mật khẩu mới"];
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 0, marginBottom: 32 }}>
      {steps.map((label, i) => {
        const active = i + 1 === step;
        const done = i + 1 < step;
        return (
          <React.Fragment key={i}>
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center", flex: 1 }}>
              <div style={{
                width: 32, height: 32, borderRadius: "50%", display: "flex", alignItems: "center",
                justifyContent: "center", fontWeight: 700, fontSize: 13,
                background: done ? "#0891b2" : active ? "#0f172a" : "#e2e8f0",
                color: done || active ? "#fff" : "#94a3b8",
                border: active ? "2px solid #0891b2" : "none",
                transition: "all 0.3s ease",
              }}>
                {done ? "✓" : i + 1}
              </div>
              <span style={{
                marginTop: 6, fontSize: 10, fontWeight: 600, textAlign: "center",
                color: active ? "#0f172a" : done ? "#0891b2" : "#94a3b8",
                textTransform: "uppercase", letterSpacing: "0.03em"
              }}>{label}</span>
            </div>
            {i < steps.length - 1 && (
              <div style={{
                height: 2, flex: 1, marginBottom: 20, marginTop: -8,
                background: done ? "#0891b2" : "#e2e8f0",
                transition: "background 0.3s ease"
              }} />
            )}
          </React.Fragment>
        );
      })}
    </div>
  );
}

// ── Main component ───────────────────────────────────────────────────────────
export default function ForgotPasswordPage({ onBackToLogin, lang = "vi" }) {
  const isVi = lang === "vi";
  const [step, setStep] = useState(1);
  const [email, setEmail] = useState("");
  const [otpDigits, setOtpDigits] = useState(["", "", "", "", "", ""]);
  const [newPwd, setNewPwd] = useState("");
  const [confirmPwd, setConfirmPwd] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const countdown = useCountdown(60);
  const otpRefs = useRef([]);

  const clearMessages = () => { setError(""); setSuccess(""); };

  // ── Bước 1: Gửi OTP ─────────────────────────────────────────────────────
  const handleSendOtp = async (e) => {
    e?.preventDefault();
    clearMessages();
    if (!email.trim()) { setError("Vui lòng nhập email công ty của bạn."); return; }
    setLoading(true);
    try {
      const data = await post("/forgot-password", { email: email.trim() });
      setSuccess(data.message || "Mã OTP đã được gửi! Kiểm tra hộp thư của bạn.");
      setStep(2);
      countdown.start(60);
      setTimeout(() => otpRefs.current[0]?.focus(), 100);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  // ── Bước 2: Xác thực OTP ────────────────────────────────────────────────
  const getOtpString = () => otpDigits.join("");

  const handleOtpChange = (idx, val) => {
    if (!/^\d?$/.test(val)) return;
    const next = [...otpDigits];
    next[idx] = val;
    setOtpDigits(next);
    if (val && idx < 5) otpRefs.current[idx + 1]?.focus();
  };

  const handleOtpKeyDown = (idx, e) => {
    if (e.key === "Backspace" && !otpDigits[idx] && idx > 0) {
      otpRefs.current[idx - 1]?.focus();
    }
  };

  const handleVerifyOtp = async (e) => {
    e?.preventDefault();
    clearMessages();
    const otp = getOtpString();
    if (otp.length < 6) { setError("Vui lòng nhập đủ 6 chữ số."); return; }
    if (countdown.expired) { setError("Mã OTP đã hết hạn. Vui lòng yêu cầu gửi lại."); return; }
    setLoading(true);
    try {
      await post("/verify-otp", { email, otp_code: otp });
      setSuccess("Xác thực thành công! Vui lòng đặt mật khẩu mới.");
      setStep(3);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  const handleResendOtp = async () => {
    clearMessages();
    setOtpDigits(["", "", "", "", "", ""]);
    setLoading(true);
    try {
      const data = await post("/forgot-password", { email });
      setSuccess(data.message || "Đã gửi lại mã OTP mới.");
      countdown.start(60);
      setTimeout(() => otpRefs.current[0]?.focus(), 100);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  // ── Bước 3: Đặt lại mật khẩu ────────────────────────────────────────────
  const handleResetPassword = async (e) => {
    e?.preventDefault();
    clearMessages();
    if (newPwd !== confirmPwd) { setError("Mật khẩu xác nhận không khớp."); return; }
    setLoading(true);
    try {
      const data = await post("/reset-password", {
        email,
        otp_code: getOtpString(),
        new_password: newPwd,
        confirm_password: confirmPwd,
      });
      setSuccess(data.message || "Đặt lại mật khẩu thành công!");
      setTimeout(() => onBackToLogin?.(), 2000);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  // ── Shared styles ────────────────────────────────────────────────────────
  const BTN = {
    width: "100%", padding: "12px", borderRadius: 8, border: "none",
    fontWeight: 700, fontSize: 14, cursor: "pointer", transition: "all 0.2s ease",
  };
  const ERR_BOX = {
    background: "#fef2f2", border: "1px solid #fecaca", color: "#dc2626",
    padding: "10px 14px", borderRadius: 6, fontSize: 12.5, fontWeight: 600,
    marginBottom: 16, display: "flex", alignItems: "center", gap: 8,
  };
  const OK_BOX = {
    background: "#f0fdf4", border: "1px solid #bbf7d0", color: "#16a34a",
    padding: "10px 14px", borderRadius: 6, fontSize: 12.5, fontWeight: 600,
    marginBottom: 16, display: "flex", alignItems: "center", gap: 8,
  };

  return (
    <div style={{
      width: "100vw", minHeight: "100vh", display: "flex", alignItems: "center",
      justifyContent: "center", background: "#010f1a", fontFamily: "var(--f-body,'Inter',sans-serif)",
    }}>
      {/* Background glow */}
      <div style={{
        position: "fixed", top: "20%", left: "50%", transform: "translateX(-50%)",
        width: 500, height: 500, borderRadius: "50%",
        background: "radial-gradient(circle, rgba(0,229,255,0.07) 0%, transparent 70%)",
        pointerEvents: "none",
      }} />

      <div style={{
        width: "100%", maxWidth: 480, margin: "40px 16px",
        background: "#ffffff", borderRadius: 16, padding: "40px 40px 32px",
        boxShadow: "0 25px 60px rgba(0,0,0,0.35)",
        animation: "fadeInUp 0.4s ease",
      }}>
        {/* Header */}
        <div style={{ textAlign: "center", marginBottom: 28 }}>
          <div style={{
            width: 52, height: 52, borderRadius: "50%", margin: "0 auto 16px",
            background: "linear-gradient(135deg,#0891b2,#0f172a)",
            display: "flex", alignItems: "center", justifyContent: "center",
            fontSize: 24, boxShadow: "0 4px 16px rgba(8,145,178,0.35)",
          }}>
            🔐
          </div>
          <h1 style={{ fontSize: 22, fontWeight: 800, color: "#0f172a", margin: "0 0 6px" }}>
            {isVi ? "Khôi phục Mật khẩu" : "Password Recovery"}
          </h1>
          <p style={{ fontSize: 13, color: "#64748b", margin: 0 }}>
            {isVi
              ? "Chỉ dành cho tài khoản nhân viên do Admin cấp"
              : "For company accounts provisioned by Admin only"}
          </p>
        </div>

        <StepIndicator step={step} />

        {/* Messages */}
        {error && (
          <div style={ERR_BOX}>
            ⚠️ <span>{error}</span>
            {error.includes("hết hạn") && step === 3 && (
              <button
                type="button"
                onClick={() => { clearMessages(); setStep(1); }}
                style={{
                  marginLeft: "auto", background: "#dc2626", color: "#fff",
                  border: "none", borderRadius: 4, padding: "3px 8px",
                  fontSize: 11, cursor: "pointer", fontWeight: 700,
                }}
              >
                {isVi ? "Gửi lại mã" : "Resend"}
              </button>
            )}
          </div>
        )}
        {success && <div style={OK_BOX}>✅ <span>{success}</span></div>}

        {/* ── Step 1: Email ─────────────────────────────────────────────── */}
        {step === 1 && (
          <form onSubmit={handleSendOtp}>
            <div style={{ marginBottom: 20 }}>
              <label style={{ display: "block", fontSize: 11, fontWeight: 700, color: "#64748b", textTransform: "uppercase", marginBottom: 6 }}>
                📧 {isVi ? "Email công ty" : "Company Email"}
              </label>
              <input
                type="email" required value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="ten@graphmind.ai"
                style={INPUT_STYLE}
                onFocus={e => e.target.style.borderColor = "#0891b2"}
                onBlur={e => e.target.style.borderColor = "#cbd5e1"}
              />
              <p style={{ fontSize: 11, color: "#94a3b8", marginTop: 6 }}>
                {isVi
                  ? "Mã xác thực 6 số sẽ được gửi đến hộp thư này."
                  : "A 6-digit verification code will be sent to this inbox."}
              </p>
            </div>
            <button
              type="submit" disabled={loading}
              style={{ ...BTN, background: loading ? "#94a3b8" : "#0f172a", color: "#fff" }}
            >
              {loading ? "⏳ Đang gửi..." : (isVi ? "📨 Nhận mã xác thực" : "Send Verification Code")}
            </button>
          </form>
        )}

        {/* ── Step 2: OTP ───────────────────────────────────────────────── */}
        {step === 2 && (
          <form onSubmit={handleVerifyOtp}>
            <div style={{ marginBottom: 8, textAlign: "center" }}>
              <p style={{ fontSize: 13, color: "#475569", marginBottom: 4 }}>
                {isVi ? "Nhập mã gửi đến" : "Enter code sent to"}{" "}
                <strong style={{ color: "#0f172a" }}>{email}</strong>
              </p>
            </div>

            {/* OTP 6 ô tách biệt */}
            <div style={{ display: "flex", gap: 10, justifyContent: "center", marginBottom: 20 }}>
              {otpDigits.map((d, i) => (
                <input
                  key={i}
                  ref={el => otpRefs.current[i] = el}
                  type="text" inputMode="numeric" maxLength={1}
                  value={d}
                  onChange={e => handleOtpChange(i, e.target.value)}
                  onKeyDown={e => handleOtpKeyDown(i, e)}
                  style={{
                    width: 52, height: 60, textAlign: "center", fontSize: 24, fontWeight: 800,
                    border: `2px solid ${d ? "#0891b2" : "#e2e8f0"}`,
                    borderRadius: 10, outline: "none", color: "#0f172a",
                    transition: "all 0.15s ease", background: d ? "#f0f9ff" : "#fff",
                  }}
                  onFocus={e => e.target.style.borderColor = "#0891b2"}
                  onBlur={e => e.target.style.borderColor = d ? "#0891b2" : "#e2e8f0"}
                />
              ))}
            </div>

            {/* Countdown */}
            <div style={{ textAlign: "center", marginBottom: 20 }}>
              {countdown.expired ? (
                <span style={{ fontSize: 13, color: "#dc2626", fontWeight: 600 }}>
                  ⌛ {isVi ? "Mã đã hết hạn" : "Code expired"}
                </span>
              ) : (
                <span style={{ fontSize: 13, color: "#64748b" }}>
                  ⏱ {isVi ? "Còn" : "Expires in"}{" "}
                  <strong style={{ color: countdown.seconds <= 15 ? "#dc2626" : "#0891b2", fontVariantNumeric: "tabular-nums" }}>
                    {countdown.fmt}
                  </strong>
                </span>
              )}
            </div>

            <button type="submit" disabled={loading}
              style={{ ...BTN, background: loading ? "#94a3b8" : "#0891b2", color: "#fff", marginBottom: 12 }}>
              {loading ? "⏳ Đang xác thực..." : (isVi ? "✅ Xác nhận mã OTP" : "Verify OTP")}
            </button>

            <button type="button" onClick={handleResendOtp} disabled={loading || !countdown.expired}
              style={{
                ...BTN, background: "transparent",
                color: countdown.expired ? "#0891b2" : "#94a3b8",
                border: `1.5px solid ${countdown.expired ? "#0891b2" : "#e2e8f0"}`,
                cursor: (loading || !countdown.expired) ? "not-allowed" : "pointer",
              }}>
              🔄 {isVi ? "Gửi lại mã OTP" : "Resend OTP"}
            </button>
          </form>
        )}

        {/* ── Step 3: Mật khẩu mới ──────────────────────────────────────── */}
        {step === 3 && (
          <form onSubmit={handleResetPassword}>
            {[
              { label: isVi ? "Mật khẩu mới" : "New Password", val: newPwd, set: setNewPwd, hint: "≥8 ký tự, chữ hoa, chữ thường, số, ký tự đặc biệt" },
              { label: isVi ? "Xác nhận mật khẩu" : "Confirm Password", val: confirmPwd, set: setConfirmPwd, hint: "" },
            ].map(({ label, val, set, hint }) => (
              <div key={label} style={{ marginBottom: 16 }}>
                <label style={{ display: "block", fontSize: 11, fontWeight: 700, color: "#64748b", textTransform: "uppercase", marginBottom: 6 }}>
                  🔑 {label}
                </label>
                <input type="password" required value={val} onChange={e => set(e.target.value)}
                  placeholder="••••••••" style={INPUT_STYLE}
                  onFocus={e => e.target.style.borderColor = "#0891b2"}
                  onBlur={e => e.target.style.borderColor = "#cbd5e1"}
                />
                {hint && <p style={{ fontSize: 11, color: "#94a3b8", marginTop: 4 }}>{hint}</p>}
              </div>
            ))}

            {/* Password strength indicator */}
            {newPwd && (
              <div style={{ marginBottom: 16 }}>
                {[
                  { ok: newPwd.length >= 8, text: "≥8 ký tự" },
                  { ok: /[A-Z]/.test(newPwd), text: "Chữ hoa" },
                  { ok: /[a-z]/.test(newPwd), text: "Chữ thường" },
                  { ok: /\d/.test(newPwd), text: "Số" },
                  { ok: /[^A-Za-z\d]/.test(newPwd), text: "Ký tự đặc biệt" },
                ].map(({ ok, text }) => (
                  <span key={text} style={{
                    display: "inline-flex", alignItems: "center", gap: 3,
                    marginRight: 10, fontSize: 11, fontWeight: 600,
                    color: ok ? "#16a34a" : "#94a3b8"
                  }}>
                    {ok ? "✓" : "○"} {text}
                  </span>
                ))}
              </div>
            )}

            <button type="submit" disabled={loading}
              style={{ ...BTN, background: loading ? "#94a3b8" : "#059669", color: "#fff" }}>
              {loading ? "⏳ Đang lưu..." : (isVi ? "💾 Đặt lại mật khẩu" : "Reset Password")}
            </button>
          </form>
        )}

        {/* Back to Login */}
        <div style={{ textAlign: "center", marginTop: 20 }}>
          <button onClick={onBackToLogin}
            style={{
              background: "none", border: "none", cursor: "pointer",
              fontSize: 13, color: "#64748b", fontWeight: 600,
            }}>
            ← {isVi ? "Quay lại đăng nhập" : "Back to Login"}
          </button>
        </div>
      </div>

      <style>{`
        @keyframes fadeInUp {
          from { opacity: 0; transform: translateY(20px); }
          to   { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </div>
  );
}
