"""Self-check nhanh (không cần DB): python -m app.tests.test_user_admin_api  (chạy từ thư mục backend)"""
import asyncio
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))))

from fastapi import HTTPException
from fastapi.security import HTTPAuthorizationCredentials

from app.core.security import create_access_token
from app.modules.m6_admin_security.user_admin_api import _check_role, require_admin


def _cred(role):
    return HTTPAuthorizationCredentials(scheme="Bearer", credentials=create_access_token({"sub": "1", "role": role}))


def _status(cred):
    try:
        asyncio.run(require_admin(cred))
        return 200
    except HTTPException as e:
        return e.status_code


def test_user_admin_api():
    assert _status(None) == 401
    assert _status(_cred("standard")) == 403
    assert _status(_cred("it_admin")) == 200
    _check_role("executive")
    try:
        _check_role("hacker")
        raise AssertionError("role không hợp lệ phải bị chặn")
    except HTTPException:
        pass


if __name__ == "__main__":
    test_user_admin_api()
    print("OK")
