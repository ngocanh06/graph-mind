const express = require("express");
const router = express.Router();
const knowledgeData = require("../data/knowledgeData");

// 1. Health & Pipeline Pulse
router.get("/health", (req, res) => {
  res.json({
    success: true,
    data: knowledgeData.health
  });
});

// 2. AI Detected Signals
router.get("/signals", (req, res) => {
  res.json({
    success: true,
    count: knowledgeData.signals.length,
    data: knowledgeData.signals
  });
});

// 3. Knowledge Graph Entities
router.get("/graph/entities", (req, res) => {
  res.json({
    success: true,
    data: knowledgeData.entities
  });
});

// 4. Single Entity Details
router.get("/graph/entity/:id", (req, res) => {
  const entity = knowledgeData.entities[req.params.id];
  if (!entity) {
    return res.status(404).json({ success: false, message: "Entity not found in Knowledge Graph" });
  }
  res.json({ success: true, data: entity });
});

// 5. Human-in-the-loop Verification
router.post("/graph/verify", (req, res) => {
  const { entityId, verified, auditor } = req.body;
  if (!knowledgeData.entities[entityId]) {
    return res.status(404).json({ success: false, message: "Entity not found" });
  }

  knowledgeData.entities[entityId].verified = verified;
  knowledgeData.entities[entityId].status = verified ? "Human Verified" : "Needs Review";

  res.json({
    success: true,
    message: `Entity ${entityId} verification updated by ${auditor || "Auditor"}`,
    data: knowledgeData.entities[entityId]
  });
});

// 6. AI Copilot Hybrid GraphRAG Reasoner
router.post("/copilot/ask", (req, res) => {
  const { query, lang } = req.body;
  const isVi = lang === "vi";

  // Graph Mind Reasoning simulation with strict evidence provenance
  const response = {
    query: query || "General inquiry",
    model: "Graph Mind Hybrid GraphRAG v2.4",
    insight: isVi
      ? "2 trong số 14 tài khoản VIP ghi nhận mức sụt giảm liên tục về tần suất đặt hàng — Tập đoàn ABC và Delta Trading — cả hai đều thấp hơn mức chuẩn 6 tháng qua trong 3 chu kỳ liên tiếp."
      : "2 of 14 VIP accounts show a sustained decline in order frequency — ABC Corporation and Delta Trading — both falling below their 6-month baseline for three consecutive cycles.",
    whyItMatters: isVi
      ? "Tập đoàn ABC trước đây trung bình 8,0 đơn/tháng nay chỉ còn 5,4 (-32,5%). Delta Trading giảm từ 5,0 xuống 2,8 đơn/tháng (-44,0%). Cả hai nằm trong top doanh thu tích lũy, việc sụt giảm kéo dài sẽ tác động trực tiếp đến kế hoạch Q4."
      : "ABC Corporation previously averaged 8.0 orders/month and now averages 5.4 (-32.5%). Delta Trading fell from 5.0 to 2.8/month (-44.0%). Both accounts sit in top-quartile by lifetime revenue, so continued decline materially impacts Q4 forecast.",
    evidenceChips: [
      { id: "ord-1023", label: "Order #1023", source: "Google Sheets" },
      { id: "ord-1041", label: "Order #1041", source: "Google Sheets" },
      { id: "ct-18", label: "Contract CT-2026-18", source: "Google Drive PDF" },
      { id: "crm-sept", label: "CRM export · Sept", source: "Local Agent CSV" }
    ],
    confidenceScore: 87,
    recommendedAction: isVi
      ? "Gặp gỡ đánh giá lại cả hai tài khoản trong vòng 7 ngày — bản nháp chăm sóc khách hàng đã sẵn sàng trong mục Báo cáo."
      : "Review both accounts and reach out within 7 days — draft outreach available in Reports."
  };

  res.json({
    success: true,
    data: response
  });
});

// 7. Connectors List
router.get("/connectors", (req, res) => {
  res.json({
    success: true,
    data: knowledgeData.connectors
  });
});

// 8. LLMOps & Cost Metrics
router.get("/llmops", (req, res) => {
  res.json({
    success: true,
    data: knowledgeData.llmops
  });
});

module.exports = router;
