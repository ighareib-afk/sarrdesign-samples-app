from fastapi import APIRouter, Depends, HTTPException, Response
from sqlalchemy.orm import Session

import models
import schemas
import serializers
from auth import (
    COOKIE_NAME, get_current_user, hash_password, log_action,
    make_session_token, verify_password,
)
from database import get_db

router = APIRouter(prefix="/api/auth", tags=["auth"])


@router.post("/login")
def login(payload: schemas.LoginIn, response: Response, db: Session = Depends(get_db)):
    user = db.query(models.User).filter(models.User.email == payload.email.lower().strip()).first()
    if not user or not verify_password(payload.password, user.password_hash):
        raise HTTPException(status_code=401, detail="Invalid email or password")
    if not user.active:
        raise HTTPException(status_code=403, detail="Account disabled - contact admin")
    token = make_session_token(user.id)
    response.set_cookie(
        key=COOKIE_NAME, value=token, httponly=True, samesite="lax", max_age=60 * 60 * 24 * 14,
    )
    log_action(db, user, "user", user.id, "login")
    db.commit()
    return {"user": serializers.user_out(user)}


@router.post("/logout")
def logout(response: Response):
    response.delete_cookie(COOKIE_NAME)
    return {"ok": True}


@router.get("/me")
def me(user: models.User = Depends(get_current_user)):
    return {"user": serializers.user_out(user)}


@router.patch("/me/language")
def set_my_language(payload: schemas.LanguageIn, db: Session = Depends(get_db),
                     user: models.User = Depends(get_current_user)):
    """Any signed-in user can switch their own dashboard language - no admin needed."""
    if payload.language not in ("en", "ar"):
        raise HTTPException(status_code=400, detail="language must be 'en' or 'ar'")
    user.language = payload.language
    db.commit()
    return {"user": serializers.user_out(user)}
