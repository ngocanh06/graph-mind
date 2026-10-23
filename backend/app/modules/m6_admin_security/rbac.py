"""Canonical RBAC mapping for GraphMind Module 6 (JWT + UI)."""

ADMIN_ONLY_DETAIL = "Chỉ Admin hệ thống mới có quyền"

ROLE_ALIASES = {
    "executive": "executive",
    "exec": "executive",
    "ceo": "executive",
    "cfo": "executive",
    "it_admin": "it_admin",
    "admin": "it_admin",
    "sys_admin": "it_admin",
    "secops": "it_admin",
    "knowledge_manager": "knowledge_manager",
    "department_manager": "knowledge_manager",
    "sme_manager": "knowledge_manager",
    "manager": "knowledge_manager",
    "standard": "standard",
    "standard_user": "standard",
    "sales": "standard",
    "ops": "standard",
}

CANONICAL_ROLES = ("executive", "it_admin", "knowledge_manager", "standard")

ROLE_LABELS_VI = {
    "executive": "Ban lãnh đạo",
    "it_admin": "Admin hệ thống",
    "knowledge_manager": "Quản lý",
    "standard": "Nhân viên",
}


def canonical_role(user_or_role) -> str:
    raw = user_or_role
    if user_or_role is not None and not isinstance(user_or_role, str):
        raw = getattr(user_or_role, "role", None) or ""
    key = (raw or "").strip().lower()
    return ROLE_ALIASES.get(key, "standard")


def is_system_admin(user) -> bool:
    if user is None:
        return False
    if getattr(user, "is_superuser", False):
        return True
    return canonical_role(user) == "it_admin"


def persist_role_value(role: str) -> str:
    mapped = canonical_role(role)
    return mapped if mapped in CANONICAL_ROLES else "standard"


def is_superuser_for_role(role: str) -> bool:
    return persist_role_value(role) == "it_admin"
