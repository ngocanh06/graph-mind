"""
Central Document Storage Management Module — GraphMind / AEGIS
Canonical Storage: Docker Named Volume `graph-mind_graphmind_documents` mounted at `/data`

Structure:
/data
├── legal
├── sales
├── accounting_procurement
├── it
└── rnd

Provides unified file operations whether running directly inside Docker container
or on Windows host communicating via Docker container `aegis_file_watcher`.
"""

import os
import re
import json
import logging
import tempfile
import subprocess
from pathlib import Path
from typing import List, Dict, Any, Optional

logger = logging.getLogger(__name__)

# Canonical directory inside Docker containers
DATA_ROOT = os.getenv("CENTRAL_STORAGE_DIR", os.getenv("DATA_ROOT", os.getenv("WATCH_ROOT", "/data")))
CONTAINER_NAME = "aegis_file_watcher"

CANONICAL_DEPARTMENTS = ["legal", "sales", "accounting_procurement", "it", "rnd"]

DEPT_DISPLAY_MAP = {
    "legal": "Pháp chế (Legal)",
    "sales": "Kinh doanh (Sales)",
    "accounting_procurement": "Kế toán / Thu mua",
    "it": "Công nghệ / IT",
    "rnd": "R&D"
}

DEPT_SHORT_MAP = {
    "legal": "Pháp chế",
    "sales": "Kinh doanh",
    "accounting_procurement": "Kế toán",
    "it": "IT",
    "rnd": "R&D"
}


def sanitize_filename(filename: str) -> str:
    """Sanitize filename to prevent path traversal and shell injection."""
    base = os.path.basename(filename)
    clean = re.sub(r'[\\/\0:;*?"<>|]', '', base).strip()
    if not clean or clean in (".", ".."):
        raise ValueError("Tên tệp không hợp lệ hoặc chứa ký tự nguy hiểm (path traversal).")
    return clean


def resolve_canonical_dept(dept: str) -> str:
    """Map any department string or alias to one of the 5 canonical folder keys."""
    dept_lower = (dept or "").lower().strip()
    if any(k in dept_lower for k in ["legal", "pháp chế", "phap che", "phap_che"]):
        return "legal"
    if any(k in dept_lower for k in ["sales", "kinh doanh", "kinh_doanh"]):
        return "sales"
    if any(k in dept_lower for k in ["accounting", "procurement", "kế toán", "ke toan", "thu mua", "thu_mua", "purchasing", "humanresources"]):
        return "accounting_procurement"
    if any(k in dept_lower for k in ["it", "công nghệ", "cong nghe", "tech"]):
        return "it"
    if any(k in dept_lower for k in ["rnd", "r&d", "nghiên cứu", "production"]):
        return "rnd"
    return "legal"


def is_direct_storage_available() -> bool:
    """Checks if /data is directly accessible on the current host/container."""
    return os.path.exists(DATA_ROOT) and os.path.isdir(DATA_ROOT)


