/**
 * GraphMind Centralized Department Definitions (Frontend)
 * Single Source of Truth matching backend/app/core/departments.py
 *
 * Exact 5 Canonical Departments:
 * 1. legal: "Pháp chế (Legal)" (folder: legal/)
 * 2. sales: "Kinh doanh (Sales)" (folder: sales/)
 * 3. accounting_procurement: "Kế toán / Thu mua" (folder: accounting_procurement/)
 * 4. it: "Công nghệ / IT" (folder: it/)
 * 5. rnd: "R&D" (folder: rnd/)
 *
 * NOTE: "Tất cả" is ONLY a filter option, NOT a department.
 */

export const DEPARTMENTS = [
  {
    key: "legal",
    displayName: "Pháp chế (Legal)",
    shortName: "Pháp chế",
    folder: "legal",
    filterValue: "Pháp chế",
    color: "indigo",
    badgeBg: "bg-indigo-50",
    badgeText: "text-indigo-700",
    badgeBorder: "border-indigo-200"
  },
  {
    key: "sales",
    displayName: "Kinh doanh (Sales)",
    shortName: "Kinh doanh",
    folder: "sales",
    filterValue: "Kinh doanh",
    color: "emerald",
    badgeBg: "bg-emerald-50",
    badgeText: "text-emerald-700",
    badgeBorder: "border-emerald-200"
  },
  {
    key: "accounting_procurement",
    displayName: "Kế toán / Thu mua",
    shortName: "Kế toán / Thu mua",
    folder: "accounting_procurement",
    filterValue: "Kế toán / Thu mua",
    color: "amber",
    badgeBg: "bg-amber-50",
    badgeText: "text-amber-700",
    badgeBorder: "border-amber-200"
  },
  {
    key: "it",
    displayName: "Công nghệ / IT",
    shortName: "Công nghệ / IT",
    folder: "it",
    filterValue: "Công nghệ / IT",
    color: "blue",
    badgeBg: "bg-blue-50",
    badgeText: "text-blue-700",
    badgeBorder: "border-blue-200"
  },
  {
    key: "rnd",
    displayName: "R&D",
    shortName: "R&D",
    folder: "rnd",
    filterValue: "R&D",
    color: "purple",
    badgeBg: "bg-purple-50",
    badgeText: "text-purple-700",
    badgeBorder: "border-purple-200"
  }
];

export const ROLE_ALLOWED_DEPT_KEYS = {
  ADMIN: ["legal", "sales", "accounting_procurement", "it", "rnd"],
  EXECUTIVE: ["legal", "sales", "accounting_procurement", "it", "rnd"],
  DEPARTMENT_MANAGER: ["legal", "sales", "accounting_procurement", "rnd"], // Strictly excludes 'it'
  STANDARD_USER: ["sales"] // Strictly isolated to own department (Sales)
};

export function resolveRoleGroup(role, currentUser) {
  const r = String(role || currentUser?.id || currentUser?.roleKey || "").toLowerCase();
  if (r === "admin" || r === "it_admin" || currentUser?.roleKey === "IT_ADMIN") return "ADMIN";
  if (r === "executive" || currentUser?.roleKey === "EXECUTIVE") return "EXECUTIVE";
  if (
    r === "knowledge_manager" ||
    r === "dept_manager" ||
    r === "department_manager" ||
    currentUser?.roleKey === "DEPT_MANAGER"
  ) {
    return "DEPARTMENT_MANAGER";
  }
  return "STANDARD_USER";
}

export function getAllowedDepartmentsForRole(role, currentUser) {
  const group = resolveRoleGroup(role, currentUser);
  const allowedKeys = ROLE_ALLOWED_DEPT_KEYS[group] || ROLE_ALLOWED_DEPT_KEYS.STANDARD_USER;
  return DEPARTMENTS.filter((d) => allowedKeys.includes(d.key));
}

export function resolveDepartment(input) {
  if (!input) return DEPARTMENTS[1]; // default sales
  const clean = String(input).toLowerCase().trim();
  const match = DEPARTMENTS.find(
    (d) =>
      d.key === clean ||
      d.displayName.toLowerCase() === clean ||
      d.shortName.toLowerCase() === clean ||
      d.folder === clean ||
      d.filterValue.toLowerCase() === clean
  );
  return match || DEPARTMENTS[1];
}

export function getDepartmentKey(input) {
  return resolveDepartment(input).key;
}

export function getDepartmentDisplayName(input) {
  return resolveDepartment(input).displayName;
}

export function getAllDepartments() {
  return DEPARTMENTS;
}
