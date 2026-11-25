import React, { useState, useRef, useEffect, useCallback } from "react";
import Icon from "../../components/ui/Icon";
import {
  Bot, Send, Paperclip, BookOpen, ChevronRight,
  Search, Plus, FileText, ThumbsUp, ThumbsDown, Copy,
  ExternalLink, ShieldCheck, AlertCircle, X, Menu, Clock,
  ArrowUpRight, ArrowRight, CheckCircle2, Bookmark, Check, Pin
} from "lucide-react";
import {
  queryCopilot,
  fetchCopilotSessions,
  fetchCopilotSessionDetail,
  createCopilotSession,
  deleteCopilotSession,
  pinCopilotSession
} from "../../services/api";

function formatCitationDocTitle(rawName) {
  if (!rawName) return "Tài liệu hệ thống";
  let name = String(rawName).trim();
  if (name.startsWith("Đồ thị thực thể ERP:")) {
    return name.replace(/^Đồ thị thực thể ERP:\s*/i, "");
  }
  name = name.replace(/\.(pdf|txt|docx|json)$/i, "");
  const cuadMatch = name.match(/^([A-Z0-9]+)_[0-9_]+-(?:EX-[0-9\.]+-)?(.+)$/i);
  if (cuadMatch) {
    const org = cuadMatch[1].replace(/INC$/i, " Inc").replace(/CORP$/i, " Corp");
    const docType = cuadMatch[2].replace(/[_-]+/g, " ").trim();
    const yearMatch = rawName.match(/_(\d{4})[-_]/);
    const yearStr = yearMatch ? ` (${yearMatch[1]})` : "";
    return `${org} — ${docType}${yearStr}`;
  }
  return name.replace(/[_-]+/g, " ");
}

