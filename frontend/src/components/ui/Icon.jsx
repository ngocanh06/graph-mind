import React from "react";

/**
 * Universal FontAwesome Icon Component
 * Renders authentic FontAwesome icons from @fortawesome/fontawesome-free.
 * Supports FontAwesome classes (e.g. "fa-solid fa-house") and maps Lucide names to FontAwesome.
 */

const LUCIDE_TO_FA = {
  Home: "fa-solid fa-house",
  Bot: "fa-solid fa-robot",
  Search: "fa-solid fa-magnifying-glass",
  Share2: "fa-solid fa-circle-nodes",
  Activity: "fa-solid fa-chart-line",
  LayoutDashboard: "fa-solid fa-gauge-high",
  AlertTriangle: "fa-solid fa-triangle-exclamation",
  AlertCircle: "fa-solid fa-circle-exclamation",
  Info: "fa-solid fa-circle-info",
  BarChart2: "fa-solid fa-chart-simple",
  BarChart3: "fa-solid fa-chart-simple",
  BarChart: "fa-solid fa-chart-column",
  PieChart: "fa-solid fa-chart-pie",
  FolderOpen: "fa-solid fa-folder-open",
  Folder: "fa-solid fa-folder",
  ClipboardList: "fa-solid fa-clipboard-list",
  Database: "fa-solid fa-database",
  Settings: "fa-solid fa-gear",
  ChevronLeft: "fa-solid fa-chevron-left",
  ChevronRight: "fa-solid fa-chevron-right",
  ChevronDown: "fa-solid fa-chevron-down",
  ChevronUp: "fa-solid fa-chevron-up",
  ChevronsLeft: "fa-solid fa-angles-left",
  ChevronsRight: "fa-solid fa-angles-right",
  Bell: "fa-solid fa-bell",
  UploadCloud: "fa-solid fa-cloud-arrow-up",
  CloudUpload: "fa-solid fa-cloud-arrow-up",
  Download: "fa-solid fa-download",
  CloudDownload: "fa-solid fa-cloud-arrow-down",
  Moon: "fa-solid fa-moon",
  Sun: "fa-solid fa-sun",
  Globe: "fa-solid fa-globe",
  LogOut: "fa-solid fa-arrow-right-from-bracket",
  Check: "fa-solid fa-check",
  CheckCheck: "fa-solid fa-check-double",
  CheckCircle2: "fa-solid fa-circle-check",
  CheckCircle: "fa-solid fa-circle-check",
  CheckSquare: "fa-solid fa-square-check",
  Shield: "fa-solid fa-shield",
  ShieldCheck: "fa-solid fa-shield-halved",
  ShieldAlert: "fa-solid fa-shield-halved",
  Building: "fa-solid fa-building",
  Building2: "fa-solid fa-building",
  ArrowRight: "fa-solid fa-arrow-right",
  ArrowLeft: "fa-solid fa-arrow-left",
  ArrowUp: "fa-solid fa-arrow-up",
  ArrowDown: "fa-solid fa-arrow-down",
  Sparkles: "fa-solid fa-wand-magic-sparkles",
  Wand2: "fa-solid fa-wand-magic-sparkles",
  FileText: "fa-solid fa-file-lines",
  File: "fa-solid fa-file",
  FileEdit: "fa-solid fa-file-pen",
  FileSpreadsheet: "fa-solid fa-file-excel",
  FileCode: "fa-solid fa-file-code",
  FilePlus: "fa-solid fa-file-circle-plus",
  FileCheck: "fa-solid fa-file-contract",
  RefreshCw: "fa-solid fa-arrows-rotate",
  RotateCw: "fa-solid fa-rotate-right",
  RotateCcw: "fa-solid fa-rotate-left",
  MessageSquare: "fa-solid fa-comment-dots",
  MessagesSquare: "fa-solid fa-comments",
  DollarSign: "fa-solid fa-dollar-sign",
  Clock: "fa-solid fa-clock",
  Hourglass: "fa-solid fa-hourglass-half",
  TrendingDown: "fa-solid fa-arrow-trend-down",
  TrendingUp: "fa-solid fa-arrow-trend-up",
  ExternalLink: "fa-solid fa-arrow-up-right-from-square",
  Trash2: "fa-solid fa-trash-can",
  Trash: "fa-solid fa-trash",
  Edit: "fa-solid fa-pen-to-square",
  Copy: "fa-solid fa-copy",
  Plus: "fa-solid fa-plus",
  PlusCircle: "fa-solid fa-circle-plus",
  Minus: "fa-solid fa-minus",
  X: "fa-solid fa-xmark",
  Eye: "fa-solid fa-eye",
  EyeOff: "fa-solid fa-eye-slash",
  Filter: "fa-solid fa-filter",
  FilterX: "fa-solid fa-filter-circle-xmark",
  Network: "fa-solid fa-diagram-project",
  SlidersHorizontal: "fa-solid fa-sliders",
  Sliders: "fa-solid fa-sliders",
  Maximize2: "fa-solid fa-expand",
  Minimize2: "fa-solid fa-compress",
  Lock: "fa-solid fa-lock",
  Key: "fa-solid fa-key",
  Send: "fa-solid fa-paper-plane",
  Inbox: "fa-solid fa-inbox",
  User: "fa-solid fa-user",
  Users: "fa-solid fa-users",
  UserCheck: "fa-solid fa-user-check",
  Terminal: "fa-solid fa-terminal",
  Layers: "fa-solid fa-layer-group",
  Grid: "fa-solid fa-table-cells-large",
  LayoutGrid: "fa-solid fa-table-cells-large",
  List: "fa-solid fa-list",
  ListOrdered: "fa-solid fa-list-ol",
  Link: "fa-solid fa-link",
  Tag: "fa-solid fa-tag",
  Mail: "fa-solid fa-envelope",
  Phone: "fa-solid fa-phone",
  Server: "fa-solid fa-server",
  Star: "fa-solid fa-star",
  Calendar: "fa-solid fa-calendar-days",
  HelpCircle: "fa-solid fa-circle-question",
  CircleHelp: "fa-solid fa-circle-question",
  PanelLeft: "fa-solid fa-bars",
  Menu: "fa-solid fa-bars",
  Loader2: "fa-solid fa-spinner fa-spin",
  Paperclip: "fa-solid fa-paperclip",
  Award: "fa-solid fa-award",
  Lightbulb: "fa-solid fa-lightbulb",
  Printer: "fa-solid fa-print",
  Quote: "fa-solid fa-quote-left",
  Brain: "fa-solid fa-brain",
  ZoomIn: "fa-solid fa-magnifying-glass-plus",
  ZoomOut: "fa-solid fa-magnifying-glass-minus",
  HardDrive: "fa-solid fa-hard-drive",
  Table: "fa-solid fa-table",
  FolderSync: "fa-solid fa-folder-tree",
  Play: "fa-solid fa-play",
  BookOpen: "fa-solid fa-book-open",
  ThumbsUp: "fa-solid fa-thumbs-up",
  ThumbsDown: "fa-solid fa-thumbs-down",
  Bookmark: "fa-solid fa-bookmark",
  Pin: "fa-solid fa-thumbtack",
  UserPlus: "fa-solid fa-user-plus",
  Unlock: "fa-solid fa-unlock",
  KeyRound: "fa-solid fa-key",
  Ban: "fa-solid fa-ban",
  ShoppingCart: "fa-solid fa-cart-shopping",
  Scale: "fa-solid fa-scale-balanced",
  Save: "fa-solid fa-floppy-disk",
  Edit3: "fa-solid fa-pen",
  Cpu: "fa-solid fa-microchip",
  FlaskConical: "fa-solid fa-flask",
  Crown: "fa-solid fa-crown",
};

