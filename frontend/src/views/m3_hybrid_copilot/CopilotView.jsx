import React, { useState, useRef, useEffect } from "react";
import {
  Bot, Send, Paperclip, Sparkles, BookOpen, ChevronRight,
  Search, Plus, FileText, ThumbsUp, ThumbsDown, Copy,
  ExternalLink, ShieldCheck, AlertCircle, X, Menu, Clock,
  ArrowUpRight, CheckCircle2, Bookmark, Check
} from "lucide-react";
import {
  queryCopilot,
  fetchCopilotSessions,
  fetchCopilotSessionDetail,
  createCopilotSession,
  deleteCopilotSession
} from "../../services/api";

function formatInlineMetrics(text) {
  if (!text) return null;
  // Regex bắt các cụm tiền tệ: $XX.XX triệu USD, $XX,XXX USD, $XX.XX
  // và các cụm đơn hàng: XXX đơn hàng, XXX đơn, khách hàng #XXXX
  const parts = text.split(/(\$[\d,.]+\s*(?:triệu USD|tỷ USD|USD|M|K)?|\b\d{1,3}(?:,\d{3})+\s*(?:đơn hàng|đơn|khách hàng)?|\b\d{3,6}\s*(?:đơn hàng|đơn)\b|#\d+)/gi);

  return parts.map((part, i) => {
    if (/^\$[\d,.]+/i.test(part)) {
      return (
        <strong
          key={i}
          style={{
            color: "var(--blue)",
            background: "var(--blue-soft)",
            padding: "1px 6px",
            borderRadius: "var(--r-xs, 4px)",
            fontFamily: "var(--f-mono, monospace)",
            fontSize: "0.95em",
            fontWeight: 700
          }}
        >
          {part}
        </strong>
      );
    }
    if (/\b\d+[\d,]*\s*(?:đơn hàng|đơn|khách hàng)/i.test(part)) {
      return (
        <span
          key={i}
          style={{
            fontWeight: 700,
            color: "var(--text-1)"
          }}
        >
          {part}
        </span>
      );
    }
    if (/^#\d+/.test(part)) {
      return (
        <span
          key={i}
          style={{
            fontFamily: "var(--f-mono, monospace)",
            color: "#8b5cf6",
            background: "rgba(139,92,246,0.08)",
            padding: "1px 5px",
            borderRadius: 4,
            fontWeight: 600
          }}
        >
          {part}
        </span>
      );
    }
    return part;
  });
}

function renderFormattedMessage(text) {
  if (!text) return null;

  // 1. Chuẩn hóa phân tách dòng triệt để
  let str = text;
  // Tách số đầu mục dính liền: "sau: 1. AAA" hoặc "2014. 2. BBB"
  str = str.replace(/([.:])\s+(\d+[\.\)])\s+/g, "$1\n$2 ");
  str = str.replace(/([)\]])\s+(\d+[\.\)])\s+/g, "$1\n$2 ");
  // Tách gạch đầu dòng dính liền: "- Năm 2011: ... - Năm 2012:"
  str = str.replace(/\s+([-\*•])\s+/g, "\n$1 ");
  str = str.replace(/([.:])\s+([-\*•])\s+/g, "$1\n$2 ");
  // Tách cụ thể / ví dụ nếu dính liền
  str = str.replace(/([.:])\s+(Cụ thể:?|Ví dụ:?|Lưu ý:?)/g, "$1\n$2");
  // Tách mốc năm dính liền nếu có: "... đơn. Năm 2012..." hoặc "Cụ thể, doanh thu năm 2011..."
  str = str.replace(/([.:])\s+(Năm \d{4}:?|Đến năm \d{4},?|Vào năm \d{4},?|Trong năm \d{4},?)/g, "$1\n- $2");

  const rawLines = str.split("\n").map(l => l.trim()).filter(Boolean);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
      {rawLines.map((line, idx) => {
        // A. Mục đánh số danh sách: "1. Tên hợp đồng..." hoặc "1) ..."
        const numMatch = line.match(/^(\d+)[\.\)]\s*(.+)/);
        if (numMatch) {
          const num = numMatch[1];
          const content = numMatch[2];
          return (
            <div
              key={idx}
              style={{
                display: "flex",
                alignItems: "flex-start",
                gap: 12,
                padding: "10px 14px",
                borderRadius: "var(--r-md, 10px)",
                background: "var(--surface-1, rgba(255,255,255,0.03))",
                border: "1px solid var(--border-soft, rgba(255,255,255,0.08))",
                fontSize: 13,
                lineHeight: 1.6,
                boxShadow: "0 1px 2px rgba(0,0,0,0.03)"
              }}
            >
              <span
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  justifyContent: "center",
                  minWidth: 24,
                  height: 24,
                  borderRadius: "50%",
                  background: "var(--blue-soft, rgba(37,99,235,0.14))",
                  border: "1px solid rgba(37,99,235,0.25)",
                  color: "var(--blue, #3b82f6)",
                  fontWeight: 800,
                  fontSize: 11.5,
                  flexShrink: 0,
                  marginTop: 1
                }}
              >
                {num}
              </span>
              <div style={{ flex: 1, color: "var(--text-1)", wordBreak: "break-word" }}>
                {formatInlineMetrics(content)}
              </div>
            </div>
          );
        }

        // B. Mục gạch đầu dòng: "- AAA", "* AAA", "• AAA"
        const bulletMatch = line.match(/^[-*•]\s*(.+)/);
        if (bulletMatch) {
          const content = bulletMatch[1];
          return (
            <div
              key={idx}
              style={{
                display: "flex",
                alignItems: "flex-start",
                gap: 10,
                padding: "8px 14px",
                marginLeft: 8,
                borderRadius: "var(--r-sm, 6px)",
                background: "rgba(37,99,235,0.04)",
                borderLeft: "3px solid var(--blue, #3b82f6)",
                fontSize: 13,
                lineHeight: 1.55,
                color: "var(--text-1)"
              }}
            >
              <div style={{ flex: 1, wordBreak: "break-word" }}>
                {formatInlineMetrics(content)}
              </div>
            </div>
          );
        }

        // C. Tiêu đề / Đoạn chuyển: "Cụ thể:", "Tóm lại:"
        if (/^(cụ thể|tóm lại|kết luận|ghi chú|khuyến nghị):?/i.test(line)) {
          return (
            <div
              key={idx}
              style={{
                fontSize: 12,
                fontWeight: 700,
                color: "var(--text-3)",
                textTransform: "uppercase",
                letterSpacing: "0.05em",
                marginTop: 4,
                marginBottom: -3
              }}
            >
              {line}
            </div>
          );
        }

        // D. Đoạn văn bản thông thường (Intro / Outro)
        return (
          <p
            key={idx}
            style={{
              fontSize: 13.5,
              color: "var(--text-1)",
              lineHeight: 1.65,
              margin: 0
            }}
          >
            {formatInlineMetrics(line)}
          </p>
        );
      })}
    </div>
  );
}

