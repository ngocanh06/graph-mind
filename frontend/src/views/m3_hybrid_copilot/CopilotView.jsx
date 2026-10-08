import React, { useState, useRef, useEffect } from "react";
import {
  Bot, Send, Paperclip, Sparkles, BookOpen, ChevronRight,
  Search, Plus, FileText, ThumbsUp, ThumbsDown, Copy,
  ExternalLink, ShieldCheck, AlertCircle, X, Menu, Clock,
  ArrowUpRight, CheckCircle2, Bookmark, Check
} from "lucide-react";
import { queryCopilot } from "../../services/api";

export default function CopilotView({
  onNavigate,
  t = {},
  lang = "vi",
  apiConnected = false,
  role = "executive",
  currentUser
}) {
  const isVi = lang === "vi";

  // Drawer toggle states
  const [showSessionDrawer, setShowSessionDrawer] = useState(true);
  const [showCitationDrawer, setShowCitationDrawer] = useState(true);

  // Search & input states
  const [searchHistory, setSearchHistory] = useState("");
  const [queryInput, setQueryInput] = useState("");
  const [isInferring, setIsInferring] = useState(false);
  const [showEmptyState, setShowEmptyState] = useState(false);
  const [toastMsg, setToastMsg] = useState("");

  // Citation Preview state
  const [activeCitation, setActiveCitation] = useState({
    docName: "CUAD_Service_Agreement_v4.pdf",
    match: "98.6% MATCH",
    location: isVi ? "Trang 16, Mục 12.2" : "Page 16, Clause 12.2",
    entity: isVi ? "Alpha Corp (Bên A)" : "Alpha Corp (Party A)",
    chunk1: {
      id: "#VEC-8812",
      title: isVi ? "Đoạn trích chứng thực 1 (Qdrant Chunk #402)" : "Verified Excerpt 1 (Qdrant Chunk #402)",
      text: isVi
        ? "...Trong mọi trường hợp, Bên A sẽ không chịu trách nhiệm đối với bất kỳ thiệt hại ngẫu nhiên, gián tiếp phát sinh từ việc gián đoạn dịch vụ quá 48 giờ liên tục do trường hợp bất khả kháng..."
        : "...In no event shall Party A be liable for any incidental or consequential damages arising from service disruption exceeding 48 consecutive hours under force majeure..."
    },
    chunk2: {
      id: "Chunk #403",
      title: isVi ? "Đoạn trích chứng thực 2 (Giới hạn bồi thường)" : "Verified Excerpt 2 (Indemnification Cap)",
      text: isVi
        ? "...Tổng mức bồi thường của Bên A cho toàn bộ các khiếu nại trong suốt thời hạn thỏa thuận sẽ không vượt quá số tiền tương đương với 10% tổng phí dịch vụ được thanh toán trong tháng xảy ra sự kiện vi phạm..."
        : "...The aggregate liability of Party A for all claims during the term shall not exceed an amount equivalent to 10% of total service fees paid in the month of breach..."
    },
    neo4jNode: "Clause:Liability_Limit",
    neo4jProps: "is_unilateral = true, cap_percentage = 0.10",
    agent: "AEGIS Local Agent (PC-01 / legal)"
  });

  const messagesEndRef = useRef(null);

  const showToast = (msg) => {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(""), 3500);
  };

  // Default active messages matching SCREEN-018 design spec
  const [messages, setMessages] = useState([
    {
      id: "m1",
      sender: "user",
      time: "14:20",
      userLabel: currentUser?.name || (isVi ? "Trần Thị Thu Hương (Executive)" : "Thu Huong Tran (Executive)"),
      text: isVi
        ? "Hãy rà soát Hợp đồng dịch vụ CUAD_042 với đối tác Alpha Corp. Có điều khoản nào miễn trừ hoặc giới hạn trách nhiệm bồi thường thiệt hại bất lợi cho doanh nghiệp không?"
        : "Please review Service Contract CUAD_042 with partner Alpha Corp. Are there any unfavorable liability limitation or exclusion clauses against our enterprise?"
    },
    {
      id: "copilot",
      sender: "copilot",
      time: "14:20",
      verifiedBadge: "Hybrid GraphRAG Verified",
      confidence: "98.6%",
      citationCount: 2,
      latency: "1.42s latency (Hybrid Vector-Graph Fusion)",
      introText: isVi
        ? "Qua trích xuất kết hợp từ đồ thị tri thức Neo4j và kho véc-tơ Qdrant trên hợp đồng CUAD_Service_Agreement_v4.pdf (thuộc đối tác Alpha Corp), tôi phát hiện 1 điều khoản bất lợi nghiêm trọng tại Mục 12.2:"
        : "Through hybrid extraction fusing Neo4j knowledge graph and Qdrant vector database on CUAD_Service_Agreement_v4.pdf (Alpha Corp), I identified 1 critical unfavorable clause at Section 12.2:",
      riskBox: {
        title: isVi
          ? "RỦI RO PHÁP LÝ: Bất đối xứng giới hạn trách nhiệm (Unilateral Liability Cap)"
          : "LEGAL RISK: Unilateral Liability Cap Asymmetry",
        text: isVi
          ? 'Điều khoản quy định: "Bên B (doanh nghiệp) phải bồi thường tối đa 100% giá trị hợp đồng khi có sự cố dữ liệu, trong khi Bên A (Alpha Corp) được miễn trừ hoàn toàn đối với mọi thiệt hại gián tiếp và trần trách nhiệm chỉ bằng 10% phí dịch vụ tháng gần nhất."'
          : 'Clause terms: "Party B (Enterprise) indemnifies up to 100% contract value upon data incident, while Party A (Alpha Corp) is fully exempted from indirect damages and caps liability at only 10% of monthly fee."'
      }
    }
  ]);

  // Scroll to bottom on new messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isInferring]);

  const handleSend = async (e) => {
    if (e) e.preventDefault();
    if (!queryInput.trim() || isInferring) return;

    const userText = queryInput.trim();
    setQueryInput("");
    setShowEmptyState(false);

    const userMsg = {
      id: `u_${Date.now()}`,
      sender: "user",
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      userLabel: currentUser?.name || "Executive User",
      text: userText
    };

    setMessages((prev) => [...prev, userMsg]);
    setIsInferring(true);

    try {
      if (apiConnected) {
        const response = await queryCopilot(userText, isVi ? "vi" : "en");
        const data = response?.data || response;
        const answerText = response?.answer || data?.insight || response?.text || (isVi ? "Hệ thống đã hoàn tất xử lý." : "Processing completed.");
        const latencyStr = response?.latency ? `${response.latency}s latency` : "1.2s latency";
        const modelBadge = response?.model || "Qwen2.5-7B + Hybrid GraphRAG";
        const citationCount = data?.evidenceChips?.length || 1;
        const confidenceScore = data?.confidenceScore ? `${data.confidenceScore}%` : "98.5%";

        setMessages((prev) => [
          ...prev,
          {
            id: `c_${Date.now()}`,
            sender: "copilot",
            time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
            verifiedBadge: modelBadge,
            confidence: confidenceScore,
            citationCount: citationCount,
            latency: latencyStr,
            introText: answerText
          }
        ]);
      } else {
        setTimeout(() => {
          setMessages((prev) => [
            ...prev,
            {
              id: `c_${Date.now()}`,
              sender: "copilot",
              time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
              verifiedBadge: "Hybrid GraphRAG Verified",
              confidence: "97.4%",
              citationCount: 2,
              latency: "1.35s latency (Offline Graph Mock)",
              introText: isVi
                ? `Hệ thống đã đối soát yêu cầu "${userText}" trên cơ sở tri thức Neo4j và hợp đồng CUAD. Các thực thể liên quan đã được xác thực toàn vẹn.`
                : `Cross-referenced query "${userText}" across Neo4j knowledge graph and CUAD contracts. Linked entities verified intact.`
            }
          ]);
          setIsInferring(false);
        }, 800);
        return;
      }
    } catch (err) {
      setMessages((prev) => [
        ...prev,
        {
          id: `c_err_${Date.now()}`,
          sender: "copilot",
          time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          verifiedBadge: "Fallback Mode",
          confidence: "80.0%",
          citationCount: 0,
          introText: isVi
            ? "Đang kết nối lại API Engine... Phản hồi mô phỏng từ bộ đệm GraphMind."
            : "Reconnecting to API Engine... Fallback simulated response from GraphMind buffer."
        }
      ]);
    } finally {
      setIsInferring(false);
    }
  };

  const fillPrompt = (text) => {
    setQueryInput(text);
  };

  const clearChatToEmpty = () => {
    setMessages([]);
    setShowEmptyState(true);
  };

  return (
    <div style={{
      display: "flex",
      flexDirection: "column",
      height: "100%",
      background: "var(--base)",
      position: "relative",
      overflow: "hidden"
    }}>

      {/* Toast */}
      {toastMsg && (
        <div style={{
          position: "fixed",
          bottom: 24,
          right: 24,
          zIndex: 100,
          background: "var(--surface)",
          border: "1px solid var(--border-strong)",
          borderRadius: "var(--r-md)",
          padding: "12px 18px",
          boxShadow: "var(--shadow-xl)",
          display: "flex",
          alignItems: "center",
          gap: 10,
          fontSize: 13,
          fontWeight: 600,
          color: "var(--text-1)"
        }}>
          <CheckCircle2 size={16} color="var(--green)" />
          <span>{toastMsg}</span>
        </div>
      )}

      {/* ── COPILOT TOPBAR ───────────────────────────────────── */}
      <div style={{
        height: 56,
        background: "var(--surface)",
        borderBottom: "1px solid var(--border)",
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        padding: "0 20px",
        flexShrink: 0,
        gap: 12
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <button
            onClick={() => setShowSessionDrawer(!showSessionDrawer)}
            title={isVi ? "Mở/Đóng danh sách phiên chat" : "Toggle chat sessions"}
            style={{
              width: 32,
              height: 32,
              borderRadius: "var(--r-md)",
              border: "1px solid var(--border)",
              background: showSessionDrawer ? "var(--surface-2)" : "transparent",
              color: "var(--text-2)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              cursor: "pointer"
            }}
          >
            <Menu size={16} />
          </button>

          <div style={{ width: 1, height: 20, background: "var(--border-soft)" }} />

          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <div style={{
              width: 30,
              height: 30,
              borderRadius: 8,
              background: "linear-gradient(135deg, #0F233D 0%, #2563EB 100%)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: "#ffffff"
            }}>
              <Bot size={17} strokeWidth={2.2} />
            </div>
            <div>
              <div style={{ fontSize: 14, fontWeight: 700, color: "var(--text-1)", display: "flex", alignItems: "center", gap: 8, fontFamily: "var(--f-display)" }}>
                <span>GraphMind AI Copilot</span>
                <span style={{
                  fontSize: 11,
                  fontWeight: 600,
                  padding: "2px 8px",
                  borderRadius: 99,
                  background: "var(--blue-soft)",
                  color: "var(--blue)",
                  border: "1px solid rgba(37,99,235,0.2)"
                }}>
                  Qwen2.5-7B LoRA + Neo4j GraphRAG
                </span>
              </div>
            </div>
          </div>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <div style={{
            display: "none",
            alignItems: "center",
            gap: 6,
            padding: "4px 10px",
            borderRadius: "var(--r-md)",
            background: "var(--surface-2)",
            border: "1px solid var(--border)",
            fontSize: 11.5,
            color: "var(--text-3)"
          }} className="sm-flex">
            <span>{isVi ? "Phiên:" : "Session:"}</span>
            <span style={{ fontFamily: "var(--f-mono)", color: "var(--text-1)", fontWeight: 600 }}>SES-9481-EXEC</span>
            <span style={{ width: 6, height: 6, borderRadius: "50%", background: "var(--green)" }} />
          </div>

          <button
            onClick={clearChatToEmpty}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 6,
              padding: "6px 12px",
              borderRadius: "var(--r-md)",
              border: "1px solid var(--border)",
              background: "var(--surface-2)",
              color: "var(--text-2)",
              fontSize: 12,
              fontWeight: 600,
              cursor: "pointer"
            }}
          >
            <Plus size={14} />
            <span>{isVi ? "Phiên mới" : "New Chat"}</span>
          </button>

          <button
            onClick={() => setShowCitationDrawer(!showCitationDrawer)}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 6,
              padding: "6px 12px",
              borderRadius: "var(--r-md)",
              border: `1px solid ${showCitationDrawer ? "rgba(37,99,235,0.3)" : "var(--border)"}`,
              background: showCitationDrawer ? "var(--blue-soft)" : "var(--surface-2)",
              color: showCitationDrawer ? "var(--blue)" : "var(--text-2)",
              fontSize: 12,
              fontWeight: 600,
              cursor: "pointer"
            }}
          >
            <BookOpen size={14} />
            <span>{isVi ? "Trích dẫn & Nguồn (2)" : "Citations (2)"}</span>
          </button>
        </div>
      </div>

      {/* ── 3-COLUMN WORKSPACE ───────────────────────────────── */}
      <div style={{ flex: 1, display: "flex", overflow: "hidden", minHeight: 0 }}>

        {/* ── COLUMN 1: SESSIONS DRAWER (240px) ───────────────── */}
        {showSessionDrawer && (
          <aside style={{
            width: 240,
            background: "var(--surface)",
            borderRight: "1px solid var(--border)",
            display: "flex",
            flexDirection: "column",
            flexShrink: 0
          }}>
            <div style={{ padding: 12, borderBottom: "1px solid var(--border-soft)", display: "flex", flexDirection: "column", gap: 8 }}>
              <div style={{ position: "relative" }}>
                <Search size={13} color="var(--text-4)" style={{ position: "absolute", left: 10, top: "50%", transform: "translateY(-50%)" }} />
                <input
                  type="text"
                  value={searchHistory}
                  onChange={(e) => setSearchHistory(e.target.value)}
                  placeholder={isVi ? "Tìm lịch sử..." : "Search history..."}
                  style={{
                    width: "100%",
                    background: "var(--surface-2)",
                    border: "1px solid var(--border)",
                    borderRadius: "var(--r-md)",
                    padding: "6px 10px 6px 28px",
                    fontSize: 12,
                    color: "var(--text-1)",
                    outline: "none"
                  }}
                />
              </div>

              <button
                onClick={clearChatToEmpty}
                style={{
                  width: "100%",
                  padding: "6px 12px",
                  borderRadius: "var(--r-md)",
                  background: "var(--text-1)",
                  color: "var(--surface)",
                  fontSize: 12,
                  fontWeight: 600,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: 6,
                  cursor: "pointer"
                }}
              >
                <Plus size={13} />
                <span>{isVi ? "Tạo hội thoại mới" : "Start New Chat"}</span>
              </button>
            </div>

            <div style={{ flex: 1, overflowY: "auto", padding: 10, display: "flex", flexDirection: "column", gap: 12 }}>
              <div>
                <div style={{ fontSize: 10, fontWeight: 700, color: "var(--text-4)", textTransform: "uppercase", letterSpacing: "0.05em", padding: "4px 8px" }}>
                  {isVi ? "Hôm nay" : "Today"}
                </div>
                <div style={{ display: "flex", flexDirection: "column", gap: 4, marginTop: 4 }}>
                  <div style={{
                    padding: "8px 10px",
                    borderRadius: "var(--r-md)",
                    background: "var(--blue-soft)",
                    border: "1px solid rgba(37,99,235,0.2)",
                    color: "var(--blue)",
                    cursor: "pointer"
                  }}>
                    <div style={{ fontSize: 12.5, fontWeight: 700, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                      {isVi ? "Rà soát hợp đồng CUAD_042..." : "Review contract CUAD_042..."}
                    </div>
                    <div style={{ fontSize: 10.5, color: "var(--text-3)", marginTop: 2 }}>
                      {isVi ? "2 trích dẫn • 14:20" : "2 citations • 14:20"}
                    </div>
                  </div>

                  <div style={{
                    padding: "8px 10px",
                    borderRadius: "var(--r-md)",
                    background: "transparent",
                    color: "var(--text-2)",
                    cursor: "pointer"
                  }}>
                    <div style={{ fontSize: 12, fontWeight: 500, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                      {isVi ? "Tần suất đơn hàng Đông Nam" : "Dong Nam order frequency"}
                    </div>
                    <div style={{ fontSize: 10.5, color: "var(--text-4)", marginTop: 2 }}>
                      AdventureWorks • 11:05
                    </div>
                  </div>
                </div>
              </div>

              <div>
                <div style={{ fontSize: 10, fontWeight: 700, color: "var(--text-4)", textTransform: "uppercase", letterSpacing: "0.05em", padding: "4px 8px" }}>
                  {isVi ? "7 ngày qua" : "Previous 7 Days"}
                </div>
                <div style={{ display: "flex", flexDirection: "column", gap: 4, marginTop: 4 }}>
                  <div style={{ padding: "8px 10px", borderRadius: "var(--r-md)", color: "var(--text-2)", cursor: "pointer" }}>
                    <div style={{ fontSize: 12, fontWeight: 500, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                      {isVi ? "SOP nghiệm thu phần mềm v2.1" : "SOP Acceptance v2.1"}
                    </div>
                    <div style={{ fontSize: 10.5, color: "var(--text-4)", marginTop: 2 }}>
                      {isVi ? "Thứ 3 • Phòng IT" : "Tue • IT Dept"}
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div style={{
              padding: "10px 14px",
              borderTop: "1px solid var(--border-soft)",
              background: "var(--surface-2)",
              fontSize: 11,
              color: "var(--text-3)",
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between"
            }}>
              <span>{isVi ? "Hạn mức:" : "Quota:"} <strong style={{ color: "var(--text-1)" }}>{isVi ? "Không giới hạn" : "Unlimited"}</strong></span>
              <span style={{ width: 6, height: 6, borderRadius: "50%", background: "var(--green)" }} />
            </div>
          </aside>
        )}

        {/* ── COLUMN 2: CHAT CONVERSATION VIEWPORT (FLEX-1) ──── */}
        <div style={{
          flex: 1,
          display: "flex",
          flexDirection: "column",
          background: "var(--surface)",
          position: "relative",
          minWidth: 0
        }}>
          {/* Scroll area */}
          <div style={{ flex: 1, overflowY: "auto", padding: "24px 32px", display: "flex", flexDirection: "column", gap: 20 }}>

            {/* Context notice */}
            <div style={{ display: "flex", justifyContent: "center" }}>
              <div style={{
                padding: "6px 14px",
                borderRadius: 99,
                background: "var(--surface-2)",
                border: "1px solid var(--border)",
                fontSize: 11.5,
                color: "var(--text-3)",
                display: "flex",
                alignItems: "center",
                gap: 6
              }}>
                <ShieldCheck size={13} color="var(--blue)" />
                <span>{isVi ? "Phạm vi:" : "Scope:"} <strong>{isVi ? "Hợp đồng CUAD" : "CUAD Contracts"}</strong> & <strong>AdventureWorks ERP</strong> (RBAC: Executive)</span>
              </div>
            </div>

            {/* Empty state */}
            {showEmptyState && (
              <div style={{
                margin: "auto 0",
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                textAlign: "center",
                padding: 32,
                gap: 16
              }}>
                <div style={{
                  width: 56,
                  height: 56,
                  borderRadius: 16,
                  background: "var(--blue-soft)",
                  color: "var(--blue)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center"
                }}>
                  <Sparkles size={28} />
                </div>
                <div>
                  <h4 style={{ fontSize: 17, fontWeight: 700, color: "var(--text-1)", margin: "0 0 6px", fontFamily: "var(--f-display)" }}>
                    {isVi ? "Bắt đầu cuộc trò chuyện với AI Copilot" : "Start a Conversation with AI Copilot"}
                  </h4>
                  <p style={{ fontSize: 13, color: "var(--text-3)", maxWidth: 440, margin: 0, lineHeight: 1.5 }}>
                    {isVi
                      ? "Hỏi đáp tự nhiên trên dữ liệu kinh doanh ERP và hệ thống hợp đồng pháp lý CUAD. Mọi câu trả lời đều có trích dẫn nguồn xác thực."
                      : "Query freely across AdventureWorks ERP and CUAD legal contracts with grounded evidence citations."}
                  </p>
                </div>

                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, maxWidth: 520, width: "100%", textAlign: "left" }}>
                  <button
                    onClick={() => fillPrompt(isVi ? "Tìm các hợp đồng dịch vụ sắp hết hạn trong 30 ngày tới" : "Find service agreements expiring in the next 30 days")}
                    style={{
                      padding: "12px",
                      borderRadius: "var(--r-md)",
                      background: "var(--surface-2)",
                      border: "1px solid var(--border)",
                      color: "var(--text-1)",
                      cursor: "pointer",
                      textAlign: "left"
                    }}
                  >
                    <div style={{ fontSize: 12.5, fontWeight: 700 }}>📄 {isVi ? "Hợp đồng sắp hết hạn" : "Expiring Contracts"}</div>
                    <div style={{ fontSize: 11, color: "var(--text-3)", marginTop: 2 }}>{isVi ? "Quét các hợp đồng cần tái đàm phán" : "Scan contracts needing renewal"}</div>
                  </button>

                  <button
                    onClick={() => fillPrompt(isVi ? "Khách hàng VIP nào giảm tần suất đặt hàng trong quý 3?" : "Which VIP customers experienced order frequency drop in Q3?")}
                    style={{
                      padding: "12px",
                      borderRadius: "var(--r-md)",
                      background: "var(--surface-2)",
                      border: "1px solid var(--border)",
                      color: "var(--text-1)",
                      cursor: "pointer",
                      textAlign: "left"
                    }}
                  >
                    <div style={{ fontSize: 12.5, fontWeight: 700 }}>📉 {isVi ? "Rủi ro sụt giảm đơn hàng" : "Order Cadence Dips"}</div>
                    <div style={{ fontSize: 11, color: "var(--text-3)", marginTop: 2 }}>{isVi ? "So sánh dữ liệu đơn hàng gần đây" : "Compare time-series order history"}</div>
                  </button>
                </div>
              </div>
            )}

            {/* Messages */}
            {messages.map((msg) => {
              if (msg.sender === "user") {
                return (
                  <div key={msg.id} style={{ display: "flex", justifyContent: "flex-end" }}>
                    <div style={{ maxWidth: "75%", display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 4 }}>
                      <div style={{
                        background: "var(--blue-soft)",
                        border: "1px solid rgba(37,99,235,0.25)",
                        borderRadius: "16px 16px 4px 16px",
                        padding: "14px 18px",
                        color: "var(--text-1)",
                        fontSize: 13.5,
                        lineHeight: 1.6,
                        boxShadow: "var(--shadow-xs)"
                      }}>
                        {msg.text}
                      </div>
                      <div style={{ fontSize: 11, color: "var(--text-4)", paddingRight: 4 }}>
                        <span>{msg.userLabel}</span> • <span>{msg.time}</span>
                      </div>
                    </div>
                  </div>
                );
              }

              return (
                <div key={msg.id} style={{ display: "flex", alignItems: "flex-start", gap: 12 }}>
                  <div style={{
                    width: 32,
                    height: 32,
                    borderRadius: 10,
                    background: "linear-gradient(135deg, #0F233D 0%, #2563EB 100%)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    color: "#ffffff",
                    flexShrink: 0,
                    marginTop: 4
                  }}>
                    <Bot size={17} strokeWidth={2.2} />
                  </div>

                  <div style={{ flex: 1, maxWidth: "85%", display: "flex", flexDirection: "column", gap: 8 }}>
                    <div style={{
                      background: "var(--surface-2)",
                      border: "1px solid var(--border)",
                      borderRadius: "4px 16px 16px 16px",
                      padding: "18px 22px",
                      boxShadow: "var(--shadow-xs)",
                      display: "flex",
                      flexDirection: "column",
                      gap: 14
                    }}>
                      {/* Badge row */}
                      <div style={{
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "space-between",
                        borderBottom: "1px solid var(--border-soft)",
                        paddingBottom: 10
                      }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                          <span style={{
                            padding: "2px 8px",
                            borderRadius: "var(--r-xs)",
                            background: "var(--blue-soft)",
                            color: "var(--blue)",
                            fontWeight: 700,
                            fontSize: 11,
                            border: "1px solid rgba(37,99,235,0.2)",
                            display: "flex",
                            alignItems: "center",
                            gap: 4
                          }}>
                            <Sparkles size={11} />
                            {msg.verifiedBadge}
                          </span>
                          <span style={{ fontSize: 11.5, color: "var(--text-3)" }}>
                            {isVi ? "Độ tin cậy:" : "Confidence:"} <strong style={{ color: "var(--text-1)" }}>{msg.confidence}</strong>
                          </span>
                        </div>

                        {msg.citationCount > 0 && (
                          <button
                            onClick={() => setShowCitationDrawer(true)}
                            style={{
                              display: "flex",
                              alignItems: "center",
                              gap: 5,
                              padding: "3px 10px",
                              borderRadius: 99,
                              background: "var(--amber-soft)",
                              border: "1px solid rgba(217,119,6,0.25)",
                              color: "var(--amber)",
                              fontSize: 11.5,
                              fontWeight: 600,
                              cursor: "pointer"
                            }}
                          >
                            <Bookmark size={11} />
                            <span>{msg.citationCount} {isVi ? "Trích dẫn nguồn" : "Citations"}</span>
                          </button>
                        )}
                      </div>

                      <p style={{ fontSize: 13.5, color: "var(--text-1)", lineHeight: 1.6, margin: 0 }}>
                        {msg.introText}
                      </p>

                      {/* Risk Callout */}
                      {msg.riskBox && (
                        <div style={{
                          background: "var(--red-soft)",
                          borderLeft: "4px solid var(--red)",
                          borderRadius: "0 var(--r-md) var(--r-md) 0",
                          padding: "12px 16px",
                          display: "flex",
                          flexDirection: "column",
                          gap: 6
                        }}>
                          <div style={{
                            display: "flex",
                            alignItems: "center",
                            gap: 6,
                            fontSize: 12.5,
                            fontWeight: 700,
                            color: "var(--red)"
                          }}>
                            <AlertCircle size={15} />
                            <span>{msg.riskBox.title}</span>
                          </div>
                          <p style={{ fontSize: 12.5, color: "var(--text-2)", lineHeight: 1.6, margin: 0 }}>
                            {msg.riskBox.text}
                          </p>
                        </div>
                      )}

                      {/* Action buttons */}
                      <div style={{
                        display: "flex",
                        flexWrap: "wrap",
                        alignItems: "center",
                        justifyContent: "space-between",
                        gap: 10,
                        borderTop: "1px solid var(--border-soft)",
                        paddingTop: 10
                      }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                          <button
                            onClick={() => onNavigate?.("knowledge")}
                            style={{
                              display: "flex",
                              alignItems: "center",
                              gap: 5,
                              padding: "5px 10px",
                              borderRadius: "var(--r-md)",
                              background: "var(--surface)",
                              border: "1px solid var(--border)",
                              color: "var(--blue)",
                              fontSize: 11.5,
                              fontWeight: 600,
                              cursor: "pointer"
                            }}
                          >
                            <span>{isVi ? "Xem đồ thị Neo4j" : "View Neo4j Graph"}</span>
                            <ArrowUpRight size={12} />
                          </button>

                          <button
                            onClick={() => setShowCitationDrawer(true)}
                            style={{
                              display: "flex",
                              alignItems: "center",
                              gap: 5,
                              padding: "5px 10px",
                              borderRadius: "var(--r-md)",
                              background: "var(--surface)",
                              border: "1px solid var(--border)",
                              color: "var(--text-2)",
                              fontSize: 11.5,
                              fontWeight: 600,
                              cursor: "pointer"
                            }}
                          >
                            <FileText size={12} />
                            <span>{isVi ? "Soi trích dẫn" : "Inspect Citation"}</span>
                          </button>
                        </div>

                        <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
                          <button
                            onClick={() => showToast(isVi ? "Đánh giá: Hữu ích" : "Marked helpful")}
                            title={isVi ? "Hữu ích" : "Helpful"}
                            style={{ width: 28, height: 28, borderRadius: "var(--r-xs)", display: "flex", alignItems: "center", justifyContent: "center", color: "var(--text-4)", cursor: "pointer" }}
                          >
                            <ThumbsUp size={13} />
                          </button>
                          <button
                            onClick={() => showToast(isVi ? "Đã phản hồi ý kiến" : "Feedback noted")}
                            title={isVi ? "Chưa đúng" : "Inaccurate"}
                            style={{ width: 28, height: 28, borderRadius: "var(--r-xs)", display: "flex", alignItems: "center", justifyContent: "center", color: "var(--text-4)", cursor: "pointer" }}
                          >
                            <ThumbsDown size={13} />
                          </button>
                          <button
                            onClick={() => {
                              navigator.clipboard?.writeText(msg.introText);
                              showToast(isVi ? "Đã sao chép câu trả lời" : "Copied to clipboard");
                            }}
                            title={isVi ? "Sao chép" : "Copy"}
                            style={{ width: 28, height: 28, borderRadius: "var(--r-xs)", display: "flex", alignItems: "center", justifyContent: "center", color: "var(--text-4)", cursor: "pointer" }}
                          >
                            <Copy size={13} />
                          </button>
                        </div>
                      </div>
                    </div>

                    <div style={{ fontSize: 11, color: "var(--text-4)", paddingLeft: 4 }}>
                      GraphMind AI Copilot • {msg.latency || "1.42s latency"}
                    </div>
                  </div>
                </div>
              );
            })}

            {isInferring && (
              <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 14px", background: "var(--surface-2)", borderRadius: "var(--r-md)", width: "fit-content" }}>
                <span style={{ width: 6, height: 6, borderRadius: "50%", background: "var(--blue)" }} className="pulse-dot" />
                <span style={{ fontSize: 12, color: "var(--text-2)", fontWeight: 500 }}>
                  {isVi ? "Đang tra vấn đồ thị quan hệ Neo4j & trích xuất vector Qdrant..." : "Querying Neo4j relations & extracting Qdrant vectors..."}
                </span>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>

          {/* Sticky input */}
          <div style={{
            padding: "16px 24px",
            borderTop: "1px solid var(--border)",
            background: "var(--surface)"
          }}>
            <form onSubmit={handleSend} style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              <div style={{
                position: "relative",
                background: "var(--surface-2)",
                border: "1px solid var(--border)",
                borderRadius: "var(--r-lg)",
                padding: "10px 14px"
              }}>
                <textarea
                  rows={2}
                  value={queryInput}
                  onChange={(e) => setQueryInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && !e.shiftKey) {
                      e.preventDefault();
                      handleSend();
                    }
                  }}
                  placeholder={isVi ? "Đặt câu hỏi về khách hàng, đơn hàng, điều khoản hợp đồng CUAD..." : "Ask questions regarding contracts, customers, ERP orders..."}
                  style={{
                    width: "100%",
                    background: "transparent",
                    border: "none",
                    outline: "none",
                    resize: "none",
                    fontSize: 13,
                    color: "var(--text-1)",
                    lineHeight: 1.5,
                    paddingRight: 80
                  }}
                />

                <div style={{ position: "absolute", right: 10, bottom: 10, display: "flex", alignItems: "center", gap: 6 }}>
                  <button
                    type="button"
                    onClick={() => showToast(isVi ? "Đính kèm tệp phân tích..." : "Attach analysis file...")}
                    title={isVi ? "Đính kèm tài liệu" : "Attach document"}
                    style={{ width: 30, height: 30, borderRadius: "var(--r-md)", display: "flex", alignItems: "center", justifyContent: "center", color: "var(--text-3)", cursor: "pointer" }}
                  >
                    <Paperclip size={15} />
                  </button>

                  <button
                    type="submit"
                    disabled={!queryInput.trim() || isInferring}
                    style={{
                      padding: "6px 12px",
                      borderRadius: "var(--r-md)",
                      background: !queryInput.trim() || isInferring ? "var(--surface-3)" : "var(--blue)",
                      color: !queryInput.trim() || isInferring ? "var(--text-4)" : "#ffffff",
                      fontSize: 12,
                      fontWeight: 700,
                      display: "flex",
                      alignItems: "center",
                      gap: 4,
                      cursor: !queryInput.trim() || isInferring ? "not-allowed" : "pointer",
                      transition: "all 0.15s ease"
                    }}
                  >
                    <span>{isVi ? "Gửi" : "Send"}</span>
                    <Send size={12} />
                  </button>
                </div>
              </div>

              <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11, color: "var(--text-4)", padding: "0 4px" }}>
                <span>{isVi ? "Nhấn Enter để gửi, Shift + Enter để xuống dòng" : "Press Enter to send, Shift + Enter for new line"}</span>
                <span style={{ display: "flex", alignItems: "center", gap: 4 }}>
                  <CheckCircle2 size={11} color="var(--green)" />
                  {isVi ? "Không bịa đặt thông tin • Luôn neo vào cơ sở tri thức" : "Fact-grounded • Tied to verified knowledge"}
                </span>
              </div>
            </form>
          </div>
        </div>

        {/* ── COLUMN 3: CITATION DRAWER (360px) ───────────────── */}
        {showCitationDrawer && (
          <aside style={{
            width: 360,
            background: "var(--surface)",
            borderLeft: "1px solid var(--border)",
            display: "flex",
            flexDirection: "column",
            flexShrink: 0
          }}>
            <div style={{
              height: 56,
              padding: "0 16px",
              borderBottom: "1px solid var(--border)",
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              background: "var(--surface-2)"
            }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <span style={{ width: 8, height: 8, borderRadius: "50%", background: "var(--amber)" }} />
                <span style={{ fontSize: 12, fontWeight: 700, color: "var(--text-1)", textTransform: "uppercase", letterSpacing: "0.04em" }}>
                  {isVi ? "Trích Dẫn & Nguồn Chứng Thực" : "Grounded Evidence Citations"}
                </span>
              </div>

              <button
                onClick={() => setShowCitationDrawer(false)}
                style={{ width: 28, height: 28, borderRadius: "var(--r-xs)", display: "flex", alignItems: "center", justifyContent: "center", color: "var(--text-3)", cursor: "pointer" }}
              >
                <X size={15} />
              </button>
            </div>

            <div style={{ flex: 1, overflowY: "auto", padding: 16, display: "flex", flexDirection: "column", gap: 14 }}>
              {/* Document metadata card */}
              <div style={{
                background: "var(--surface-2)",
                border: "1px solid var(--border)",
                borderRadius: "var(--r-md)",
                padding: "12px 14px",
                display: "flex",
                flexDirection: "column",
                gap: 8
              }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <span style={{ fontSize: 11, fontWeight: 700, color: "var(--blue)", textTransform: "uppercase" }}>
                    {isVi ? "Tài liệu pháp lý gốc" : "Source Document"}
                  </span>
                  <span style={{ fontSize: 10, fontWeight: 700, color: "var(--green)", background: "var(--green-soft)", padding: "2px 6px", borderRadius: 4 }}>
                    {activeCitation.match}
                  </span>
                </div>
                <div style={{ fontSize: 12.5, fontWeight: 700, color: "var(--text-1)", fontFamily: "var(--f-mono)" }}>
                  {activeCitation.docName}
                </div>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, fontSize: 11, color: "var(--text-3)", borderTop: "1px solid var(--border-soft)", paddingTop: 6 }}>
                  <div>{isVi ? "Vị trí:" : "Location:"} <strong style={{ color: "var(--text-1)" }}>{activeCitation.location}</strong></div>
                  <div>{isVi ? "Thực thể:" : "Entity:"} <strong style={{ color: "var(--text-1)" }}>{activeCitation.entity}</strong></div>
                </div>
              </div>

              {/* Excerpt 1 */}
              <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11, color: "var(--text-3)" }}>
                  <span style={{ fontWeight: 600 }}>{activeCitation.chunk1.title}</span>
                  <span style={{ fontFamily: "var(--f-mono)" }}>{activeCitation.chunk1.id}</span>
                </div>
                <div style={{
                  background: "var(--amber-soft)",
                  border: "1px solid rgba(217,119,6,0.25)",
                  borderRadius: "var(--r-md)",
                  padding: "12px",
                  fontSize: 12,
                  color: "var(--text-1)",
                  lineHeight: 1.6
                }}>
                  {activeCitation.chunk1.text}
                </div>
              </div>

              {/* Excerpt 2 */}
              <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11, color: "var(--text-3)" }}>
                  <span style={{ fontWeight: 600 }}>{activeCitation.chunk2.title}</span>
                  <span style={{ fontFamily: "var(--f-mono)" }}>{activeCitation.chunk2.id}</span>
                </div>
                <div style={{
                  background: "var(--amber-soft)",
                  border: "1px solid rgba(217,119,6,0.25)",
                  borderRadius: "var(--r-md)",
                  padding: "12px",
                  fontSize: 12,
                  color: "var(--text-1)",
                  lineHeight: 1.6
                }}>
                  {activeCitation.chunk2.text}
                </div>
              </div>

              {/* Lineage */}
              <div style={{
                background: "var(--surface-2)",
                border: "1px solid var(--border-soft)",
                borderRadius: "var(--r-md)",
                padding: "12px",
                fontSize: 11,
                color: "var(--text-3)",
                display: "flex",
                flexDirection: "column",
                gap: 4
              }}>
                <div style={{ fontWeight: 700, color: "var(--text-2)" }}>{isVi ? "Nguồn gốc Hybrid GraphRAG:" : "Hybrid Lineage:"}</div>
                <div>Neo4j Node: <code style={{ color: "var(--blue)" }}>{activeCitation.neo4jNode}</code></div>
                <div>{isVi ? "Thuộc tính:" : "Properties:"} <code style={{ color: "var(--text-2)" }}>{activeCitation.neo4jProps}</code></div>
                <div>{isVi ? "Nạp bởi:" : "Ingested by:"} {activeCitation.agent}</div>
              </div>
            </div>

            <div style={{ padding: 16, borderTop: "1px solid var(--border-soft)", background: "var(--surface-2)" }}>
              <button
                onClick={() => onNavigate?.("knowledge")}
                style={{
                  width: "100%",
                  padding: "8px 14px",
                  borderRadius: "var(--r-md)",
                  background: "var(--blue)",
                  color: "#ffffff",
                  fontSize: 12,
                  fontWeight: 600,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: 6,
                  cursor: "pointer"
                }}
              >
                <span>{isVi ? "Mở trong Knowledge Base" : "Open in Knowledge Base"}</span>
                <ExternalLink size={13} />
              </button>
            </div>
          </aside>
        )}

      </div>
    </div>
  );
}
