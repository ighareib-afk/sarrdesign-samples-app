import os
from typing import Optional, List

import bcrypt
from fastapi import Depends, HTTPException, Request, status
from itsdangerous import URLSafeTimedSerializer, BadSignature
from sqlalchemy.orm import Session

from database import get_db
import models

SECRET_KEY = os.environ.get("SECRET_KEY", "sarrdesign-samples-dev-secret-change-me")
COOKIE_NAME = "sd_session"
SESSION_MAX_AGE = 60 * 60 * 24 * 14  # 14 days

serializer = URLSafeTimedSerializer(SECRET_KEY)


def hash_password(password: str) -> str:
    return bcrypt.hashpw(password.encode("utf-8")[:72], bcrypt.gensalt()).decode("utf-8")


def verify_password(password: str, password_hash: str) -> bool:
    try:
        return bcrypt.checkpw(password.encode("utf-8")[:72], password_hash.encode("utf-8"))
    except ValueError:
        return False


def make_session_token(user_id: int) -> str:
    return serializer.dumps({"uid": user_id})


def read_session_token(token: str) -> Optional[int]:
    try:
        data = serializer.loads(token, max_age=SESSION_MAX_AGE)
        return data.get("uid")
    except BadSignature:
        return None


def get_current_user(request: Request, db: Session = Depends(get_db)) -> models.User:
    token = request.cookies.get(COOKIE_NAME)
    if not token:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Not authenticated")
    uid = read_session_token(token)
    if not uid:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Session expired")
    user = db.query(models.User).filter(models.User.id == uid).first()
    if not user or not user.active:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Account not found or inactive")
    return user


def require_roles(*roles: models.Role):
    def dependency(user: models.User = Depends(get_current_user)) -> models.User:
        if models.Role.ADMIN.value == user.role.value:
            return user  # admin can do everything
        allowed = {r.value for r in roles}
        if user.role.value not in allowed:
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Not permitted for your role")
        return user
    return dependency


def log_action(db: Session, user: Optional[models.User], entity_type: str, entity_id: int, action: str, details: str = ""):
    entry = models.AuditLog(
        user_id=user.id if user else None,
        entity_type=entity_type,
        entity_id=entity_id,
        action=action,
        details=details,
    )
    db.add(entry)
