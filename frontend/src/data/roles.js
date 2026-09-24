/**
 * CẤU HÌNH VAI TRÒ & TÀI KHOẢN DOANH NGHIỆP ĐẠI DIỆN (ENTERPRISE RBAC & PERSONAS)
 * Nền tảng Ra quyết định & Quản trị Tri thức Doanh nghiệp (Graph Mind / AEGIS EKMP)
 * 
 * Quản trị Tri thức (Knowledge Management) đã được gộp trực tiếp vào vai trò Admin (Quản trị viên Hệ thống & Tri thức).
 * 
 * 4 Nhóm vai trò chuẩn:
 * - cfo: Lãnh đạo C-Level (Executive / CFO)
 * - manager: Cấp Quản lý / Trưởng phòng bộ phận (Department Head / Middle Management)
 * - admin: Quản trị viên Hệ thống & Tri thức (System & Knowledge Admin, SecOps & LLMOps)
 * - ops: Chuyên viên Nghiệp vụ & Vận hành (Operations Specialist)
 */

export const ENTERPRISE_ROLES = {
  executive: {
    id: "executive",
    roleKey: "EXECUTIVE",
    username: "ceo",
    badge: "BAN LÃNH ĐẠO C-LEVEL",
    badgeEn: "EXECUTIVE (C-SUITE / CEO)",
    name: "Hoàng Minh Điều",
    email: "executive@graphmind.ai",
    aliases: ["ceo", "exec", "cfo", "lanhdao", "dieu", "dieu.hoang", "executive", "ceo@graphmind.ai", "executive@graphmind.ai", "cfo@graphmind.ai", "cfo@enterprise.vn"],
    title: "Ban Lãnh Đạo · Giám Đốc Điều Hành (CEO / C-Suite)",
    titleEn: "Executive Leadership · C-Suite / CEO",
    department: "Ban Giám Đốc & Hội Đồng Quản Trị",
    departmentEn: "Executive Board & C-Suite",
    avatar: "HĐ",
    color: "#0891b2",
    accentColor: "#00e5ff",
    defaultView: "executive",
    allowedViews: ["executive", "risk", "reports", "copilot", "knowledge", "search"],
    description: "Đài quan sát vĩ mô toàn diện: bức tranh tài chính, vận hành, kiểm soát rủi ro toàn doanh nghiệp và hỗ trợ ra quyết định chiến lược cấp cao.",
    descriptionEn: "Holistic enterprise pulse: monitor corporate performance, anomaly signals, cross-department risks, and high-level strategic decisions."
  },

  knowledge_manager: {
    id: "knowledge_manager",
    roleKey: "KNOWLEDGE_MGR",
    username: "manager",
    badge: "TRƯỞNG PHÒNG / QUẢN LÝ",
    badgeEn: "DEPARTMENT MANAGER",
    name: "Trần M. Anh",
    email: "manager@graphmind.ai",
    aliases: ["manager", "mgr", "lead", "tp", "truongphong", "anh", "anh.tran", "manager@graphmind.ai", "data.lead@enterprise.vn"],
    title: "Trưởng Phòng · Quản lý Cấp trung",
    titleEn: "Department Head · Middle Management",
    department: "Khối Quản lý Phòng ban & Bộ phận",
    departmentEn: "Department Management & Business Units",
    avatar: "TA",
    color: "#059669",
    accentColor: "#3fcb8e",
    defaultView: "reports",
    allowedViews: ["reports", "documents", "copilot", "search", "risk"],
    description: "Theo dõi tiến độ & hiệu suất phòng ban, quản lý tài liệu và nhân sự bộ phận, giám sát rủi ro tác nghiệp và xuất báo cáo.",
    descriptionEn: "Oversee department KPIs, review team documents & operational risk, and facilitate department-level tactical decisions."
  },

  it_admin: {
    id: "it_admin",
    roleKey: "IT_ADMIN",
    username: "admin",
    badge: "ADMIN HỆ THỐNG & TRI THỨC",
    badgeEn: "SYS & KNOWLEDGE ADMIN",
    name: "SecOps Admin",
    email: "admin@graphmind.ai",
    aliases: ["admin", "secops", "it", "itadmin", "knowledge", "data", "admin@graphmind.ai", "admin.secops@enterprise.vn"],
    title: "Quản trị viên Hệ thống & Tri thức · SecOps Lead",
    titleEn: "System & Knowledge Administrator · SecOps Lead",
    department: "Khối Công nghệ, Dữ liệu & Quản trị Tri thức",
    departmentEn: "Information Technology & Knowledge Governance",
    avatar: "SA",
    color: "#d97706",
    accentColor: "#f59e0b",
    defaultView: "admin",
    allowedViews: ["admin", "knowledge", "connectors", "documents", "reports", "search", "copilot", "executive"],
    description: "Toàn quyền quản trị hệ thống, đồ thị tri thức (Knowledge Graph), kết nối dữ liệu (Connectors), kiểm duyệt HITL, phân quyền RBAC & LLMOps.",
    descriptionEn: "Full authority over system telemetry, enterprise Knowledge Graph, data connector pipelines, HITL validation queues, and RBAC security."
  },

  standard: {
    id: "standard",
    roleKey: "SALES_OPS",
    username: "sales",
    badge: "CHUYÊN VIÊN KINH DOANH",
    badgeEn: "SALES & ACCOUNT EXECUTIVE",
    name: "Nguyễn V. Nam",
    email: "sales@graphmind.ai",
    aliases: ["sales", "kinhdoanh", "nam", "ops", "user", "nhanvien", "nam.nguyen@enterprise.vn", "sales@graphmind.ai", "ops@graphmind.ai"],
    title: "Chuyên viên Kinh doanh & Quản trị Hợp đồng",
    titleEn: "Sales & Account Executive",
    department: "Phòng Kinh doanh & Khách hàng Doanh nghiệp",
    departmentEn: "Corporate Sales & Account Management",
    avatar: "NN",
    color: "#2563eb",
    accentColor: "#60a5fa",
    defaultView: "search",
    allowedViews: ["search", "copilot", "documents", "reports"],
    description: "Bàn làm việc kinh doanh: theo dõi sức khỏe tài khoản khách hàng, xử lý cảnh báo sụt giảm đơn hàng, trợ lý AI đàm phán, quản lý kho hợp đồng và báo cáo công việc ca làm việc.",
    descriptionEn: "Sales operations hub: track client account health, handle order drop alerts, negotiate contract renewals with AI Copilot, and file operational work reports."
  }
};

