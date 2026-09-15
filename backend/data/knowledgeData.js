/**
 * Graph Mind — Enterprise Knowledge Dataset & Graph Model
 */

const knowledgeData = {
  health: {
    status: "nominal",
    uptime: "99.98%",
    activeSources: 247,
    reasoningEngine: "Hybrid GraphRAG v2.4",
    lastSync: new Date().toISOString()
  },

  signals: [
    {
      id: "sig-1",
      severity: "high",
      badge: "HIGH CHURN RISK",
      what: "Customer ABC Corporation order frequency decreased 32%.",
      why: "Order cadence fell from 8.0/mo to 5.4/mo over trailing 60 days — consistent with prior churn events in manufacturing tier.",
      action: "Review account within 7 days",
      entityId: "abc"
    },
    {
      id: "sig-2",
      severity: "med",
      badge: "MEDIUM RISK",
      what: "3 contracts expire within 21 days with no renewal activity logged.",
      why: "Combined value of 4.1B VND has no renewal activity logged in CRM or Drive folders.",
      action: "Open Risk Center",
      entityId: "ct18"
    },
    {
      id: "sig-3",
      severity: "low",
      badge: "DATA QUALITY",
      what: "12 documents contain incomplete metadata or unverified owners.",
      why: "Department and author fields missing, reducing traceability for downstream AI reasoning.",
      action: "Send to Validation Queue",
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
    }
  },

  connectors: [
    {
      id: "conn-1",
      name: "Google Drive",
      type: "cloud_storage",
      status: "Connected · Continuous",
      lastSync: "2 min ago",
      nextSync: "in 13 min",
      filesProcessed: 4208,
      recordsExtracted: 18930,
      errors: 0
    },
    {
      id: "conn-2",
      name: "Google Sheets",
      type: "tabular_data",
      status: "Connected · Continuous",
      lastSync: "9 min ago",
      nextSync: "in 6 min",
      filesProcessed: 312,
      recordsExtracted: 52104,
      errors: 0
    },
    {
      id: "conn-3",
      name: "Local Agent — AEGIS",
      type: "agent_daemon",
      status: "3 machines online",
      lastSync: "14s ago",
      nextSync: "Real-time",
      filesProcessed: 86,
      recordsExtracted: 4,
      errors: 1
    }
  ],

  llmops: {
    totalTokens30D: "18.4M",
    promptTokens: "11.2M",
    completionTokens: "7.2M",
    aiQueries: 54180,
    avgLatency: "2.1s",
    estimatedCost: "$312",
    citationCoverage: "94%"
  }
};

module.exports = knowledgeData;
