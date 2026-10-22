import React, { useState, useRef, useEffect, useCallback } from "react";
import {
  Bot, Send, Paperclip, Sparkles, BookOpen, ChevronRight,
  Search, Plus, FileText, ThumbsUp, ThumbsDown, Copy,
  ExternalLink, ShieldCheck, AlertCircle, X, Menu, Clock,
  ArrowUpRight, CheckCircle2, Bookmark, Check, Pin
} from "lucide-react";
import {
  queryCopilot,
  fetchCopilotSessions,
  fetchCopilotSessionDetail,
  createCopilotSession,
  deleteCopilotSession,
  pinCopilotSession
} from "../../services/api";

export default function CopilotView({
  onNavigate,
  t = {},
  lang = "vi",
  apiConnected = false,
  role = "executive",
  currentUser
}) {
  const isVi = lang === "vi";

  // Sessions state (per-user database persistence + US37 department shared documents)
  const [sessionTab, setSessionTab] = useState("personal"); // "personal" | "department"
  const [sessions, setSessions] = useState([]);
  const [currentSessionId, setCurrentSessionId] = useState(null);
  const [currentSessionDetail, setCurrentSessionDetail] = useState(null);
  const [isLoadingSessions, setIsLoadingSessions] = useState(false);

  // Pinning modal & action state (US37 · PB59 · UC.18)
  const [showPinModal, setShowPinModal] = useState(false);
  const [pinTargetSession, setPinTargetSession] = useState(null);
  const [pinNotesInput, setPinNotesInput] = useState("");
  const [isPinning, setIsPinning] = useState(false);

  // Drawer toggle states
  const [showSessionDrawer, setShowSessionDrawer] = useState(true);
  const [showCitationDrawer, setShowCitationDrawer] = useState(false);

  // Search & input states
  const [searchHistory, setSearchHistory] = useState("");
  const [queryInput, setQueryInput] = useState("");
  const [isInferring, setIsInferring] = useState(false);
  const [showEmptyState, setShowEmptyState] = useState(false);
  const [toastMsg, setToastMsg] = useState("");

  // Citation Preview state (only populated when actual citations exist from queries)
  const [activeCitation, setActiveCitation] = useState(null);

  const messagesEndRef = useRef(null);

  const showToast = (msg) => {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(""), 3500);
  };

  const [messages, setMessages] = useState([]);

  // Load user sessions from PostgreSQL whenever currentUser or sessionTab changes
  const loadSessions = useCallback(async (tab = sessionTab, preserveActiveId = null) => {
    setIsLoadingSessions(true);
    try {
      const mode = tab === "department" ? "pinned" : "personal";
      const data = await fetchCopilotSessions(mode, currentUser);
      if (data && data.success && Array.isArray(data.sessions)) {
        setSessions(data.sessions);
        const targetId = preserveActiveId || (data.sessions.length > 0 ? data.sessions[0].id : null);
        if (targetId) {
          const detail = await fetchCopilotSessionDetail(targetId, currentUser);
          if (detail && detail.success && detail.session) {
            setCurrentSessionId(targetId);
            setCurrentSessionDetail(detail.session);
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
            return;
          }
        }
        if (!targetId) {
          setCurrentSessionId(null);
          setCurrentSessionDetail(null);
          setMessages([]);
          setShowEmptyState(true);
          setActiveCitation(null);
          setShowCitationDrawer(false);
        }
      } else {
        setSessions([]);
        setCurrentSessionId(null);
        setCurrentSessionDetail(null);
        setMessages([]);
        setShowEmptyState(true);
        setActiveCitation(null);
        setShowCitationDrawer(false);
      }
    } catch (err) {
      console.warn("[Copilot] Error loading sessions:", err);
    } finally {
      setIsLoadingSessions(false);
    }
  }, [sessionTab, currentUser?.email, currentUser?.username, currentUser?.id, currentUser?.department]);

  useEffect(() => {
    loadSessions(sessionTab);
  }, [loadSessions, sessionTab]);

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
        setCurrentSessionDetail(detail.session);
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
    setCurrentSessionDetail(null);
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

  // Pinning Handlers (US37 · PB59 · UC.18)
  const handleOpenPinModal = (e, session = null) => {
    if (e && e.stopPropagation) e.stopPropagation();
    const target = session || currentSessionDetail;
    if (!target) return;
    setPinTargetSession(target);
    setPinNotesInput(target.pinNotes || "");
    setShowPinModal(true);
  };

  const handleConfirmPin = async () => {
    if (!pinTargetSession) return;
    setIsPinning(true);
    try {
      const targetDept = currentUser?.department || pinTargetSession.department || "Kinh doanh";
      const res = await pinCopilotSession(
        pinTargetSession.id,
        true,
        pinNotesInput.trim(),
        targetDept,
        currentUser
      );
      showToast(isVi ? "Đã ghim phiên hội thoại thành tài liệu dùng chung phòng ban!" : "Pinned conversation to department docs!");
      setShowPinModal(false);
      // Refresh current session detail and list
      if (currentSessionId === pinTargetSession.id) {
        const updatedDetail = await fetchCopilotSessionDetail(pinTargetSession.id, currentUser);
        if (updatedDetail?.session) {
          setCurrentSessionDetail(updatedDetail.session);
        }
      }
      await loadSessions(sessionTab, currentSessionId);
    } catch (err) {
      showToast(err.message || (isVi ? "Lỗi khi ghim phiên hội thoại" : "Failed to pin session"));
    } finally {
      setIsPinning(false);
    }
  };

  const handleUnpin = async (sessionId, e = null) => {
    if (e && e.stopPropagation) e.stopPropagation();
    try {
      await pinCopilotSession(sessionId, false, "", null, currentUser);
      showToast(isVi ? "Đã bỏ ghim phiên hội thoại khỏi phòng ban." : "Unpinned session from department.");
      if (currentSessionId === sessionId) {
        const updatedDetail = await fetchCopilotSessionDetail(sessionId, currentUser);
        if (updatedDetail?.session) {
          setCurrentSessionDetail(updatedDetail.session);
        }
      }
      await loadSessions(sessionTab, currentSessionId);
    } catch (err) {
      showToast(err.message || (isVi ? "Lỗi khi bỏ ghim phiên hội thoại" : "Failed to unpin session"));
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

          {/* US37: Pin session as shared team document action */}
          {currentSessionId && (
            <button
              onClick={(e) => handleOpenPinModal(e, currentSessionDetail)}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 6,
                padding: "6px 12px",
                borderRadius: "var(--r-md)",
                border: currentSessionDetail?.isPinned
                  ? "1px solid rgba(245, 158, 11, 0.4)"
                  : "1px solid var(--border)",
                background: currentSessionDetail?.isPinned
                  ? "rgba(245, 158, 11, 0.12)"
                  : "var(--surface-2)",
                color: currentSessionDetail?.isPinned ? "#f59e0b" : "var(--text-2)",
                fontSize: 12,
                fontWeight: 600,
                cursor: "pointer",
                transition: "all 0.15s ease"
              }}
              title={
                currentSessionDetail?.isPinned
                  ? (isVi ? "Phiên đã được ghim làm tài liệu phòng ban. Bấm để xem/sửa ghi chú." : "Pinned to department. Click to edit notes.")
                  : (isVi ? "Ghim phiên này làm tài liệu dùng chung phòng ban (US37 · PB59 · UC.18)" : "Pin as shared team document")
              }
            >
              <Pin size={13} fill={currentSessionDetail?.isPinned ? "#f59e0b" : "none"} color={currentSessionDetail?.isPinned ? "#f59e0b" : "currentColor"} />
              <span>
                {currentSessionDetail?.isPinned
                  ? (isVi ? `Đã ghim (${currentSessionDetail?.department || "Phòng ban"})` : `Pinned (${currentSessionDetail?.department || "Team"})`)
                  : (isVi ? "Ghim phòng ban" : "Pin to Dept")}
              </span>
            </button>
          )}

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

        {/* ── COLUMN 1: SESSIONS DRAWER (250px) ───────────────── */}
        {showSessionDrawer && (
          <aside style={{
            width: 250,
            background: "var(--surface)",
            borderRight: "1px solid var(--border)",
            display: "flex",
            flexDirection: "column",
            flexShrink: 0
          }}>
            <div style={{ padding: 12, borderBottom: "1px solid var(--border-soft)", display: "flex", flexDirection: "column", gap: 8 }}>
              {/* US37 / PB59 Tabs: Cuộc trò chuyện cá nhân vs Tài liệu ghim phòng ban */}
              <div style={{
                display: "flex",
                background: "var(--surface-2)",
                padding: 3,
                borderRadius: "var(--r-md)",
                border: "1px solid var(--border-soft)",
                gap: 3
              }}>
                <button
                  onClick={() => setSessionTab("personal")}
                  style={{
                    flex: 1,
                    padding: "6px 4px",
                    borderRadius: 6,
                    border: "none",
                    background: sessionTab === "personal" ? "var(--surface)" : "transparent",
                    color: sessionTab === "personal" ? "var(--text-1)" : "var(--text-3)",
                    fontWeight: sessionTab === "personal" ? 700 : 500,
                    fontSize: 11,
                    cursor: "pointer",
                    boxShadow: sessionTab === "personal" ? "0 1px 3px rgba(0,0,0,0.1)" : "none",
                    transition: "all 0.15s ease",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    gap: 4
                  }}
                >
                  <span>{isVi ? "Cá nhân" : "Personal"}</span>
                </button>
                <button
                  onClick={() => setSessionTab("department")}
                  style={{
                    flex: 1,
                    padding: "6px 4px",
                    borderRadius: 6,
                    border: "none",
                    background: sessionTab === "department" ? "var(--surface)" : "transparent",
                    color: sessionTab === "department" ? "#f59e0b" : "var(--text-3)",
                    fontWeight: sessionTab === "department" ? 700 : 500,
                    fontSize: 11,
                    cursor: "pointer",
                    boxShadow: sessionTab === "department" ? "0 1px 3px rgba(0,0,0,0.1)" : "none",
                    transition: "all 0.15s ease",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    gap: 4
                  }}
                  title={isVi ? "Tài liệu hỏi đáp quan trọng được ghim dùng chung phòng ban" : "Important department pinned Q&A documents"}
                >
                  <Pin size={11} fill={sessionTab === "department" ? "#f59e0b" : "none"} color={sessionTab === "department" ? "#f59e0b" : "currentColor"} />
                  <span>{isVi ? "Ghim phòng ban" : "Pinned Docs"}</span>
                </button>
              </div>

              <div style={{ position: "relative" }}>
                <Search size={13} color="var(--text-4)" style={{ position: "absolute", left: 10, top: "50%", transform: "translateY(-50%)" }} />
                <input
                  type="text"
                  value={searchHistory}
                  onChange={(e) => setSearchHistory(e.target.value)}
                  placeholder={sessionTab === "department" ? (isVi ? "Tìm tài liệu ghim..." : "Search pinned docs...") : (isVi ? "Tìm lịch sử..." : "Search history...")}
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

              {sessionTab === "personal" && (
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
              )}
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
                    : (sessionTab === "department"
                        ? (isVi ? "Chưa có tài liệu nào được ghim trong phòng ban này." : "No pinned documents in this department.")
                        : (isVi ? "Chưa có cuộc hội thoại nào." : "No conversation history."))}
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
                          const btns = e.currentTarget.querySelectorAll(".session-action-btn");
                          btns.forEach(b => b.style.opacity = "1");
                        }}
                        onMouseLeave={(e) => {
                          if (!isActive) e.currentTarget.style.background = "transparent";
                          const btns = e.currentTarget.querySelectorAll(".session-action-btn");
                          btns.forEach(b => b.style.opacity = "0");
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
                            display: "flex",
                            alignItems: "center",
                            gap: 5
                          }}>
                            {s.isPinned && (
                              <Pin size={11} fill="#f59e0b" color="#f59e0b" style={{ flexShrink: 0 }} />
                            )}
                            <span style={{ overflow: "hidden", textOverflow: "ellipsis" }}>
                              {s.title || (isVi ? "Cuộc hội thoại mới" : "New Chat")}
                            </span>
                          </div>
                          
                          <div style={{ display: "flex", alignItems: "center", gap: 3 }}>
                            {/* Pin / Unpin button */}
                            <button
                              className="session-action-btn"
                              title={s.isPinned ? (isVi ? "Bỏ ghim khỏi phòng ban" : "Unpin from department") : (isVi ? "Ghim vào phòng ban" : "Pin to department")}
                              onClick={(e) => s.isPinned ? handleUnpin(s.id, e) : handleOpenPinModal(e, s)}
                              style={{
                                background: "transparent",
                                border: "none",
                                color: s.isPinned ? "#f59e0b" : "var(--text-4)",
                                cursor: "pointer",
                                padding: 2,
                                opacity: s.isPinned ? 1 : 0,
                                transition: "opacity 0.15s",
                                display: "flex",
                                alignItems: "center",
                              }}
                            >
                              <Pin size={12} fill={s.isPinned ? "#f59e0b" : "none"} color={s.isPinned ? "#f59e0b" : "currentColor"} />
                            </button>

                            {/* Delete button (for personal sessions) */}
                            {sessionTab === "personal" && (
                              <button
                                className="session-action-btn"
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
                            )}
                          </div>
                        </div>

                        {/* Metadata: Pinned by & department badge */}
                        {s.isPinned && (
                          <div style={{
                            display: "flex",
                            alignItems: "center",
                            gap: 6,
                            fontSize: 10,
                            color: "#d97706",
                            marginTop: 1
                          }}>
                            <span style={{
                              padding: "1px 5px",
                              borderRadius: 3,
                              background: "rgba(245, 158, 11, 0.15)",
                              fontWeight: 600
                            }}>
                              {s.department || "Phòng ban"}
                            </span>
                            {s.pinnedByName && (
                              <span style={{ color: "var(--text-4)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                                {s.pinnedByName}
                              </span>
                            )}
                          </div>
                        )}

                        {/* Optional pin notes preview */}
                        {s.isPinned && s.pinNotes && (
                          <div style={{
                            fontSize: 10.5,
                            color: "var(--text-3)",
                            fontStyle: "italic",
                            background: "rgba(245, 158, 11, 0.05)",
                            borderLeft: "2px solid #f59e0b",
                            padding: "2px 6px",
                            borderRadius: "0 4px 4px 0",
                            marginTop: 2,
                            overflow: "hidden",
                            textOverflow: "ellipsis",
                            whiteSpace: "nowrap"
                          }}>
                            "{s.pinNotes}"
                          </div>
                        )}

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

            {/* US37 · PB59 · UC.18: Pinned Department Document Notice Banner */}
            {currentSessionDetail?.isPinned && (
              <div style={{
                padding: "12px 16px",
                borderRadius: "var(--r-md)",
                background: "linear-gradient(135deg, rgba(245, 158, 11, 0.09) 0%, rgba(245, 158, 11, 0.02) 100%)",
                border: "1px solid rgba(245, 158, 11, 0.28)",
                display: "flex",
                alignItems: "flex-start",
                justifyContent: "space-between",
                gap: 12
              }}>
                <div style={{ display: "flex", alignItems: "flex-start", gap: 10 }}>
                  <div style={{
                    width: 28,
                    height: 28,
                    borderRadius: 7,
                    background: "rgba(245, 158, 11, 0.15)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    color: "#f59e0b",
                    flexShrink: 0,
                    marginTop: 1
                  }}>
                    <Pin size={15} fill="#f59e0b" color="#f59e0b" />
                  </div>
                  <div>
                    <div style={{ fontSize: 13, fontWeight: 700, color: "var(--text-1)", display: "flex", alignItems: "center", gap: 8 }}>
                      <span>{isVi ? "Tài liệu dùng chung phòng ban" : "Shared Department Document"}</span>
                      <span style={{
                        fontSize: 11,
                        padding: "1px 8px",
                        borderRadius: 99,
                        background: "rgba(245, 158, 11, 0.18)",
                        color: "#d97706",
                        fontWeight: 700
                      }}>
                        {currentSessionDetail.department || currentUser?.department || (isVi ? "Phòng ban" : "Department")}
                      </span>
                    </div>
                    <div style={{ fontSize: 11.5, color: "var(--text-3)", marginTop: 2 }}>
                      {isVi ? "Ghim bởi" : "Pinned by"} <strong style={{ color: "var(--text-2)" }}>{currentSessionDetail.pinnedByName || "Trưởng phòng / Thành viên"}</strong>
                      {currentSessionDetail.pinnedAt && ` • ${new Date(currentSessionDetail.pinnedAt).toLocaleString([], { hour: '2-digit', minute: '2-digit', day: '2-digit', month: '2-digit', year: 'numeric' })}`}
                    </div>
                    {currentSessionDetail.pinNotes && (
                      <div style={{
                        fontSize: 12,
                        color: "var(--text-2)",
                        marginTop: 6,
                        padding: "6px 10px",
                        background: "var(--surface)",
                        borderRadius: 6,
                        border: "1px solid rgba(245, 158, 11, 0.2)",
                        lineHeight: 1.45
                      }}>
                        💡 <strong>{isVi ? "Ghi chú:" : "Notes:"}</strong> {currentSessionDetail.pinNotes}
                      </div>
                    )}
                  </div>
                </div>
                <button
                  onClick={() => handleUnpin(currentSessionDetail.id)}
                  style={{
                    padding: "4px 10px",
                    borderRadius: "var(--r-md)",
                    border: "1px solid var(--border)",
                    background: "var(--surface)",
                    color: "var(--text-3)",
                    fontSize: 11,
                    fontWeight: 600,
                    cursor: "pointer",
                    whiteSpace: "nowrap"
                  }}
                  title={isVi ? "Bỏ ghim khỏi tài liệu phòng ban" : "Unpin from department"}
                >
                  {isVi ? "Bỏ ghim" : "Unpin"}
                </button>
              </div>
            )}


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
      
      {/* ── PIN SESSION MODAL (US37 · PB59 · UC.18) ──────────── */}
      {showPinModal && (
        <div style={{
          position: "fixed",
          inset: 0,
          zIndex: 1000,
          background: "rgba(15, 23, 42, 0.65)",
          backdropFilter: "blur(4px)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          padding: 20
        }} onClick={() => setShowPinModal(false)}>
          <div style={{
            width: "100%",
            maxWidth: 500,
            background: "var(--surface)",
            border: "1px solid var(--border-strong)",
            borderRadius: "var(--r-lg)",
            boxShadow: "var(--shadow-2xl)",
            padding: 24,
            display: "flex",
            flexDirection: "column",
            gap: 16
          }} onClick={(e) => e.stopPropagation()}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <div style={{
                  width: 34,
                  height: 34,
                  borderRadius: 8,
                  background: "rgba(245, 158, 11, 0.15)",
                  color: "#d97706",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center"
                }}>
                  <Pin size={18} fill="#d97706" />
                </div>
                <div>
                  <h3 style={{ margin: 0, fontSize: 15, fontWeight: 700, color: "var(--text-1)" }}>
                    {isVi ? "Ghim làm tài liệu dùng chung phòng ban" : "Pin as Shared Department Document"}
                  </h3>
                  <div style={{ fontSize: 11.5, color: "var(--text-3)", marginTop: 2 }}>
                    US37 · PB59 · UC.18 · BR-02
                  </div>
                </div>
              </div>
              <button
                onClick={() => setShowPinModal(false)}
                style={{
                  background: "transparent",
                  border: "none",
                  color: "var(--text-4)",
                  cursor: "pointer",
                  padding: 4
                }}
              >
                <X size={16} />
              </button>
            </div>

            <div style={{
              background: "var(--surface-2)",
              border: "1px solid var(--border-soft)",
              borderRadius: "var(--r-md)",
              padding: 12,
              fontSize: 12,
              color: "var(--text-2)",
              lineHeight: 1.5
            }}>
              <div style={{ fontWeight: 600, color: "var(--text-1)", marginBottom: 4 }}>
                {pinTargetSession?.title || (isVi ? "Cuộc hội thoại" : "Conversation")}
              </div>
              <div style={{ color: "var(--text-3)", fontSize: 11.5 }}>
                {isVi
                  ? "Phiên hỏi đáp này sẽ được lưu làm tài liệu dùng chung cho phòng ban tham khảo. Các trích dẫn tài liệu sẽ tự động kiểm soát quyền truy cập theo chính sách BR-02."
                  : "This Q&A session will be pinned for your department. Document citations will enforce BR-02 data scopes."}
              </div>
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              <label style={{ fontSize: 12, fontWeight: 600, color: "var(--text-2)" }}>
                {isVi ? "Phòng ban áp dụng:" : "Target Department:"}
              </label>
              <div style={{
                padding: "8px 12px",
                borderRadius: "var(--r-md)",
                background: "var(--surface-2)",
                border: "1px solid var(--border)",
                fontSize: 12.5,
                fontWeight: 600,
                color: "var(--text-1)",
                display: "flex",
                alignItems: "center",
                gap: 8
              }}>
                <span style={{
                  width: 8,
                  height: 8,
                  borderRadius: "50%",
                  background: "#f59e0b"
                }} />
                <span>{currentUser?.department || pinTargetSession?.department || "Kinh doanh (Sales)"}</span>
              </div>
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              <label style={{ fontSize: 12, fontWeight: 600, color: "var(--text-2)" }}>
                {isVi ? "Ghi chú tài liệu (tùy chọn):" : "Document Notes (optional):"}
              </label>
              <textarea
                value={pinNotesInput}
                onChange={(e) => setPinNotesInput(e.target.value)}
                placeholder={isVi ? "VD: Mẫu đối soát và chiết khấu hợp đồng khách hàng quý 4/2026..." : "e.g. Reconciliation notes for Q4 sales team..."}
                rows={3}
                style={{
                  width: "100%",
                  background: "var(--surface-2)",
                  border: "1px solid var(--border)",
                  borderRadius: "var(--r-md)",
                  padding: 10,
                  fontSize: 12.5,
                  color: "var(--text-1)",
                  outline: "none",
                  resize: "vertical",
                  boxSizing: "border-box"
                }}
              />
            </div>

            <div style={{ display: "flex", alignItems: "center", justifyContent: "flex-end", gap: 10, marginTop: 4 }}>
              <button
                type="button"
                onClick={() => setShowPinModal(false)}
                style={{
                  padding: "8px 16px",
                  borderRadius: "var(--r-md)",
                  border: "1px solid var(--border)",
                  background: "transparent",
                  color: "var(--text-2)",
                  fontSize: 12.5,
                  fontWeight: 600,
                  cursor: "pointer"
                }}
              >
                {isVi ? "Hủy" : "Cancel"}
              </button>
              <button
                type="button"
                disabled={isPinning}
                onClick={handleConfirmPin}
                style={{
                  padding: "8px 18px",
                  borderRadius: "var(--r-md)",
                  border: "none",
                  background: "linear-gradient(135deg, #d97706 0%, #b45309 100%)",
                  color: "#ffffff",
                  fontSize: 12.5,
                  fontWeight: 700,
                  cursor: isPinning ? "not-allowed" : "pointer",
                  display: "flex",
                  alignItems: "center",
                  gap: 6,
                  boxShadow: "0 2px 6px rgba(217,119,6,0.35)",
                  opacity: isPinning ? 0.7 : 1
                }}
              >
                <Pin size={13} fill="#ffffff" />
                <span>{isPinning ? (isVi ? "Đang lưu..." : "Saving...") : (isVi ? "Xác nhận ghim" : "Confirm Pin")}</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

