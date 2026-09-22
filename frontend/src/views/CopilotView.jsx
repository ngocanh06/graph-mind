import React, { useState, useRef, useEffect } from "react";
import { queryCopilot } from "../services/api";

export default function CopilotView({ onNavigate, t, lang, apiConnected }) {
  const isVi = lang === "vi";
  const [queryInput, setQueryInput] = useState("");
  const [isInferring, setIsInferring] = useState(false);
  const [activeThread, setActiveThread] = useState(1);
  const [toastMsg, setToastMsg] = useState("");

  // Modal xem văn bản gốc trích dẫn (Citation Preview)
  const [activeCitation, setActiveCitation] = useState(null);

  // Modal soạn thư từ Action Trigger
  const [actionDraftModal, setActionDraftModal] = useState(null);
  const [copiedDraft, setCopiedDraft] = useState(false);

  const messagesEndRef = useRef(null);

  const showToast = (msg) => {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(""), 3500);
  };

  // Lịch sử chat theo thread
  const [threads, setThreads] = useState({
    1: {
      id: 1,
      title: isVi ? "Khách hàng VIP ABC Corp & Hợp đồng CT-18" : "VIP ABC Corp Churn & Contract CT-18",
      scope: isVi ? "Bán hàng & Vận hành" : "Sales & Ops",
      messages: [
        {
          id: "m1",
          sender: "user",
          time: "10:14",
          text: isVi
            ? "Khách hàng ABC Corporation gần đây có rủi ro gì và tôi cần chuẩn bị hồ sơ gì trước ngày 18/10?"
            : "What are the recent risks with ABC Corporation and what dossier should I prepare before 18 Oct?"
        },
        {
          id: "m2",
          sender: "copilot",
          time: "10:14",
          text: isVi
            ? "Dựa trên Đồ thị Tri thức và đối soát dữ liệu ERP/CRM của phòng Bán hàng & Vận hành:\n\n1. **Tín hiệu cảnh báo**: Tập đoàn ABC giảm tần suất đặt hàng 32% (từ 8,0 xuống 5,4 đơn/tháng) trong 60 ngày gần nhất.\n2. **Hợp đồng CT-2026-18** (giá trị 1,2 tỷ VND cung ứng linh kiện Sản phẩm A) sẽ hết hạn vào ngày **18/10/2026 (còn 12 ngày)**, chưa có biên bản gia hạn.\n3. **Khuyến nghị tác nghiệp**: Cần chuẩn bị phụ lục hợp đồng 2027 với ưu đãi chiết khấu 5.5% và cam kết SLA giao hàng trong 24h để giữ chân tài khoản này."
            : "Based on the Sales & Operations Knowledge Graph and ERP telemetry:\n\n1. **Anomaly Signal**: ABC Corp order cadence dropped 32% (from 8.0/mo to 5.4/mo) over trailing 60 days.\n2. **Contract CT-2026-18** (1.2B VND manufacturing supply) expires on **18 Oct 2026 (in 12 days)** with no renewal logged.\n3. **Recommended Action**: Prepare 2027 renewal addendum with 5.5% volume discount and 24h SLA delivery commitment.",
          graphNodes: [
            { id: "abc", label: "ABC Corporation", type: "Khách hàng VIP", color: "#dc2626", bg: "#fee2e2", border: "#fca5a5", icon: "fa-building" },
            { id: "ct18", label: "Contract CT-2026-18", type: "Hợp đồng (1.2B)", color: "#d97706", bg: "#fef3c7", border: "#fcd34d", icon: "fa-file-signature" },
            { id: "proda", label: "Sản phẩm A", type: "Linh kiện cung ứng", color: "#0284c7", bg: "#e0f2fe", border: "#7dd3fc", icon: "fa-box-archive" },
            { id: "sig1", label: "Tín hiệu giảm -32%", type: "Cảnh báo rời bỏ", color: "#dc2626", bg: "#fee2e2", border: "#fca5a5", icon: "fa-triangle-exclamation" }
          ],
          citations: [
            {
              id: "c1",
              title: "Contract_CT-2026-18.pdf",
              location: "Trang 2, Điều 4.2",
              page: "Trang 2",
              excerpt: isVi
                ? "Thời hạn hiệu lực đến hết ngày 18 tháng 10 năm 2026. Nếu hai bên không thông báo tái tục trước 15 ngày, hợp đồng sẽ tự động chấm dứt quyền ưu đãi giá."
                : "Effective until 18 October 2026. Unless renewed 15 days prior, preferential pricing shall lapse.",
              type: "PDF"
            },
            {
              id: "c2",
              title: "CRM_Account_Ledger_2026.xlsx",
              location: "Sheet 'Orders', Dòng 142",
              page: "Dòng 142",
              excerpt: isVi
                ? "Tháng 8: 5 đơn hàng (420M VND). Tháng 9: 3 đơn hàng (260M VND). Nhịp mua hàng giảm 32.4% so với trung bình quý 2."
                : "August: 5 orders (420M VND). September: 3 orders (260M VND). Cadence reduced by 32.4% vs Q2 average.",
              type: "SHEETS"
            }
          ]
        }
      ]
    },
    2: {
      id: 2,
      title: isVi ? "Quy trình Đối soát Công nợ SOP-04" : "Reconciliation SOP-04 Validation",
      scope: isVi ? "Kế toán & Vận hành" : "Finance & Operations",
      messages: [
        {
          id: "m2-1",
          sender: "user",
          time: "09:30",
          text: isVi ? "Tài liệu SOP-04 hiện tại thiếu trường thông tin nào?" : "What metadata is missing from SOP-04?"
        },
        {
          id: "m2-2",
          sender: "copilot",
          time: "09:30",
          text: isVi
            ? "Tài liệu **SOP-04_Reconciliation.docx** đang thiếu trường **'Phòng ban chịu trách nhiệm'** và **'Chữ ký kiểm duyệt của Trưởng ban'**. Khoản công nợ 8,6 tỷ VND cần hoàn tất rà soát trước kỳ đối soát cuối quý."
            : "File **SOP-04_Reconciliation.docx** is missing **'Responsible Department'** and **'Approver Signature'** fields.",
          graphNodes: [
            { id: "sop4", label: "SOP-04 Reconciliation", type: "Quy trình", color: "#059669", bg: "#d1fae5", border: "#a7f3d0", icon: "fa-file-lines" },
            { id: "fin", label: "Phòng Tài chính", type: "Phòng ban", color: "#0284c7", bg: "#e0f2fe", border: "#7dd3fc", icon: "fa-building" }
          ],
          citations: [
            {
              id: "c3",
              title: "SOP-04_Reconciliation.docx",
              location: "Mục 1.2",
              page: "Trang 1",
              excerpt: isVi ? "Mục 1.2: Người lập quy trình chưa ký số điện tử." : "Section 1.2: Author digital signature missing.",
              type: "DOCX"
            }
          ]
        }
      ]
    }
  });

  const currentThreadData = threads[activeThread] || threads[1];
  const hasUserInteracted = useRef(false);

  // Auto scroll tin nhắn mới khi có tương tác
  useEffect(() => {
    if (hasUserInteracted.current) {
      messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }
  }, [currentThreadData.messages.length, isInferring]);

  // Helper render markdown phong cách doanh nghiệp tinh tế
  const renderFormattedText = (rawText) => {
    if (!rawText) return null;
    const lines = rawText.split("\n");

    return (
      <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
        {lines.map((line, lIdx) => {
          if (!line.trim()) return <div key={lIdx} style={{ height: "4px" }} />;

          // Phát hiện danh sách số "1. ", "2. ", "3. "
          const numMatch = line.match(/^(\d+)\.\s+(.*)/);
          if (numMatch) {
            const num = numMatch[1];
            const content = numMatch[2];
            return (
              <div key={lIdx} style={{ display: "flex", alignItems: "flex-start", gap: "10px", marginTop: "2px" }}>
                <span style={{
                  display: "inline-flex",
                  alignItems: "center",
                  justifyContent: "center",
                  width: "20px",
                  height: "20px",
                  borderRadius: "50%",
                  background: "var(--cyan-soft)",
                  color: "var(--cyan)",
                  fontSize: "11px",
                  fontWeight: "800",
                  flexShrink: 0,
                  marginTop: "1px"
                }}>
                  {num}
                </span>
                <span style={{ flex: 1, lineHeight: "1.6" }}>
                  {formatInlineText(content)}
                </span>
              </div>
            );
          }

          // Phát hiện danh sách gạch đầu dòng "• " hoặc "- "
          const bulletMatch = line.match(/^([•\-])\s+(.*)/);
          if (bulletMatch) {
            const content = bulletMatch[2];
            return (
              <div key={lIdx} style={{ display: "flex", alignItems: "flex-start", gap: "10px", marginTop: "2px" }}>
                <span style={{
                  color: "var(--cyan)",
                  fontSize: "13px",
                  fontWeight: "800",
                  flexShrink: 0,
                  marginTop: "-1px"
                }}>
                  •
                </span>
                <span style={{ flex: 1, lineHeight: "1.6" }}>
                  {formatInlineText(content)}
                </span>
              </div>
            );
          }

          return (
            <p key={lIdx} style={{ margin: 0, lineHeight: "1.6" }}>
              {formatInlineText(line)}
            </p>
          );
        })}
      </div>
    );
  };

  // Helper parse bold **text** sang thẻ strong đậm rõ ràng
  const formatInlineText = (text) => {
    const parts = text.split(/(\*\*.*?\*\*)/g);
    return parts.map((part, pIdx) => {
      if (part.startsWith("**") && part.endsWith("**")) {
        return (
          <strong key={pIdx} style={{ color: "var(--text-1)", fontWeight: "700" }}>
            {part.slice(2, -2)}
          </strong>
        );
      }
      return part;
    });
  };

  // Xử lý gửi câu hỏi với bộ lọc bảo mật RBAC
  const handleSendMessage = async (textToSend) => {
    const text = textToSend || queryInput;
    if (!text.trim()) return;

    hasUserInteracted.current = true;

    // 1. KIỂM TRA BỘ LỌC BẢO MẬT PHÒNG BAN (RBAC DEPT SCOPING)
    const lowerText = text.toLowerCase();
    const isHrSalaryQuery =
      lowerText.includes("lương") ||
      lowerText.includes("salary") ||
      lowerText.includes("payroll") ||
      lowerText.includes("nhân sự") ||
      lowerText.includes("hr") ||
      lowerText.includes("bảo hiểm");

    const isBoardConfidential =
      lowerText.includes("quỹ kín") ||
      lowerText.includes("m&a") ||
      lowerText.includes("cổ đông");

    const userMessage = {
      id: `usr-${Date.now()}`,
      sender: "user",
      time: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
      text: text
    };

    setThreads((prev) => ({
      ...prev,
      [activeThread]: {
        ...prev[activeThread],
        messages: [...prev[activeThread].messages, userMessage]
      }
    }));
    setQueryInput("");
    setIsInferring(true);

    // Giả lập độ trễ suy luận AI
    setTimeout(() => {
      setIsInferring(false);

      // TRƯỜNG HỢP 1: VI PHẠM BỘ LỌC BẢO MẬT PHÒNG BAN (RBAC REJECTION)
      if (isHrSalaryQuery || isBoardConfidential) {
        const rejectionMessage = {
          id: `ai-${Date.now()}`,
          sender: "copilot",
          isSecurityAlert: true,
          time: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
          text: isVi
            ? "⛔ [TỪ CHỐI TRUY XUẤT — BẢO MẬT PHÒNG BAN L4]:\n\nTài khoản của bạn thuộc Khối Vận hành Kinh doanh (Sales & Operations). Hệ thống AI tự động kích hoạt Hàng rào Bảo vệ RAG Guardrails nghiêm cấm truy xuất thông tin về Bảng lương Nhân sự (HR Payroll) hoặc Dữ liệu Mật của Ban Giám đốc.\n\n✓ Mọi truy vấn ngoài thẩm quyền đều được ghi lại vào Nhật ký Kiểm toán An ninh (Audit Log #SEC-403)."
            : "⛔ [RBAC SECURITY REJECTION — ACCESS DENIED]:\n\nYour account belongs to Sales & Operations. Automated RAG Guardrails strictly restrict access to HR Payroll or Executive Board files.\n\n✓ Security audit incident logged (#SEC-403).",
          citations: []
        };

        setThreads((prev) => ({
          ...prev,
          [activeThread]: {
            ...prev[activeThread],
            messages: [...prev[activeThread].messages, rejectionMessage]
          }
        }));
        showToast(isVi ? "⚠️ Cảnh báo: Truy vấn vượt quá thẩm quyền phòng ban!" : "Security Alert: Out-of-scope query rejected!");
        return;
      }

      // TRƯỜNG HỢP 2: TRUY VẤN HỢP LỆ VỚI DỮ LIỆU ĐỒ THỊ & TRÍCH DẪN
      const botResponse = {
        id: `ai-${Date.now()}`,
        sender: "copilot",
        time: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
        text: isVi
          ? `Đã trích xuất thông tin hợp chuẩn cho câu hỏi "${text}":\n\n1. **Dữ liệu xác thực**: Tìm thấy 3 thực thể liên kết trên Đồ thị Tri thức Bán hàng & Vận hành.\n2. **Khuyến nghị**: Nên kết hợp phụ lục chiết khấu để tháo gỡ điểm nghẽn và ghi nhận nhật ký ca làm việc ngay hôm nay.`
          : `Synthesized verified operational response for "${text}":\n\n1. **Verified Data**: Found 3 linked entities across the Sales & Operations Knowledge Graph.\n2. **Recommendation**: Combine discount addendum to unlock blockers and log case resolution.`,
        graphNodes: [
          { id: "q1", label: "Thực thể truy vấn", type: "Thực thể", color: "#0284c7", bg: "#e0f2fe", border: "#7dd3fc", icon: "fa-circle-nodes" },
          { id: "q2", label: "Quy trình nghiệp vụ", type: "SOP", color: "#059669", bg: "#d1fae5", border: "#a7f3d0", icon: "fa-file-lines" },
          { id: "q3", label: "Phòng Bán hàng", type: "Bộ phận", color: "#8b5cf6", bg: "#ede9fe", border: "#c4b5fd", icon: "fa-building" }
        ],
        citations: [
          {
            id: "c-new",
            title: "Quy_dinh_ban_hang_2026.pdf",
            location: "Trang 4, Mục 2",
            page: "Trang 4",
            excerpt: isVi ? "Chính sách chiết khấu cấp trung tối đa 6.0% đối với tài khoản VIP nhóm 1." : "Tier-1 VIP retention discount threshold capped at 6.0%.",
            type: "PDF"
          }
        ]
      };

      setThreads((prev) => ({
        ...prev,
        [activeThread]: {
          ...prev[activeThread],
          messages: [...prev[activeThread].messages, botResponse]
        }
      }));
      showToast(isVi ? "✓ Phản hồi đã được kiểm chứng qua Đồ thị Tri thức!" : "Response verified across Knowledge Graph!");
    }, 850);
  };

  return (
    <div
      className="view active"
      style={{
        height: "100%",
        maxHeight: "100%",
        overflow: "hidden",
        display: "flex",
        flexDirection: "column",
        gap: "12px",
        padding: "12px 18px 14px",
        boxSizing: "border-box"
      }}
    >
      {/* Toast Notification */}
      {toastMsg && (
        <div style={{
          position: "fixed",
          bottom: "28px",
          right: "28px",
          zIndex: 9999,
          background: "var(--surface)",
          border: "1.5px solid var(--cyan)",
          color: "var(--text-1)",
          padding: "12px 20px",
          borderRadius: "var(--r-md)",
          boxShadow: "var(--shadow-lg)",
          display: "flex",
          alignItems: "center",
          gap: "12px",
          fontSize: "13.5px",
          fontWeight: "600"
        }}>
          <i className="fa-solid fa-brain" style={{ color: "var(--cyan)", fontSize: "18px" }}></i>
          <span>{toastMsg}</span>
        </div>
      )}

      {/* Top Banner: RBAC Department Security Bar (Compact & Sleek) */}
      <div style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        flexWrap: "wrap",
        gap: "10px",
        padding: "8px 16px",
        background: "var(--surface)",
        border: "1px solid var(--border)",
        borderRadius: "var(--r-md)",
        boxShadow: "var(--shadow-sm)",
        flexShrink: 0
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: "10px", flexWrap: "wrap" }}>
          <div style={{
            display: "inline-flex",
            alignItems: "center",
            gap: "6px",
            padding: "3px 10px",
            borderRadius: "5px",
            background: "var(--green-soft)",
            border: "1px solid var(--green-dim)",
            color: "var(--green)",
            fontWeight: "700",
            fontSize: "11.5px",
            letterSpacing: "0.02em"
          }}>
            <i className="fa-solid fa-shield-halved"></i>
            <span>{isVi ? "BẢO MẬT PHÒNG BAN (RBAC L4)" : "DEPARTMENT RBAC ENFORCED"}</span>
          </div>

          <span style={{ fontSize: "12.5px", color: "var(--text-3)", fontWeight: "500" }}>
            {isVi
              ? "Phạm vi RAG: Chỉ truy cập dữ liệu Khách hàng, Đơn hàng, Hợp đồng & SOP Bán hàng / Vận hành"
              : "RAG Scope: Restricted to Sales, Orders, Contracts & Operational SOPs"}
          </span>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: "8px", fontSize: "11.5px", color: "var(--text-3)" }}>
          <span>{isVi ? "Chuyên viên:" : "Operator:"} <b style={{ color: "var(--text-1)" }}>Nguyễn V. Nam (@ops)</b></span>
          <span>·</span>
          <span style={{ color: "var(--cyan)", fontFamily: "var(--f-mono)", fontWeight: "700" }}>MILVUS + NEO4J</span>
        </div>
      </div>

      {/* 3-COLUMN WORKSPACE COCKPIT */}
      <div style={{
        display: "grid",
        gridTemplateColumns: "240px 1fr 280px",
        gap: "14px",
        alignItems: "stretch",
        flex: 1,
        minHeight: 0,
        width: "100%"
      }}>
        {/* ============================================================ */}
        {/* CỘT 1: SESSIONS & PHẠM VI NGHIỆP VỤ (240px)                  */}
        {/* ============================================================ */}
        <div style={{
          display: "flex",
          flexDirection: "column",
          gap: "12px",
          minWidth: 0,
          overflowY: "auto",
          paddingRight: "4px"
        }}>
          {/* Card Phiên Tác Nghiệp */}
          <div style={{
            background: "var(--surface)",
            border: "1px solid var(--border)",
            borderRadius: "var(--r-lg)",
            padding: "14px 16px",
            boxShadow: "var(--shadow-sm)",
            display: "flex",
            flexDirection: "column",
            gap: "10px"
          }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", borderBottom: "1px solid var(--border-soft)", paddingBottom: "8px" }}>
              <span style={{
                fontSize: "11.5px",
                fontWeight: "700",
                color: "var(--text-3)",
                textTransform: "uppercase",
                letterSpacing: "0.03em"
              }}>
                {isVi ? "Phiên Tác Nghiệp" : "Chat Sessions"}
              </span>

              <button
                onClick={() => {
                  const newId = Date.now();
                  setThreads((prev) => ({
                    ...prev,
                    [newId]: {
                      id: newId,
                      title: isVi ? "Phiên tác nghiệp mới" : "New Operational Session",
                      scope: isVi ? "Bán hàng & Vận hành" : "Sales & Ops",
                      messages: []
                    }
                  }));
                  setActiveThread(newId);
                  showToast(isVi ? "Đã mở phiên chat tác nghiệp mới!" : "Opened new session!");
                }}
                style={{
                  background: "var(--cyan-soft)",
                  border: "1px solid var(--cyan-dim)",
                  padding: "2px 8px",
                  borderRadius: "5px",
                  fontSize: "11px",
                  color: "var(--cyan)",
                  fontWeight: "700",
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  gap: "4px"
                }}
              >
                <i className="fa-solid fa-plus" style={{ fontSize: "10px" }}></i>
                {isVi ? "Mới" : "New"}
              </button>
            </div>

            {/* Danh sách threads */}
            <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
              {Object.values(threads).map((th) => {
                const isActive = activeThread === th.id;
                return (
                  <div
                    key={th.id}
                    onClick={() => setActiveThread(th.id)}
                    style={{
                      padding: "10px 12px",
                      borderRadius: "var(--r-md)",
                      cursor: "pointer",
                      transition: "all var(--transition-fast)",
                      background: isActive ? "var(--surface)" : "var(--surface-2)",
                      border: `1.5px solid ${isActive ? "var(--cyan)" : "var(--border-soft)"}`,
                      boxShadow: isActive ? "0 2px 8px rgba(8, 145, 178, 0.12)" : "none",
                      borderLeft: isActive ? "3.5px solid var(--cyan)" : "1.5px solid var(--border-soft)",
                      display: "flex",
                      flexDirection: "column",
                      gap: "5px"
                    }}
                  >
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", fontSize: "10.5px" }}>
                      <span style={{
                        fontWeight: "700",
                        color: "var(--cyan)",
                        background: "var(--cyan-soft)",
                        padding: "1px 6px",
                        borderRadius: "4px"
                      }}>
                        {th.scope}
                      </span>
                      <span style={{ color: "var(--text-4)", fontWeight: "600" }}>{th.messages.length} tin</span>
                    </div>

                    <div style={{
                      fontSize: "12px",
                      fontWeight: isActive ? "700" : "600",
                      color: isActive ? "var(--text-1)" : "var(--text-2)",
                      lineHeight: "1.35"
                    }}>
                      {th.title}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Card Gợi ý câu hỏi hợp lệ */}
          <div style={{
            background: "var(--surface)",
            border: "1px solid var(--border)",
            borderRadius: "var(--r-lg)",
            padding: "14px 16px",
            boxShadow: "var(--shadow-sm)",
            display: "flex",
            flexDirection: "column",
            gap: "10px"
          }}>
            <span style={{
              fontSize: "11.5px",
              fontWeight: "700",
              color: "var(--text-3)",
              textTransform: "uppercase",
              letterSpacing: "0.03em",
              borderBottom: "1px solid var(--border-soft)",
              paddingBottom: "8px"
            }}>
              {isVi ? "Truy Vấn Mẫu" : "Quick Prompts"}
            </span>

            <div style={{ display: "flex", flexDirection: "column", gap: "7px" }}>
              <button
                onClick={() => handleSendMessage(isVi ? "Hợp đồng CT-2026-18 có điều khoản phạt chậm giao hàng như thế nào?" : "What are penalty clauses in contract CT-18?")}
                style={{
                  textAlign: "left",
                  fontSize: "11.5px",
                  padding: "8px 10px",
                  background: "var(--surface-2)",
                  border: "1px solid var(--border-soft)",
                  borderRadius: "6px",
                  color: "var(--text-2)",
                  cursor: "pointer",
                  transition: "all 0.15s ease",
                  display: "flex",
                  alignItems: "center",
                  gap: "8px",
                  lineHeight: "1.35"
                }}
              >
                <i className="fa-regular fa-file-lines" style={{ color: "var(--cyan)", fontSize: "12px", flexShrink: 0 }}></i>
                <span>{isVi ? "Điều khoản phạt chậm giao hàng CT-18" : "Penalty clauses in CT-18"}</span>
              </button>

              <button
                onClick={() => handleSendMessage(isVi ? "Soạn phương án đàm phán ưu đãi gia hạn cho khách hàng ABC" : "Draft renewal retention strategy for ABC Corp")}
                style={{
                  textAlign: "left",
                  fontSize: "11.5px",
                  padding: "8px 10px",
                  background: "var(--surface-2)",
                  border: "1px solid var(--border-soft)",
                  borderRadius: "6px",
                  color: "var(--text-2)",
                  cursor: "pointer",
                  transition: "all 0.15s ease",
                  display: "flex",
                  alignItems: "center",
                  gap: "8px",
                  lineHeight: "1.35"
                }}
              >
                <i className="fa-regular fa-envelope" style={{ color: "var(--blue)", fontSize: "12px", flexShrink: 0 }}></i>
                <span>{isVi ? "Soạn phương án ưu đãi gia hạn ABC Corp" : "Draft renewal strategy for ABC Corp"}</span>
              </button>
            </div>

            {/* Nút kiểm tra cơ chế bảo mật phòng ban */}
            <div style={{ paddingTop: "8px", borderTop: "1px solid var(--border-soft)", display: "flex", flexDirection: "column", gap: "6px" }}>
              <span style={{ fontSize: "10.5px", color: "var(--red)", fontWeight: "700", textTransform: "uppercase", display: "flex", alignItems: "center", gap: "5px" }}>
                <i className="fa-solid fa-shield-halved" style={{ fontSize: "11px" }}></i>
                <span>{isVi ? "Thử nghiệm RBAC:" : "Test RBAC:"}</span>
              </span>

              <button
                onClick={() => handleSendMessage(isVi ? "Cho tôi xem bảng lương chi tiết của phòng Nhân sự HR tháng 9" : "Show me HR payroll records")}
                style={{
                  textAlign: "left",
                  fontSize: "11.5px",
                  padding: "8px 10px",
                  background: "var(--red-soft)",
                  border: "1px solid var(--red-dim)",
                  borderRadius: "6px",
                  color: "var(--red)",
                  fontWeight: "600",
                  cursor: "pointer",
                  transition: "all 0.15s ease",
                  display: "flex",
                  alignItems: "center",
                  gap: "8px",
                  lineHeight: "1.35"
                }}
                title="Hệ thống sẽ từ chối do nhân viên Sales/Ops không có quyền xem lương HR"
              >
                <i className="fa-solid fa-ban" style={{ fontSize: "12px", flexShrink: 0 }}></i>
                <span>{isVi ? "Hỏi về Bảng lương HR (Thử vi phạm)" : "Ask for HR Payroll (Test Rejection)"}</span>
              </button>
            </div>
          </div>
        </div>

        {/* ============================================================ */}
        {/* CỘT 2: KHUNG CHAT MULTI-TURN HERO (RỘNG RÃI & LUÔN CỐ ĐỊNH) */}
        {/* ============================================================ */}
        <div style={{
          background: "var(--surface)",
          border: "1px solid var(--border)",
          borderRadius: "var(--r-lg)",
          boxShadow: "var(--shadow-sm)",
          display: "flex",
          flexDirection: "column",
          height: "100%",
          minHeight: 0,
          overflow: "hidden"
        }}>
          {/* Header phiên chat (Luôn cố định trên đầu) */}
          <div style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            borderBottom: "1px solid var(--border-soft)",
            padding: "12px 18px",
            flexShrink: 0,
            background: "var(--surface)"
          }}>
            <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
              <div style={{
                width: "32px",
                height: "32px",
                borderRadius: "8px",
                background: "linear-gradient(135deg, var(--cyan), var(--blue))",
                color: "#ffffff",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontWeight: "800",
                fontSize: "13px",
                boxShadow: "0 2px 6px rgba(8, 145, 178, 0.25)",
                flexShrink: 0
              }}>
                AI
              </div>

              <div>
                <h3 style={{
                  fontSize: "15px",
                  fontWeight: "800",
                  color: "var(--text-1)",
                  margin: 0,
                  letterSpacing: "-0.01em"
                }}>
                  {currentThreadData.title}
                </h3>
                <span style={{ fontSize: "12px", color: "var(--text-3)", fontWeight: "500" }}>
                  {isVi ? "Xác thực logic qua Multi-hop GraphRAG" : "Deterministic Multi-hop GraphRAG"}
                </span>
              </div>
            </div>

            <span style={{
              fontSize: "11px",
              fontWeight: "600",
              padding: "4px 10px",
              borderRadius: "6px",
              background: "var(--surface-3)",
              color: "var(--text-2)",
              border: "1px solid var(--border-soft)",
              whiteSpace: "nowrap"
            }}>
              {currentThreadData.scope}
            </span>
          </div>

          {/* Stream tin nhắn (Cuộn mượt mà bên trong, không đẩy mất Header hay Input) */}
          <div style={{
            flex: 1,
            overflowY: "auto",
            padding: "18px 22px",
            display: "flex",
            flexDirection: "column",
            gap: "18px",
            minHeight: 0
          }}>
            {currentThreadData.messages.map((msg) => {
              const isUser = msg.sender === "user";
              return (
                <div
                  key={msg.id}
                  style={{
                    display: "flex",
                    flexDirection: "column",
                    gap: "6px",
                    alignItems: isUser ? "flex-end" : "flex-start",
                    maxWidth: "100%"
                  }}
                >
                  <div style={{ display: "flex", alignItems: "center", gap: "8px", fontSize: "11px", color: "var(--text-4)" }}>
                    <span style={{ fontWeight: "700", color: isUser ? "var(--cyan)" : "var(--text-3)" }}>
                      {isUser ? (isVi ? "Bạn (Nguyễn V. Nam)" : "You") : "AI Copilot Core"}
                    </span>
                    <span>·</span>
                    <span>{msg.time}</span>
                  </div>

                  {/* BONG BÓNG TIN NHẮN RỘNG RÃI, DỄ ĐỌC */}
                  <div
                    style={{
                      padding: "14px 18px",
                      borderRadius: isUser ? "14px 14px 2px 14px" : "14px 14px 14px 2px",
                      maxWidth: isUser ? "80%" : "96%",
                      fontSize: "13.5px",
                      lineHeight: "1.65",
                      background: isUser
                        ? "linear-gradient(135deg, #0284c7, #0891b2)"
                        : msg.isSecurityAlert
                        ? "var(--red-soft)"
                        : "var(--surface-2)",
                      color: isUser
                        ? "#ffffff"
                        : msg.isSecurityAlert
                        ? "var(--red)"
                        : "var(--text-2)",
                      border: isUser
                        ? "none"
                        : msg.isSecurityAlert
                        ? "1.5px solid var(--red-dim)"
                        : "1px solid var(--border-soft)",
                      boxShadow: isUser ? "0 2px 8px rgba(2, 132, 199, 0.25)" : "var(--shadow-sm)"
                    }}
                  >
                    {isUser ? (
                      <span style={{ fontWeight: "500" }}>{msg.text}</span>
                    ) : (
                      renderFormattedText(msg.text)
                    )}
                  </div>

                  {/* ACTION TRIGGERS CHO CÂU TRẢ LỜI CỦA AI */}
                  {!isUser && !msg.isSecurityAlert && (
                    <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: "8px", marginTop: "4px" }}>
                      <button
                        onClick={() => {
                          setActionDraftModal({
                            recipient: "Tran M. Anh (Procurement Dir - ABC Corp)",
                            subject: "[Graph Mind] Đề xuất tái tục Hợp đồng CT-2026-18 & Ưu đãi 5.5%",
                            body: isVi
                              ? "Kính gửi Ông/Bà Tran M. Anh,\n\nTôi là Nguyễn V. Nam (Phòng Vận hành & Khách hàng Doanh nghiệp). Liên quan Hợp đồng CT-2026-18 hết hạn vào 18/10, chúng tôi trân trọng đề xuất gói gia hạn 2027 với ưu đãi chiết khấu 5.5% và cam kết SLA giao hàng 24h.\n\nKính đề nghị Quý công ty xếp lịch trao đổi sáng Thứ Năm tuần này."
                              : "Dear Tran M. Anh,\n\nRegarding Contract CT-2026-18 expiring 18 Oct, we propose a 5.5% retention volume discount package."
                          });
                        }}
                        style={{
                          fontSize: "11.5px",
                          fontWeight: "700",
                          padding: "5px 12px",
                          borderRadius: "6px",
                          background: "var(--cyan-soft)",
                          color: "var(--cyan)",
                          border: "1px solid var(--cyan-dim)",
                          cursor: "pointer",
                          display: "flex",
                          alignItems: "center",
                          gap: "6px",
                          transition: "all 0.15s ease",
                          boxShadow: "var(--shadow-sm)"
                        }}
                      >
                        <i className="fa-solid fa-paper-plane" style={{ fontSize: "10.5px" }}></i>
                        <span>{isVi ? "Soạn thư gửi khách hàng" : "Draft Outreach"}</span>
                      </button>

                      <button
                        onClick={() => {
                          onNavigate?.("documents");
                          showToast(isVi ? "Đang mở Hợp đồng CT-2026-18.pdf trong kho tài liệu..." : "Opening Contract_CT-2026-18.pdf...");
                        }}
                        style={{
                          fontSize: "11.5px",
                          fontWeight: "700",
                          padding: "5px 12px",
                          borderRadius: "6px",
                          background: "var(--red-soft)",
                          color: "var(--red)",
                          border: "1px solid var(--red-dim)",
                          cursor: "pointer",
                          display: "flex",
                          alignItems: "center",
                          gap: "6px",
                          transition: "all 0.15s ease",
                          boxShadow: "var(--shadow-sm)"
                        }}
                      >
                        <i className="fa-solid fa-file-pdf" style={{ fontSize: "11px" }}></i>
                        <span>{isVi ? "Mở văn bản PDF" : "Open PDF"}</span>
                      </button>

                      <button
                        onClick={() => {
                          showToast(isVi ? "Đã chuyển tiếp câu trả lời và đề xuất lên Trưởng phòng (@manager)!" : "Escalated case to Department Manager!");
                        }}
                        style={{
                          fontSize: "11.5px",
                          fontWeight: "700",
                          padding: "5px 12px",
                          borderRadius: "6px",
                          background: "var(--amber-soft)",
                          color: "var(--amber)",
                          border: "1px solid var(--amber-dim)",
                          cursor: "pointer",
                          display: "flex",
                          alignItems: "center",
                          gap: "6px",
                          transition: "all 0.15s ease",
                          boxShadow: "var(--shadow-sm)"
                        }}
                      >
                        <i className="fa-solid fa-arrow-up-right-from-square" style={{ fontSize: "10.5px" }}></i>
                        <span>{isVi ? "Trình duyệt Trưởng phòng" : "Escalate to Mgr"}</span>
                      </button>
                    </div>
                  )}
                </div>
              );
            })}

            {isInferring && (
              <div style={{ display: "flex", alignItems: "center", gap: "8px", fontSize: "12.5px", color: "var(--cyan)", padding: "6px 0", fontWeight: "600" }}>
                <i className="fa-solid fa-circle-notch fa-spin"></i>
                <span>{isVi ? "AI đang duyệt đồ thị & kiểm tra bảo mật RBAC..." : "Traversing Knowledge Graph & enforcing RBAC..."}</span>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Ô nhập tin nhắn (Luôn cố định chân chat, không bao giờ bị trôi) */}
          <div style={{
            borderTop: "1px solid var(--border-soft)",
            padding: "10px 16px",
            background: "var(--surface)",
            flexShrink: 0,
            display: "flex",
            flexDirection: "column",
            gap: "6px"
          }}>
            <div style={{
              display: "flex",
              alignItems: "center",
              background: "var(--surface-2)",
              border: "1.5px solid var(--border)",
              borderRadius: "8px",
              padding: "6px 8px 6px 14px",
              transition: "all 0.15s ease",
              boxShadow: "var(--shadow-sm)"
            }}>
              <input
                type="text"
                value={queryInput}
                onChange={(e) => setQueryInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") handleSendMessage();
                }}
                placeholder={isVi ? "Hỏi bất kỳ điều gì trong phạm vi Bán hàng & Vận hành..." : "Ask across Sales & Operations knowledge..."}
                style={{
                  width: "100%",
                  background: "transparent",
                  border: "none",
                  outline: "none",
                  fontSize: "13.5px",
                  color: "var(--text-1)",
                  fontWeight: "500"
                }}
              />

              <button
                onClick={() => handleSendMessage()}
                disabled={isInferring || !queryInput.trim()}
                className="btn primary sm"
                style={{
                  padding: "6px 14px",
                  flexShrink: 0,
                  opacity: isInferring || !queryInput.trim() ? 0.6 : 1,
                  display: "flex",
                  alignItems: "center",
                  gap: "6px"
                }}
              >
                <span>{isVi ? "Gửi" : "Send"}</span>
                <i className="fa-solid fa-paper-plane" style={{ fontSize: "10.5px" }}></i>
              </button>
            </div>

            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", fontSize: "10px", color: "var(--text-4)", padding: "0 2px" }}>
              <span>{isVi ? "Nhấn Enter để gửi · Hệ thống tự lọc dữ liệu ngoài thẩm quyền" : "Press Enter to send · Out-of-scope queries automatically rejected"}</span>
              <span style={{ fontFamily: "var(--f-mono)", fontWeight: "700", color: "var(--green)" }}>L4 RBAC ACTIVE</span>
            </div>
          </div>
        </div>

        {/* ============================================================ */}
        {/* CỘT 3: KNOWLEDGE GRAPH & CITATIONS (280px)                    */}
        {/* ============================================================ */}
        <div style={{
          display: "flex",
          flexDirection: "column",
          gap: "12px",
          minWidth: 0,
          overflowY: "auto",
          paddingRight: "4px"
        }}>
          {/* 1. SƠ ĐỒ MẠNG LƯỚI THU NHỎ (MINI KNOWLEDGE GRAPH) */}
          <div style={{
            background: "var(--surface)",
            border: "1px solid var(--border)",
            borderRadius: "var(--r-lg)",
            padding: "14px 16px",
            boxShadow: "var(--shadow-sm)",
            display: "flex",
            flexDirection: "column",
            gap: "8px"
          }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", borderBottom: "1px solid var(--border-soft)", paddingBottom: "8px" }}>
              <span style={{
                fontSize: "11.5px",
                fontWeight: "700",
                color: "var(--text-3)",
                textTransform: "uppercase",
                letterSpacing: "0.03em"
              }}>
                {isVi ? "Đồ Thị Logic Thu Nhỏ" : "Mini Knowledge Graph"}
              </span>

              <span style={{
                fontSize: "10px",
                fontWeight: "700",
                padding: "2px 7px",
                borderRadius: "4px",
                background: "var(--green-soft)",
                color: "var(--green)",
                border: "1px solid var(--green-dim)"
              }}>
                4 NODES
              </span>
            </div>

            <p style={{ fontSize: "11px", color: "var(--text-3)", margin: 0, lineHeight: "1.35" }}>
              {isVi ? "Thực thể liên quan đến câu trả lời:" : "Entities referenced in reasoning:"}
            </p>

            {/* Visualizer đồ thị mini */}
            <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
              {[
                { name: "ABC Corporation", type: "Khách hàng VIP", icon: "fa-building", color: "#dc2626", bg: "#fee2e2", border: "#fca5a5" },
                { name: "Contract CT-2026-18", type: "Hợp đồng (1.2B)", icon: "fa-file-signature", color: "#d97706", bg: "#fef3c7", border: "#fcd34d" },
                { name: "Sản phẩm A", type: "Linh kiện", icon: "fa-box-archive", color: "#0284c7", bg: "#e0f2fe", border: "#7dd3fc" },
                { name: "Tín hiệu giảm -32%", type: "Cảnh báo rủi ro", icon: "fa-triangle-exclamation", color: "#dc2626", bg: "#fee2e2", border: "#fca5a5" }
              ].map((n, i) => (
                <div
                  key={i}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    padding: "7px 10px",
                    borderRadius: "6px",
                    background: "var(--surface-2)",
                    border: "1px solid var(--border-soft)",
                    gap: "8px"
                  }}
                >
                  <div style={{ display: "flex", alignItems: "center", gap: "7px", minWidth: 0 }}>
                    <i className={`fa-solid ${n.icon}`} style={{ color: n.color, fontSize: "11px", width: "12px", textAlign: "center", flexShrink: 0 }}></i>
                    <span style={{ fontWeight: "700", fontSize: "11.5px", color: "var(--text-1)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                      {n.name}
                    </span>
                  </div>

                  <span style={{
                    fontSize: "9.5px",
                    fontWeight: "700",
                    padding: "1px 6px",
                    borderRadius: "4px",
                    background: n.bg,
                    color: n.color,
                    border: `1px solid ${n.border}`,
                    flexShrink: 0,
                    whiteSpace: "nowrap"
                  }}>
                    {n.type}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* 2. BỘ TRÍCH DẪN NGUỒN VĂN BẢN GỐC (CITATION VIEWER) */}
          <div style={{
            background: "var(--surface)",
            border: "1px solid var(--border)",
            borderRadius: "var(--r-lg)",
            padding: "14px 16px",
            boxShadow: "var(--shadow-sm)",
            display: "flex",
            flexDirection: "column",
            gap: "8px"
          }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", borderBottom: "1px solid var(--border-soft)", paddingBottom: "8px" }}>
              <span style={{
                fontSize: "11.5px",
                fontWeight: "700",
                color: "var(--text-3)",
                textTransform: "uppercase",
                letterSpacing: "0.03em"
              }}>
                {isVi ? "Trích Dẫn Nguồn Gốc" : "Verified Citations"}
              </span>

              <span style={{
                fontSize: "10px",
                fontWeight: "700",
                padding: "2px 7px",
                borderRadius: "4px",
                background: "var(--blue-soft)",
                color: "var(--blue)",
                border: "1px solid var(--blue-dim)"
              }}>
                L5 PROVENANCE
              </span>
            </div>

            <p style={{ fontSize: "11px", color: "var(--text-3)", margin: 0, lineHeight: "1.35" }}>
              {isVi ? "Bấm vào để xem đoạn văn bản gốc:" : "Click to view original excerpt:"}
            </p>

            <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
              <div
                onClick={() =>
                  setActiveCitation({
                    title: "Contract_CT-2026-18.pdf — Trang 2, Điều 4.2",
                    type: "PDF HỢP ĐỒNG",
                    content:
                      "Điều 4.2 (Hiệu lực hợp đồng): Hợp đồng này có giá trị hiệu lực đến hết ngày 18 tháng 10 năm 2026. Trong trường hợp Bên B (Tập đoàn ABC) có nhu cầu tái ký hoặc gia hạn hợp đồng, hai bên sẽ tiến hành rà soát chỉ tiêu mua sắm tối thiểu 15 ngày trước ngày kết thúc hợp đồng. Nếu không có văn bản gia hạn, các mức giá ưu đãi cam kết sẽ tự động mất hiệu lực."
                  })
                }
                style={{
                  padding: "9px 11px",
                  background: "var(--surface-2)",
                  border: "1px solid var(--border-soft)",
                  borderRadius: "var(--r-md)",
                  cursor: "pointer",
                  transition: "all var(--transition-fast)",
                  display: "flex",
                  flexDirection: "column",
                  gap: "5px"
                }}
              >
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: "6px" }}>
                  <span style={{ fontWeight: "700", fontSize: "11.5px", color: "var(--cyan)", display: "flex", alignItems: "center", gap: "6px", minWidth: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                    <i className="fa-solid fa-file-pdf" style={{ color: "var(--red)", fontSize: "12px", flexShrink: 0 }}></i>
                    <span style={{ overflow: "hidden", textOverflow: "ellipsis" }}>Contract_CT-2026-18.pdf</span>
                  </span>
                  <span style={{ fontSize: "10px", fontFamily: "var(--f-mono)", color: "var(--text-4)", flexShrink: 0, whiteSpace: "nowrap" }}>Trang 2</span>
                </div>
                <p style={{
                  fontSize: "11px",
                  color: "var(--text-3)",
                  margin: 0,
                  lineHeight: "1.4",
                  fontStyle: "italic",
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                  display: "-webkit-box",
                  WebkitLineClamp: 2,
                  WebkitBoxOrient: "vertical",
                  borderLeft: "2px solid var(--cyan)",
                  paddingLeft: "7px"
                }}>
                  "...Thời hạn hiệu lực đến hết ngày 18 tháng 10 năm 2026. Nếu không tái ký trước 15 ngày..."
                </p>
              </div>

              <div
                onClick={() =>
                  setActiveCitation({
                    title: "CRM_Account_Ledger_2026.xlsx — Dòng 142",
                    type: "BẢNG TÍNH SHEETS",
                    content:
                      "Bản ghi CRM ID #142 (ABC Corporation):\n• Tháng 7: 8 đơn hàng — Doanh thu 680,000,000 VND\n• Tháng 8: 5 đơn hàng — Doanh thu 420,000,000 VND\n• Tháng 9: 3 đơn hàng — Doanh thu 260,000,000 VND\n• Tốc độ tăng trưởng: -32.4% (Tín hiệu rời bỏ mức độ cao, cần can thiệp chăm sóc khẩn cấp)."
                  })
                }
                style={{
                  padding: "9px 11px",
                  background: "var(--surface-2)",
                  border: "1px solid var(--border-soft)",
                  borderRadius: "var(--r-md)",
                  cursor: "pointer",
                  transition: "all var(--transition-fast)",
                  display: "flex",
                  flexDirection: "column",
                  gap: "5px"
                }}
              >
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: "6px" }}>
                  <span style={{ fontWeight: "700", fontSize: "11.5px", color: "var(--green)", display: "flex", alignItems: "center", gap: "6px", minWidth: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                    <i className="fa-solid fa-file-excel" style={{ color: "var(--green)", fontSize: "12px", flexShrink: 0 }}></i>
                    <span style={{ overflow: "hidden", textOverflow: "ellipsis" }}>CRM_Account_Ledger_2026.xlsx</span>
                  </span>
                  <span style={{ fontSize: "10px", fontFamily: "var(--f-mono)", color: "var(--text-4)", flexShrink: 0, whiteSpace: "nowrap" }}>Dòng 142</span>
                </div>
                <p style={{
                  fontSize: "11px",
                  color: "var(--text-3)",
                  margin: 0,
                  lineHeight: "1.4",
                  fontStyle: "italic",
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                  display: "-webkit-box",
                  WebkitLineClamp: 2,
                  WebkitBoxOrient: "vertical",
                  borderLeft: "2px solid var(--green)",
                  paddingLeft: "7px"
                }}>
                  "...Tháng 8: 5 đơn hàng. Tháng 9: 3 đơn hàng. Nhịp mua hàng giảm 32.4%..."
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ============================================================ */}
      {/* MODAL 1: XEM CHI TIẾT TRÍCH DẪN VĂN BẢN GỐC (CITATION VIEWER)*/}
      {/* ============================================================ */}
      {activeCitation && (
        <div style={{
          position: "fixed",
          inset: 0,
          zIndex: 1000,
          background: "rgba(15, 23, 42, 0.65)",
          backdropFilter: "blur(4px)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          padding: "16px"
        }}>
          <div style={{
            background: "var(--surface)",
            border: "1px solid var(--border)",
            borderRadius: "var(--r-xl)",
            maxWidth: "600px",
            width: "100%",
            padding: "22px 24px",
            boxShadow: "var(--shadow-lg)",
            display: "flex",
            flexDirection: "column",
            gap: "16px"
          }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", borderBottom: "1px solid var(--border-soft)", paddingBottom: "12px" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                <i className="fa-solid fa-quote-left" style={{ color: "var(--cyan)", fontSize: "16px" }}></i>
                <h3 style={{ fontSize: "15px", fontWeight: "800", color: "var(--text-1)", margin: 0 }}>
                  {activeCitation.title}
                </h3>
              </div>
              <button
                onClick={() => setActiveCitation(null)}
                style={{ background: "transparent", border: "none", color: "var(--text-3)", cursor: "pointer", fontSize: "16px" }}
              >
                <i className="fa-solid fa-xmark"></i>
              </button>
            </div>

            <div style={{
              padding: "14px 16px",
              background: "var(--surface-2)",
              borderRadius: "8px",
              border: "1px solid var(--border-soft)",
              fontSize: "13px",
              color: "var(--text-2)",
              lineHeight: "1.6",
              fontFamily: "var(--f-mono)",
              whiteSpace: "pre-line"
            }}>
              {activeCitation.content}
            </div>

            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", borderTop: "1px solid var(--border-soft)", paddingTop: "12px" }}>
              <span style={{ fontSize: "11.5px", color: "var(--green)", display: "flex", alignItems: "center", gap: "6px", fontWeight: "600" }}>
                <i className="fa-solid fa-circle-check"></i>
                {isVi ? "Bằng chứng đã được kiểm toán toàn vẹn" : "Cryptographically verified provenance"}
              </span>

              <button
                onClick={() => {
                  onNavigate?.("documents");
                  setActiveCitation(null);
                  showToast(isVi ? "Đang chuyển sang Kho Tài liệu toàn văn..." : "Opening full document...");
                }}
                className="btn primary sm"
              >
                {isVi ? "Mở Toàn Văn Tệp" : "Open Full Document"} →
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ============================================================ */}
      {/* MODAL 2: ACTION TRIGGER DRAFT MODAL                           */}
      {/* ============================================================ */}
      {actionDraftModal && (
        <div style={{
          position: "fixed",
          inset: 0,
          zIndex: 1000,
          background: "rgba(15, 23, 42, 0.65)",
          backdropFilter: "blur(4px)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          padding: "16px"
        }}>
          <div style={{
            background: "var(--surface)",
            border: "1px solid var(--border)",
            borderRadius: "var(--r-xl)",
            maxWidth: "620px",
            width: "100%",
            padding: "22px 24px",
            boxShadow: "var(--shadow-lg)",
            display: "flex",
            flexDirection: "column",
            gap: "16px"
          }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", borderBottom: "1px solid var(--border-soft)", paddingBottom: "12px" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                <i className="fa-solid fa-paper-plane" style={{ color: "var(--cyan)", fontSize: "16px" }}></i>
                <h3 style={{ fontSize: "15px", fontWeight: "800", color: "var(--text-1)", margin: 0 }}>
                  {isVi ? "Thư Đề Xuất Do AI Soạn Sẵn" : "AI Generated Outreach Email"}
                </h3>
              </div>
              <button
                onClick={() => setActionDraftModal(null)}
                style={{ background: "transparent", border: "none", color: "var(--text-3)", cursor: "pointer", fontSize: "16px" }}
              >
                <i className="fa-solid fa-xmark"></i>
              </button>
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: "6px", fontSize: "12.5px", color: "var(--text-2)" }}>
              <div><b style={{ color: "var(--text-1)" }}>{isVi ? "Người nhận:" : "To:"}</b> {actionDraftModal.recipient}</div>
              <div><b style={{ color: "var(--text-1)" }}>{isVi ? "Tiêu đề:" : "Subject:"}</b> {actionDraftModal.subject}</div>
            </div>

            <textarea
              rows={8}
              value={actionDraftModal.body}
              onChange={(e) => setActionDraftModal({ ...actionDraftModal, body: e.target.value })}
              style={{
                width: "100%",
                background: "var(--surface-2)",
                color: "var(--text-1)",
                padding: "12px 14px",
                borderRadius: "8px",
                border: "1px solid var(--border)",
                fontSize: "13px",
                lineHeight: "1.6",
                outline: "none",
                fontFamily: "var(--f-body)"
              }}
            />

            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", borderTop: "1px solid var(--border-soft)", paddingTop: "12px" }}>
              <button
                type="button"
                onClick={() => {
                  navigator.clipboard.writeText(actionDraftModal.body);
                  setCopiedDraft(true);
                  setTimeout(() => setCopiedDraft(false), 2500);
                }}
                className="btn sm"
              >
                <i className={`fa-solid ${copiedDraft ? "fa-check" : "fa-copy"}`} style={{ color: copiedDraft ? "var(--green)" : "inherit", marginRight: "6px" }}></i>
                {copiedDraft ? (isVi ? "Đã sao chép!" : "Copied!") : (isVi ? "Sao chép thư" : "Copy Email")}
              </button>

              <button
                type="button"
                onClick={() => {
                  setActionDraftModal(null);
                  showToast(isVi ? "✅ Đã gửi thư và cập nhật nhật ký tác nghiệp!" : "Email sent & logged to audit trail!");
                }}
                className="btn primary sm"
              >
                {isVi ? "Gửi Đi & Lưu Nhật Ký" : "Send & Log"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
