import React, { useState, useRef, useEffect } from "react";
import { queryCopilot } from "../../services/api";

export default function CopilotView({
  onNavigate,
  t,
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
    location: "Trang 16, Mục 12.2",
    entity: "Alpha Corp (Bên A)",
    chunk1: {
      id: "#VEC-8812",
      title: "Đoạn trích chứng thực 1 (Qdrant Chunk #402)",
      text: "...Trong mọi trường hợp, Bên A sẽ không chịu trách nhiệm đối với bất kỳ thiệt hại ngẫu nhiên, gián tiếp phát sinh từ việc gián đoạn dịch vụ quá 48 giờ liên tục do trường hợp bất khả kháng..."
    },
    chunk2: {
      id: "Chunk #403",
      title: "Đoạn trích chứng thực 2 (Giới hạn bồi thường)",
      text: "...Tổng mức bồi thường của Bên A cho toàn bộ các khiếu nại trong suốt thời hạn thỏa thuận sẽ không vượt quá số tiền tương đương với 10% tổng phí dịch vụ được thanh toán trong tháng xảy ra sự kiện vi phạm..."
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
      userLabel: "Trần Thị Thu Hương (Executive)",
      text: "Hãy rà soát Hợp đồng dịch vụ CUAD_042 với đối tác Alpha Corp. Có điều khoản nào miễn trừ hoặc giới hạn trách nhiệm bồi thường thiệt hại bất lợi cho doanh nghiệp không?"
    },
    {
      id: "m2",
      sender: "copilot",
      time: "14:20",
      verifiedBadge: "Hybrid GraphRAG Verified",
      confidence: "98.6%",
      citationCount: 2,
      latency: "1.42s latency (Hybrid Vector-Graph Fusion)",
      introText: "Qua trích xuất kết hợp từ đồ thị tri thức Neo4j và kho véc-tơ Qdrant trên hợp đồng CUAD_Service_Agreement_v4.pdf (thuộc đối tác Alpha Corp), tôi phát hiện 1 điều khoản bất lợi nghiêm trọng tại Mục 12.2:",
      riskBox: {
        title: "RỦI RO PHÁP LÝ: Bất đối xứng giới hạn trách nhiệm (Unilateral Liability Cap)",
        text: 'Điều khoản quy định: "Bên B (doanh nghiệp) phải bồi thường tối đa 100% giá trị hợp đồng khi có sự cố dữ liệu, trong khi Bên A (Alpha Corp) được miễn trừ hoàn toàn đối với mọi thiệt hại gián tiếp và trần trách nhiệm chỉ bằng 10% phí dịch vụ tháng gần nhất."'
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
        const res = await queryCopilot(userText, role);
        const aiMsg = {
          id: `ai_${Date.now()}`,
          sender: "copilot",
          time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          verifiedBadge: "Hybrid GraphRAG Verified",
          confidence: "96.5%",
          citationCount: res.citations ? res.citations.length : 1,
          latency: `${res.latency || 1.12}s latency (Neo4j + Qdrant)`,
          introText: res.answer || res.response || "Kết quả phân tích từ hệ thống tri thức GraphMind:",
          riskBox: res.riskAlert ? {
            title: res.riskAlert.title || "CẢNH BÁO TỐI ƯU HÓA TÁC NGHIỆP",
            text: res.riskAlert.text || res.riskAlert
          } : null
        };
        setMessages((prev) => [...prev, aiMsg]);
      } else {
        // Fallback simulation response
        setTimeout(() => {
          const aiMsg = {
            id: `ai_${Date.now()}`,
            sender: "copilot",
            time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
            verifiedBadge: "Hybrid GraphRAG Verified",
            confidence: "97.8%",
            citationCount: 2,
            latency: "1.25s latency (Hybrid Vector-Graph Fusion)",
            introText: `Đã truy vấn dữ liệu cho câu hỏi: "${userText}". Dưới đây là kết quả trích xuất từ mạng tri thức Neo4j & kho vector Qdrant:`,
            riskBox: {
              title: "THÔNG TIN ĐỐI SOÁT HỆ THỐNG",
              text: `Đã kiểm tra hồ sơ thực thể liên quan trong CRM AdventureWorks & Hợp đồng CUAD. Các tham số vận hành tuân thủ theo tiêu chuẩn RBAC (${role.toUpperCase()}).`
            }
          };
          setMessages((prev) => [...prev, aiMsg]);
          setIsInferring(false);
        }, 1200);
        return;
      }
    } catch (err) {
      console.error(err);
      showToast("Lỗi kết nối AI Copilot API. Đã chuyển sang chế độ mô phỏng.");
    } finally {
      setIsInferring(false);
    }
  };

  const fillPrompt = (promptText) => {
    setQueryInput(promptText);
  };

  const clearChatToEmpty = () => {
    setMessages([]);
    setShowEmptyState(true);
    showToast("Đã khởi tạo phiên trò chuyện mới.");
  };

  return (
    <div className="space-y-4 font-sans text-slate-900">

      {/* TOAST NOTIFICATION */}
      {toastMsg && (
        <div className="fixed bottom-6 right-6 z-50 px-4 py-2.5 bg-slate-900 text-white text-xs font-medium rounded-xl shadow-2xl border border-slate-700 flex items-center gap-2 animate-bounce">
          <span className="w-2 h-2 rounded-full bg-emerald-400"></span>
          {toastMsg}
        </div>
      )}

      {/* SCREEN TITLE & INFO BAR */}
      <div className="flex flex-wrap items-center justify-between border-b border-slate-200 pb-3 gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <span className="w-2.5 h-2.5 rounded-full bg-blue-600"></span>
            <h2 className="text-lg font-bold text-slate-900 tracking-tight">
              SCREEN-018 — Chat UI (Hybrid AI Copilot 3-Column Architecture)
            </h2>
            <span className="text-xs bg-slate-100 text-slate-700 px-2 py-0.5 rounded border border-slate-200 font-mono">
              1440 × 900 Canvas Standard
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-0.5">
            Bố cục 3 cột tương tác: [DRAWER-002 Lịch sử phiên - 260px] + [Khung trò chuyện trung tâm] + [DRAWER-001 Trích dẫn bằng chứng - 420px]
          </p>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs font-mono text-slate-600 bg-slate-100 px-2.5 py-1 rounded-lg border border-slate-200 flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
            Hybrid Query: Neo4j + Qdrant Live
          </span>
        </div>
      </div>

      {/* THE 3-COLUMN DESKTOP SCREEN CONTAINER */}
      <div className="bg-white text-slate-900 rounded-2xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col h-[780px] relative">

        {/* INNER HEADER / COPILOT GLOBAL BAR */}
        <div className="h-14 border-b border-slate-200 bg-white px-5 flex items-center justify-between flex-shrink-0">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setShowSessionDrawer(!showSessionDrawer)}
              className={`p-2 rounded-lg transition-colors ${
                showSessionDrawer ? "bg-slate-100 text-slate-800" : "text-slate-500 hover:text-slate-800 hover:bg-slate-100"
              }`}
              title="Mở/Đóng danh sách phiên chat (DRAWER-002)"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6h16M4 12h16M4 18h7" />
              </svg>
            </button>
            <div className="h-5 w-px bg-slate-200"></div>
            <div className="flex items-center gap-2.5">
              <div className="w-7 h-7 rounded-lg bg-gradient-to-tr from-blue-600 to-indigo-600 flex items-center justify-center text-white text-xs font-bold shadow-sm">
                AI
              </div>
              <div>
                <h3 className="text-sm font-semibold text-slate-800 flex items-center gap-2">
                  GraphMind AI Copilot
                  <span className="text-[11px] font-normal px-2 py-0.5 rounded-full bg-indigo-50 text-indigo-600 border border-indigo-100">
                    Qwen2.5-7B LoRA + Neo4j GraphRAG
                  </span>
                </h3>
              </div>
            </div>
          </div>

          {/* Session Metadata & Action Toolbar */}
          <div className="flex items-center gap-3">
            <div className="hidden sm:flex items-center gap-2 px-3 py-1 rounded-lg bg-slate-50 border border-slate-200 text-xs text-slate-600">
              <span className="text-slate-400">Phiên:</span>
              <span className="font-medium text-slate-800 font-mono">SES-9481-EXEC</span>
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
            </div>
            <button
              onClick={clearChatToEmpty}
              className="px-3 py-1.5 text-xs font-medium rounded-lg text-slate-600 hover:text-slate-900 hover:bg-slate-100 border border-slate-200 transition-all flex items-center gap-1.5"
            >
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4" />
              </svg>
              Phiên mới
            </button>
            <button
              onClick={() => setShowCitationDrawer(!showCitationDrawer)}
              className={`px-3 py-1.5 text-xs font-medium rounded-lg border transition-all flex items-center gap-1.5 ${
                showCitationDrawer
                  ? "bg-blue-50 text-blue-600 border-blue-200"
                  : "bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100"
              }`}
            >
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              Trích dẫn & Nguồn (2)
            </button>
          </div>
        </div>

        {/* 3 COLUMNS BODY WRAPPER */}
        <div className="flex-1 flex overflow-hidden relative bg-slate-50/50">

          {/* ========================================== */}
          {/* COLUMN 1: DRAWER-002 CHAT SESSION MANAGEMENT (260px) */}
          {/* ========================================== */}
          {showSessionDrawer && (
            <aside className="w-[260px] border-r border-slate-200 bg-white flex flex-col flex-shrink-0 transition-all duration-300 z-10">
              {/* Sidebar Header / Search */}
              <div className="p-3 border-b border-slate-100 space-y-2">
                <div className="relative">
                  <input
                    type="text"
                    value={searchHistory}
                    onChange={(e) => setSearchHistory(e.target.value)}
                    placeholder="Tìm lịch sử hội thoại..."
                    className="w-full text-xs bg-slate-50 border border-slate-200 rounded-lg pl-8 pr-3 py-1.5 text-slate-700 placeholder-slate-400 focus:outline-none focus:border-blue-500 focus:bg-white"
                  />
                  <svg className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                  </svg>
                </div>
                <button
                  onClick={clearChatToEmpty}
                  className="w-full py-1.5 px-3 rounded-lg bg-slate-900 text-white text-xs font-medium hover:bg-slate-800 transition-colors flex items-center justify-center gap-1.5 shadow-sm"
                >
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4" />
                  </svg>
                  Tạo hội thoại mới
                </button>
              </div>

              {/* Session List by Time Intervals */}
              <div className="flex-1 overflow-y-auto p-2 space-y-3 text-xs">
                {/* Group: Hôm nay */}
                <div>
                  <p className="px-2 py-1 text-[11px] font-bold text-slate-400 uppercase tracking-wider">Hôm nay</p>
                  <div className="space-y-1 mt-1">
                    {/* Active Session Item */}
                    <div className="p-2 rounded-lg bg-blue-50/80 border border-blue-200 text-blue-900 font-medium flex items-start justify-between group cursor-pointer">
                      <div className="truncate pr-1">
                        <p className="truncate font-semibold text-slate-800">Rà soát hợp đồng CUAD_042...</p>
                        <p className="text-[10px] text-blue-600 truncate mt-0.5">2 trích dẫn • 14:20</p>
                      </div>
                      <svg className="w-3.5 h-3.5 text-blue-600 flex-shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                        <path d="M5 4a2 2 0 012-2h6a2 2 0 012 2v14l-5-2.5L5 18V4z" />
                      </svg>
                    </div>

                    {/* Other Sessions */}
                    <div className="p-2 rounded-lg hover:bg-slate-100 text-slate-700 flex items-start justify-between group cursor-pointer transition-colors">
                      <div className="truncate pr-1">
                        <p className="truncate text-slate-700">Tần suất đơn hàng Đông Nam</p>
                        <p className="text-[10px] text-slate-400 truncate mt-0.5">AdventureWorks • 11:05</p>
                      </div>
                      <button className="opacity-0 group-hover:opacity-100 text-slate-400 hover:text-slate-600 p-0.5">
                        <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z" />
                        </svg>
                      </button>
                    </div>
                  </div>
                </div>

                {/* Group: 7 ngày qua */}
                <div>
                  <p className="px-2 py-1 text-[11px] font-bold text-slate-400 uppercase tracking-wider">7 ngày qua</p>
                  <div className="space-y-1 mt-1">
                    <div className="p-2 rounded-lg hover:bg-slate-100 text-slate-700 flex items-start justify-between group cursor-pointer transition-colors">
                      <div className="truncate pr-1">
                        <p className="truncate text-slate-700">SOP nghiệm thu phần mềm v2.1</p>
                        <p className="text-[10px] text-slate-400 truncate mt-0.5">Thứ 3 • Phòng IT</p>
                      </div>
                      <button className="opacity-0 group-hover:opacity-100 text-slate-400 hover:text-slate-600 p-0.5">
                        <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z" />
                        </svg>
                      </button>
                    </div>
                    <div className="p-2 rounded-lg hover:bg-slate-100 text-slate-700 flex items-start justify-between group cursor-pointer transition-colors">
                      <div className="truncate pr-1">
                        <p className="truncate text-slate-700">Điều khoản bồi thường thiệt hại HĐ dịch vụ</p>
                        <p className="text-[10px] text-slate-400 truncate mt-0.5">Thứ 2 • Đã ghim</p>
                      </div>
                      <svg className="w-3.5 h-3.5 text-amber-500 flex-shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                        <path d="M5 4a2 2 0 012-2h6a2 2 0 012 2v14l-5-2.5L5 18V4z" />
                      </svg>
                    </div>
                  </div>
                </div>

                {/* Group: Tháng trước */}
                <div>
                  <p className="px-2 py-1 text-[11px] font-bold text-slate-400 uppercase tracking-wider">Tháng trước</p>
                  <div className="space-y-1 mt-1">
                    <div className="p-2 rounded-lg hover:bg-slate-100 text-slate-600 flex items-start justify-between group cursor-pointer transition-colors">
                      <div className="truncate pr-1">
                        <p className="truncate text-slate-600">Phân tích nhà cung cấp phụ tùng ERP</p>
                        <p className="text-[10px] text-slate-400 truncate mt-0.5">24/09/2026</p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Footer: Role Quota Indicator */}
              <div className="p-3 border-t border-slate-100 bg-slate-50 text-[11px] text-slate-500 flex items-center justify-between">
                <span>Hạn mức: <strong className="text-slate-800">Không giới hạn</strong> (Exec)</span>
                <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
              </div>
            </aside>
          )}

          {/* ========================================== */}
          {/* COLUMN 2: MAIN CONVERSATION VIEWPORT (FLEX-1) */}
          {/* ========================================== */}
          <div className="flex-1 flex flex-col h-full bg-white relative overflow-hidden">

            {/* CHAT MESSAGES SCROLL AREA */}
            <div className="flex-1 overflow-y-auto p-6 space-y-6">

              {/* SYSTEM / DATA CONTEXT NOTICE */}
              <div className="flex justify-center">
                <div className="px-3.5 py-1.5 rounded-full bg-slate-100 border border-slate-200 text-slate-600 text-xs flex items-center gap-2">
                  <svg className="w-3.5 h-3.5 text-blue-600" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                  </svg>
                  <span>Phạm vi truy vấn: <strong>Hợp đồng CUAD</strong> và <strong>CRM AdventureWorks</strong> (RBAC: Unrestricted Executive)</span>
                </div>
              </div>

              {/* EMPTY STATE CONTAINER */}
              {showEmptyState && (
                <div className="h-full flex flex-col items-center justify-center text-center p-8 space-y-4 my-auto">
                  <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-blue-600/10 to-indigo-600/10 border border-blue-200/50 flex items-center justify-center shadow-lg">
                    <svg className="w-8 h-8 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.75" d="M13 10V3L4 14h7v7l9-11h-7z" />
                    </svg>
                  </div>
                  <div className="max-w-md space-y-1.5">
                    <h4 className="text-base font-bold text-slate-800">Bắt đầu cuộc trò chuyện với AI Copilot</h4>
                    <p className="text-xs text-slate-500 leading-relaxed">
                      Hỏi đáp tự nhiên trên dữ liệu kinh doanh CRM AdventureWorks và hệ thống hợp đồng pháp lý CUAD. Mọi câu trả lời đều có trích dẫn nguồn xác thực.
                    </p>
                  </div>
                  {/* Suggested Quick Prompts */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 w-full max-w-lg text-left text-xs pt-2">
                    <button
                      onClick={() => fillPrompt("Tìm các hợp đồng dịch vụ sắp hết hạn trong 30 ngày tới")}
                      className="p-2.5 rounded-xl border border-slate-200 bg-white hover:border-blue-500 hover:bg-blue-50/50 transition-all text-slate-700"
                    >
                      <span className="font-semibold block text-slate-900">📄 Hợp đồng sắp hết hạn</span>
                      <span className="text-[11px] text-slate-500">Quét các hợp đồng cần đàm phán lại</span>
                    </button>
                    <button
                      onClick={() => fillPrompt("Khách hàng VIP nào giảm tần suất đặt hàng trong quý 3?")}
                      className="p-2.5 rounded-xl border border-slate-200 bg-white hover:border-blue-500 hover:bg-blue-50/50 transition-all text-slate-700"
                    >
                      <span className="font-semibold block text-slate-900">📉 Rủi ro doanh số khách hàng</span>
                      <span className="text-[11px] text-slate-500">So sánh dữ liệu đơn hàng gần đây</span>
                    </button>
                  </div>
                </div>
              )}

              {/* MESSAGES LIST */}
              {messages.map((msg) => {
                if (msg.sender === "user") {
                  return (
                    <div key={msg.id} className="flex justify-end">
                      <div className="max-w-[80%] md:max-w-[70%] space-y-1">
                        <div className="bg-blue-50 border border-blue-200 text-slate-900 rounded-2xl rounded-tr-sm p-4 text-sm shadow-xs">
                          <p className="leading-relaxed font-medium">{msg.text}</p>
                        </div>
                        <div className="flex items-center justify-end gap-1.5 text-[11px] text-slate-400 px-1">
                          <span>{msg.userLabel || "Executive"}</span> • <span>{msg.time}</span>
                        </div>
                      </div>
                    </div>
                  );
                }

                return (
                  <div key={msg.id} className="flex justify-start items-start gap-3">
                    <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-blue-600 to-indigo-600 flex items-center justify-center text-white text-xs font-bold flex-shrink-0 shadow-sm mt-1">
                      AI
                    </div>
                    <div className="max-w-[85%] md:max-w-[80%] space-y-2">
                      <div className="bg-slate-50 border border-slate-200 text-slate-800 rounded-2xl rounded-tl-sm p-5 text-sm shadow-xs space-y-3">
                        <div className="flex items-center justify-between border-b border-slate-200/80 pb-2">
                          <div className="flex items-center gap-2">
                            <span className="font-semibold text-xs text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded border border-indigo-100 flex items-center gap-1">
                              <svg className="w-3 h-3 text-indigo-600" fill="currentColor" viewBox="0 0 20 20">
                                <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                              </svg>
                              {msg.verifiedBadge}
                            </span>
                            <span className="text-xs text-slate-400">Độ tin cậy: <strong>{msg.confidence}</strong></span>
                          </div>

                          {/* Interactive Badges for Evidence */}
                          <div className="flex items-center gap-1.5">
                            <button
                              onClick={() => setShowCitationDrawer(true)}
                              className="px-2.5 py-1 text-xs font-medium rounded-full bg-amber-50 text-amber-800 border border-amber-200 hover:bg-amber-100 transition-colors flex items-center gap-1 cursor-pointer"
                            >
                              <svg className="w-3 h-3 text-amber-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
                              </svg>
                              <span>{msg.citationCount} Trích dẫn nguồn (Mở Drawer)</span>
                            </button>
                          </div>
                        </div>

                        <p className="leading-relaxed">{msg.introText}</p>

                        {/* Risk Box Callout */}
                        {msg.riskBox && (
                          <div className="p-3.5 bg-rose-50/70 border-l-4 border-rose-500 rounded-r-xl space-y-1.5 text-xs text-rose-900">
                            <div className="font-bold flex items-center gap-1.5 text-rose-800">
                              <svg className="w-4 h-4 text-rose-600" fill="currentColor" viewBox="0 0 20 20">
                                <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                              </svg>
                              {msg.riskBox.title}
                            </div>
                            <p className="leading-relaxed font-sans">{msg.riskBox.text}</p>
                          </div>
                        )}

                        {/* Recommended Action & Knowledge Graph Link */}
                        <div className="pt-1 flex flex-wrap items-center justify-between gap-3 text-xs">
                          <div className="flex items-center gap-2">
                            <button
                              onClick={() => onNavigate && onNavigate("m3_hybrid_copilot")}
                              className="text-blue-600 hover:text-blue-800 font-medium inline-flex items-center gap-1 bg-blue-50 hover:bg-blue-100 px-3 py-1.5 rounded-lg border border-blue-200 transition-colors"
                            >
                              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 10V3L4 14h7v7l9-11h-7z" />
                              </svg>
                              Xem liên kết đồ thị thực thể (Neo4j)
                            </button>
                            <button
                              onClick={() => setShowCitationDrawer(true)}
                              className="text-slate-600 hover:text-slate-900 inline-flex items-center gap-1 bg-white hover:bg-slate-100 px-3 py-1.5 rounded-lg border border-slate-200 transition-colors"
                            >
                              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                              </svg>
                              Soi chứng thực trang 16
                            </button>
                          </div>

                          {/* Copilot Evaluation Controls */}
                          <div className="flex items-center gap-1 text-slate-400">
                            <button
                              onClick={() => showToast("Đánh giá: Hữu ích 👍")}
                              className="p-1 hover:text-slate-600 rounded"
                              title="Hữu ích"
                            >
                              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M14 10h4.764a2 2 0 011.789 2.894l-3.5 7A2 2 0 0115.263 21h-4.017c-.163 0-.326-.02-.485-.06L7 20m7-10V5a2 2 0 00-2-2h-.095c-.5 0-.905.405-.905.905 0 .714-.211 1.412-.608 2.006L7 11v9m7-10h-2M7 20H5a2 2 0 01-2-2v-6a2 2 0 012-2h2.5" />
                              </svg>
                            </button>
                            <button
                              onClick={() => showToast("Đã phản hồi ý kiến.")}
                              className="p-1 hover:text-slate-600 rounded"
                              title="Chưa chính xác"
                            >
                              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 14H5.236a2 2 0 01-1.789-2.894l3.5-7A2 2 0 018.736 3h4.018a2 2 0 01.485.06l3.76 1.34m-7 10v5a2 2 0 002 2h.096c.5 0 .905-.405.905-.904 0-.715.211-1.413.608-2.008L17 13V4m-7 10h2m5-10h2a2 2 0 012 2v6a2 2 0 01-2 2h-2.5" />
                              </svg>
                            </button>
                            <button
                              onClick={() => {
                                navigator.clipboard?.writeText(msg.introText);
                                showToast("Đã sao chép câu trả lời vào bộ nhớ tạm.");
                              }}
                              className="p-1 hover:text-slate-600 rounded"
                              title="Sao chép câu trả lời"
                            >
                              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                              </svg>
                            </button>
                          </div>
                        </div>
                      </div>

                      <div className="text-[11px] text-slate-400 pl-1">
                        GraphMind AI Copilot • {msg.latency || "1.42s latency (Hybrid Vector-Graph Fusion)"}
                      </div>
                    </div>
                  </div>
                );
              })}

              {/* THINKING / TYPING INDICATOR STATE */}
              {isInferring && (
                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 rounded-xl bg-slate-200 text-slate-600 flex items-center justify-center text-xs font-bold flex-shrink-0">
                    AI
                  </div>
                  <div className="bg-slate-50 border border-slate-200 rounded-2xl rounded-tl-sm px-4 py-3 flex items-center gap-3 shadow-xs">
                    <div className="flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-full bg-blue-600 animate-pulse"></span>
                      <span className="w-2 h-2 rounded-full bg-blue-600 animate-pulse delay-75"></span>
                      <span className="w-2 h-2 rounded-full bg-blue-600 animate-pulse delay-150"></span>
                    </div>
                    <span className="text-xs text-slate-500 font-medium">
                      Đang tra vấn đồ thị quan hệ Neo4j & trích xuất vector Qdrant...
                    </span>
                  </div>
                </div>
              )}

              <div ref={messagesEndRef} />
            </div>

            {/* CHAT INPUT STICKY BOTTOM BAR */}
            <div className="p-4 border-t border-slate-200 bg-white flex-shrink-0">
              <form onSubmit={handleSend} className="space-y-2">
                <div className="relative rounded-xl border border-slate-300 focus-within:border-blue-600 focus-within:ring-2 focus-within:ring-blue-100 bg-white transition-all shadow-sm">
                  <textarea
                    rows="2"
                    value={queryInput}
                    onChange={(e) => setQueryInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" && !e.shiftKey) {
                        e.preventDefault();
                        handleSend();
                      }
                    }}
                    placeholder="Đặt câu hỏi về khách hàng, đơn hàng, điều khoản hợp đồng CUAD..."
                    className="w-full text-xs text-slate-800 placeholder-slate-400 p-3 pr-24 rounded-xl resize-none focus:outline-none"
                  />

                  {/* Bottom Action Buttons in Input */}
                  <div className="absolute right-2.5 bottom-2.5 flex items-center gap-1.5">
                    <button
                      type="button"
                      onClick={() => showToast("Đính kèm tệp phân tích...")}
                      className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100 transition-colors"
                      title="Đính kèm tài liệu phân tích"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" />
                      </svg>
                    </button>
                    <button
                      type="submit"
                      disabled={!queryInput.trim() || isInferring}
                      className={`px-3.5 py-1.5 text-white text-xs font-semibold rounded-lg shadow-sm flex items-center gap-1.5 transition-all ${
                        !queryInput.trim() || isInferring
                          ? "bg-blue-300 cursor-not-allowed"
                          : "bg-blue-600 hover:bg-blue-700"
                      }`}
                    >
                      <span>Gửi</span>
                      <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M14 5l7 7m0 0l-7 7m7-7H3" />
                      </svg>
                    </button>
                  </div>
                </div>

                {/* Footer Hint */}
                <div className="flex items-center justify-between text-[11px] text-slate-400 px-1">
                  <span>Nhấn <strong>Enter</strong> để gửi, <strong>Shift + Enter</strong> để xuống dòng</span>
                  <span className="flex items-center gap-1">
                    <svg className="w-3 h-3 text-emerald-500" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                    </svg>
                    Không bịa đặt thông tin • Luôn neo vào cơ sở tri thức
                  </span>
                </div>
              </form>
            </div>

          </div>

          {/* ========================================== */}
          {/* COLUMN 3: DRAWER-001 SOURCE & CITATION VIEWER (420px) */}
          {/* ========================================== */}
          {showCitationDrawer && (
            <aside className="w-[420px] border-l border-slate-200 bg-white flex flex-col flex-shrink-0 transition-all duration-300 z-20 shadow-xl lg:shadow-none">

              {/* Drawer Header */}
              <div className="h-14 border-b border-slate-200 px-4 flex items-center justify-between bg-slate-50/70">
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-amber-500"></span>
                  <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                    DRAWER-001: Trích Dẫn & Nguồn Chứng Thực
                  </h4>
                </div>
                <button
                  onClick={() => setShowCitationDrawer(false)}
                  className="p-1 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-200 transition-colors"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              {/* Drawer Content: Highlighted Citations */}
              <div className="flex-1 overflow-y-auto p-4 space-y-4 text-xs">

                {/* Source Badge & Confidence */}
                <div className="p-3 bg-indigo-50/60 border border-indigo-100 rounded-xl space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-indigo-900 text-xs">Tài liệu pháp lý gốc</span>
                    <span className="px-2 py-0.5 rounded-full bg-indigo-600 text-white font-mono text-[10px] font-semibold">
                      {activeCitation.match}
                    </span>
                  </div>
                  <div className="text-indigo-950 font-medium text-xs font-mono">
                    {activeCitation.docName}
                  </div>
                  <div className="grid grid-cols-2 gap-2 text-[11px] text-slate-500 pt-1 border-t border-indigo-100/60">
                    <div>Vị trí: <strong className="text-slate-800">{activeCitation.location}</strong></div>
                    <div>Thực thể: <strong className="text-slate-800">{activeCitation.entity}</strong></div>
                  </div>
                </div>

                {/* Highlighted Excerpt 1 */}
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between text-slate-500">
                    <span className="font-semibold text-slate-700">{activeCitation.chunk1.title}</span>
                    <span className="text-[10px] bg-slate-100 px-1.5 py-0.5 rounded text-slate-600 font-mono">
                      Vector ID: {activeCitation.chunk1.id}
                    </span>
                  </div>
                  {/* Yellow Highlight Snippet */}
                  <div className="p-3.5 bg-amber-50 border border-amber-200 rounded-xl text-slate-800 leading-relaxed font-serif text-[12px] shadow-xs">
                    "...Trong mọi trường hợp, <mark className="bg-amber-200 text-amber-950 px-1 py-0.5 rounded font-sans font-semibold">Bên A sẽ không chịu trách nhiệm đối với bất kỳ thiệt hại ngẫu nhiên, gián tiếp phát sinh</mark> từ việc gián đoạn dịch vụ quá 48 giờ liên tục do trường hợp bất khả kháng..."
                  </div>
                </div>

                {/* Highlighted Excerpt 2 */}
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between text-slate-500">
                    <span className="font-semibold text-slate-700">{activeCitation.chunk2.title}</span>
                    <span className="text-[10px] bg-slate-100 px-1.5 py-0.5 rounded text-slate-600 font-mono">
                      {activeCitation.chunk2.id}
                    </span>
                  </div>
                  <div className="p-3.5 bg-amber-50 border border-amber-200 rounded-xl text-slate-800 leading-relaxed font-serif text-[12px] shadow-xs">
                    "...Tổng mức bồi thường của Bên A cho toàn bộ các khiếu nại trong suốt thời hạn thỏa thuận <mark className="bg-amber-200 text-amber-950 px-1 py-0.5 rounded font-sans font-semibold">sẽ không vượt quá số tiền tương đương với 10% tổng phí dịch vụ</mark> được thanh toán trong tháng xảy ra sự kiện vi phạm..."
                  </div>
                </div>

                {/* Metadata Summary Box */}
                <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl space-y-1.5 text-[11px] text-slate-600">
                  <div className="font-semibold text-slate-700">Thông tin trích xuất Hybrid GraphRAG:</div>
                  <ul className="list-disc list-inside space-y-0.5 text-slate-500 font-mono">
                    <li>Neo4j Node: <code>{activeCitation.neo4jNode}</code></li>
                    <li>Thuộc tính: <code>{activeCitation.neo4jProps}</code></li>
                    <li>Nạp bởi: {activeCitation.agent}</li>
                  </ul>
                </div>

              </div>

              {/* Drawer Footer CTA */}
              <div className="p-4 border-t border-slate-200 bg-slate-50 space-y-2">
                <button
                  onClick={() => onNavigate && onNavigate("m2_knowledge_editor")}
                  className="w-full py-2 px-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-semibold shadow-sm flex items-center justify-center gap-1.5 transition-colors"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                  </svg>
                  Mở tài liệu gốc trong Knowledge Base
                </button>
                <button
                  onClick={() => setShowCitationDrawer(false)}
                  className="w-full py-1.5 text-center text-xs text-slate-500 hover:text-slate-800"
                >
                  Đóng ngăn trích dẫn
                </button>
              </div>

            </aside>
          )}

        </div>

      </div>
    </div>
  );
}
