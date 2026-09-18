"""
One-time / idempotent seeding: default users + product master + a starter
set of distributors & showrooms. Distributor data extracted from the paper
list is best-effort - use the Distributors admin screen (or CSV import) to
correct/extend it.
"""
import csv
import json
import os

import openpyxl
from sqlalchemy.orm import Session

import models
from auth import hash_password

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
PRODUCTS_XLSX = os.path.join(BASE_DIR, "data", "products_seed.xlsx")
DISTRIBUTORS_CSV = os.path.join(BASE_DIR, "data", "distributors_seed.csv")
OPENING_STOCK_JSON = os.path.join(BASE_DIR, "data", "opening_stock_seed.json")
OPENING_STOCK_DISTRIBUTOR_NAME = "Sarrdesign - Opening Stock (Internal)"

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


def seed_opening_stock(db: Session):
    """
    One-time import of the team's manual warehouse stock ledger (Sept 2026),
    so the Warehouse Stock screen shows real numbers instead of starting at
    zero. Runs once - guarded by checking for the placeholder distributor it
    creates to hold these records. Each SKU becomes a minimal, fully-received
    sample-request chain (request -> item -> factory shipment -> warehouse
    receipt) attributed to the admin account, dated at import time, so it
    shows up consistently in Warehouse Stock, request history, and audit log
    without needing any change to those screens.
    """
    if db.query(models.Distributor).filter(
        models.Distributor.name == OPENING_STOCK_DISTRIBUTOR_NAME
    ).first():
        return  # already imported
    if not os.path.exists(OPENING_STOCK_JSON):
        return
    admin = db.query(models.User).filter(models.User.role == models.Role.ADMIN).first()
    if not admin:
        return

    with open(OPENING_STOCK_JSON, encoding="utf-8") as f:
        rows = json.load(f)

    dist = models.Distributor(
        name=OPENING_STOCK_DISTRIBUTOR_NAME,
        type=models.PartnerType.DISTRIBUTOR,
        brand="Sarrdesign",
        notes=(
            "Internal placeholder, not a real distributor. Holds the opening "
            "warehouse-stock balance imported from the team's manual Excel "
            "ledger (034_23082026.xlsx, 'Samples request' sheet) so the app "
            "didn't start at zero after the database migration."
        ),
    )
    db.add(dist)
    db.flush()
    showroom = models.Showroom(
        distributor_id=dist.id,
        name="Opening Balance Import",
        address="N/A - placeholder location for the initial stock count, not a physical showroom",
        min_order_qty=0,
    )
    db.add(showroom)
    db.flush()

    last = db.query(models.SampleRequest).order_by(models.SampleRequest.id.desc()).first()
    n = 244
    if last and last.request_number:
        try:
            n = int(last.request_number.split("-")[-1])
        except ValueError:
            n = 244

    imported = 0
    for row in rows:
        code = (row.get("code") or "").strip()
        qty = row.get("qty")
        if not code or not qty or qty <= 0:
            continue
        product = db.query(models.Product).filter(models.Product.code == code).first()
        if not product:
            continue

        n += 1
        req = models.SampleRequest(
            request_number=f"SD-{n:04d}",
            sales_manager_id=admin.id,
            distributor_id=dist.id,
            showroom_id=showroom.id,
            purpose="opening_stock",
            distributor_order_ref="Opening stock import from manual Excel ledger (Sept 2026)",
            status=models.RequestStatus.FULLY_RECEIVED,
            notes="Auto-imported opening warehouse balance - not a real distributor request.",
        )
        db.add(req)
        db.flush()

        item = models.SampleRequestItem(
            request_id=req.id, product_id=product.id, qty_requested=qty,
            is_dummy=product.default_dummy if product.default_dummy is not None else True,
            sku_matches_stock=True, min_order_met=True, qty_approved=qty,
            status=models.ItemStatus.FULLY_RECEIVED,
            qty_shipped_from_factory=qty, qty_received_warehouse=qty,
        )
        db.add(item)
        db.flush()

        shipment = models.FactoryShipment(
            item_id=item.id, qty_sent=qty, batch_ref="OPENING-BALANCE", created_by=admin.id,
        )
        db.add(shipment)
        db.flush()
        db.add(models.WarehouseReceipt(
            item_id=item.id, factory_shipment_id=shipment.id, qty_received=qty,
            received_by=admin.id, notes="Opening balance import",
        ))
        db.add(models.ApprovalAction(
            request_id=req.id, actor_id=admin.id, action="opening_stock_import",
            notes=f"Seeded {qty} pcs from the manual stock ledger",
        ))
        imported += 1

    db.commit()
    print(f"[seed_opening_stock] imported {imported} SKUs into '{OPENING_STOCK_DISTRIBUTOR_NAME}'")


def run_all_seeds(db: Session):
    seed_users(db)
    seed_products(db)
    seed_distributors(db)
    seed_opening_stock(db)
