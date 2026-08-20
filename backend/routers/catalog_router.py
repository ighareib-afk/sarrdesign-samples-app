import io
from typing import Optional

import openpyxl
from fastapi import APIRouter, Depends, HTTPException, Query, UploadFile, File
from sqlalchemy.orm import Session

import models
import schemas
import serializers
from auth import get_current_user, log_action, require_roles
from database import get_db

router = APIRouter(prefix="/api", tags=["catalog"])


# ---------------------------------------------------------------------------
# Products
# ---------------------------------------------------------------------------

@router.get("/products")
def list_products(q: Optional[str] = None, include_inactive: bool = False,
                   db: Session = Depends(get_db), user: models.User = Depends(get_current_user)):
    query = db.query(models.Product)
    if not include_inactive:
        query = query.filter(models.Product.active == True)  # noqa: E712
    if q:
        like = f"%{q}%"
        query = query.filter(
            (models.Product.code.ilike(like)) |
            (models.Product.family.ilike(like)) |
            (models.Product.application.ilike(like)) |
            (models.Product.color.ilike(like))
        )
    products = query.order_by(models.Product.family, models.Product.code).all()
    return [serializers.product_out(p) for p in products]


@router.post("/products")
def create_product(payload: schemas.ProductIn, db: Session = Depends(get_db),
                    user: models.User = Depends(require_roles(models.Role.ADMIN, models.Role.COMMERCIAL_DIRECTOR))):
    if db.query(models.Product).filter(models.Product.code == payload.code).first():
        raise HTTPException(status_code=400, detail="Product code already exists")
    p = models.Product(**payload.dict())
    db.add(p)
    db.flush()
    log_action(db, user, "product", p.id, "create", payload.code)
    db.commit()
    return serializers.product_out(p)


@router.patch("/products/{product_id}")
def update_product(product_id: int, payload: schemas.ProductUpdateIn, db: Session = Depends(get_db),
                    user: models.User = Depends(require_roles(models.Role.ADMIN, models.Role.COMMERCIAL_DIRECTOR))):
    p = db.query(models.Product).filter(models.Product.id == product_id).first()
    if not p:
        raise HTTPException(status_code=404, detail="Product not found")
    for field, value in payload.dict(exclude_unset=True).items():
        setattr(p, field, value)
    log_action(db, user, "product", p.id, "update")
    db.commit()
    return serializers.product_out(p)


@router.delete("/products/{product_id}")
def delist_product(product_id: int, db: Session = Depends(get_db),
                    user: models.User = Depends(require_roles(models.Role.ADMIN, models.Role.COMMERCIAL_DIRECTOR))):
    p = db.query(models.Product).filter(models.Product.id == product_id).first()
    if not p:
        raise HTTPException(status_code=404, detail="Product not found")
    p.active = False
    log_action(db, user, "product", p.id, "delist")
    db.commit()
    return {"ok": True}


@router.post("/products/import")
def import_products(file: UploadFile = File(...), db: Session = Depends(get_db),
                     user: models.User = Depends(require_roles(models.Role.ADMIN, models.Role.COMMERCIAL_DIRECTOR))):
    """Import/refresh products from an xlsx with columns:
    Code, Color, Name, Kind, Application, Full Description, الوصف الكامل بالعربي, Price"""
    content = file.file.read()
    wb = openpyxl.load_workbook(io.BytesIO(content), data_only=True)
    ws = wb.worksheets[0]
    rows = list(ws.iter_rows(values_only=True))
    created, updated = 0, 0
    for row in rows[1:]:
        if not row or not row[0]:
            continue
        code = str(row[0]).strip()
        color = row[1]
        family = row[2]
        kind = row[3]
        application = row[4]
        desc_en = row[5]
        desc_ar = row[6] if len(row) > 6 else None
        price = row[7] if len(row) > 7 else None
        existing = db.query(models.Product).filter(models.Product.code == code).first()
        if existing:
            existing.color, existing.family, existing.kind = color, family, kind
            existing.application, existing.description_en = application, desc_en
            existing.description_ar, existing.price = desc_ar, price
            existing.active = True
            updated += 1
        else:
            db.add(models.Product(
                code=code, color=color, family=family, kind=kind, application=application,
                description_en=desc_en, description_ar=desc_ar, price=price,
            ))
            created += 1
    log_action(db, user, "product", 0, "import", f"created={created} updated={updated}")
    db.commit()
    return {"created": created, "updated": updated}


# ---------------------------------------------------------------------------
# Distributors
# ---------------------------------------------------------------------------