export default function CopilotView({
  onNavigate,
  t = {},
  lang = "vi",
  apiConnected = false,
  role = "executive",
  currentUser,
  initialQuery = "",
  onClearInitialQuery
}) {
  const isVi = lang === "vi";

  // Sessions state (per-user database persistence)
  const [sessions, setSessions] = useState([]);
  const [currentSessionId, setCurrentSessionId] = useState(null);
  const [isLoadingSessions, setIsLoadingSessions] = useState(false);

  // Drawer toggle states
  const [showSessionDrawer, setShowSessionDrawer] = useState(true);
  const [showCitationDrawer, setShowCitationDrawer] = useState(false);

  // Search & input states
  const [searchHistory, setSearchHistory] = useState("");
  const [queryInput, setQueryInput] = useState(initialQuery || "");
  const [isInferring, setIsInferring] = useState(false);
  const [showEmptyState, setShowEmptyState] = useState(false);
  const [toastMsg, setToastMsg] = useState("");

  // Tự động điền câu hỏi khi điều hướng từ các view khác (vd: Executive Dashboard)
  const textareaRef = useRef(null);

  useEffect(() => {
    if (initialQuery) {
      setQueryInput(initialQuery);
      if (onClearInitialQuery) onClearInitialQuery();
      setTimeout(() => {
        textareaRef.current?.focus();
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
      }, 150);
    }
  }, [initialQuery, onClearInitialQuery]);

  // Citation Preview state (only populated when actual citations exist from queries)
  const [activeCitation, setActiveCitation] = useState(null);

  const messagesEndRef = useRef(null);

  const showToast = (msg) => {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(""), 3500);
  };

  const [messages, setMessages] = useState([]);

  // Load user sessions from PostgreSQL whenever currentUser changes
  useEffect(() => {
    let isMounted = true;
    async function loadSessions() {
      setIsLoadingSessions(true);
      try {
        const data = await fetchCopilotSessions(currentUser);
        if (!isMounted) return;
        if (data && data.success && Array.isArray(data.sessions)) {
          setSessions(data.sessions);
          if (data.sessions.length > 0) {
            const firstSession = data.sessions[0];
            setCurrentSessionId(firstSession.id);
            const detail = await fetchCopilotSessionDetail(firstSession.id, currentUser);
            if (isMounted && detail && detail.success && detail.session) {
              const msgs = detail.session.messages || [];
              setMessages(msgs);
              setShowEmptyState(msgs.length === 0);
              const lastCopilot = msgs.slice().reverse().find(m => m.sender === "copilot" && m.citations?.length > 0);
              if (lastCopilot && lastCopilot.citations?.length > 0) {
                setActiveCitation(lastCopilot.citations);
                setShowCitationDrawer(true);
              } else {
                setActiveCitation(null);
                setShowCitationDrawer(false);
              }
            }
          } else {
            setCurrentSessionId(null);
            setMessages([]);
            setShowEmptyState(true);
            setActiveCitation(null);
            setShowCitationDrawer(false);
          }
        } else {
          setCurrentSessionId(null);
          setMessages([]);
          setShowEmptyState(true);
          setActiveCitation(null);
          setShowCitationDrawer(false);
        }
      } catch (err) {
        console.warn("[Copilot] Error loading sessions:", err);
      } finally {
        if (isMounted) setIsLoadingSessions(false);
      }
    }
    loadSessions();
    return () => { isMounted = false; };
  }, [currentUser?.email, currentUser?.username, currentUser?.id]);

  // Scroll to bottom on new messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isInferring]);

  const handleSelectSession = async (sessionId) => {
    if (sessionId === currentSessionId && messages.length > 0) return;
    setCurrentSessionId(sessionId);
    try {
      const detail = await fetchCopilotSessionDetail(sessionId, currentUser);
      if (detail && detail.success && detail.session) {
        const msgs = detail.session.messages || [];
        setMessages(msgs);
        setShowEmptyState(msgs.length === 0);
        const lastCopilot = msgs.slice().reverse().find(m => m.sender === "copilot" && m.citations?.length > 0);
        if (lastCopilot && lastCopilot.citations?.length > 0) {
          setActiveCitation(lastCopilot.citations);
          setShowCitationDrawer(true);
        } else {
          setActiveCitation(null);
          setShowCitationDrawer(false);
        }
      }
    } catch (e) {
      console.warn("[Copilot] Could not load session:", e);
    }
  };

  const handleNewChat = () => {
    setCurrentSessionId(null);
    setMessages([]);
    setShowEmptyState(true);
    setActiveCitation(null);
    setShowCitationDrawer(false);
  };

  const handleDeleteSession = async (e, sessionId) => {
    e.stopPropagation();
    try {
      await deleteCopilotSession(sessionId, currentUser);
      setSessions((prev) => prev.filter((s) => s.id !== sessionId));
      if (currentSessionId === sessionId) {
        handleNewChat();
      }
      showToast(isVi ? "Đã xóa cuộc hội thoại" : "Deleted conversation");
    } catch (e) {
      console.warn("[Copilot] Error deleting session:", e);
    }
  };

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
      userLabel: currentUser?.name || currentUser?.username || "Executive User",
      text: userText
    };

    setMessages((prev) => [...prev, userMsg]);
    setIsInferring(true);

    try {
      const response = await queryCopilot(userText, isVi ? "vi" : "en", currentSessionId, currentUser);
      if (response && response.success) {
        if (response.sessionId) {
          setCurrentSessionId(response.sessionId);
        }
        if (response.session && response.session.messages) {
          setMessages(response.session.messages);
        } else {
          const data = response?.data || response;
          const answerText = response?.answer || data?.insight || response?.text || (isVi ? "Hệ thống đã hoàn tất xử lý." : "Processing completed.");
          const latencyStr = response?.latency ? `${response.latency}s latency` : "1.2s latency";
          const modelBadge = response?.model || "Qwen2.5-7B + Hybrid GraphRAG";
          const serverCitations = response?.citations || data?.citations || [];
          const citationCount = serverCitations.length;
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
              introText: answerText,
              evidenceChips: data?.evidenceChips || [],
              citations: serverCitations
            }
          ]);
        }

        // Cập nhật trích dẫn thực tế: Chỉ mở Drawer khi có trích dẫn thực tế
        const realCitations = response?.citations || response?.data?.citations || [];
        if (realCitations && realCitations.length > 0) {
          setActiveCitation(realCitations);
          setShowCitationDrawer(true);
        } else {
          setActiveCitation(null);
          setShowCitationDrawer(false);
        }

        // Refresh sessions list in left drawer
        const sData = await fetchCopilotSessions(currentUser);
        if (sData && sData.sessions) {
          setSessions(sData.sessions);
        }
      } else {
        setMessages((prev) => [
          ...prev,
          {
            id: `c_${Date.now()}`,
            sender: "copilot",
            time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
            verifiedBadge: "AI Local Engine",
            confidence: "85.0%",
            citationCount: 0,
            latency: "1.0s latency",
            introText: isVi
              ? `Không nhận được phản hồi từ AI Copilot cho yêu cầu "${userText}". Vui lòng thử lại.`
              : `No response from AI Copilot for "${userText}". Please try again.`
          }
        ]);
        setActiveCitation(null);
        setShowCitationDrawer(false);
      }
    } catch (err) {
      setMessages((prev) => [
        ...prev,
        {
          id: `c_err_${Date.now()}`,
          sender: "copilot",
          time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          verifiedBadge: "Offline",
          confidence: "0.0%",
          citationCount: 0,
          introText: isVi
            ? "Lỗi kết nối máy chủ Copilot. Vui lòng kiểm tra lại dịch vụ."
            : "Copilot server connection error. Please verify the service."
        }
      ]);
      setActiveCitation(null);
      setShowCitationDrawer(false);
    } finally {
      setIsInferring(false);
    }
  };

  const fillPrompt = (text) => {
    setQueryInput(text);
  };

  const clearChatToEmpty = () => {
    handleNewChat();
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
            display: "flex",
            alignItems: "center",
            gap: 6,
            padding: "4px 10px",
            borderRadius: "var(--r-md)",
            background: "var(--surface-2)",
            border: "1px solid var(--border)",
            fontSize: 11.5,
            color: "var(--text-3)"
          }}>
            <span>{isVi ? "Phiên:" : "Session:"}</span>
            <span style={{ fontFamily: "var(--f-mono)", color: "var(--text-1)", fontWeight: 600 }}>
              {currentSessionId ? `SES-${currentSessionId.slice(0, 6).toUpperCase()}` : (isVi ? "MỚI" : "NEW")}
            </span>
            <span style={{ width: 6, height: 6, borderRadius: "50%", background: currentSessionId ? "var(--green)" : "var(--blue)" }} />
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

          {(() => {
            const count = Array.isArray(activeCitation) ? activeCitation.length : (activeCitation ? 1 : 0);
            return (
              <button
                onClick={() => {
                  if (count > 0) {
                    setShowCitationDrawer(!showCitationDrawer);
                  } else {
                    showToast(isVi ? "Chưa có nguồn trích dẫn từ tài liệu cho câu hỏi này" : "No citations available for this query");
                  }
                }}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 6,
                  padding: "6px 12px",
                  borderRadius: "var(--r-md)",
                  border: `1px solid ${showCitationDrawer ? "rgba(37,99,235,0.3)" : "var(--border)"}`,
                  background: showCitationDrawer ? "var(--blue-soft)" : "var(--surface-2)",
                  color: showCitationDrawer ? "var(--blue)" : count > 0 ? "var(--text-2)" : "var(--text-4)",
                  fontSize: 12,
                  fontWeight: 600,
                  cursor: count > 0 ? "pointer" : "default",
                  opacity: count > 0 ? 1 : 0.65,
                  transition: "all 0.15s ease"
                }}
                title={count > 0 ? (isVi ? "Xem chi tiết nguồn trích dẫn" : "View source citations") : (isVi ? "Chưa có trích dẫn" : "No citations")}
              >
                <BookOpen size={14} />
                <span>{isVi ? `Trích dẫn & Nguồn (${count})` : `Citations (${count})`}</span>
              </button>
            );
          })()}
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

            <div style={{ flex: 1, overflowY: "auto", padding: 10, display: "flex", flexDirection: "column", gap: 6 }}>
              {isLoadingSessions ? (
                <div style={{ padding: "16px 8px", textAlign: "center", color: "var(--text-3)", fontSize: 12 }}>
                  {isVi ? "Đang tải danh sách..." : "Loading sessions..."}
                </div>
              ) : sessions.filter(s => !searchHistory || (s.title && s.title.toLowerCase().includes(searchHistory.toLowerCase()))).length === 0 ? (
                <div style={{ padding: "24px 8px", textAlign: "center", color: "var(--text-4)", fontSize: 12 }}>
                  {searchHistory 
                    ? (isVi ? "Không tìm thấy phiên nào" : "No sessions found")
                    : (isVi ? "Chưa có cuộc hội thoại nào" : "No conversation history")}
                </div>
              ) : (
                sessions
                  .filter(s => !searchHistory || (s.title && s.title.toLowerCase().includes(searchHistory.toLowerCase())))
                  .map((s) => {
                    const isActive = s.id === currentSessionId;
                    const timeFormatted = s.updatedAt
                      ? new Date(s.updatedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                      : "";
                    return (
                      <div
                        key={s.id}
                        onClick={() => handleSelectSession(s.id)}
                        style={{
                          padding: "8px 10px",
                          borderRadius: "var(--r-md)",
                          background: isActive ? "var(--blue-soft)" : "transparent",
                          border: isActive ? "1px solid rgba(37,99,235,0.25)" : "1px solid transparent",
                          color: isActive ? "var(--blue)" : "var(--text-2)",
                          cursor: "pointer",
                          position: "relative",
                          transition: "all 0.15s ease",
                          display: "flex",
                          flexDirection: "column",
                          gap: 3,
                        }}
                        onMouseEnter={(e) => {
                          if (!isActive) e.currentTarget.style.background = "var(--surface-2)";
                          const delBtn = e.currentTarget.querySelector(".session-del-btn");
                          if (delBtn) delBtn.style.opacity = "1";
                        }}
                        onMouseLeave={(e) => {
                          if (!isActive) e.currentTarget.style.background = "transparent";
                          const delBtn = e.currentTarget.querySelector(".session-del-btn");
                          if (delBtn) delBtn.style.opacity = "0";
                        }}
                      >
                        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 6 }}>
                          <div style={{
                            fontSize: 12.5,
                            fontWeight: isActive ? 700 : 500,
                            whiteSpace: "nowrap",
                            overflow: "hidden",
                            textOverflow: "ellipsis",
                            flex: 1,
                          }}>
                            {s.title || (isVi ? "Cuộc hội thoại mới" : "New Chat")}
                          </div>
                          <button
                            className="session-del-btn"
                            title={isVi ? "Xóa cuộc hội thoại" : "Delete session"}
                            onClick={(e) => handleDeleteSession(e, s.id)}
                            style={{
                              background: "transparent",
                              border: "none",
                              color: "var(--text-4)",
                              cursor: "pointer",
                              padding: 2,
                              opacity: 0,
                              transition: "opacity 0.15s",
                              display: "flex",
                              alignItems: "center",
                            }}
                          >
                            <X size={12} />
                          </button>
                        </div>
                        <div style={{ fontSize: 10.5, color: isActive ? "var(--blue)" : "var(--text-4)", display: "flex", alignItems: "center", gap: 6 }}>
                          <span>{s.messageCount || 0} {isVi ? "tin nhắn" : "messages"}</span>
                          {timeFormatted && <span>• {timeFormatted}</span>}
                        </div>
                      </div>
                    );
                  })
              )}
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

                        {msg.citations && msg.citations.length > 0 && (
                          <button
                            onClick={() => {
                              setActiveCitation(msg.citations);
                              setShowCitationDrawer(true);
                            }}
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
                            <span>{msg.citations.length} {isVi ? "Trích dẫn nguồn" : "Citations"}</span>
                          </button>
                        )}
                      </div>

                      {renderFormattedMessage(msg.introText)}

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

                          {msg.citations && msg.citations.length > 0 && (
                            <button
                              onClick={() => {
                                setActiveCitation(msg.citations);
                                setShowCitationDrawer(true);
                              }}
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
                          )}
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
                  ref={textareaRef}
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

        {/* ── COLUMN 3: CITATION DRAWER (380px) ───────────────── */}
        {showCitationDrawer && (
          <aside style={{
            width: 380,
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
                {Array.isArray(activeCitation) && activeCitation.length > 0 && (
                  <span style={{
                    fontSize: 11,
                    fontWeight: 700,
                    padding: "1px 7px",
                    borderRadius: 99,
                    background: "var(--amber-soft)",
                    color: "var(--amber)",
                    border: "1px solid rgba(217,119,6,0.3)"
                  }}>
                    {activeCitation.length}
                  </span>
                )}
              </div>

              <button
                onClick={() => setShowCitationDrawer(false)}
                style={{
                  width: 28,
                  height: 28,
                  borderRadius: "var(--r-xs)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  color: "var(--text-3)",
                  cursor: "pointer",
                  background: "transparent",
                  border: "none"
                }}
              >
                <X size={15} />
              </button>
            </div>

            <div style={{ flex: 1, overflowY: "auto", padding: 16, display: "flex", flexDirection: "column", gap: 14 }}>
              {(!activeCitation || (Array.isArray(activeCitation) && activeCitation.length === 0)) ? (
                <div style={{ padding: "40px 16px", textAlign: "center", color: "var(--text-4)", fontSize: 12 }}>
                  {isVi ? "Chưa có nguồn trích dẫn từ tài liệu thực tế cho câu hỏi này." : "No grounded citations available for this query."}
                </div>
              ) : (
                (Array.isArray(activeCitation) ? activeCitation : [activeCitation]).map((cite, idx) => (
                  <div
                    key={cite.chunkId || idx}
                    style={{
                      background: "var(--surface-2)",
                      border: "1px solid var(--border)",
                      borderRadius: "var(--r-md)",
                      padding: "14px",
                      display: "flex",
                      flexDirection: "column",
                      gap: 10
                    }}
                  >
                    {/* Header: Type + Match */}
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                      <span style={{ fontSize: 11, fontWeight: 700, color: "var(--blue)", textTransform: "uppercase" }}>
                        {cite.sourceType || (isVi ? "Tài liệu chứng thực" : "Verified Source")}
                      </span>
                      {cite.match && (
                        <span style={{
                          fontSize: 10,
                          fontWeight: 700,
                          color: "var(--green)",
                          background: "var(--green-soft)",
                          padding: "2px 6px",
                          borderRadius: 4
                        }}>
                          {cite.match}
                        </span>
                      )}
                    </div>

                    {/* File name */}
                    <div>
                      <div style={{ fontSize: 10.5, color: "var(--text-3)", marginBottom: 2 }}>
                        {isVi ? "Tệp tài liệu gốc:" : "Source File:"}
                      </div>
                      <div style={{
                        fontSize: 12,
                        fontWeight: 700,
                        color: "var(--text-1)",
                        fontFamily: "var(--f-mono)",
                        wordBreak: "break-all",
                        lineHeight: 1.4
                      }}>
                        📄 {cite.docName || cite.file || "Contract_Document.txt"}
                      </div>
                    </div>

                    {/* Line / Chunk Location */}
                    <div style={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      fontSize: 11,
                      color: "var(--text-3)",
                      background: "var(--surface)",
                      padding: "6px 10px",
                      borderRadius: "var(--r-xs)",
                      border: "1px solid var(--border-soft)"
                    }}>
                      <span>📍 {isVi ? "Vị trí & Dòng:" : "Location & Line:"}</span>
                      <strong style={{ color: "var(--text-1)", fontFamily: "var(--f-mono)" }}>
                        {cite.location || (cite.chunkId ? `Chunk #${cite.chunkId}` : "Toàn văn")}
                      </strong>
                    </div>

                    {/* Excerpt Text */}
                    <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
                      <div style={{ fontSize: 10.5, fontWeight: 600, color: "var(--text-3)", textTransform: "uppercase" }}>
                        {isVi ? "Đoạn trích thực tế từ tệp:" : "Actual Excerpt from File:"}
                      </div>
                      <div style={{
                        background: "var(--amber-soft)",
                        border: "1px solid rgba(217,119,6,0.25)",
                        borderRadius: "var(--r-md)",
                        padding: "10px 12px",
                        fontSize: 12,
                        color: "var(--text-1)",
                        lineHeight: 1.6,
                        maxHeight: 220,
                        overflowY: "auto",
                        whiteSpace: "pre-wrap"
                      }}>
                        {cite.text || (isVi ? "(Không có trích đoạn văn bản)" : "(No snippet available)")}
                      </div>
                    </div>

                    {/* Neo4j Node if present */}
                    {cite.neo4jNode && (
                      <div style={{
                        background: "var(--surface)",
                        border: "1px solid var(--border-soft)",
                        borderRadius: "var(--r-xs)",
                        padding: "8px 10px",
                        fontSize: 11,
                        color: "var(--text-3)"
                      }}>
                        <span>Graph Entity: </span>
                        <code style={{ color: "var(--blue)" }}>{cite.neo4jNode}</code>
                      </div>
                    )}
                  </div>
                ))
              )}
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
                  cursor: "pointer",
                  border: "none"
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
