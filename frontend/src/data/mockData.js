export const INITIAL_DATA = {
  signals: [
    {
      id: "sig-1",
      severity: "high",
      badge: "HIGH CHURN RISK",
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
      badge: "MEDIUM RISK",
      what_en: "3 contracts expire within 21 days with no renewal activity logged.",
      what_vi: "3 hợp đồng hết hạn trong 21 ngày tới chưa có hoạt động gia hạn.",
      why_en: "Combined value of 4.1B VND has no renewal activity logged in CRM or Drive folders.",
      why_vi: "Tổng giá trị hợp đồng 4,1 tỷ VND chưa ghi nhận động thái gia hạn nào trên CRM hoặc Google Drive.",
      action_en: "Open Risk Center",
      action_vi: "Mở Trung tâm Rủi ro",
      entityId: "ct18"
    },
    {
      id: "sig-3",
      severity: "low",
      badge: "DATA QUALITY",
      what_en: "12 documents contain incomplete metadata or unverified owners.",
      what_vi: "12 tài liệu bị thiếu siêu dữ liệu hoặc chưa xác thực người sở hữu.",
      why_en: "Department and author fields missing, reducing traceability for downstream AI reasoning.",
      why_vi: "Thiếu trường phòng ban và người lập, làm giảm khả năng truy xuất bằng chứng của AI.",
      action_en: "Send to Validation Queue",
      action_vi: "Chuyển tới Hàng đợi Xác thực",
      entityId: "doc-sop"
    }
  ],

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

  validationQueue: [
    {
      id: "vq-1",
      entity: "ABC Corporation",
      relation: "SIGNED_CONTRACT → CT-2026-18 · from Contract_CT-2026-18.pdf, p.2",
      confidence: 74
    },
    {
      id: "vq-2",
      entity: "Delta Trading Ltd",
      relation: "PURCHASED → Product B · from Invoice_0442.pdf, p.1",
      confidence: 96
    },
    {
      id: "vq-3",
      entity: "Company X — Finance Dept",
      relation: "OWNS_DOCUMENT → SOP-04 Reconciliation · conflicting owner field",
      confidence: 52
    }
  ]
};
