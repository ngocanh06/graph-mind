import React, { useState } from "react";

export default function SearchView({ onNavigate, onSelectEntity, t, lang }) {
  const isVi = lang === "vi";
  const [query, setQuery] = useState("contracts expiring next 30 days with declining customer activity");
  const [searchMode, setSearchMode] = useState("hybrid"); // "semantic" | "graph" | "hybrid" | "evidence"
  const [filterDept, setFilterDept] = useState("ALL");
  const [filterType, setFilterType] = useState("ALL");
  const [filterRisk, setFilterRisk] = useState("ALL");
  const [toastMsg, setToastMsg] = useState("");

  const showToast = (msg) => {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(""), 3500);
  };

  const SAMPLE_QUERIES = [
    { label: isVi ? "Hợp đồng sắp hết hạn <30 ngày" : "Contracts expiring <30d", text: "contracts expiring next 30 days with declining customer activity" },
    { label: isVi ? "Khách hàng ABC giảm sản lượng" : "ABC Corp churn signals", text: "ABC Corporation order frequency drop pattern and contract exposure" },
    { label: isVi ? "Chuỗi cung ứng Sản phẩm A" : "Product A supply chain", text: "Product A enterprise core delivery to ABC Corporation dependencies" },
    { label: isVi ? "SOP đối soát công nợ" : "Reconciliation SOP owner", text: "Finance Department SOP-04 reconciliation document owner verification" }
  ];

  const ALL_RESULTS = [
    {
      id: "res-1",
      entityId: "ct18",
      type: "CONTRACT",
      title: "Contract CT-2026-18 — ABC Corporation",
      pill: "red",
      pillText: isVi ? "Hết hạn 18/10 (12 ngày)" : "Expires 18/10 (12d)",
      snippet: isVi
        ? "Hợp đồng cung ứng linh kiện sản xuất, giá trị 1,2 tỷ VND. Khách hàng liên kết ghi nhận đơn hàng sụt giảm 32% trong 60 ngày gần nhất."
        : "Manufacturing supply agreement, value 1.2B VND. Linked customer shows a 32% decline in order cadence over trailing 60 days.",
      score: 0.94,
      graphPath: "Contract → ABC Corp (Customer) → Order Drop (-32%)",
      sourceDoc: "Contract_CT-2026-18.pdf, p.2",
      dept: "Sales",
      risk: "High",
      confidence: "94%"
    },
    {
      id: "res-2",
      entityId: "abc",
      type: "CUSTOMER",
      title: "ABC Corporation — VIP Manufacturing Account",
      pill: "red",
      pillText: isVi ? "Nguy cơ Rời bỏ" : "High Churn Risk",
      snippet: isVi
        ? "Tài khoản khách hàng công nghiệp trọng yếu, doanh thu hàng năm 6,4 tỷ VND. Tần suất đặt hàng giảm từ 8,0/tháng xuống 5,4/tháng."
        : "Tier-1 enterprise customer, 6.4B VND revenue account. Cadence fell from 8.0/mo to 5.4/mo; consistent with pre-churn behavior.",
      score: 0.91,
      graphPath: "Customer → Purchased (Product A) → Signed (CT-2026-18)",
      sourceDoc: "CRM_Account_Ledger_2026.xlsx",
      dept: "Sales",
      risk: "High",
      confidence: "92%"
    },
    {
      id: "res-3",
      entityId: "delta",
      type: "CUSTOMER",
      title: "Delta Trading Ltd — Distribution Partner",
      pill: "amber",
      pillText: isVi ? "Hết hạn 24/10" : "Expires 24/10",
      snippet: isVi
        ? "Hợp đồng phân phối Sản phẩm B (CT-2026-24). Tần suất đặt hàng giảm từ 5,0/tháng xuống 2,8/tháng kể từ quý 3."
        : "Distribution agreement for Product B. Delta Trading's order cadence has fallen from 5.0/mo to 2.8/mo since July.",
      score: 0.87,
      graphPath: "Contract CT-2026-24 → Delta Trading → Invoice_0442.pdf",
      sourceDoc: "Contract_CT-2026-24.pdf, p.1",
      dept: "Operations",
      risk: "Med",
      confidence: "87%"
    },
    {
      id: "res-4",
      entityId: "proda",
      type: "PRODUCT",
      title: "Product A — Enterprise Core Platform",
      pill: "green",
      pillText: isVi ? "Hệ thống Đang chạy" : "System Healthy",
      snippet: isVi
        ? "Nền tảng chủ lực doanh nghiệp, đóng góp 28,4 tỷ VND lũy kế. Cung ứng cho 180 khách hàng trong đó có Tập đoàn ABC."
        : "Core enterprise platform contributing 28.4B VND YTD across 180 active contracts including ABC Corporation.",
      score: 0.83,
      graphPath: "Product A → Supplied To (ABC Corp) → Tech Division",
      sourceDoc: "Product_Catalog_Master.json",
      dept: "Operations",
      risk: "Low",
      confidence: "98%"
    },
    {
      id: "res-5",
      entityId: "doc-sop",
      type: "SOP",
      title: "SOP-04 — Reconciliation & Receivables Verification",
      pill: "cyan",
      pillText: isVi ? "Cần Xác thực" : "Needs Review",
      snippet: isVi
        ? "Quy trình đối soát công nợ nội bộ. Tài liệu thiếu trường phòng ban và người lập hợp lệ, đang nằm trong hàng đợi xác thực."
        : "Internal financial reconciliation procedure. Missing department metadata and author field; pending validation queue.",
      score: 0.79,
      graphPath: "SOP-04 → Finance Dept → Outstanding Receivables (8.6B)",
      sourceDoc: "SOP-04_Reconciliation.docx, p.4",
      dept: "Finance",
      risk: "Med",
      confidence: "74%"
    }
  ];

  const filteredResults = ALL_RESULTS.filter((r) => {
    if (filterDept !== "ALL" && r.dept !== filterDept) return false;
    if (filterType !== "ALL" && r.type !== filterType) return false;
    if (filterRisk !== "ALL" && r.risk !== filterRisk) return false;
    if (query.trim()) {
      const q = query.toLowerCase();
      const match =
        r.title.toLowerCase().includes(q) ||
        r.snippet.toLowerCase().includes(q) ||
        r.graphPath.toLowerCase().includes(q) ||
        r.type.toLowerCase().includes(q);
      // If no direct substring match, show high scores in semantic mode
      if (!match && searchMode === "keyword") return false;
    }
    return true;
  });

  return (
    <section className="view active text-on-surface flex flex-col gap-space-md">
      {/* Toast Notification */}
      {toastMsg && (
        <div className="fixed bottom-6 right-6 z-50 bg-surface-container-high border border-primary/40 text-on-surface px-space-md py-space-sm rounded-DEFAULT shadow-2xl flex items-center gap-space-sm animate-bounce">
          <i className="fa-solid fa-magnifying-glass text-primary text-[18px]"></i>
          <span className="font-body-sm text-body-sm font-medium">{toastMsg}</span>
        </div>
      )}

      {/* SEARCH HERO */}
      <div className="search-hero bg-surface-container-low p-space-lg rounded-lg border border-outline-variant/30 text-center flex flex-col items-center">
        <h1 className="text-2xl font-bold text-on-surface mb-space-2xs">
          {t.search_hero_title || (isVi ? "Tìm kiếm Tri thức Doanh nghiệp Toàn diện" : "Enterprise Knowledge Search")}
        </h1>
        <p className="text-body-sm text-on-surface-variant max-w-[650px] mb-space-md">
          {t.search_hero_sub || (isVi ? "Truy xuất hợp nhất ngữ nghĩa, đồ thị quan hệ và bằng chứng tài liệu trích dẫn" : "Federated hybrid retrieval across semantic vectors, multi-hop knowledge graph, and cited evidence")}
        </p>

        {/* Search Input Bar */}
        <div className="search-box w-full max-w-[760px] flex items-center bg-surface-container-lowest border border-outline-variant/40 rounded-DEFAULT px-space-md py-space-sm shadow-sm focus-within:border-primary">
          <i className="fa-solid fa-magnifying-glass text-primary text-[18px] mr-space-sm shrink-0"></i>
          <input
            type="text"
            className="w-full bg-transparent text-on-surface outline-none font-body-sm text-body-sm"
            placeholder={isVi ? "Nhập câu hỏi, tên khách hàng, mã hợp đồng hoặc điều khoản..." : "Search entities, contracts, relationships, or questions..."}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
          {query && (
            <button onClick={() => setQuery("")} className="text-outline hover:text-on-surface mr-2">
              <i className="fa-solid fa-xmark"></i>
            </button>
          )}
          <button
            onClick={() => showToast(isVi ? "Đang chạy tìm kiếm Hybrid GraphRAG..." : "Executing Hybrid GraphRAG Search...")}
            className="btn primary sm shrink-0"
          >
            {isVi ? "Tìm kiếm" : "Search"}
          </button>
        </div>

        {/* Search Mode Toggles */}
        <div className="flex items-center gap-space-xs mt-space-sm">
          <span className="font-label-caps text-label-caps text-outline mr-space-xs">
            {isVi ? "CHẾ ĐỘ TÌM:" : "SEARCH ENGINE:"}
          </span>
          {[
            { id: "hybrid", label: isVi ? "Đồ thị + Ngữ nghĩa (Hybrid)" : "Hybrid GraphRAG" },
            { id: "semantic", label: isVi ? "Vector Ngữ nghĩa (Cosine)" : "Semantic Vector" },
            { id: "graph", label: isVi ? "Đường dẫn Đồ thị (Multi-hop)" : "Graph Traversal" },
            { id: "evidence", label: isVi ? "Trích dẫn Bằng chứng (PDF/XLSX)" : "Cited Evidence" }
          ].map((mode) => (
            <button
              key={mode.id}
              onClick={() => {
                setSearchMode(mode.id);
                showToast(isVi ? `Đã chuyển sang chế độ: ${mode.label}` : `Retriever switched to ${mode.label}`);
              }}
              className={`px-space-sm py-space-2xs rounded-DEFAULT font-label-caps text-label-caps font-semibold transition-all ${
                searchMode === mode.id
                  ? "bg-primary text-on-primary shadow-sm"
                  : "bg-surface-container text-on-surface-variant hover:text-on-surface"
              }`}
            >
              {mode.label}
            </button>
          ))}
        </div>

        {/* Sample query shortcuts */}
        <div className="flex flex-wrap items-center justify-center gap-space-xs mt-space-sm">
          <span className="font-label-caps text-label-caps text-outline">
            {isVi ? "Gợi ý truy vấn:" : "Sample prompts:"}
          </span>
          {SAMPLE_QUERIES.map((sq, i) => (
            <button
              key={i}
              onClick={() => {
                setQuery(sq.text);
                showToast(isVi ? `Đã chọn truy vấn mẫu: ${sq.label}` : `Query loaded: ${sq.label}`);
              }}
              className="px-space-xs py-space-2xs bg-surface-container rounded-DEFAULT text-body-sm text-primary hover:bg-surface-container-high transition-colors"
            >
              "{sq.label}"
            </button>
          ))}
        </div>
      </div>

      {/* SEARCH BODY: FILTERS SIDEBAR + RESULTS */}
      <div className="search-body grid grid-cols-1 lg:grid-cols-12 gap-space-md">
        {/* FILTERS SIDEBAR (Col 3) */}
        <div className="lg:col-span-3 flex flex-col gap-space-sm">
          <div className="bg-surface-container-low p-space-md rounded-lg border border-outline-variant/30 flex flex-col gap-space-md">
            <div className="flex items-center justify-between pb-space-xs border-b border-outline-variant/20">
              <span className="font-title-sm text-title-sm font-bold text-on-surface">
                {isVi ? "Bộ lọc Đa chiều" : "Faceted Filters"}
              </span>
              <button
                onClick={() => {
                  setFilterDept("ALL");
                  setFilterType("ALL");
                  setFilterRisk("ALL");
                }}
                className="text-caption text-primary hover:underline"
              >
                {isVi ? "Đặt lại" : "Reset"}
              </button>
            </div>

            {/* Department filter */}
            <div className="filter-block flex flex-col gap-space-2xs">
              <div className="filter-title font-label-caps text-label-caps text-outline uppercase font-bold">
                {isVi ? "PHÒNG BAN" : "DEPARTMENT"}
              </div>
              {["ALL", "Sales", "Finance", "Operations"].map((d) => (
                <div
                  key={d}
                  onClick={() => setFilterDept(d)}
                  className={`filter-opt flex justify-between items-center p-space-xs rounded-DEFAULT cursor-pointer transition-colors ${
                    filterDept === d ? "bg-surface-container-highest text-primary font-bold" : "hover:bg-surface-container text-on-surface-variant"
                  }`}
                >
                  <span>{d === "ALL" ? (isVi ? "Tất cả phòng ban" : "All Departments") : d}</span>
                  <span className="fc text-outline text-caption">{d === "ALL" ? "5" : d === "Sales" ? "2" : d === "Finance" ? "1" : "2"}</span>
                </div>
              ))}
            </div>

            {/* Entity Type filter */}
            <div className="filter-block flex flex-col gap-space-2xs">
              <div className="filter-title font-label-caps text-label-caps text-outline uppercase font-bold">
                {isVi ? "LOẠI THỰC THỂ" : "ENTITY TYPE"}
              </div>
              {["ALL", "CUSTOMER", "CONTRACT", "PRODUCT", "SOP"].map((t) => (
                <div
                  key={t}
                  onClick={() => setFilterType(t)}
                  className={`filter-opt flex justify-between items-center p-space-xs rounded-DEFAULT cursor-pointer transition-colors ${
                    filterType === t ? "bg-surface-container-highest text-primary font-bold" : "hover:bg-surface-container text-on-surface-variant"
                  }`}
                >
                  <span>{t === "ALL" ? (isVi ? "Tất cả thực thể" : "All Types") : t}</span>
                  <span className="fc text-outline text-caption">{t === "ALL" ? "5" : "1"}</span>
                </div>
              ))}
            </div>

            {/* Risk filter */}
            <div className="filter-block flex flex-col gap-space-2xs">
              <div className="filter-title font-label-caps text-label-caps text-outline uppercase font-bold">
                {isVi ? "MỨC RỦI RO" : "RISK STATUS"}
              </div>
              {["ALL", "High", "Med", "Low"].map((r) => (
                <div
                  key={r}
                  onClick={() => setFilterRisk(r)}
                  className={`filter-opt flex justify-between items-center p-space-xs rounded-DEFAULT cursor-pointer transition-colors ${
                    filterRisk === r ? "bg-surface-container-highest text-primary font-bold" : "hover:bg-surface-container text-on-surface-variant"
                  }`}
                >
                  <span>{r === "ALL" ? (isVi ? "Tất cả mức độ" : "All Risk Levels") : r}</span>
                  <span className="fc text-outline text-caption">{r === "High" ? "2" : r === "Med" ? "2" : "1"}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* RESULTS LIST (Col 9) */}
        <div className="lg:col-span-9 flex flex-col gap-space-sm">
          <div className="flex items-center justify-between px-space-xs">
            <span className="font-body-sm text-body-sm text-on-surface-variant">
              {isVi ? "Tìm thấy" : "Showing"} <b>{filteredResults.length}</b> {isVi ? "kết quả tương quan cao" : "high-confidence matches"}
            </span>
            <span className="font-label-caps text-label-caps text-outline">
              SORTED BY: RELEVANCE + PROVENANCE
            </span>
          </div>

          {filteredResults.length === 0 ? (
            <div className="bg-surface-container-low p-space-xl rounded-lg border border-outline-variant/30 text-center text-outline">
              {isVi ? "Không tìm thấy kết quả nào phù hợp với bộ lọc đã chọn." : "No results match your selected search criteria."}
            </div>
          ) : (
            filteredResults.map((item) => (
              <div
                key={item.id}
                className="result-card bg-surface-container-low p-space-md rounded-lg border border-outline-variant/30 flex flex-col gap-space-xs hover:border-primary/50 transition-all hover:shadow-md"
              >
                <div className="result-top flex items-center justify-between gap-space-sm">
                  <div className="flex items-center gap-space-xs">
                    <span className="font-label-caps text-label-caps bg-surface-container-highest text-outline px-space-xs py-space-2xs rounded-DEFAULT font-mono">
                      {item.type}
                    </span>
                    <span className="result-title font-title-sm text-title-sm font-bold text-on-surface">
                      {item.title}
                    </span>
                  </div>
                  <span className={`pill ${item.pill} font-bold text-[10px] uppercase`}>
                    {item.pillText}
                  </span>
                </div>

                <div className="result-snippet font-body-sm text-body-sm text-on-surface-variant">
                  {item.snippet}
                </div>

                {/* WHY THIS RESULT MATCHES (Transparent AI Explanation) */}
                <div className="result-why bg-surface-container p-space-xs rounded-DEFAULT flex flex-wrap items-center gap-space-xs mt-space-2xs border border-outline-variant/10">
                  <span className="font-label-caps text-label-caps text-primary font-bold">
                    {isVi ? "LÝ DO KHỚP:" : "WHY THIS MATCHES:"}
                  </span>
                  <span className="why-chip text-caption bg-surface-container-high text-primary px-space-xs py-space-2xs rounded-DEFAULT">
                    {isVi ? "Tương đồng" : "Semantic score"} {item.score}
                  </span>
                  <span className="why-chip text-caption bg-surface-container-high text-on-surface px-space-xs py-space-2xs rounded-DEFAULT font-mono">
                    {item.graphPath}
                  </span>
                  <span className="why-chip text-caption bg-surface-container-high text-tertiary px-space-xs py-space-2xs rounded-DEFAULT">
                    {isVi ? "Nguồn:" : "Source:"} {item.sourceDoc}
                  </span>
                </div>

                {/* Card Action Footer */}
                <div className="flex items-center justify-between pt-space-xs mt-space-2xs border-t border-outline-variant/10">
                  <span className="text-caption text-outline">
                    {isVi ? "Độ tin cậy:" : "Confidence:"} <b className="text-green-500">{item.confidence}</b> · {isVi ? "Phòng ban:" : "Dept:"} {item.dept}
                  </span>

                  <div className="flex items-center gap-space-xs">
                    <button
                      onClick={() => {
                        onSelectEntity?.(item.entityId);
                        onNavigate("knowledge");
                      }}
                      className="btn sm"
                    >
                      {isVi ? "Khám phá Đồ thị" : "Inspect Graph"}
                    </button>
                    <button
                      onClick={() => onNavigate("copilot")}
                      className="btn primary sm"
                    >
                      {isVi ? "Hỏi Copilot" : "Ask Copilot"} →
                    </button>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </section>
  );
}
