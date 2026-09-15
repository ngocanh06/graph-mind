/* ============================================================
   AEGIS EKMP — ENTERPRISE DATASET & KNOWLEDGE GRAPH
   ============================================================ */

window.AEGIS_DATA = {
  // Executive Signals
  signals: [
    {
      id: "sig-1",
      severity: "high",
      badge: "HIGH",
      what_en: "Customer ABC Corporation order frequency decreased 32%.",
      what_vi: "Tần suất đặt hàng của Tập đoàn ABC giảm 32%.",
      why_en: "Order cadence fell from 8.0/mo to 5.4/mo over trailing 60 days — consistent with prior churn events in manufacturing tier.",
      why_vi: "Tần suất đặt hàng giảm từ 8,0/tháng xuống 5,4/tháng trong 60 ngày qua — khớp với mô hình rời bỏ trước đây.",
      action_en: "Review account within 7 days",
      action_vi: "Xem xét tài khoản trong vòng 7 ngày",
      entityId: "abc"
    },
    {
      id: "sig-2",
      severity: "med",
      badge: "MEDIUM",
      what_en: "3 contracts expire within 21 days with no renewal activity.",
      what_vi: "3 hợp đồng hết hạn trong 21 ngày tới chưa có hoạt động gia hạn.",
      why_en: "Combined contract value of 4.1B VND has no renewal activity logged in CRM or Drive folders.",
      why_vi: "Tổng giá trị hợp đồng 4,1 tỷ VND chưa ghi nhận động thái gia hạn nào trên CRM hoặc Google Drive.",
      action_en: "Open Risk Center",
      action_vi: "Mở Trung tâm Rủi ro",
      entityId: "ct18"
    },
    {
      id: "sig-3",
      severity: "low",
      badge: "LOW",
      what_en: "12 documents contain incomplete metadata or unverified owners.",
      what_vi: "12 tài liệu bị thiếu siêu dữ liệu hoặc chưa xác thực người sở hữu.",
      why_en: "Department and author fields missing, reducing traceability for downstream AI reasoning.",
      why_vi: "Thiếu trường phòng ban và người lập, làm giảm khả năng truy xuất bằng chứng của AI.",
      action_en: "Send to Validation Queue",
      action_vi: "Chuyển tới Hàng đợi Xác thực",
      entityId: "doc-sop"
    }
  ],

  // Entities in Knowledge Graph
  entities: {
    abc: {
      id: "abc",
      type: "CUSTOMER",
      name: "ABC Corporation",
      verified: true,
      status: "Human Verified",
      risk: "Elevated",
      industry: "Manufacturing & Industrial",
      contact: "Tran M. Anh (Procurement Dir.)",
      revenue: "6.4B VND",
      ordersCount: 214,
      activeContracts: 2,
      relationships: [
        { rel: "Customer of", target: "Company X" },
        { rel: "Purchased", target: "Product A" },
        { rel: "Signed", target: "Contract CT-2026-18", warning: true }
      ]
    },
    ct18: {
      id: "ct18",
      type: "CONTRACT",
      name: "Contract CT-2026-18",
      verified: false,
      status: "Needs Review",
      risk: "High",
      industry: "Legal / Sales",
      contact: "Pham Q. Linh (Account Mgr)",
      revenue: "1.2B VND",
      ordersCount: 18,
      activeContracts: 1,
      relationships: [
        { rel: "Signed by", target: "ABC Corporation" },
        { rel: "Governs", target: "Product A supply" },
        { rel: "Expires on", target: "18 Oct 2026 (12 days left)" }
      ]
    },
    delta: {
      id: "delta",
      type: "CUSTOMER",
      name: "Delta Trading Ltd",
      verified: true,
      status: "Human Verified",
      risk: "Medium",
      industry: "Distribution & Logistics",
      contact: "Nguyen V. Binh (Director)",
      revenue: "3.2B VND",
      ordersCount: 94,
      activeContracts: 1,
      relationships: [
        { rel: "Customer of", target: "Company X" },
        { rel: "Purchased", target: "Product B" },
        { rel: "Signed", target: "Contract CT-2026-24" }
      ]
    },
    proda: {
      id: "proda",
      type: "PRODUCT",
      name: "Product A — Enterprise Core",
      verified: true,
      status: "System Verified",
      risk: "Low",
      industry: "Software & Services",
      contact: "Product Management Team",
      revenue: "28.4B VND (YTD)",
      ordersCount: 840,
      activeContracts: 180,
      relationships: [
        { rel: "Delivered to", target: "ABC Corporation" },
        { rel: "Produced by", target: "Tech Division" }
      ]
    }
  },

  // Copilot Preset / Live Questions & Answers
  copilotQA: {
    "q-risk": {
      query_en: "Which VIP customers are showing signs of declining purchasing activity?",
      query_vi: "Những khách hàng VIP nào đang có dấu hiệu sụt giảm tần suất mua hàng?",
      intel_main_en: "2 of 14 VIP accounts show a sustained decline in order frequency — ABC Corporation and Delta Trading — both falling below their 6-month baseline for three consecutive cycles.",
      intel_main_vi: "2 trong số 14 tài khoản VIP ghi nhận mức sụt giảm liên tục về tần suất đặt hàng — Tập đoàn ABC và Delta Trading — cả hai đều thấp hơn mức chuẩn 6 tháng qua trong 3 chu kỳ liên tiếp.",
      why_en: "ABC Corporation previously averaged 8.0 orders/month and now averages 5.4 (-32.5%). Delta Trading fell from 5.0 to 2.8/month (-44.0%). Both accounts sit in top-quartile by lifetime revenue, so continued decline materially impacts Q4 forecast.",
      why_vi: "Tập đoàn ABC trước đây trung bình 8,0 đơn/tháng nay chỉ còn 5,4 (-32,5%). Delta Trading giảm từ 5,0 xuống 2,8 đơn/tháng (-44,0%). Cả hai nằm trong top doanh thu tích lũy, việc sụt giảm kéo dài sẽ tác động trực tiếp đến kế hoạch Q4.",
      evidence_chips: [
        { label: "Order #1023", type: "order" },
        { label: "Order #1041", type: "order" },
        { label: "Contract CT-2026-18", type: "contract" },
        { label: "CRM export · Sept", type: "crm" }
      ],
      confidence: 87,
      action_en: "Review both accounts and reach out within 7 days — draft outreach available in Reports.",
      action_vi: "Gặp gỡ đánh giá lại cả hai tài khoản trong vòng 7 ngày — bản nháp chăm sóc khách hàng đã sẵn sàng trong mục Báo cáo."
    }
  },

  // Knowledge Validation Queue Items
  validationQueue: [
    {
      id: "vq-1",
      entity: "ABC Corporation",
      relation: "SIGNED_CONTRACT → CT-2026-18 · from Contract_CT-2026-18.pdf, p.2",
      confidence: 74,
      status: "pending"
    },
    {
      id: "vq-2",
      entity: "Delta Trading Ltd",
      relation: "PURCHASED → Product B · from Invoice_0442.pdf, p.1",
      confidence: 96,
      status: "pending"
    },
    {
      id: "vq-3",
      entity: "Company X — Finance Dept",
      relation: "OWNS_DOCUMENT → SOP-04 Reconciliation · conflicting owner field",
      confidence: 52,
      status: "pending"
    },
    {
      id: "vq-4",
      entity: "Nguyen T. Hoang",
      relation: "AUTHORIZED_SIGNER → Contract CT-2026-24 · detected from scan signature",
      confidence: 81,
      status: "pending"
    }
  ],

  // Connectors Statuses
  connectors: [
    {
      name: "Google Drive",
      status: "Connected · Continuous",
      lastSync: "2 min ago",
      nextSync: "in 13 min",
      files: "4,208",
      records: "18,930",
      errors: 0
    },
    {
      name: "Google Sheets",
      status: "Connected · Continuous",
      lastSync: "9 min ago",
      nextSync: "in 6 min",
      files: "312",
      records: "52,104",
      errors: 0
    },
    {
      name: "Local Agent — AEGIS",
      status: "3 machines online",
      lastSync: "14s ago",
      nextSync: "Real-time",
      files: "86 / 24h",
      records: "4 pending",
      errors: 1
    },
    {
      name: "File Watcher",
      status: "Active · Low Latency",
      lastSync: "Just now",
      nextSync: "Real-time",
      files: "212 today",
      records: "198 auto-ingested",
      errors: 0
    }
  ]
};
