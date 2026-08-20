from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

import models
import schemas
import serializers
from auth import get_current_user, log_action, require_roles
from database import get_db

router = APIRouter(prefix="/api/factory", tags=["factory"])


@router.get("/queue")
def production_queue(db: Session = Depends(get_db),
                      user: models.User = Depends(require_roles(models.Role.FACTORY, models.Role.COMMERCIAL_DIRECTOR, models.Role.WAREHOUSE))):
    """Every approved item not yet fully shipped from the factory - shows delays clearly."""
    statuses = [models.ItemStatus.SENT_TO_FACTORY, models.ItemStatus.IN_PRODUCTION, models.ItemStatus.PARTIALLY_SHIPPED]
    items = db.query(models.SampleRequestItem).filter(models.SampleRequestItem.status.in_(statuses)).all()
    out = []
    for i in items:
        out.append({
            **serializers.item_out(i),
            "request_number": i.request.request_number,
            "distributor_name": i.request.distributor.name if i.request.distributor else None,
            "showroom_name": i.request.showroom.name if i.request.showroom else None,
            "date_created": i.request.date_created.isoformat() if i.request.date_created else None,
        })
    return out


@router.post("/shipments")
def log_shipment(payload: schemas.FactoryShipmentIn, db: Session = Depends(get_db),
                  user: models.User = Depends(require_roles(models.Role.FACTORY))):
    item = db.query(models.SampleRequestItem).filter(models.SampleRequestItem.id == payload.item_id).first()
    if not item:
        raise HTTPException(status_code=404, detail="Item not found")
    if item.status not in (models.ItemStatus.SENT_TO_FACTORY, models.ItemStatus.IN_PRODUCTION,
                            models.ItemStatus.PARTIALLY_SHIPPED):
        raise HTTPException(status_code=400, detail=f"Item is in status {item.status.value}, cannot log a shipment")
    if payload.qty_sent <= 0:
        raise HTTPException(status_code=400, detail="qty_sent must be positive")
    remaining = item.qty_approved - item.qty_shipped_from_factory
    if payload.qty_sent > remaining:
        raise HTTPException(status_code=400, detail=f"Only {remaining} pieces remain to ship for this item")

    shipment = models.FactoryShipment(
        item_id=item.id, qty_sent=payload.qty_sent, batch_ref=payload.batch_ref,
        notes=payload.notes, created_by=user.id,
    )
    db.add(shipment)
    item.qty_shipped_from_factory += payload.qty_sent
    item.status = (models.ItemStatus.FULLY_SHIPPED if item.qty_shipped_from_factory >= item.qty_approved
                   else models.ItemStatus.PARTIALLY_SHIPPED)

    req = item.request
    if req.status == models.RequestStatus.SENT_TO_FACTORY:
        req.status = models.RequestStatus.IN_PRODUCTION

    log_action(db, user, "sample_request_item", item.id, "factory_shipment",
               f"sent {payload.qty_sent} batch={payload.batch_ref}")
    db.commit()
    db.refresh(item)
    return serializers.item_out(item)


@router.get("/shipments/{item_id}")
def list_shipments(item_id: int, db: Session = Depends(get_db), user: models.User = Depends(get_current_user)):
    item = db.query(models.SampleRequestItem).filter(models.SampleRequestItem.id == item_id).first()
    if not item:
        raise HTTPException(status_code=404, detail="Item not found")
    return [serializers.shipment_out(s) for s in item.shipments]