/**
 * Hàm xác thực & tìm hồ sơ tài khoản theo Username hoặc Email
 */
export function authenticateByEmail(inputIdentifier = "") {
  const cleanInput = (inputIdentifier || "").trim().toLowerCase();
  
  // 1. Đối chiếu chính xác theo Username hoặc Email hoặc Alias
  for (const roleId of Object.keys(ENTERPRISE_ROLES)) {
    const roleConfig = ENTERPRISE_ROLES[roleId];
    if (
      roleConfig.username.toLowerCase() === cleanInput ||
      roleConfig.email.toLowerCase() === cleanInput ||
      roleConfig.aliases.some((a) => a.toLowerCase() === cleanInput)
    ) {
      return roleConfig;
    }
  }

  // 2. Tìm theo từ khóa trong chuỗi nhập
  if (cleanInput.includes("cfo") || cleanInput.includes("ceo") || cleanInput.includes("exec") || cleanInput.includes("lanhdao") || cleanInput.includes("board") || cleanInput.includes("dieu")) {
    return ENTERPRISE_ROLES.executive;
  }
  if (
    cleanInput.includes("manager") ||
    cleanInput.includes("mgr") ||
    cleanInput.includes("lead") ||
    cleanInput.includes("tp") ||
    cleanInput.includes("truong") ||
    cleanInput.includes("quanly") ||
    cleanInput.includes("anh")
  ) {
    return ENTERPRISE_ROLES.knowledge_manager;
  }
  if (
    cleanInput.includes("admin") ||
    cleanInput.includes("secops") ||
    cleanInput.includes("it") ||
    cleanInput.includes("knowledge") ||
    cleanInput.includes("data")
  ) {
    return ENTERPRISE_ROLES.it_admin;
  }
  if (
    cleanInput.includes("sales") ||
    cleanInput.includes("kinhdoanh") ||
    cleanInput.includes("ops") ||
    cleanInput.includes("nam") ||
    cleanInput.includes("analyst") ||
    cleanInput.includes("user")
  ) {
    return ENTERPRISE_ROLES.standard;
  }

  // 3. Mặc định tài khoản chuẩn cho doanh nghiệp: Executive
  return ENTERPRISE_ROLES.executive;
}
