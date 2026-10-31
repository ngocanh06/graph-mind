"""
Centralized Department Mapping for GraphMind / AEGIS
Single Source of Truth for department keys, display names, and folder mappings.
Used across:
  Folder -> File Watcher -> Backend -> Document metadata -> Qdrant payload -> Neo4j property -> API response -> Frontend filter.
"""
from typing import Dict, Any, Optional

DEPARTMENT_DEFINITIONS: Dict[str, Dict[str, Any]] = {
    "legal": {
        "key": "legal",
        "displayName": "Pháp chế (Legal)",
        "shortName": "Pháp chế",
        "folder": "legal",
        "aliases": [
            "legal", "phap che", "pháp chế", "phap_che", "hop dong",
            "hợp đồng", "nda", "contract", "legal department"
        ]
    },
    "sales": {
        "key": "sales",
        "displayName": "Kinh doanh (Sales)",
        "shortName": "Kinh doanh",
        "folder": "sales",
        "aliases": [
            "sales", "kinh doanh", "kinh_doanh", "crm", "order",
            "quote", "ban hang", "bán hàng", "sales ops"
        ]
    },
    "accounting_procurement": {
        "key": "accounting_procurement",
        "displayName": "Kế toán / Thu mua",
        "shortName": "Kế toán / Thu mua",
        "folder": "accounting_procurement",
        "aliases": [
            "accounting_procurement", "ke toan", "kế toán", "thu mua",
            "ke_toan", "thu_mua", "finance", "procurement", "invoice",
            "hoa don", "hóa đơn", "accounting"
        ]
    },
    "it": {
        "key": "it",
        "displayName": "Công nghệ / IT",
        "shortName": "Công nghệ / IT",
        "folder": "it",
        "aliases": [
            "it", "cong nghe", "công nghệ", "cong_nghe", "tech",
            "technology", "cntt", "information technology", "systems"
        ]
    },
    "rnd": {
        "key": "rnd",
        "displayName": "R&D",
        "shortName": "R&D",
        "folder": "rnd",
        "aliases": [
            "rnd", "r&d", "nghien cuu", "nghiên cứu", "product",
            "research", "development", "research & dev"
        ]
    }
}

DEFAULT_DEPARTMENT = "sales"


def resolve_department(identifier: Optional[str]) -> Dict[str, Any]:
    """
    Resolve any folder path, department name, or alias to canonical department definition.
    Example:
      resolve_department("legal") -> {"key": "legal", "displayName": "Pháp chế (Legal)", ...}
      resolve_department("/data/legal/contract.pdf") -> {"key": "legal", ...}
      resolve_department("Pháp chế") -> {"key": "legal", ...}
    """
    if not identifier:
        return DEPARTMENT_DEFINITIONS[DEFAULT_DEPARTMENT]

    clean = identifier.strip().lower().replace("\\", "/")
    # If path was passed, check folder segments
    segments = [s.strip().lower() for s in clean.split("/") if s.strip()]

    # 1. Direct key match in definition
    if clean in DEPARTMENT_DEFINITIONS:
        return DEPARTMENT_DEFINITIONS[clean]

    # 2. Check each segment of the path against folder names and aliases
    for seg in reversed(segments):
        if seg in DEPARTMENT_DEFINITIONS:
            return DEPARTMENT_DEFINITIONS[seg]
        for key, defn in DEPARTMENT_DEFINITIONS.items():
            if seg == defn["folder"] or any(a in seg for a in defn["aliases"]):
                return defn

    # 3. Substring alias search across full string
    for key, defn in DEPARTMENT_DEFINITIONS.items():
        if any(a in clean for a in defn["aliases"]):
            return defn

    return DEPARTMENT_DEFINITIONS[DEFAULT_DEPARTMENT]


def get_department_key(identifier: Optional[str]) -> str:
    """Returns canonical department key, e.g. 'legal', 'sales', etc."""
    return resolve_department(identifier)["key"]


def get_department_display_name(identifier: Optional[str]) -> str:
    """Returns official human-readable display name, e.g. 'Pháp chế (Legal)'."""
    return resolve_department(identifier)["displayName"]


def get_all_departments() -> list:
    """Returns list of all official departments."""
    return list(DEPARTMENT_DEFINITIONS.values())
