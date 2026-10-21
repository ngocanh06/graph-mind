"""
OTP store in-memory - TTL 10 phut, 6 chu so.
ponytail: dict don gian du dung; upgrade len Redis khi can cluster hoac restart-safe.

Bao mat:
  - Single-use: OTP bi xoa ngay sau khi dung dung.
  - Expiry: TTL 10 phut.
  - Brute-force guard: 5 lan nhap sai -> huy OTP, buoc xin ma moi.
  - Rate-limit gui lai: backend enforce 60s, chong bypass qua API.
"""
import random
import string
import time

_store: dict[str, tuple[str, float, int]] = {}  # key -> (otp, expire_ts, fail_count)
_send_ts: dict[str, float] = {}                  # email -> timestamp lan gui gan nhat

OTP_TTL = 600        # 10 phut
MAX_FAILS = 5        # xoa OTP sau 5 lan nhap sai
RESEND_COOLDOWN = 60 # giay


def can_resend(email: str) -> bool:
    """True neu da qua 60s ke tu lan gui truoc."""
    last = _send_ts.get(email.lower(), 0)
    return (time.time() - last) >= RESEND_COOLDOWN


def generate_otp(email: str) -> str:
    """Tao OTP moi, ghi de ban cu. Ghi timestamp gui."""
    otp = "".join(random.choices(string.digits, k=6))
    key = email.lower()
    _store[key] = (otp, time.time() + OTP_TTL, 0)
    _send_ts[key] = time.time()
    return otp


def verify_otp(email: str, otp: str) -> bool:
    """Kiem tra OTP. Single-use + brute-force guard."""
    key = email.lower()
    entry = _store.get(key)
    if not entry:
        return False
    code, expires, fails = entry
    if time.time() > expires:
        _store.pop(key, None)
        return False
    if code != otp.strip():
        fails += 1
        if fails >= MAX_FAILS:
            _store.pop(key, None)   # huy luon sau MAX_FAILS lan sai
        else:
            _store[key] = (code, expires, fails)
        return False
    _store.pop(key)   # single-use
    return True