@router.get("/distributors")
def list_distributors(q: Optional[str] = None, db: Session = Depends(get_db),
                       user: models.User = Depends(get_current_user)):
    query = db.query(models.Distributor).filter(models.Distributor.active == True)  # noqa: E712
    if q:
        query = query.filter(models.Distributor.name.ilike(f"%{q}%"))
    dists = query.order_by(models.Distributor.name).all()
    return [serializers.distributor_out(d) for d in dists]


@router.post("/distributors")
def create_distributor(payload: schemas.DistributorIn, db: Session = Depends(get_db),
                        user: models.User = Depends(require_roles(models.Role.ADMIN, models.Role.SALES_MANAGER, models.Role.COMMERCIAL_DIRECTOR))):
    d = models.Distributor(
        name=payload.name, type=models.PartnerType(payload.type or "distributor"),
        brand=payload.brand, governorate=payload.governorate, phone=payload.phone, notes=payload.notes,
    )
    db.add(d)
    db.flush()
    log_action(db, user, "distributor", d.id, "create", payload.name)
    db.commit()
    return serializers.distributor_out(d)


@router.patch("/distributors/{distributor_id}")
def update_distributor(distributor_id: int, payload: schemas.DistributorIn, db: Session = Depends(get_db),
                        user: models.User = Depends(require_roles(models.Role.ADMIN, models.Role.COMMERCIAL_DIRECTOR))):
    d = db.query(models.Distributor).filter(models.Distributor.id == distributor_id).first()
    if not d:
        raise HTTPException(status_code=404, detail="Distributor not found")
    d.name = payload.name
    d.type = models.PartnerType(payload.type or "distributor")
    d.brand = payload.brand
    d.governorate = payload.governorate
    d.phone = payload.phone
    d.notes = payload.notes
    log_action(db, user, "distributor", d.id, "update")
    db.commit()
    return serializers.distributor_out(d)


@router.delete("/distributors/{distributor_id}")
def deactivate_distributor(distributor_id: int, db: Session = Depends(get_db),
                            user: models.User = Depends(require_roles(models.Role.ADMIN))):
    d = db.query(models.Distributor).filter(models.Distributor.id == distributor_id).first()
    if not d:
        raise HTTPException(status_code=404, detail="Distributor not found")
    d.active = False
    log_action(db, user, "distributor", d.id, "deactivate")
    db.commit()
    return {"ok": True}


# ---------------------------------------------------------------------------
# Showrooms
# ---------------------------------------------------------------------------

@router.get("/showrooms")
def list_showrooms(distributor_id: Optional[int] = None, db: Session = Depends(get_db),
                    user: models.User = Depends(get_current_user)):
    query = db.query(models.Showroom).filter(models.Showroom.active == True)  # noqa: E712
    if distributor_id:
        query = query.filter(models.Showroom.distributor_id == distributor_id)
    rooms = query.order_by(models.Showroom.name).all()
    return [serializers.showroom_out(s) for s in rooms]


@router.post("/showrooms")
def create_showroom(payload: schemas.ShowroomIn, db: Session = Depends(get_db),
                     user: models.User = Depends(require_roles(models.Role.ADMIN, models.Role.SALES_MANAGER, models.Role.COMMERCIAL_DIRECTOR))):
    if not db.query(models.Distributor).filter(models.Distributor.id == payload.distributor_id).first():
        raise HTTPException(status_code=404, detail="Distributor not found")
    s = models.Showroom(**payload.dict())
    db.add(s)
    db.flush()
    log_action(db, user, "showroom", s.id, "create", payload.name)
    db.commit()
    return serializers.showroom_out(s)


@router.patch("/showrooms/{showroom_id}")
def update_showroom(showroom_id: int, payload: schemas.ShowroomIn, db: Session = Depends(get_db),
                     user: models.User = Depends(require_roles(models.Role.ADMIN, models.Role.COMMERCIAL_DIRECTOR))):
    s = db.query(models.Showroom).filter(models.Showroom.id == showroom_id).first()
    if not s:
        raise HTTPException(status_code=404, detail="Showroom not found")
    for field, value in payload.dict(exclude_unset=True).items():
        setattr(s, field, value)
    log_action(db, user, "showroom", s.id, "update")
    db.commit()
    return serializers.showroom_out(s)


@router.delete("/showrooms/{showroom_id}")
def deactivate_showroom(showroom_id: int, db: Session = Depends(get_db),
                         user: models.User = Depends(require_roles(models.Role.ADMIN))):
    s = db.query(models.Showroom).filter(models.Showroom.id == showroom_id).first()
    if not s:
        raise HTTPException(status_code=404, detail="Showroom not found")
    s.active = False
    log_action(db, user, "showroom", s.id, "deactivate")
    db.commit()
    return {"ok": True}
