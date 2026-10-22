import React from "react";
import * as LucideIcons from "lucide-react";

/**
 * Universal Icon Resolver (UI/UX Pro Max)
 * Maps Lucide names and legacy icon classes to clean Lucide SVG icons.
 * Guarantees zero reliance on external font files, ensuring strict SVG vector rendering.
 */

const FA_TO_LUCIDE = {
  "fa-check": "Check",
  "fa-square-check": "CheckSquare",
  "fa-circle-check": "CheckCircle2",
  "fa-check-double": "CheckCheck",
  "fa-magnifying-glass": "Search",
  "fa-magnifying-glass-plus": "ZoomIn",
  "fa-magnifying-glass-minus": "ZoomOut",
  "fa-rotate": "RotateCw",
  "fa-rotate-left": "RotateCcw",
  "fa-spinner": "Loader2",
  "fa-wand-magic-sparkles": "Sparkles",
  "fa-paper-plane": "Send",
  "fa-file-lines": "FileText",
  "fa-file-pdf": "FileText",
  "fa-file-excel": "FileSpreadsheet",
  "fa-file-csv": "FileSpreadsheet",
  "fa-file-spreadsheet": "FileSpreadsheet",
  "fa-file-code": "FileCode",
  "fa-file-word": "FileText",
  "fa-file": "FileText",
  "fa-file-contract": "FileCheck",
  "fa-file-signature": "FileCheck",
  "fa-file-circle-plus": "FilePlus",
  "fa-chart-pie": "PieChart",
  "fa-chart-line": "TrendingUp",
  "fa-chart-simple": "BarChart3",
  "fa-building": "Building2",
  "fa-building-circle-check": "Building2",
  "fa-building-columns": "Landmark",
  "fa-calendar": "Calendar",
  "fa-calendar-check": "CalendarCheck",
  "fa-calendar-day": "Calendar",
  "fa-calendar-week": "Calendar",
  "fa-clock": "Clock",
  "fa-hourglass-half": "Hourglass",
  "fa-shield-halved": "Shield",
  "fa-shield-check": "ShieldCheck",
  "fa-user-shield": "ShieldCheck",
  "fa-circle-nodes": "Share2",
  "fa-diagram-project": "Network",
  "fa-brain": "Brain",
  "fa-robot": "Bot",
  "fa-copy": "Copy",
  "fa-pen-to-square": "Edit",
  "fa-pen-nib": "PenTool",
  "fa-sliders": "SlidersHorizontal",
  "fa-table-cells-large": "LayoutGrid",
  "fa-table-list": "List",
  "fa-list": "List",
  "fa-list-check": "CheckSquare",
  "fa-list-ol": "ListOrdered",
  "fa-list-ul": "List",
  "fa-arrow-left": "ArrowLeft",
  "fa-arrow-right": "ArrowRight",
  "fa-arrow-turn-down-right": "CornerDownRight",
  "fa-chevron-left": "ChevronLeft",
  "fa-chevron-right": "ChevronRight",
  "fa-angles-left": "ChevronsLeft",
  "fa-angles-right": "ChevronsRight",
  "fa-xmark": "X",
  "fa-plus": "Plus",
  "fa-circle-plus": "PlusCircle",
  "fa-minus": "Minus",
  "fa-trash-can": "Trash2",
  "fa-eye": "Eye",
  "fa-expand": "Maximize2",
  "fa-compress": "Minimize2",
  "fa-grip": "Grid",
  "fa-border-all": "Grid",
  "fa-link": "Link",
  "fa-tags": "Tag",
  "fa-envelope": "Mail",
  "fa-phone": "Phone",
  "fa-lock": "Lock",
  "fa-key": "Key",
  "fa-server": "Server",
  "fa-folder-open": "FolderOpen",
  "fa-bell": "Bell",
  "fa-box-open": "Package",
  "fa-briefcase": "Briefcase",
  "fa-cloud-arrow-down": "CloudDownload",
  "fa-cloud-arrow-up": "CloudUpload",
  "fa-paperclip": "Paperclip",
  "fa-award": "Award",
  "fa-medal": "Award",
  "fa-stamp": "Award",
  "fa-certificate": "Award",
  "fa-lightbulb": "Lightbulb",
  "fa-newspaper": "Newspaper",
  "fa-star": "Star",
  "fa-triangle-exclamation": "AlertTriangle",
  "fa-circle-exclamation": "AlertCircle",
  "fa-circle-info": "Info",
  "fa-circle-question": "HelpCircle",
  "fa-user": "User",
  "fa-id-badge": "UserCheck",
  "fa-hand-holding-dollar": "DollarSign",
  "fa-filter-circle-xmark": "FilterX",
  "fa-print": "Printer",
  "fa-quote-left": "Quote",
  "fa-terminal": "Terminal",
  "fa-layer-group": "Layers",
  "fa-house": "Home",
  "fa-highlighter": "Highlighter",
  "fa-ban": "Ban",
};

export default function Icon({
  name,
  size = 16,
  strokeWidth = 2,
  color = "currentColor",
  className = "",
  style = {},
  ...props
}) {
  if (!name) return null;

  let resolvedName = name;

  // Check if string contains FontAwesome class like "fa-solid fa-magnifying-glass"
  if (typeof name === "string") {
    const parts = name.split(" ");
    for (const part of parts) {
      if (FA_TO_LUCIDE[part]) {
        resolvedName = FA_TO_LUCIDE[part];
        break;
      }
    }
  }

  // Get Lucide component
  const LucideComponent = LucideIcons[resolvedName] || LucideIcons.FileText || LucideIcons.HelpCircle || LucideIcons.CircleHelp;
  const isSpin = typeof name === "string" && (name.includes("fa-spin") || name.includes("spin"));

  return (
    <LucideComponent
      size={size}
      strokeWidth={strokeWidth}
      color={color}
      style={{
        display: "inline-block",
        verticalAlign: "middle",
        animation: isSpin ? "spin 1s linear infinite" : undefined,
        ...style,
      }}
      className={`icon-ui ${className}`}
      aria-hidden="true"
      {...props}
    />
  );
}