export function resolveFaClass(name) {
  if (!name) return "fa-solid fa-circle-question";

  // If a React component function from lucide-react was passed
  if (typeof name === "function") {
    const fnName = name.displayName || name.name;
    if (fnName && LUCIDE_TO_FA[fnName]) return LUCIDE_TO_FA[fnName];
    // Check if the component has a common name
    return "fa-solid fa-circle-info";
  }

  if (typeof name !== "string") return "fa-solid fa-circle-question";

  const trimmed = name.trim();
  if (LUCIDE_TO_FA[trimmed]) return LUCIDE_TO_FA[trimmed];

  // Already a full FA class string like "fa-solid fa-house" or "fas fa-check"
  if (
    trimmed.startsWith("fa-solid ") ||
    trimmed.startsWith("fa-regular ") ||
    trimmed.startsWith("fa-brands ") ||
    trimmed.startsWith("fas ") ||
    trimmed.startsWith("far ") ||
    trimmed.startsWith("fab ")
  ) {
    return trimmed;
  }

  // Starts with fa- like "fa-check" or "fa-robot"
  if (trimmed.startsWith("fa-")) {
    return `fa-solid ${trimmed}`;
  }

  // Bare name like "check"
  return `fa-solid fa-${trimmed}`;
}

export default function Icon({
  name,
  size = 15,
  color = "currentColor",
  className = "",
  style = {},
  ...props
}) {
  if (!name) return null;

  const pxSize = typeof size === "number" ? `${size}px` : size;

  if (name === "Sparkles" || name === "sparkles" || name === "Wand2") {
    return (
      <svg
        width={pxSize}
        height={pxSize}
        viewBox="0 0 24 24"
        fill="currentColor"
        className={className}
        style={{
          display: "inline-flex",
          alignItems: "center",
          justifyContent: "center",
          lineHeight: 1,
          verticalAlign: "middle",
          flexShrink: 0,
          color: color || "currentColor",
          ...style,
        }}
        aria-hidden="true"
        {...props}
      >
        <path d="M12 2C12 7.52 7.52 12 2 12C7.52 12 12 16.48 12 22C12 16.48 16.48 12 22 12C16.48 12 12 7.52 12 2Z" />
        <path d="M19 2C19 4.2 17.2 6 15 6C17.2 6 19 7.8 19 10C19 7.8 20.8 6 23 6C20.8 6 19 4.2 19 2Z" opacity="0.75" />
      </svg>
    );
  }

  const faClass = resolveFaClass(name);
  const isSpin = typeof name === "string" && (name.includes("fa-spin") || name.includes("spin"));

  return (
    <i
      className={`${faClass} ${isSpin ? "fa-spin" : ""} ${className}`}
      style={{
        fontSize: pxSize,
        color: color,
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        lineHeight: 1,
        width: pxSize,
        height: pxSize,
        verticalAlign: "middle",
        ...style,
      }}
      aria-hidden="true"
      {...props}
    />
  );
}
