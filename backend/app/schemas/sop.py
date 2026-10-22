"""
Pydantic schemas for Standard Operating Procedure (SOP) API
Hỗ trợ FR26, UC.14 và quy tắc BR-04.
"""
from typing import Optional, List, Dict, Any, Union
from pydantic import BaseModel, Field


class SopStepSchema(BaseModel):
    num: int
    title: str
    desc: str


class SopCreateRequest(BaseModel):
    id: Optional[str] = None
    code: Optional[str] = None
    title: str
    dept: str
    version: Optional[str] = "v1.0"
    tags: Optional[Union[List[str], str]] = None
    purpose: Optional[str] = None
    steps: Optional[List[SopStepSchema]] = None
    governance: Optional[str] = None


class SopUpdateRequest(BaseModel):
    title: Optional[str] = None
    dept: Optional[str] = None
    version: Optional[str] = None
    tags: Optional[Union[List[str], str]] = None
    purpose: Optional[str] = None
    steps: Optional[List[SopStepSchema]] = None
    governance: Optional[str] = None


class SopPublishRequest(BaseModel):
    """
    Yêu cầu xuất bản SOP (/api/v1/sop/publish).
    Có thể truyền:
    - `sop_id` (hoặc `id` / `code`) để xuất bản SOP đã lưu trong database.
    - Hoặc toàn bộ payload mới để tạo và xuất bản trực tiếp từ trình soạn thảo.
    """
    sop_id: Optional[str] = None
    id: Optional[str] = None
    code: Optional[str] = None
    title: Optional[str] = None
    dept: Optional[str] = None
    version: Optional[str] = None
    tags: Optional[Union[List[str], str]] = None
    purpose: Optional[str] = None
    steps: Optional[List[SopStepSchema]] = None
    governance: Optional[str] = None


class SopResponse(BaseModel):
    success: bool
    message: str
    data: Optional[Dict[str, Any]] = None


class SopListResponse(BaseModel):
    success: bool
    count: int
    data: List[Dict[str, Any]]
