from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

import models
import schemas
import serializers
from auth import get_current_user, hash_password, log_action, require_roles
from database import get_db

router = APIRouter(prefix="/api/users", tags=["users"])


@router.get("")
def list_users(db: Session = Depends(get_db), user: models.User = Depends(require_roles(models.Role.ADMIN))):
    users = db.query(models.User).order_by(models.User.name).all()
    return [serializers.user_out(u) for u in users]


@router.post("")
def create_user(payload: schemas.UserIn, db: Session = Depends(get_db),
                 user: models.User = Depends(require_roles(models.Role.ADMIN))):
    email = payload.email.lower().strip()
    if db.query(models.User).filter(models.User.email == email).first():
        raise HTTPException(status_code=400, detail="Email already exists")
    try:
        role = models.Role(payload.role)
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid role")
    new_user = models.User(
        name=payload.name, email=email, password_hash=hash_password(payload.password),
        role=role, area=payload.area, phone=payload.phone,
    )
    db.add(new_user)
    db.flush()
    log_action(db, user, "user", new_user.id, "create", f"created {email} as {role.value}")
    db.commit()
    return serializers.user_out(new_user)


@router.patch("/{user_id}")
def update_user(user_id: int, payload: schemas.UserUpdateIn, db: Session = Depends(get_db),
                 user: models.User = Depends(require_roles(models.Role.ADMIN))):
    target = db.query(models.User).filter(models.User.id == user_id).first()
    if not target:
        raise HTTPException(status_code=404, detail="User not found")
    if payload.name is not None:
        target.name = payload.name
    if payload.role is not None:
        try:
            target.role = models.Role(payload.role)
        except ValueError:
            raise HTTPException(status_code=400, detail="Invalid role")
    if payload.area is not None:
        target.area = payload.area
    if payload.phone is not None:
        target.phone = payload.phone
    if payload.active is not None:
        target.active = payload.active
    if payload.language is not None:
        target.language = payload.language
    if payload.password:
        target.password_hash = hash_password(payload.password)
    log_action(db, user, "user", target.id, "update")
    db.commit()
    return serializers.user_out(target)