def list_central_storage_files() -> List[Dict[str, Any]]:
    """
    Returns full file inventory from Central Storage (/data).
    Works directly if mounted, or queries `aegis_file_watcher` container via docker.
    """
    items = []

    # Case 1: Backend running inside Docker where /data is mounted
    if is_direct_storage_available():
        for dept in CANONICAL_DEPARTMENTS:
            dept_dir = os.path.join(DATA_ROOT, dept)
            if not os.path.exists(dept_dir):
                continue
            for fname in os.listdir(dept_dir):
                fpath = os.path.join(dept_dir, fname)
                if os.path.isfile(fpath) and not fname.startswith((".", "~")):
                    try:
                        stat = os.stat(fpath)
                        ext = os.path.splitext(fname)[1].lower()
                        items.append({
                            "name": fname,
                            "ext": ext,
                            "dept_key": dept,
                            "dept_name": DEPT_DISPLAY_MAP.get(dept, "Pháp chế (Legal)"),
                            "dept_short": DEPT_SHORT_MAP.get(dept, "Pháp chế"),
                            "storage_path": f"/data/{dept}/{fname}",
                            "size_bytes": stat.st_size,
                            "mtime": stat.st_mtime,
                            "source": "central_storage"
                        })
                    except Exception as e:
                        logger.warning(f"[CentralStorage] Error reading {fpath}: {e}")
        return items

    # Case 2: Backend running on Windows host during local development
    # Query aegis_file_watcher container which mounts graph-mind_graphmind_documents:/data
    try:
        py_script = (
            "import os, json\n"
            "res = []\n"
            "depts = ['legal', 'sales', 'accounting_procurement', 'it', 'rnd']\n"
            "for d in depts:\n"
            "    p = os.path.join('/data', d)\n"
            "    if os.path.exists(p):\n"
            "        for f in os.listdir(p):\n"
            "            fp = os.path.join(p, f)\n"
            "            if os.path.isfile(fp) and not f.startswith(('.', '~')):\n"
            "                try:\n"
            "                    st = os.stat(fp)\n"
            "                    res.append({'name': f, 'dept': d, 'size': st.st_size, 'mtime': st.st_mtime})\n"
            "                except Exception:\n"
            "                    pass\n"
            "print(json.dumps(res))\n"
        )
        proc = subprocess.run(
            ["docker", "exec", CONTAINER_NAME, "python", "-c", py_script],
            capture_output=True,
            text=True,
            timeout=10
        )
        if proc.returncode == 0 and proc.stdout.strip():
            raw_list = json.loads(proc.stdout.strip())
            for it in raw_list:
                fname = it["name"]
                dept = it["dept"]
                ext = os.path.splitext(fname)[1].lower()
                items.append({
                    "name": fname,
                    "ext": ext,
                    "dept_key": dept,
                    "dept_name": DEPT_DISPLAY_MAP.get(dept, "Pháp chế (Legal)"),
                    "dept_short": DEPT_SHORT_MAP.get(dept, "Pháp chế"),
                    "storage_path": f"/data/{dept}/{fname}",
                    "size_bytes": it["size"],
                    "mtime": it["mtime"],
                    "source": "central_storage"
                })
            return items
        else:
            logger.warning(f"[CentralStorage] Docker exec list failed: {proc.stderr}")
    except Exception as e:
        logger.warning(f"[CentralStorage] Failed to query container storage: {e}")

    # Fallback to local data folder if container query failed
    fallback_root = Path(__file__).resolve().parent.parent.parent / "data"
    if fallback_root.exists():
        for dept in CANONICAL_DEPARTMENTS:
            p = fallback_root / dept
            if p.exists():
                for f in p.iterdir():
                    if f.is_file() and not f.name.startswith((".", "~")):
                        ext = f.suffix.lower()
                        items.append({
                            "name": f.name,
                            "ext": ext,
                            "dept_key": dept,
                            "dept_name": DEPT_DISPLAY_MAP.get(dept, "Pháp chế (Legal)"),
                            "dept_short": DEPT_SHORT_MAP.get(dept, "Pháp chế"),
                            "storage_path": f"/data/{dept}/{f.name}",
                            "size_bytes": f.stat().st_size,
                            "mtime": f.stat().st_mtime,
                            "source": "central_storage"
                        })
    return items


def save_file_to_storage(content_bytes: bytes, filename: str, department: str) -> Dict[str, Any]:
    """
    Saves raw file directly into Central Document Storage (/data/{dept}/{filename}).
    Raises Exception if saving fails. Only returns on verified success.
    """
    safe_name = sanitize_filename(filename)
    dept_key = resolve_canonical_dept(department)
    dest_subpath = f"{dept_key}/{safe_name}"

    if is_direct_storage_available():
        target_dir = os.path.join(DATA_ROOT, dept_key)
        os.makedirs(target_dir, exist_ok=True)
        target_path = os.path.join(target_dir, safe_name)
        with open(target_path, "wb") as f:
            f.write(content_bytes)
        if not os.path.exists(target_path) or os.path.getsize(target_path) == 0:
            raise IOError(f"Không thể ghi tệp vào Central Storage: {target_path}")
        logger.info(f"[CentralStorage] Saved directly: {target_path} ({len(content_bytes)} bytes)")
        return {
            "success": True,
            "filename": safe_name,
            "department": dept_key,
            "storage_path": f"/data/{dest_subpath}",
            "size_bytes": len(content_bytes),
            "storage_method": "direct"
        }

    # Case 2: Copy into container volume
    ext = os.path.splitext(safe_name)[1]
    tmp_path = None
    try:
        with tempfile.NamedTemporaryFile(delete=False, suffix=ext) as tmp:
            tmp.write(content_bytes)
            tmp_path = tmp.name

        # Ensure directory inside container exists
        subprocess.run(
            ["docker", "exec", CONTAINER_NAME, "mkdir", "-p", f"/data/{dept_key}"],
            check=True, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL
        )

        container_dest = f"{CONTAINER_NAME}:/data/{dest_subpath}"
        cp_res = subprocess.run(
            ["docker", "cp", tmp_path, container_dest],
            capture_output=True, text=True, check=True
        )

        # Verify file exists inside container
        verify_proc = subprocess.run(
            ["docker", "exec", CONTAINER_NAME, "test", "-s", f"/data/{dest_subpath}"],
            check=False
        )
        if verify_proc.returncode != 0:
            raise IOError(f"Xác nhận ghi tệp vào Central Storage thất bại: /data/{dest_subpath}")

        logger.info(f"[CentralStorage] Saved via docker cp: /data/{dest_subpath} ({len(content_bytes)} bytes)")
        return {
            "success": True,
            "filename": safe_name,
            "department": dept_key,
            "storage_path": f"/data/{dest_subpath}",
            "size_bytes": len(content_bytes),
            "storage_method": "docker_cp"
        }
    finally:
        if tmp_path and os.path.exists(tmp_path):
            try:
                os.remove(tmp_path)
            except Exception:
                pass


