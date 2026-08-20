"""
One-time / idempotent seeding: default users + product master + a starter
set of distributors & showrooms. Distributor data extracted from the paper
list is best-effort - use the Distributors admin screen (or CSV import) to
correct/extend it.
"""
import csv
import os

import openpyxl
from sqlalchemy.orm import Session

import models
from auth import hash_password

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
PRODUCTS_XLSX = os.path.join(BASE_DIR, "data", "products_seed.xlsx")
DISTRIBUTORS_CSV = os.path.join(BASE_DIR, "data", "distributors_seed.csv")

DEFAULT_USERS = [
    # name, email, password, role, area
    ("Ibrahim (Admin)", "ighareib@gmail.com", "ChangeMe123!", models.Role.ADMIN, None),
    ("Sales Manager Demo", "sales@sarrdesign.demo", "ChangeMe123!", models.Role.SALES_MANAGER, "Cairo & Giza"),
    ("Commercial Director Demo", "director@sarrdesign.demo", "ChangeMe123!", models.Role.COMMERCIAL_DIRECTOR, None),
    ("Factory Demo", "factory@sarrdesign.demo", "ChangeMe123!", models.Role.FACTORY, None),
    ("Warehouse Demo", "warehouse@sarrdesign.demo", "ChangeMe123!", models.Role.WAREHOUSE, None),
    ("Assembly Team Demo", "assembly@sarrdesign.demo", "ChangeMe123!", models.Role.ASSEMBLY, None),
]


def seed_users(db: Session):
    if db.query(models.User).count() > 0:
        return
    for name, email, pw, role, area in DEFAULT_USERS:
        db.add(models.User(name=name, email=email, password_hash=hash_password(pw), role=role, area=area))
    db.commit()


def seed_products(db: Session):
    if db.query(models.Product).count() > 0:
        return
    if not os.path.exists(PRODUCTS_XLSX):
        return
    wb = openpyxl.load_workbook(PRODUCTS_XLSX, data_only=True)
    ws = wb.worksheets[0]
    rows = list(ws.iter_rows(values_only=True))
    for row in rows[1:]:
        if not row or not row[0]:
            continue
        code = str(row[0]).strip()
        if db.query(models.Product).filter(models.Product.code == code).first():
            continue
        db.add(models.Product(
            code=code, color=row[1], family=row[2], kind=row[3], application=row[4],
            description_en=row[5], description_ar=row[6] if len(row) > 6 else None,
            price=row[7] if len(row) > 7 else None,
        ))
    db.commit()


def seed_distributors(db: Session):
    if db.query(models.Distributor).count() > 0:
        return
    if not os.path.exists(DISTRIBUTORS_CSV):
        return
    with open(DISTRIBUTORS_CSV, newline="", encoding="utf-8") as f:
        reader = csv.DictReader(f)
        dist_cache = {}
        for row in reader:
            name = (row.get("distributor_name") or "").strip()
            if not name:
                continue
            key = name
            dist = dist_cache.get(key)
            if not dist:
                dist = db.query(models.Distributor).filter(models.Distributor.name == name).first()
                if not dist:
                    dist = models.Distributor(
                        name=name,
                        type=models.PartnerType.DISTRIBUTOR,
                        brand=row.get("brand") or "Sarrdesign",
                        governorate=row.get("governorate") or None,
                    )
                    db.add(dist)
                    db.flush()
                dist_cache[key] = dist
            showroom_name = (row.get("area") or row.get("governorate") or "Showroom").strip()
            db.add(models.Showroom(
                distributor_id=dist.id,
                name=showroom_name,
                address=row.get("address"),
                governorate=row.get("governorate"),
                area=row.get("area"),
                phone=row.get("phone"),
            ))
    db.commit()


def run_all_seeds(db: Session):
    seed_users(db)
    seed_products(db)
    seed_distributors(db)