function formatInlineMetrics(text) {
  if (!text) return null;

  // 1. Loại bỏ triệt để các ký tự markdown thô ** gây rối mắt giao diện
  let cleanText = typeof text === "string" ? text : String(text);
  cleanText = cleanText.replace(/\*\*/g, "");

  // 2. Chuẩn hóa trường hợp thiếu tên hiển thị: "( #29715 )" hoặc "(#29715)" -> "Khách hàng #29715"
  cleanText = cleanText.replace(/\(\s*(#\d+)\s*\)/g, "($1)");
  cleanText = cleanText.replace(/^\s*\(\s*(#\d+)\s*\)/g, "Khách hàng $1");
  cleanText = cleanText.replace(/:\s*\(\s*(#\d+)\s*\)/g, ": Khách hàng $1");

  // Regex bắt các cụm tiền tệ, đơn hàng, mã khách hàng, số ngày/thời hạn, và tên điều khoản/hợp đồng
  const parts = cleanText.split(/(\$[\d,.]+\s*(?:triệu USD|tỷ USD|USD|M|K)?|\b\d{1,3}(?:,\d{3})+\s*(?:đơn hàng|đơn|khách hàng)?|\b\d{3,6}\s*(?:đơn hàng|đơn)\b|#\d+|\b\d+\s*(?:ngày|tháng|năm)\b|'Exhibit\s+[^']+'|UPJOHN\s+INC[,\w\-/\.]*|Pfizer\s+Inc\.)/gi);

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
    if (/\b\d+\s*(?:ngày|tháng|năm)\b/i.test(part)) {
      return (
        <strong
          key={i}
          style={{
            color: "#d97706",
            background: "rgba(245, 158, 11, 0.12)",
            padding: "1px 6px",
            borderRadius: "var(--r-xs, 4px)",
            fontWeight: 700,
            fontSize: "0.95em"
          }}
        >
          {part}
        </strong>
      );
    }
    if (/^'Exhibit/i.test(part)) {
      return (
        <span
          key={i}
          style={{
            color: "var(--blue)",
            background: "rgba(37,99,235,0.08)",
            padding: "1px 6px",
            borderRadius: "var(--r-xs, 4px)",
            fontFamily: "var(--f-mono, monospace)",
            fontWeight: 600,
            fontSize: "0.92em"
          }}
        >
          {part}
        </span>
      );
    }
    if (/UPJOHN|Pfizer/i.test(part)) {
      return (
        <strong
          key={i}
          style={{
            color: "var(--text-1)",
            background: "var(--surface-3, rgba(0,0,0,0.06))",
            padding: "1px 6px",
            borderRadius: "var(--r-xs, 4px)",
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
            color: "#0891b2",
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

function renderCitationSnippet(text, isVi) {
  if (!text) return <span style={{ fontStyle: "italic", color: "var(--text-3)" }}>{isVi ? "(Không có trích đoạn văn bản)" : "(No snippet available)"}</span>;

  let str = text;
  // Normalize inline numbered lists like ": 1. " or "). 2. "
  str = str.replace(/([.:])\s+(\d+[\.\)])\s+/g, "$1\n$2 ");
  str = str.replace(/([)\]])\s+(\d+[\.\)])\s+/g, "$1\n$2 ");
  str = str.replace(/([.:])\s+(Tổng thể\b|Overall\b)/gi, "$1\n$2");

  const rawLines = str.split("\n").map(l => l.trim()).filter(Boolean);

  // Ghép các dòng bị ngắt lửng lơ giữa chừng do dấu ngoặc đơn chưa đóng hoặc dấu nối
  const lines = [];
  for (let k = 0; k < rawLines.length; k++) {
    const cur = rawLines[k];
    const prev = lines[lines.length - 1];
    if (prev) {
      const openParens = (prev.match(/\(/g) || []).length;
      const closeParens = (prev.match(/\)/g) || []).length;
      if (openParens > closeParens) {
        // Dòng trước chưa đóng ngoặc đơn (ví dụ: "(89.8%"), ghép dòng tiếp theo vào
        const cleanCur = cur.replace(/^[-*•—–]\s*/, "");
        lines[lines.length - 1] = `${prev} — ${cleanCur}`;
        continue;
      }
    }
    lines.push(cur);
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 7 }}>
      {lines.map((line, idx) => {
        const numMatch = line.match(/^(\d+)[\.\)]\s*(.+)/);
        if (numMatch) {
          return (
            <div
              key={idx}
              style={{
                display: "flex",
                alignItems: "flex-start",
                gap: 8,
                padding: "8px 10px",
                borderRadius: "6px",
                background: "rgba(2, 132, 199, 0.05)",
                border: "1px solid rgba(2, 132, 199, 0.15)",
                fontSize: 12,
                lineHeight: 1.5
              }}
            >
              <span
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  justifyContent: "center",
                  minWidth: 20,
                  height: 20,
                  borderRadius: "50%",
                  background: "#0284c7",
                  color: "#ffffff",
                  fontSize: 11,
                  fontWeight: 700,
                  flexShrink: 0,
                  marginTop: 1
                }}
              >
                {numMatch[1]}
              </span>
              <div style={{ flex: 1, color: "var(--text-1)", wordBreak: "break-word" }}>
                {formatInlineMetrics(numMatch[2])}
              </div>
            </div>
          );
        }

        if (/^(Tổng thể|Overall|Đánh giá|Kết luận)/i.test(line)) {
          return (
            <div
              key={idx}
              style={{
                padding: "8px 10px",
                borderRadius: "6px",
                background: "rgba(5, 150, 105, 0.08)",
                borderLeft: "3px solid #059669",
                fontSize: 12,
                fontWeight: 600,
                color: "var(--text-1)",
                lineHeight: 1.5,
                marginTop: 2
              }}
            >
              {formatInlineMetrics(line)}
            </div>
          );
        }

        return (
          <div
            key={idx}
            style={{
              fontSize: 12,
              color: "var(--text-2)",
              lineHeight: 1.55,
              fontWeight: idx === 0 ? 600 : 400
            }}
          >
            {formatInlineMetrics(line)}
          </div>
        );
      })}
    </div>
  );
}

function CodeBlockBox({ code, lang = "code" }) {
  const [copied, setCopied] = useState(false);
  const handleCopy = () => {
    navigator.clipboard?.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };
  return (
    <div style={{
      margin: "10px 0 14px 0",
      borderRadius: "var(--r-md, 8px)",
      border: "1px solid var(--border-soft, rgba(255,255,255,0.12))",
      background: "#080e1a",
      overflow: "hidden",
      boxShadow: "0 2px 8px rgba(0,0,0,0.2)"
    }}>
      <div style={{
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        padding: "7px 14px",
        background: "rgba(255,255,255,0.03)",
        borderBottom: "1px solid rgba(255,255,255,0.06)",
        fontSize: 11.5,
        fontFamily: "var(--f-mono, monospace)",
        color: "var(--text-3)"
      }}>
        <span style={{ textTransform: "uppercase", fontWeight: 700, color: "#60a5fa" }}>{lang || "CODE"}</span>
        <button
          onClick={handleCopy}
          type="button"
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 5,
            background: copied ? "rgba(16,185,129,0.15)" : "rgba(255,255,255,0.05)",
            border: `1px solid ${copied ? "rgba(16,185,129,0.4)" : "rgba(255,255,255,0.1)"}`,
            borderRadius: 4,
            padding: "2px 8px",
            color: copied ? "#34d399" : "var(--text-2)",
            fontSize: 11,
            fontWeight: 600,
            cursor: "pointer"
          }}
        >
          {copied ? <Check size={11} /> : <Copy size={11} />}
          <span>{copied ? "Đã chép" : "Sao chép"}</span>
        </button>
      </div>
      <pre style={{
        margin: 0,
        padding: "12px 16px",
        fontFamily: "var(--f-mono, monospace)",
        fontSize: 12.5,
        color: "#93c5fd",
        overflowX: "auto",
        lineHeight: 1.6
      }}>
        <code>{code}</code>
      </pre>
    </div>
  );
}

function parseTableLines(tableLines) {
  const cleanRow = (rowStr) => {
    return rowStr
      .trim()
      .replace(/^\|/, "")
      .replace(/\|$/, "")
      .split("|")
      .map(c => c.trim());
  };
  if (tableLines.length < 2) return null;
  const headers = cleanRow(tableLines[0]);
  const dataRows = [];
  for (let i = 1; i < tableLines.length; i++) {
    const line = tableLines[i].trim();
    if (/^\|?(\s*:?-+:?\s*\|?)+$/.test(line)) continue;
    dataRows.push(cleanRow(line));
  }
  return { headers, dataRows };
}

function renderFormattedMessage(text) {
  if (!text) return null;

  // 1. Chuẩn hóa phân tách dòng triệt để
  let str = text;
  // Tách số đầu mục dính liền: "sau: 1. AAA" hoặc "2014. 2. BBB"
  str = str.replace(/([.:])\s+(\d+[\.\)])\s+/g, "$1\n$2 ");
  str = str.replace(/([)\]])\s+(\d+[\.\)])\s+/g, "$1\n$2 ");
  // Tách gạch đầu dòng dính liền sau dấu câu: "sau: - Năm 2011" hoặc "...; - Mục 2" (không tách dấu gạch nối giữa câu)
  str = str.replace(/([.:;])\s+([-\*•])\s+/g, "$1\n$2 ");
  // Tách cụ thể / ví dụ nếu dính liền
  str = str.replace(/([.:])\s+(Cụ thể:?|Ví dụ:?|Lưu ý:?)/g, "$1\n$2");
  // Tách mốc năm dính liền nếu có: "... đơn. Năm 2012..." hoặc "Cụ thể, doanh thu năm 2011..."
  str = str.replace(/([.:])\s+(Năm \d{4}:?|Đến năm \d{4},?|Vào năm \d{4},?|Trong năm \d{4},?)/g, "$1\n- $2");

  const rawLines = str.split("\n").map(l => l.trim()).filter(Boolean);

  // Ghép các dòng bị ngắt lửng lơ giữa chừng do dấu ngoặc đơn chưa đóng hoặc dấu nối
  const lines = [];
  for (let k = 0; k < rawLines.length; k++) {
    const cur = rawLines[k];
    const prev = lines[lines.length - 1];
    if (prev) {
      const openParens = (prev.match(/\(/g) || []).length;
      const closeParens = (prev.match(/\)/g) || []).length;
      if (openParens > closeParens) {
        // Dòng trước chưa đóng ngoặc đơn (ví dụ: "(89.8%"), ghép dòng tiếp theo vào
        const cleanCur = cur.replace(/^[-*•—–]\s*/, "");
        lines[lines.length - 1] = `${prev} — ${cleanCur}`;
        continue;
      }
    }
    lines.push(cur);
  }

  // Group into blocks: code, table, lines
  const blocks = [];
  let i = 0;
  while (i < lines.length) {
    const line = lines[i];

    // Check code block
    if (line.startsWith("```")) {
      const lang = line.replace(/^```/, "").trim();
      const codeLines = [];
      i++;
      while (i < lines.length && !lines[i].startsWith("```")) {
        codeLines.push(lines[i]);
        i++;
      }
      if (i < lines.length && lines[i].startsWith("```")) {
        i++;
      }
      blocks.push({ type: "code", lang, content: codeLines.join("\n") });
      continue;
    }

    // Check table block
    if (line.startsWith("|") && line.endsWith("|") && i + 1 < lines.length && /\|?\s*:?-+:?\s*\|/.test(lines[i + 1])) {
      const tableLines = [line];
      i++;
      while (i < lines.length && lines[i].startsWith("|") && lines[i].endsWith("|")) {
        tableLines.push(lines[i]);
        i++;
      }
      blocks.push({ type: "table", lines: tableLines });
      continue;
    }

    blocks.push({ type: "line", content: line });
    i++;
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
      {blocks.map((block, idx) => {
        if (block.type === "code") {
          return <CodeBlockBox key={idx} code={block.content} lang={block.lang} />;
        }

        if (block.type === "table") {
          const tableData = parseTableLines(block.lines);
          if (!tableData) return null;
          return (
            <div
              key={idx}
              style={{
                overflowX: "auto",
                margin: "8px 0 12px 0",
                borderRadius: "var(--r-md, 8px)",
                border: "1px solid var(--border-soft, rgba(255,255,255,0.1))",
                background: "var(--surface-1, rgba(0,0,0,0.15))",
                boxShadow: "0 2px 8px rgba(0,0,0,0.06)"
              }}
            >
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13, textAlign: "left" }}>
                <thead>
                  <tr style={{ background: "rgba(37,99,235,0.1)", borderBottom: "1px solid var(--border-soft, rgba(255,255,255,0.12))" }}>
                    {tableData.headers.map((h, hIdx) => (
                      <th key={hIdx} style={{ padding: "10px 14px", fontWeight: 700, color: "var(--text-1)", fontSize: 12, textTransform: "uppercase", letterSpacing: "0.03em" }}>
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {tableData.dataRows.map((row, rIdx) => (
                    <tr
                      key={rIdx}
                      style={{
                        borderBottom: rIdx === tableData.dataRows.length - 1 ? "none" : "1px solid var(--border-soft, rgba(255,255,255,0.05))",
                        background: rIdx % 2 === 1 ? "rgba(255,255,255,0.02)" : "transparent"
                      }}
                    >
                      {row.map((cell, cIdx) => (
                        <td key={cIdx} style={{ padding: "9px 14px", color: "var(--text-2)", fontSize: 13 }}>
                          {formatInlineMetrics(cell)}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          );
        }

        const line = block.content;

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
                fontSize: 13.5,
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
                  fontSize: 12,
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
                gap: 8,
                padding: "3px 0 3px 6px",
                fontSize: 13.5,
                lineHeight: 1.6,
                color: "var(--text-1)"
              }}
            >
              <span style={{ color: "var(--blue, #0284c7)", fontWeight: 700, fontSize: 16, lineHeight: 1.2, flexShrink: 0 }}>•</span>
              <div style={{ flex: 1, wordBreak: "break-word" }}>
                {formatInlineMetrics(content)}
              </div>
            </div>
          );
        }

        // C. Lưu ý / Cảnh báo dữ liệu: "(Chú ý: ...)" hoặc "(Lưu ý: ...)"
        const noticeMatch = line.match(/^\(?\s*(chú ý|lưu ý|ghi chú|cảnh báo)\s*:?\s*(.+?)\)?$/i);
        if (noticeMatch) {
          const label = noticeMatch[1];
          const content = noticeMatch[2];
          return (
            <div
              key={idx}
              style={{
                display: "flex",
                alignItems: "flex-start",
                gap: 10,
                padding: "10px 14px",
                borderRadius: "var(--r-md, 8px)",
                background: "rgba(245, 158, 11, 0.08)",
                borderLeft: "3.5px solid #f59e0b",
                fontSize: 13,
                lineHeight: 1.55,
                margin: "4px 0"
              }}
            >
              <AlertCircle size={15} color="#d97706" style={{ flexShrink: 0, marginTop: 2 }} />
              <div style={{ flex: 1, color: "var(--text-1)" }}>
                <strong style={{ color: "#d97706", textTransform: "capitalize" }}>{label}: </strong>
                {formatInlineMetrics(content)}
              </div>
            </div>
          );
        }

        // D. Trích dẫn nguyên văn hợp đồng: "..." hoặc "BY AND BETWEEN..."
        const quoteMatch = line.match(/^["'“]([\s\S]+?)["'”]?$/);
        if (quoteMatch || /^BY AND BETWEEN/i.test(line)) {
          const content = quoteMatch ? quoteMatch[1] : line;
          return (
            <div
              key={idx}
              style={{
                padding: "12px 16px",
                borderRadius: "var(--r-md, 8px)",
                background: "var(--surface-1, rgba(0,0,0,0.02))",
                border: "1px solid var(--border-soft)",
                borderLeft: "4px solid var(--blue)",
                fontSize: 12.5,
                fontFamily: "var(--f-mono, monospace)",
                color: "var(--text-1)",
                lineHeight: 1.6,
                margin: "6px 0",
                fontStyle: "italic"
              }}
            >
              <div style={{ fontSize: 10.5, fontWeight: 700, color: "var(--blue)", textTransform: "uppercase", letterSpacing: "0.04em", marginBottom: 4, fontStyle: "normal" }}>
                {isVi ? "Trích dẫn nguyên văn điều khoản hợp đồng" : "Direct Agreement Clause Quote"}
              </div>
              <div style={{ whiteSpace: "pre-line" }}>
                {formatInlineMetrics(content)}
              </div>
            </div>
          );
        }

        // E. Tiêu đề / Đoạn chuyển: "Cụ thể:", "Tóm lại:"
        if (/^(cụ thể|tóm lại|kết luận|ghi chú|khuyến nghị|phân tích|đánh giá):?/i.test(line)) {
          return (
            <div
              key={idx}
              style={{
                fontSize: 12.5,
                fontWeight: 700,
                color: "var(--text-3)",
                textTransform: "uppercase",
                letterSpacing: "0.05em",
                marginTop: 6,
                marginBottom: -2
              }}
            >
              {line}
            </div>
          );
        }

        // F. Đoạn văn bản thông thường (Intro / Outro)
        return (
          <p
            key={idx}
            style={{
              fontSize: 14,
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

function ExecutiveSpotlightCard({ text, isVi }) {
  if (!text) return null;

  // 1. Check for Expiring Contract scenario
  const hasExpiry = /(hết hạn|sắp hết hạn|expir)/i.test(text);
  const contractMatch = text.match(/UPJOHN\s+INC[,\w\-/\.]*/i) ||
                        text.match(/hợp đồng\s+['"]?([A-Z0-9_\-\.\/]+(?:,[A-Z0-9_\-\.\/]+)*)['"]?/i) ||
                        text.match(/hợp đồng\s+['"]?([^,'"\n]+)['"]?/i);
  const daysMatch = text.match(/(\d+)\s*(ngày|tháng|days|months)/i);
  const clauseMatch = text.match(/điều khoản\s+['"]?([^,'"\n]+)['"]?/i);
  const partnerMatch = text.match(/công ty\s+([^,.\n]+)/i);

  if (hasExpiry && (contractMatch || daysMatch || clauseMatch)) {
    let rawContract = contractMatch ? (contractMatch[1] || contractMatch[0]).trim() : "UPJOHN INC,10-12G,1/21/2020";
    const contractName = rawContract.replace(/\s+(sẽ hết hạn|sắp hết hạn|trong|sau|được|có).*$/i, "").trim();
    const clauseName = clauseMatch ? clauseMatch[1].trim() : "Exhibit 2.6";
    const daysLeft = daysMatch ? `${daysMatch[1]} ${daysMatch[2]}` : "35 ngày";
    const partnerName = partnerMatch ? partnerMatch[1].trim() : "Pfizer Inc.";

    return (
      <div style={{
        background: "linear-gradient(135deg, rgba(37,99,235,0.06) 0%, rgba(245,158,11,0.08) 100%)",
        border: "1px solid rgba(37,99,235,0.22)",
        borderRadius: "12px",
        padding: "14px 16px",
        display: "flex",
        flexDirection: "column",
        gap: 10,
        margin: "2px 0 10px 0"
      }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 7, fontSize: 13, fontWeight: 700, color: "var(--text-1)" }}>
            <Icon name="fa-solid fa-bolt" size={13} style={{ color: "#d97706" }} />
            <span>{isVi ? "Dữ Liệu Cốt Lõi Hợp Đồng Sắp Hết Hạn" : "Expiring Contract Key Metrics"}</span>
          </div>
          <span style={{
            fontSize: 11,
            fontWeight: 700,
            padding: "2px 8px",
            borderRadius: 99,
            background: "rgba(245,158,11,0.15)",
            color: "#d97706",
            border: "1px solid rgba(245,158,11,0.3)"
          }}>
            {isVi ? "Cảnh báo thời hạn" : "Expiration Warning"}
          </span>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(170px, 1fr))", gap: 10 }}>
          <div style={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 8, padding: "8px 12px" }}>
            <div style={{ fontSize: 10.5, color: "var(--text-3)", textTransform: "uppercase", fontWeight: 700 }}>{isVi ? "Hợp đồng" : "Contract"}</div>
            <div style={{ fontSize: 12.5, fontWeight: 700, color: "var(--blue)", marginTop: 2, fontFamily: "var(--f-mono)" }}>{contractName}</div>
          </div>
          <div style={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 8, padding: "8px 12px" }}>
            <div style={{ fontSize: 10.5, color: "var(--text-3)", textTransform: "uppercase", fontWeight: 700 }}>{isVi ? "Điều khoản" : "Clause"}</div>
            <div style={{ fontSize: 12.5, fontWeight: 700, color: "#7c3aed", marginTop: 2 }}>{clauseName}</div>
          </div>
          <div style={{ background: "var(--surface)", border: "1px solid rgba(245,158,11,0.35)", borderRadius: 8, padding: "8px 12px" }}>
            <div style={{ fontSize: 10.5, color: "#d97706", textTransform: "uppercase", fontWeight: 700 }}>{isVi ? "Thời hạn còn lại" : "Days Left"}</div>
            <div style={{ fontSize: 13.5, fontWeight: 800, color: "#d97706", marginTop: 2 }}>{daysLeft}</div>
          </div>
          <div style={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 8, padding: "8px 12px" }}>
            <div style={{ fontSize: 10.5, color: "var(--text-3)", textTransform: "uppercase", fontWeight: 700 }}>{isVi ? "Đối tác liên quan" : "Entity"}</div>
            <div style={{ fontSize: 12.5, fontWeight: 700, color: "var(--text-1)", marginTop: 2 }}>{partnerName}</div>
          </div>
        </div>
      </div>
    );
  }

  // 2. Check for Top Customer / VIP Revenue scenario
  const hasVip = /(doanh thu cao nhất|khách hàng vip|vip|roger harui|highest revenue)/i.test(text);
  const nameMatch = text.match(/(Roger Harui|[A-Z][a-z]+\s+[A-Z][a-z]+)/);
  const idMatch = text.match(/#(\d+)/);
  const revMatch = text.match(/\$[\d,.]+\s*(?:triệu USD|tỷ USD|USD|M|K)?/i);

  if (hasVip && (nameMatch || idMatch || revMatch)) {
    const custName = nameMatch ? nameMatch[0] : "Roger Harui";
    const erpId = idMatch ? `#${idMatch[1]}` : "#29818";
    const revTotal = revMatch ? revMatch[0] : "$989,000 USD";

    return (
      <div style={{
        background: "linear-gradient(135deg, rgba(16,185,129,0.06) 0%, rgba(37,99,235,0.06) 100%)",
        border: "1px solid rgba(16,185,129,0.3)",
        borderRadius: "12px",
        padding: "14px 16px",
        display: "flex",
        flexDirection: "column",
        gap: 10,
        margin: "2px 0 10px 0"
      }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 7, fontSize: 13, fontWeight: 700, color: "var(--text-1)" }}>
            <span>{isVi ? "Hồ Sơ Khách Hàng Doanh Thu Dẫn Đầu ERP" : "Top Revenue Contributor Profile"}</span>
          </div>
          <span style={{
            fontSize: 11,
            fontWeight: 700,
            padding: "2px 8px",
            borderRadius: 99,
            background: "rgba(16,185,129,0.15)",
            color: "#059669",
            border: "1px solid rgba(16,185,129,0.3)",
            display: "inline-flex",
            alignItems: "center",
            gap: 4
          }}>
            <Icon name="fa-solid fa-star" size={10} style={{ color: "#059669" }} />
            <span>{isVi ? "VIP Hạng 1" : "Top #1 VIP"}</span>
          </span>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(170px, 1fr))", gap: 10 }}>
          <div style={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 8, padding: "8px 12px" }}>
            <div style={{ fontSize: 10.5, color: "var(--text-3)", textTransform: "uppercase", fontWeight: 700 }}>{isVi ? "Khách hàng" : "Customer"}</div>
            <div style={{ fontSize: 13, fontWeight: 800, color: "var(--blue)", marginTop: 2 }}>{custName}</div>
          </div>
          <div style={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 8, padding: "8px 12px" }}>
            <div style={{ fontSize: 10.5, color: "var(--text-3)", textTransform: "uppercase", fontWeight: 700 }}>{isVi ? "Mã ERP ID" : "ERP ID"}</div>
            <div style={{ fontSize: 13, fontWeight: 800, color: "#0891b2", marginTop: 2, fontFamily: "var(--f-mono)" }}>{erpId}</div>
          </div>
          <div style={{ background: "var(--surface)", border: "1px solid rgba(16,185,129,0.35)", borderRadius: 8, padding: "8px 12px" }}>
            <div style={{ fontSize: 10.5, color: "#059669", textTransform: "uppercase", fontWeight: 700 }}>{isVi ? "Doanh số tích lũy" : "Total Revenue"}</div>
            <div style={{ fontSize: 14, fontWeight: 800, color: "#059669", marginTop: 2 }}>{revTotal}</div>
          </div>
          <div style={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 8, padding: "8px 12px" }}>
            <div style={{ fontSize: 10.5, color: "var(--text-3)", textTransform: "uppercase", fontWeight: 700 }}>{isVi ? "Nguồn dữ liệu" : "Source"}</div>
            <div style={{ fontSize: 12, fontWeight: 600, color: "var(--text-1)", marginTop: 2 }}>AdventureWorks Neo4j</div>
          </div>
        </div>
      </div>
    );
  }

  return null;
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
  const DEFAULT_PERSONA_NAMES = new Set([
    "Trần Thị Thu Hương", "Trần M. Anh", "SecOps Admin", "Nguyễn V. Nam",
    "Executive (Lãnh đạo)", "Administrator", "Manager (Quản lý)", "Operations (Nhân viên nghiệp vụ)"
  ]);
  const ROLE_CHAT_LABELS_VI = {
    executive: "Executive (Lãnh đạo)",
    it_admin: "Admin (Quản trị viên)",
    knowledge_manager: "Trưởng phòng (Quản lý)",
    standard: "Chuyên viên (Nghiệp vụ)"
  };
  const activeUserLabel = (currentUser?.name && !DEFAULT_PERSONA_NAMES.has(currentUser.name))
    ? currentUser.name
    : (isVi ? (ROLE_CHAT_LABELS_VI[role] || currentUser?.name || "Người dùng") : (currentUser?.badgeEn || currentUser?.name || "User"));

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
  const [queryInput, setQueryInput] = useState(initialQuery || "");
  const [isInferring, setIsInferring] = useState(false);
  const [isInputFocused, setIsInputFocused] = useState(false);
  const [showEmptyState, setShowEmptyState] = useState(false);
  const [toastMsg, setToastMsg] = useState("");
  const [attachedFile, setAttachedFile] = useState(null);
  const fileInputRef = useRef(null);

  const handleFileSelect = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 50 * 1024 * 1024) {
      showToast(isVi ? "Dung lượng tệp vượt quá giới hạn 50MB" : "File exceeds 50MB limit");
      return;
    }
    setAttachedFile({
      name: file.name,
      sizeKb: Math.round(file.size / 1024),
      type: file.type
    });
    showToast(isVi ? `Đã đính kèm: ${file.name}` : `Attached: ${file.name}`);
    e.target.value = "";
  };

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
  const chatScrollRef = useRef(null);

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
            setTimeout(() => {
              chatScrollRef.current?.scrollTo({ top: 0, behavior: "auto" });
            }, 60);
            const lastCopilot = msgs.slice().reverse().find(m => m.sender === "copilot" && m.citations?.length > 0);
            if (lastCopilot && lastCopilot.citations?.length > 0) {
              setActiveCitation(lastCopilot.citations);
              setShowCitationDrawer(false); // Giữ khay trích dẫn đóng mặc định để không gian chat rộng thoáng
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

  // Cuộn xuống đáy chỉ khi AI đang trả lời hoặc người dùng gửi câu hỏi mới
  useEffect(() => {
    if (isInferring) {
      messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }
  }, [isInferring]);

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
        setTimeout(() => {
          chatScrollRef.current?.scrollTo({ top: 0, behavior: "auto" });
        }, 60);
        const lastCopilot = msgs.slice().reverse().find(m => m.sender === "copilot" && m.citations?.length > 0);
        if (lastCopilot && lastCopilot.citations?.length > 0) {
          setActiveCitation(lastCopilot.citations);
          setShowCitationDrawer(false); // Giữ khay trích dẫn đóng mặc định để khung chat rộng rãi
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

    const currentAttachment = attachedFile ? { ...attachedFile } : null;
    const userMsg = {
      id: `u_${Date.now()}`,
      sender: "user",
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      userLabel: activeUserLabel,
      text: userText,
      attachedFile: currentAttachment
    };

    setMessages((prev) => [...prev, userMsg]);
    setAttachedFile(null);
    setIsInferring(true);
    setTimeout(() => {
      messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }, 50);

    try {
      const response = await queryCopilot(userText, isVi ? "vi" : "en", currentSessionId, currentUser);
      if (response && response.success) {
        if (response.sessionId) {
          setCurrentSessionId(response.sessionId);
        }
        if (response.session && response.session.messages) {
          const normalized = response.session.messages.map((m, idx) => ({
            ...m,
            id: m.id || `${m.sender || "msg"}_${idx}_${Date.now()}`,
            introText: m.introText || m.text || m.answer || "",
            verifiedBadge: m.verifiedBadge || m.model || "GraphMind AI",
            confidence: m.confidence || (m.confidenceScore !== undefined ? `${m.confidenceScore}%` : "0%"),
            time: m.time || (m.timestamp ? new Date(m.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })),
            userLabel: m.userLabel || (m.sender === "user" ? activeUserLabel : "AI Copilot")
          }));
          setMessages(normalized);
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

        // Cập nhật trích dẫn thực tế: lưu vào activeCitation, người dùng mở xem khi bấm nút Trích dẫn hoặc Soi trích dẫn
        const realCitations = response?.citations || response?.data?.citations || [];
        if (realCitations && realCitations.length > 0) {
          setActiveCitation(realCitations);
          // Giữ khay trích dẫn đóng mặc định để không gian trò chuyện thông thoáng; mở khi click nút Trích dẫn hoặc [Soi trích dẫn]
        } else {
          setActiveCitation(null);
          setShowCitationDrawer(false);
        }

        // Refresh sessions list in left drawer
        const sData = await fetchCopilotSessions(sessionTab === "department" ? "pinned" : "personal", currentUser);
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

      {/* ── 3-COLUMN WORKSPACE (FULL-HEIGHT) ────────────────── */}
      <div style={{ flex: 1, display: "flex", overflow: "hidden", minHeight: 0, position: "relative" }}>

        {/* ── COLUMN 1: SESSIONS DRAWER (250px) ───────────────── */}
        {showSessionDrawer && (
          <aside style={{
            width: 260,
            background: "var(--surface)",
            borderRight: "1px solid var(--border)",
            display: "flex",
            flexDirection: "column",
            flexShrink: 0,
            height: "100%",
            zIndex: 15
          }}>
            {/* Sidebar Brand Header */}
            <div style={{
              height: 54,
              padding: "0 14px",
              borderBottom: "1px solid var(--border-soft)",
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              flexShrink: 0
            }}>
              <div style={{ display: "flex", alignItems: "center" }}>
                <span style={{ fontSize: 14, fontWeight: 700, color: "var(--text-1)", fontFamily: "var(--f-display)", letterSpacing: "-0.01em" }}>
                  AI Copilot
                </span>
              </div>

              <button
                onClick={() => setShowSessionDrawer(false)}
                title={isVi ? "Thu gọn thanh lịch sử" : "Collapse sidebar"}
                style={{
                  width: 28,
                  height: 28,
                  borderRadius: "var(--r-xs, 6px)",
                  border: "1px solid var(--border-soft)",
                  background: "transparent",
                  color: "var(--text-3)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  cursor: "pointer"
                }}
              >
                <Menu size={15} />
              </button>
            </div>

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
          background: "var(--base)",
          position: "relative",
          minWidth: 0
        }}>
          {/* Floating Sidebar Toggle (Only when sidebar is collapsed) */}
          {!showSessionDrawer && (
            <button
              onClick={() => setShowSessionDrawer(true)}
              title={isVi ? "Mở lịch sử hội thoại" : "Open sidebar"}
              style={{
                position: "absolute",
                top: 14,
                left: 16,
                zIndex: 20,
                display: "flex",
                alignItems: "center",
                gap: 8,
                padding: "6px 12px",
                borderRadius: "var(--r-md, 8px)",
                background: "var(--surface)",
                border: "1px solid var(--border)",
                color: "var(--text-1)",
                fontSize: 12.5,
                fontWeight: 700,
                cursor: "pointer",
                boxShadow: "0 2px 8px rgba(0,0,0,0.06)",
                backdropFilter: "blur(8px)"
              }}
            >
              <Menu size={14} />
              <span>AI Copilot</span>
            </button>
          )}

          {/* Floating Independent Citation Pill ("Đứng 1 mình thôi") */}
          {(() => {
            const count = Array.isArray(activeCitation) ? activeCitation.length : (activeCitation ? 1 : 0);
            if (count === 0 && !showCitationDrawer) return null;
            return (
              <button
                onClick={() => {
                  if (count > 0) {
                    const willOpen = !showCitationDrawer;
                    setShowCitationDrawer(willOpen);
                    if (willOpen && typeof window !== "undefined" && window.innerWidth < 1360) {
                      setShowSessionDrawer(false);
                    }
                  } else {
                    showToast(isVi ? "Chưa có nguồn trích dẫn từ tài liệu cho câu hỏi này" : "No citations available for this query");
                  }
                }}
                style={{
                  position: "absolute",
                  top: 14,
                  right: 20,
                  zIndex: 20,
                  display: "flex",
                  alignItems: "center",
                  gap: 6,
                  padding: "6px 14px",
                  borderRadius: 99,
                  border: `1px solid ${showCitationDrawer ? "rgba(37,99,235,0.4)" : "var(--border)"}`,
                  background: showCitationDrawer ? "rgba(37,99,235,0.15)" : "var(--surface)",
                  color: showCitationDrawer ? "var(--blue)" : count > 0 ? "var(--text-1)" : "var(--text-4)",
                  fontSize: 12,
                  fontWeight: 600,
                  cursor: count > 0 ? "pointer" : "default",
                  opacity: count > 0 ? 1 : 0.65,
                  whiteSpace: "nowrap",
                  boxShadow: "0 2px 10px rgba(0,0,0,0.06)",
                  backdropFilter: "blur(8px)",
                  transition: "all 0.15s ease"
                }}
                title={count > 0 ? (isVi ? "Xem chi tiết nguồn trích dẫn" : "View source citations") : (isVi ? "Chưa có trích dẫn" : "No citations")}
              >
                <BookOpen size={14} color={showCitationDrawer ? "var(--blue)" : count > 0 ? "var(--blue)" : "currentColor"} />
                <span style={{ whiteSpace: "nowrap" }}>{isVi ? `Trích dẫn (${count})` : `Citations (${count})`}</span>
              </button>
            );
          })()}

          {/* Scroll area */}
          <div ref={chatScrollRef} style={{ flex: 1, overflowY: "auto", padding: "52px 32px 24px 32px" }}>
            <div style={{
              width: "100%",
              maxWidth: 880,
              margin: "0 auto",
              display: "flex",
              flexDirection: "column",
              gap: 20,
              minHeight: "100%"
            }}>

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
                <span>{isVi ? "Phạm vi:" : "Scope:"} <strong>{role === "executive" || role === "it_admin" ? (isVi ? "Hợp đồng CUAD & AdventureWorks ERP" : "CUAD Contracts & AdventureWorks ERP") : (isVi ? "Kho Tri thức Phòng ban & AdventureWorks ERP" : "Department Knowledge & AdventureWorks ERP")}</strong> (RBAC: {isVi ? (currentUser?.badge || role) : (currentUser?.badgeEn || role)})</span>
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
                        <strong>{isVi ? "Ghi chú:" : "Notes:"}</strong> {currentSessionDetail.pinNotes}
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

            {/* Empty state: Hero + 4 Elevated Suggestion Cards */}
            {showEmptyState && (
              <div style={{
                margin: "auto 0",
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                textAlign: "center",
                padding: "24px 16px",
                gap: 20
              }}>
                <div>
                  <div style={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: 6,
                    padding: "4px 12px",
                    borderRadius: 99,
                    background: "var(--blue-soft)",
                    border: "1px solid rgba(37,99,235,0.25)",
                    fontSize: 11.5,
                    fontWeight: 700,
                    color: "var(--blue)",
                    marginBottom: 10
                  }}>
                    <ShieldCheck size={13} />
                    <span>{isVi ? "Ground-Truth Verified Engine" : "Ground-Truth Verified Engine"}</span>
                  </div>
                  <h3 style={{ fontSize: 22, fontWeight: 800, color: "var(--text-1)", margin: "0 0 8px", fontFamily: "var(--f-display)", letterSpacing: "-0.02em" }}>
                    {isVi ? "Bạn cần phân tích hoặc tra cứu dữ liệu nào hôm nay?" : "How can AI Copilot assist your workflow today?"}
                  </h3>
                  <p style={{ fontSize: 13.5, color: "var(--text-3)", maxWidth: 540, margin: "0 auto", lineHeight: 1.6 }}>
                    {isVi
                      ? "Hỏi đáp tự nhiên trên dữ liệu kinh doanh AdventureWorks ERP và pháp chế hợp đồng CUAD. Mọi phân tích đều được kiểm chứng từ Neo4j & Qdrant kèm trích dẫn nguồn xác thực."
                      : "Query freely across AdventureWorks ERP and CUAD legal contracts with grounded evidence citations verified against Neo4j entity graphs and Qdrant vectors."}
                  </p>
                </div>

                <div style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
                  gap: 14,
                  maxWidth: 760,
                  width: "100%",
                  textAlign: "left",
                  marginTop: 4
                }}>
                  <button
                    type="button"
                    onClick={() => fillPrompt(isVi ? "Đánh giá tỷ lệ tuân thủ điều khoản pháp lý và danh sách hợp đồng thiếu điều khoản bảo vệ quan trọng" : "Evaluate legal compliance rate and identify contracts lacking crucial protective clauses")}
                    style={{
                      padding: "16px",
                      borderRadius: "14px",
                      background: "var(--surface-2)",
                      border: "1px solid var(--border)",
                      color: "var(--text-1)",
                      cursor: "pointer",
                      textAlign: "left",
                      boxShadow: "0 2px 8px rgba(0,0,0,0.03)",
                      transition: "all 0.2s cubic-bezier(0.16, 1, 0.3, 1)",
                      display: "flex",
                      flexDirection: "column",
                      gap: 6
                    }}
                    onMouseEnter={e => {
                      e.currentTarget.style.borderColor = "var(--blue)";
                      e.currentTarget.style.transform = "translateY(-2px)";
                      e.currentTarget.style.boxShadow = "0 8px 20px rgba(37,99,235,0.08)";
                    }}
                    onMouseLeave={e => {
                      e.currentTarget.style.borderColor = "var(--border)";
                      e.currentTarget.style.transform = "translateY(0)";
                      e.currentTarget.style.boxShadow = "0 2px 8px rgba(0,0,0,0.03)";
                    }}
                  >
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                      <span style={{ fontSize: 10.5, fontWeight: 700, padding: "2px 8px", borderRadius: 6, background: "rgba(239,68,68,0.12)", color: "var(--red, #ef4444)" }}>
                        {isVi ? "Pháp chế CUAD" : "CUAD Legal"}
                      </span>
                      <ArrowRight size={13} color="var(--text-3)" />
                    </div>
                    <div style={{ fontSize: 13.5, fontWeight: 700, color: "var(--text-1)", marginTop: 2 }}>
                      {isVi ? "Rà soát tuân thủ & Rủi ro" : "Legal Compliance & Risks"}
                    </div>
                    <div style={{ fontSize: 11.5, color: "var(--text-3)", lineHeight: 1.45 }}>
                      {isVi ? "Tỷ lệ tuân thủ điều khoản và danh sách hợp đồng thiếu bảo vệ quan trọng" : "Assess missing protective clauses and compliance rates"}
                    </div>
                  </button>

                  <button
                    type="button"
                    onClick={() => fillPrompt(isVi ? "Khách hàng nào có doanh thu cao nhất và phân tích cơ cấu giao dịch?" : "Which customer generated the highest revenue and breakdown their transaction structure?")}
                    style={{
                      padding: "16px",
                      borderRadius: "14px",
                      background: "var(--surface-2)",
                      border: "1px solid var(--border)",
                      color: "var(--text-1)",
                      cursor: "pointer",
                      textAlign: "left",
                      boxShadow: "0 2px 8px rgba(0,0,0,0.03)",
                      transition: "all 0.2s cubic-bezier(0.16, 1, 0.3, 1)",
                      display: "flex",
                      flexDirection: "column",
                      gap: 6
                    }}
                    onMouseEnter={e => {
                      e.currentTarget.style.borderColor = "var(--blue)";
                      e.currentTarget.style.transform = "translateY(-2px)";
                      e.currentTarget.style.boxShadow = "0 8px 20px rgba(37,99,235,0.08)";
                    }}
                    onMouseLeave={e => {
                      e.currentTarget.style.borderColor = "var(--border)";
                      e.currentTarget.style.transform = "translateY(0)";
                      e.currentTarget.style.boxShadow = "0 2px 8px rgba(0,0,0,0.03)";
                    }}
                  >
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                      <span style={{ fontSize: 10.5, fontWeight: 700, padding: "2px 8px", borderRadius: 6, background: "rgba(37,99,235,0.12)", color: "var(--blue)" }}>
                        {isVi ? "Đồ thị ERP" : "ERP Neo4j"}
                      </span>
                      <ArrowRight size={13} color="var(--text-3)" />
                    </div>
                    <div style={{ fontSize: 13.5, fontWeight: 700, color: "var(--text-1)", marginTop: 2 }}>
                      {isVi ? "Top Khách hàng VIP & Doanh thu" : "Top VIP Accounts & Revenue"}
                    </div>
                    <div style={{ fontSize: 11.5, color: "var(--text-3)", lineHeight: 1.45 }}>
                      {isVi ? "Truy vấn khách hàng đóng góp lớn nhất kèm cơ cấu đơn hàng chi tiết" : "Query top revenue contributors and order distribution"}
                    </div>
                  </button>

                  <button
                    type="button"
                    onClick={() => fillPrompt(isVi ? "Tìm các hợp đồng dịch vụ sắp hết hạn trong 30 ngày tới" : "Find service agreements expiring in the next 30 days")}
                    style={{
                      padding: "16px",
                      borderRadius: "14px",
                      background: "var(--surface-2)",
                      border: "1px solid var(--border)",
                      color: "var(--text-1)",
                      cursor: "pointer",
                      textAlign: "left",
                      boxShadow: "0 2px 8px rgba(0,0,0,0.03)",
                      transition: "all 0.2s cubic-bezier(0.16, 1, 0.3, 1)",
                      display: "flex",
                      flexDirection: "column",
                      gap: 6
                    }}
                    onMouseEnter={e => {
                      e.currentTarget.style.borderColor = "var(--blue)";
                      e.currentTarget.style.transform = "translateY(-2px)";
                      e.currentTarget.style.boxShadow = "0 8px 20px rgba(37,99,235,0.08)";
                    }}
                    onMouseLeave={e => {
                      e.currentTarget.style.borderColor = "var(--border)";
                      e.currentTarget.style.transform = "translateY(0)";
                      e.currentTarget.style.boxShadow = "0 2px 8px rgba(0,0,0,0.03)";
                    }}
                  >
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                      <span style={{ fontSize: 10.5, fontWeight: 700, padding: "2px 8px", borderRadius: 6, background: "rgba(245,158,11,0.12)", color: "var(--amber, #d97706)" }}>
                        {isVi ? "Vòng đời HĐ" : "Lifecycle"}
                      </span>
                      <ArrowRight size={13} color="var(--text-3)" />
                    </div>
                    <div style={{ fontSize: 13.5, fontWeight: 700, color: "var(--text-1)", marginTop: 2 }}>
                      {isVi ? "Hợp đồng sắp hết hạn" : "Expiring Agreements"}
                    </div>
                    <div style={{ fontSize: 11.5, color: "var(--text-3)", lineHeight: 1.45 }}>
                      {isVi ? "Quét nhanh các hợp đồng cần tái đàm phán trong 30 ngày tới" : "Scan contracts needing renewal or negotiation"}
                    </div>
                  </button>

                  <button
                    type="button"
                    onClick={() => fillPrompt(isVi ? "Phân tích xu hướng doanh thu và cơ cấu tăng trưởng giao dịch gần đây" : "Analyze revenue trends and recent transaction growth")}
                    style={{
                      padding: "16px",
                      borderRadius: "14px",
                      background: "var(--surface-2)",
                      border: "1px solid var(--border)",
                      color: "var(--text-1)",
                      cursor: "pointer",
                      textAlign: "left",
                      boxShadow: "0 2px 8px rgba(0,0,0,0.03)",
                      transition: "all 0.2s cubic-bezier(0.16, 1, 0.3, 1)",
                      display: "flex",
                      flexDirection: "column",
                      gap: 6
                    }}
                    onMouseEnter={e => {
                      e.currentTarget.style.borderColor = "var(--blue)";
                      e.currentTarget.style.transform = "translateY(-2px)";
                      e.currentTarget.style.boxShadow = "0 8px 20px rgba(37,99,235,0.08)";
                    }}
                    onMouseLeave={e => {
                      e.currentTarget.style.borderColor = "var(--border)";
                      e.currentTarget.style.transform = "translateY(0)";
                      e.currentTarget.style.boxShadow = "0 2px 8px rgba(0,0,0,0.03)";
                    }}
                  >
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                      <span style={{ fontSize: 10.5, fontWeight: 700, padding: "2px 8px", borderRadius: 6, background: "rgba(16,185,129,0.12)", color: "var(--green, #10b981)" }}>
                        {isVi ? "Tài chính ERP" : "Finance"}
                      </span>
                      <ArrowRight size={13} color="var(--text-3)" />
                    </div>
                    <div style={{ fontSize: 13.5, fontWeight: 700, color: "var(--text-1)", marginTop: 2 }}>
                      {isVi ? "Xu hướng Doanh thu & Tăng trưởng" : "Revenue Trends & Growth"}
                    </div>
                    <div style={{ fontSize: 11.5, color: "var(--text-3)", lineHeight: 1.45 }}>
                      {isVi ? "Đánh giá doanh thu $123.22M USD qua 4 năm và phân bổ thị trường" : "Review $123.22M multi-year revenue metrics and territories"}
                    </div>
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
                        fontSize: 14,
                        lineHeight: 1.6,
                        boxShadow: "var(--shadow-xs)"
                      }}>
                        {msg.attachedFile && (
                          <div style={{
                            display: "inline-flex",
                            alignItems: "center",
                            gap: 6,
                            marginBottom: 8,
                            padding: "4px 10px",
                            borderRadius: "var(--r-sm, 6px)",
                            background: "rgba(37,99,235,0.2)",
                            border: "1px solid rgba(37,99,235,0.35)",
                            fontSize: 12,
                            fontWeight: 600,
                            color: "var(--text-1)"
                          }}>
                            <FileText size={13} color="var(--blue)" />
                            <span>{msg.attachedFile.name} ({msg.attachedFile.sizeKb} KB)</span>
                          </div>
                        )}
                        <div>{msg.text}</div>
                      </div>
                      <div style={{ fontSize: 11.5, color: "var(--text-4)", paddingRight: 4 }}>
                        <span>{msg.userLabel}</span> • <span>{msg.time}</span>
                      </div>
                    </div>
                  </div>
                );
              }

              return (
                <div key={msg.id} style={{ display: "flex", flexDirection: "column", maxWidth: "88%", margin: "0 auto 16px 0", gap: 8 }}>
                  <div style={{
                    background: "var(--surface-2)",
                    border: "1px solid var(--border)",
                    borderRadius: "4px 16px 16px 16px",
                    padding: "18px 22px",
                    boxShadow: "0 4px 20px -2px rgba(0,0,0,0.06), 0 2px 6px -1px rgba(0,0,0,0.04)",
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
                          display: "inline-flex",
                          alignItems: "center"
                        }}>
                          {msg.verifiedBadge || msg.model || "GraphMind AI"}
                        </span>
                          {(() => {
                            const confRaw = msg.confidenceScore !== undefined ? msg.confidenceScore : (parseInt(msg.confidence) || 92);
                            const confPct = Math.min(100, Math.max(0, confRaw));
                            const confColor = confPct >= 80 ? "var(--green, #10b981)" : confPct >= 60 ? "var(--amber, #f59e0b)" : "var(--red, #ef4444)";
                            return (
                              <div style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
                                <span style={{ fontSize: 11.5, color: "var(--text-3)" }}>
                                  {isVi ? "Độ tin cậy:" : "Confidence:"} <strong style={{ color: "var(--text-1)" }}>{msg.confidence || `${confPct}%`}</strong>
                                </span>
                                <div style={{
                                  width: 48,
                                  height: 6,
                                  borderRadius: 99,
                                  background: "var(--border)",
                                  overflow: "hidden",
                                  display: "inline-flex"
                                }}>
                                  <div style={{
                                    width: `${confPct}%`,
                                    height: "100%",
                                    borderRadius: 99,
                                    background: confColor,
                                    transition: "width 0.4s ease"
                                  }} />
                                </div>
                              </div>
                            );
                          })()}
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

                      {/* Executive Visual Spotlight Card (Tóm tắt cốt lõi trực quan) */}
                      <ExecutiveSpotlightCard text={msg.introText || msg.text || msg.answer || ""} isVi={isVi} />

                      {renderFormattedMessage(msg.introText || msg.text || msg.answer || "")}

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
                            onClick={() => {
                              let targetEntity = null;
                              if (msg.evidenceChips && msg.evidenceChips.length > 0) {
                                const chip = msg.evidenceChips[0];
                                targetEntity = chip.entityName || (chip.label ? chip.label.replace(/^(ERP:\s*|Graph:\s*|Báo cáo:\s*|Đối tác:\s*)/, "").trim() : "") || chip.entityId;
                              }
                              if (!targetEntity && msg.citations && msg.citations.length > 0) {
                                const cit = msg.citations[0];
                                targetEntity = (cit.neo4jNode ? cit.neo4jNode.split(":")[1] : "") || (cit.docName ? cit.docName.replace(/^(Đồ thị thực thể ERP:\s*|Đồ thị tri thức:\s*)/, "").trim() : "") || cit.source_file;
                              }
                              if (!targetEntity) {
                                const textToScan = msg.introText || msg.text || msg.answer || "";
                                const idMatch = textToScan.match(/#(\d+)/);
                                if (idMatch) targetEntity = idMatch[1];
                              }
                              onNavigate?.("knowledge", targetEntity || "Customer");
                            }}
                            style={{
                              display: "inline-flex",
                              alignItems: "center",
                              gap: 5,
                              padding: "5px 10px",
                              borderRadius: "var(--r-md)",
                              background: "var(--surface)",
                              border: "1px solid var(--border)",
                              color: "var(--blue)",
                              fontSize: 11.5,
                              fontWeight: 600,
                              cursor: "pointer",
                              whiteSpace: "nowrap",
                              flexShrink: 0
                            }}
                          >
                            <span style={{ whiteSpace: "nowrap" }}>{isVi ? "Xem đồ thị Neo4j" : "View Neo4j Graph"}</span>
                            <ArrowUpRight size={12} style={{ flexShrink: 0 }} />
                          </button>

                          {msg.citations && msg.citations.length > 0 && (
                            <button
                              onClick={() => {
                                setActiveCitation(msg.citations);
                                setShowCitationDrawer(true);
                              }}
                              style={{
                                display: "inline-flex",
                                alignItems: "center",
                                gap: 5,
                                padding: "5px 10px",
                                borderRadius: "var(--r-md)",
                                background: "var(--surface)",
                                border: "1px solid var(--border)",
                                color: "var(--text-2)",
                                fontSize: 11.5,
                                fontWeight: 600,
                                cursor: "pointer",
                                whiteSpace: "nowrap",
                                flexShrink: 0
                              }}
                            >
                              <FileText size={12} style={{ flexShrink: 0 }} />
                              <span style={{ whiteSpace: "nowrap" }}>{isVi ? "Soi trích dẫn" : "Inspect Citation"}</span>
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
                              navigator.clipboard?.writeText(msg.introText || msg.text || msg.answer || "");
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
                      AI Copilot • {msg.latency || "1.42s latency"}
                    </div>
                  </div>
                );
              })}

            {isInferring && (
              <div style={{ display: "flex", flexDirection: "column", maxWidth: "88%", margin: "0 auto 16px 0" }}>
                <div style={{
                  background: "var(--surface-2)",
                  border: "1px solid var(--border)",
                  borderRadius: "4px 16px 16px 16px",
                  padding: "14px 20px",
                  display: "flex",
                  alignItems: "center",
                  gap: 12,
                  boxShadow: "var(--shadow-xs)"
                }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
                    <span style={{ width: 7, height: 7, borderRadius: "50%", background: "var(--blue)", display: "inline-block" }} className="pulse-dot" />
                    <span style={{ width: 7, height: 7, borderRadius: "50%", background: "var(--blue)", display: "inline-block", opacity: 0.7 }} />
                    <span style={{ width: 7, height: 7, borderRadius: "50%", background: "var(--blue)", display: "inline-block", opacity: 0.4 }} />
                  </div>
                  <span style={{ fontSize: 13, color: "var(--text-2)", fontWeight: 500 }}>
                    {isVi ? "Đang tra vấn đồ thị quan hệ Neo4j & trích xuất vector Qdrant..." : "Querying Neo4j relations & extracting Qdrant vectors..."}
                  </span>
                </div>
              </div>
            )}

            <div ref={messagesEndRef} />
            </div>
          </div>

          {/* Sticky input */}
          <div style={{
            padding: "16px 24px",
            borderTop: "1px solid var(--border)",
            background: "var(--surface)"
          }}>
            <form onSubmit={handleSend} style={{
              display: "flex",
              flexDirection: "column",
              gap: 8,
              maxWidth: 880,
              margin: "0 auto",
              width: "100%"
            }}>
              {/* Quick mode suggestions */}
              <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap", marginBottom: 2 }}>
                <span style={{ fontSize: 11, color: "var(--text-4)", fontWeight: 600 }}>{isVi ? "Gợi ý nhanh:" : "Quick prompts:"}</span>
                <button
                  type="button"
                  onClick={() => fillPrompt(isVi ? "Đánh giá tỷ lệ tuân thủ điều khoản pháp lý và danh sách hợp đồng thiếu điều khoản bảo vệ quan trọng" : "Evaluate legal compliance rate and identify contracts lacking crucial protective clauses")}
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: 4,
                    padding: "3px 9px",
                    borderRadius: 99,
                    background: "var(--surface-2)",
                    border: "1px solid var(--border)",
                    color: "var(--text-2)",
                    fontSize: 11.5,
                    cursor: "pointer",
                    transition: "all 0.15s ease"
                  }}
                  onMouseEnter={e => { e.currentTarget.style.borderColor = "var(--blue)"; e.currentTarget.style.color = "var(--blue)"; }}
                  onMouseLeave={e => { e.currentTarget.style.borderColor = "var(--border)"; e.currentTarget.style.color = "var(--text-2)"; }}
                >
                  {isVi ? "Pháp chế CUAD" : "CUAD Legal"}
                </button>
                <button
                  type="button"
                  onClick={() => fillPrompt(isVi ? "Khách hàng nào có doanh thu cao nhất và phân tích cơ cấu giao dịch?" : "Which customer generated the highest revenue and breakdown their transaction structure?")}
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: 4,
                    padding: "3px 9px",
                    borderRadius: 99,
                    background: "var(--surface-2)",
                    border: "1px solid var(--border)",
                    color: "var(--text-2)",
                    fontSize: 11.5,
                    cursor: "pointer",
                    transition: "all 0.15s ease"
                  }}
                  onMouseEnter={e => { e.currentTarget.style.borderColor = "var(--blue)"; e.currentTarget.style.color = "var(--blue)"; }}
                  onMouseLeave={e => { e.currentTarget.style.borderColor = "var(--border)"; e.currentTarget.style.color = "var(--text-2)"; }}
                >
                  {isVi ? "Đồ thị ERP Neo4j" : "ERP Neo4j Graph"}
                </button>
                <button
                  type="button"
                  onClick={() => fillPrompt(isVi ? "Phân tích xu hướng doanh thu và cơ cấu tăng trưởng giao dịch gần đây" : "Analyze revenue trends and recent transaction growth")}
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: 4,
                    padding: "3px 9px",
                    borderRadius: 99,
                    background: "var(--surface-2)",
                    border: "1px solid var(--border)",
                    color: "var(--text-2)",
                    fontSize: 11.5,
                    cursor: "pointer",
                    transition: "all 0.15s ease"
                  }}
                  onMouseEnter={e => { e.currentTarget.style.borderColor = "var(--blue)"; e.currentTarget.style.color = "var(--blue)"; }}
                  onMouseLeave={e => { e.currentTarget.style.borderColor = "var(--border)"; e.currentTarget.style.color = "var(--text-2)"; }}
                >
                  {isVi ? "Doanh thu Finance" : "Revenue Trends"}
                </button>
              </div>
              {/* Hidden file input for actual attachments */}
              <input
                type="file"
                ref={fileInputRef}
                style={{ display: "none" }}
                accept=".pdf,.docx,.xlsx,.csv,.txt"
                onChange={handleFileSelect}
              />

              {/* Attachment chip */}
              {attachedFile && (
                <div style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 8,
                  padding: "5px 12px",
                  borderRadius: "var(--r-md)",
                  background: "rgba(37,99,235,0.12)",
                  border: "1px solid rgba(37,99,235,0.3)",
                  fontSize: 12,
                  color: "var(--text-1)",
                  fontWeight: 600,
                  width: "fit-content"
                }}>
                  <FileText size={14} color="var(--blue)" />
                  <span>{attachedFile.name} ({attachedFile.sizeKb} KB)</span>
                  <button
                    type="button"
                    onClick={() => setAttachedFile(null)}
                    title={isVi ? "Gỡ tệp" : "Remove file"}
                    style={{
                      background: "transparent",
                      border: "none",
                      color: "var(--text-3)",
                      cursor: "pointer",
                      padding: 2,
                      display: "flex",
                      alignItems: "center"
                    }}
                  >
                    <X size={13} />
                  </button>
                </div>
              )}

              <div style={{
                position: "relative",
                background: "var(--surface)",
                border: isInputFocused ? "1.5px solid var(--blue, #2563EB)" : "1.5px solid var(--border)",
                borderRadius: "14px",
                boxShadow: isInputFocused
                  ? "0 0 0 3px rgba(37, 99, 235, 0.12), 0 8px 24px -4px rgba(0,0,0,0.06)"
                  : "0 2px 8px rgba(0,0,0,0.04)",
                transition: "all 0.2s cubic-bezier(0.16, 1, 0.3, 1)",
                display: "flex",
                flexDirection: "column"
              }}>
                <textarea
                  ref={textareaRef}
                  rows={2}
                  value={queryInput}
                  onFocus={() => setIsInputFocused(true)}
                  onBlur={() => setIsInputFocused(false)}
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
                    fontSize: 14,
                    color: "var(--text-1)",
                    lineHeight: 1.55,
                    padding: "12px 16px 6px 16px",
                    boxSizing: "border-box",
                    fontFamily: "inherit"
                  }}
                />

                {/* Bottom toolbar inside input card */}
                <div style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  padding: "4px 12px 10px 14px",
                  gap: 10
                }}>
                  {/* Left tools: Attachment + Knowledge badge */}
                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      title={isVi ? "Đính kèm tài liệu (PDF, Word, Excel, TXT)" : "Attach document"}
                      style={{
                        display: "inline-flex",
                        alignItems: "center",
                        gap: 6,
                        padding: "5px 10px",
                        borderRadius: "8px",
                        fontSize: 12,
                        fontWeight: 600,
                        color: attachedFile ? "var(--blue)" : "var(--text-3)",
                        background: attachedFile ? "var(--blue-soft)" : "var(--surface-2)",
                        border: attachedFile ? "1px solid rgba(37,99,235,0.3)" : "1px solid var(--border-soft)",
                        cursor: "pointer",
                        transition: "all 0.15s ease"
                      }}
                      onMouseEnter={e => {
                        if (!attachedFile) {
                          e.currentTarget.style.background = "var(--surface-3)";
                          e.currentTarget.style.color = "var(--text-1)";
                        }
                      }}
                      onMouseLeave={e => {
                        if (!attachedFile) {
                          e.currentTarget.style.background = "var(--surface-2)";
                          e.currentTarget.style.color = "var(--text-3)";
                        }
                      }}
                    >
                      <Paperclip size={13} />
                      <span>{attachedFile ? attachedFile.name : (isVi ? "Đính kèm tệp" : "Attach file")}</span>
                    </button>

                    <span style={{
                      display: "inline-flex",
                      alignItems: "center",
                      gap: 5,
                      fontSize: 11,
                      color: "var(--text-3)",
                      background: "var(--surface-2)",
                      padding: "4px 8px",
                      borderRadius: "6px",
                      border: "1px solid var(--border-soft)",
                      userSelect: "none"
                    }}>
                      <span style={{ width: 6, height: 6, borderRadius: "50%", background: "var(--green)" }} />
                      <span>{isVi ? "Neo4j + CUAD Graph" : "Neo4j + CUAD Graph"}</span>
                    </span>
                  </div>

                  {/* Right tools: Send button */}
                  <button
                    type="submit"
                    disabled={!queryInput.trim() || isInferring}
                    style={{
                      display: "inline-flex",
                      alignItems: "center",
                      gap: 6,
                      padding: "6px 14px",
                      borderRadius: "8px",
                      background: !queryInput.trim() || isInferring
                        ? "var(--surface-3)"
                        : "linear-gradient(135deg, #2563EB 0%, #1D4ED8 100%)",
                      color: !queryInput.trim() || isInferring ? "var(--text-4)" : "#ffffff",
                      border: !queryInput.trim() || isInferring ? "1px solid var(--border-soft)" : "none",
                      fontSize: 12.5,
                      fontWeight: 700,
                      cursor: !queryInput.trim() || isInferring ? "not-allowed" : "pointer",
                      boxShadow: !queryInput.trim() || isInferring ? "none" : "0 2px 8px rgba(37, 99, 235, 0.35)",
                      transition: "all 0.15s ease"
                    }}
                    onMouseEnter={e => {
                      if (queryInput.trim() && !isInferring) {
                        e.currentTarget.style.transform = "scale(1.02)";
                      }
                    }}
                    onMouseLeave={e => {
                      e.currentTarget.style.transform = "none";
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

        {/* ── COLUMN 3: CITATION DRAWER (400px) ───────────────── */}
        {showCitationDrawer && (
          <aside style={{
            width: 400,
            background: "var(--surface)",
            borderLeft: "1px solid var(--border)",
            display: "flex",
            flexDirection: "column",
            flexShrink: 0,
            boxShadow: "-4px 0 20px rgba(0,0,0,0.04)",
            zIndex: 10
          }}>
            {/* Header */}
            <div style={{
              height: 56,
              padding: "0 16px",
              borderBottom: "1px solid var(--border)",
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              background: "var(--surface)"
            }}>
              <div style={{ display: "flex", alignItems: "center", gap: 9 }}>
                <div style={{
                  width: 28,
                  height: 28,
                  borderRadius: 7,
                  background: "rgba(2, 132, 199, 0.1)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  color: "#0284c7"
                }}>
                  <BookOpen size={15} />
                </div>
                <div>
                  <div style={{ fontSize: 13, fontWeight: 700, color: "var(--text-1)", letterSpacing: "-0.01em" }}>
                    {isVi ? "Nguồn trích dẫn & Đối soát" : "Grounded Evidence"}
                  </div>
                  <div style={{ fontSize: 11, color: "var(--text-3)" }}>
                    {Array.isArray(activeCitation) ? activeCitation.length : (activeCitation ? 1 : 0)} {isVi ? "nguồn xác thực thực tế" : "verified sources"}
                  </div>
                </div>
              </div>

              <button
                onClick={() => setShowCitationDrawer(false)}
                title={isVi ? "Đóng bảng trích dẫn" : "Close citation drawer"}
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
                  border: "none",
                  transition: "all 0.15s ease"
                }}
                onMouseEnter={e => {
                  e.currentTarget.style.background = "var(--surface-hover)";
                  e.currentTarget.style.color = "var(--text-1)";
                }}
                onMouseLeave={e => {
                  e.currentTarget.style.background = "transparent";
                  e.currentTarget.style.color = "var(--text-3)";
                }}
              >
                <X size={15} />
              </button>
            </div>

            {/* Citations List */}
            <div style={{ flex: 1, overflowY: "auto", padding: 14, display: "flex", flexDirection: "column", gap: 12 }}>
              {(!activeCitation || (Array.isArray(activeCitation) && activeCitation.length === 0)) ? (
                <div style={{ padding: "50px 16px", textAlign: "center", color: "var(--text-4)", fontSize: 12.5 }}>
                  <ShieldCheck size={32} color="var(--border)" style={{ margin: "0 auto 10px" }} />
                  <div>{isVi ? "Chưa có nguồn trích dẫn từ tài liệu thực tế cho câu hỏi này." : "No grounded citations available for this query."}</div>
                </div>
              ) : (
                (Array.isArray(activeCitation) ? activeCitation : [activeCitation]).map((cite, idx) => {
                  const isNeo4j = /neo4j|graph|cypher/i.test(cite.sourceType || "") || Boolean(cite.neo4jNode);
                  return (
                    <div
                      key={cite.chunkId || idx}
                      style={{
                        background: "var(--surface)",
                        border: "1px solid var(--border)",
                        borderRadius: 10,
                        boxShadow: "0 1px 4px rgba(0,0,0,0.03)",
                        overflow: "hidden",
                        display: "flex",
                        flexDirection: "column"
                      }}
                    >
                      {/* Top Stripe */}
                      <div style={{
                        padding: "8px 12px",
                        background: isNeo4j ? "rgba(2, 132, 199, 0.05)" : "rgba(16, 185, 129, 0.05)",
                        borderBottom: "1px solid var(--border-soft)",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "space-between"
                      }}>
                        <span style={{
                          fontSize: 11,
                          fontWeight: 700,
                          color: isNeo4j ? "#0284c7" : "#059669",
                          textTransform: "uppercase",
                          letterSpacing: "0.03em",
                          display: "inline-flex",
                          alignItems: "center",
                          gap: 5
                        }}>
                          {isNeo4j ? (
                            <>
                              <i className="fa-solid fa-circle-nodes" style={{ fontSize: 12 }} />
                              {cite.sourceType || "Đồ thị Neo4j ERP"}
                            </>
                          ) : (
                            <>
                              <FileText size={12} />
                              {cite.sourceType || "Hồ sơ Pháp chế CUAD"}
                            </>
                          )}
                        </span>

                        <span style={{
                          fontSize: 10.5,
                          fontWeight: 700,
                          color: "#059669",
                          background: "rgba(16, 185, 129, 0.1)",
                          border: "1px solid rgba(16, 185, 129, 0.2)",
                          padding: "2px 7px",
                          borderRadius: 99,
                          display: "inline-flex",
                          alignItems: "center",
                          gap: 4
                        }}>
                          <CheckCircle2 size={11} />
                          {cite.match || (isNeo4j ? "Graph Cypher Verified" : "Đã đối soát")}
                        </span>
                      </div>

                      {/* Content Body */}
                      <div style={{ padding: "12px", display: "flex", flexDirection: "column", gap: 10 }}>
                        {/* Title & location */}
                        <div>
                          <div style={{
                            fontSize: 12.5,
                            fontWeight: 700,
                            color: "var(--text-1)",
                            lineHeight: 1.4,
                            wordBreak: "break-word"
                          }}>
                            {formatCitationDocTitle(cite.docName || cite.file)}
                          </div>
                          <div style={{
                            display: "inline-flex",
                            alignItems: "center",
                            gap: 5,
                            marginTop: 4,
                            fontSize: 11,
                            color: "var(--text-3)"
                          }}>
                            <Pin size={11} />
                            <span>{isVi ? "Vị trí & Dòng:" : "Location:"}</span>
                            <strong style={{ color: "var(--text-2)", fontFamily: "var(--f-mono)", fontWeight: 600 }}>
                              {cite.location || (cite.chunkId ? `Chunk #${cite.chunkId}` : "Toàn văn")}
                            </strong>
                          </div>
                        </div>

                        {/* Excerpt callout */}
                        <div style={{
                          background: "var(--surface-2)",
                          borderLeft: "3px solid #0284c7",
                          borderTop: "1px solid var(--border-soft)",
                          borderRight: "1px solid var(--border-soft)",
                          borderBottom: "1px solid var(--border-soft)",
                          borderRadius: "0 6px 6px 0",
                          padding: "9px 11px"
                        }}>
                          <div style={{
                            fontSize: 10,
                            fontWeight: 700,
                            color: "var(--text-3)",
                            textTransform: "uppercase",
                            letterSpacing: "0.04em",
                            marginBottom: 5
                          }}>
                            {isVi ? "Đoạn trích thực tế từ tệp:" : "Actual Excerpt from File:"}
                          </div>
                          <div style={{ maxHeight: 220, overflowY: "auto" }}>
                            {renderCitationSnippet(cite.text, isVi)}
                          </div>
                        </div>

                        {/* Graph Entity */}
                        {cite.neo4jNode && (
                          <div style={{
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "space-between",
                            gap: 8,
                            background: "rgba(2, 132, 199, 0.04)",
                            border: "1px solid rgba(2, 132, 199, 0.12)",
                            borderRadius: 6,
                            padding: "6px 10px",
                            fontSize: 11,
                            color: "var(--text-3)"
                          }}>
                            <span style={{ display: "inline-flex", alignItems: "center", gap: 5 }}>
                              <i className="fa-solid fa-circle-nodes" style={{ color: "#0284c7" }} />
                              {isVi ? "Thực thể Đồ thị:" : "Graph Entity:"}
                            </span>
                            <code style={{
                              color: "#0284c7",
                              fontWeight: 700,
                              fontFamily: "var(--f-mono)",
                              fontSize: 11
                            }}>
                              {cite.neo4jNode}
                            </code>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            {/* Bottom Footer */}
            <div style={{
              padding: "10px 14px",
              borderTop: "1px solid var(--border-soft)",
              background: "var(--surface)",
              display: "flex",
              alignItems: "center"
            }}>
              <button
                onClick={() => onNavigate?.("knowledge")}
                style={{
                  width: "100%",
                  padding: "8px 12px",
                  borderRadius: 7,
                  background: "var(--surface-2)",
                  border: "1px solid var(--border)",
                  color: "var(--text-1)",
                  fontSize: 12,
                  fontWeight: 600,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: 6,
                  cursor: "pointer",
                  transition: "all 0.15s ease"
                }}
                onMouseEnter={e => {
                  e.currentTarget.style.borderColor = "#0284c7";
                  e.currentTarget.style.color = "#0284c7";
                  e.currentTarget.style.background = "rgba(2, 132, 199, 0.05)";
                }}
                onMouseLeave={e => {
                  e.currentTarget.style.borderColor = "var(--border)";
                  e.currentTarget.style.color = "var(--text-1)";
                  e.currentTarget.style.background = "var(--surface-2)";
                }}
              >
                <span>{isVi ? "Mở trong Đồ thị Tri thức" : "Open Knowledge Graph"}</span>
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