def delete_file_from_storage(filename: str, department: str) -> bool:
    """
    Deletes raw file from Central Document Storage (/data/{dept}/{filename}).
    """
    safe_name = sanitize_filename(filename)
    dept_key = resolve_canonical_dept(department)

    if is_direct_storage_available():
        target_path = os.path.join(DATA_ROOT, dept_key, safe_name)
        if os.path.exists(target_path):
            os.remove(target_path)
            logger.info(f"[CentralStorage] Deleted file directly: {target_path}")
            return True
        return False

    # Inside container
    try:
        subprocess.run(
            ["docker", "exec", CONTAINER_NAME, "rm", "-f", f"/data/{dept_key}/{safe_name}"],
            check=True, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL
        )
        logger.info(f"[CentralStorage] Deleted file via docker exec: /data/{dept_key}/{safe_name}")
        return True
    except Exception as e:
        logger.warning(f"[CentralStorage] Failed to delete file in container: {e}")
        return False


def rename_file_in_storage(old_name: str, new_name: str, department: str) -> bool:
    """
    Renames file in Central Document Storage (/data/{dept}/{old_name} -> /data/{dept}/{new_name}).
    """
    safe_old = sanitize_filename(old_name)
    safe_new = sanitize_filename(new_name)
    dept_key = resolve_canonical_dept(department)

    if is_direct_storage_available():
        old_path = os.path.join(DATA_ROOT, dept_key, safe_old)
        new_path = os.path.join(DATA_ROOT, dept_key, safe_new)
        if os.path.exists(old_path):
            os.rename(old_path, new_path)
            logger.info(f"[CentralStorage] Renamed file directly: {old_path} -> {new_path}")
            return True
        return False

    try:
        subprocess.run(
            ["docker", "exec", CONTAINER_NAME, "mv", f"/data/{dept_key}/{safe_old}", f"/data/{dept_key}/{safe_new}"],
            check=True, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL
        )
        logger.info(f"[CentralStorage] Renamed file via docker exec: {safe_old} -> {safe_new}")
        return True
    except Exception as e:
        logger.warning(f"[CentralStorage] Failed to rename file in container: {e}")
        return False


def read_file_from_storage(filename: str, department: str) -> Optional[bytes]:
    """
    Reads bytes of file from Central Document Storage.
    """
    safe_name = sanitize_filename(filename)
    dept_key = resolve_canonical_dept(department)

    if is_direct_storage_available():
        target_path = os.path.join(DATA_ROOT, dept_key, safe_name)
        if os.path.exists(target_path):
            with open(target_path, "rb") as f:
                return f.read()
        return None

    try:
        proc = subprocess.run(
            ["docker", "exec", CONTAINER_NAME, "cat", f"/data/{dept_key}/{safe_name}"],
            capture_output=True, check=True
        )
        return proc.stdout
    except Exception as e:
        logger.warning(f"[CentralStorage] Failed to read file from container: {e}")
        return None
