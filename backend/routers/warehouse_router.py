from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session

import models
import schemas
import serializers
from auth import get_current_user, log_action, require_roles
from database import get_db

router = APIRouter(prefix="/api/warehouse", tags=["warehouse"])


def recompute_item_status(item: models.SampleRequestItem):
    """Re-derive an item's high-level status from its current quantity counters.
    Called after anything that changes qty_assigned_showroom (new assignment or a return)."""
    if item.status == models.ItemStatus.REJECTED:
        return
    if item.qty_assigned_showroom <= 0:
        item.status = (models.ItemStatus.FULLY_RECEIVED if item.qty_received_warehouse >= item.qty_approved
                       else models.ItemStatus.PARTIALLY_RECEIVED)
    elif item.qty_assigned_showroom < item.qty_received_warehouse:
        item.status = models.ItemStatus.PARTIALLY_ASSIGNED
    else:
        item.status = models.ItemStatus.ASSIGNED


def recompute_request_status(req: models.SampleRequest):
    item_statuses = {it.status for it in req.items if it.status != models.ItemStatus.REJECTED}
    if not item_statuses:
        return
    if item_statuses.issubset({models.ItemStatus.ASSIGNED}):
        req.status = models.RequestStatus.COMPLETED
    elif models.ItemStatus.ASSIGNED in item_statuses or models.ItemStatus.PARTIALLY_ASSIGNED in item_statuses:
        req.status = models.RequestStatus.PARTIALLY_ASSIGNED
    elif item_statuses.issubset({models.ItemStatus.FULLY_RECEIVED}):
        req.status = models.RequestStatus.FULLY_RECEIVED
    elif models.ItemStatus.PARTIALLY_RECEIVED in item_statuses or models.ItemStatus.FULLY_RECEIVED in item_statuses:
        req.status = models.RequestStatus.PARTIALLY_RECEIVED


# ---------------------------------------------------------------------------
# Receiving (handles: batches never arrive together, delays up to months)
# ---------------------------------------------------------------------------

@router.get("/incoming")
def incoming(db: Session = Depends(get_db),
             user: models.User = Depends(require_roles(models.Role.WAREHOUSE, models.Role.COMMERCIAL_DIRECTOR, models.Role.FACTORY))):
    """Items shipped by the factory but not yet fully received - and items approved
    but never shipped at all (the >3 month delay problem)."""
    statuses = [models.ItemStatus.SENT_TO_FACTORY, models.ItemStatus.IN_PRODUCTION,
                models.ItemStatus.PARTIALLY_SHIPPED, models.ItemStatus.FULLY_SHIPPED,
                models.ItemStatus.PARTIALLY_RECEIVED]
    items = db.query(models.SampleRequestItem).filter(models.SampleRequestItem.status.in_(statuses)).all()
    out = []
    for i in items:
        pending_receive = i.qty_shipped_from_factory - i.qty_received_warehouse
        never_shipped_days = None
        if i.qty_shipped_from_factory == 0:
            never_shipped_days = (models.now() - i.updated_at).days if i.updated_at else None
        out.append({
            **serializers.item_out(i),
            "request_number": i.request.request_number,
            "distributor_name": i.request.distributor.name if i.request.distributor else None,
            "showroom_name": i.request.showroom.name if i.request.showroom else None,
            "pending_receive": pending_receive,
            "outstanding_from_factory": i.qty_approved - i.qty_shipped_from_factory,
            "days_since_last_update": never_shipped_days,
        })
    return out


@router.post("/receipts")
def log_receipt(payload: schemas.WarehouseReceiptIn, db: Session = Depends(get_db),
                 user: models.User = Depends(require_roles(models.Role.WAREHOUSE))):
    item = db.query(models.SampleRequestItem).filter(models.SampleRequestItem.id == payload.item_id).first()
    if not item:
        raise HTTPException(status_code=404, detail="Item not found")
    if payload.qty_received <= 0:
        raise HTTPException(status_code=400, detail="qty_received must be positive")
    remaining = item.qty_shipped_from_factory - item.qty_received_warehouse
    if payload.qty_received > remaining:
        raise HTTPException(status_code=400, detail=f"Only {remaining} pieces are known to be in transit for this item")

    receipt = models.WarehouseReceipt(
        item_id=item.id, factory_shipment_id=payload.factory_shipment_id,
        qty_received=payload.qty_received, received_by=user.id, notes=payload.notes,
    )
    db.add(receipt)
    item.qty_received_warehouse += payload.qty_received
    item.status = (models.ItemStatus.FULLY_RECEIVED if item.qty_received_warehouse >= item.qty_approved
                   else models.ItemStatus.PARTIALLY_RECEIVED)

    req = item.request
    statuses = {it.status for it in req.items if it.status != models.ItemStatus.REJECTED}
    if statuses and statuses.issubset({models.ItemStatus.FULLY_RECEIVED}):
        req.status = models.RequestStatus.FULLY_RECEIVED
    elif models.ItemStatus.PARTIALLY_RECEIVED in statuses or models.ItemStatus.FULLY_RECEIVED in statuses:
        req.status = models.RequestStatus.PARTIALLY_RECEIVED

    log_action(db, user, "sample_request_item", item.id, "warehouse_receipt", f"received {payload.qty_received}")
    db.commit()
    db.refresh(item)
    return serializers.item_out(item)


@router.get("/stock")
def stock(q: Optional[str] = None, db: Session = Depends(get_db),
          user: models.User = Depends(get_current_user)):
    """Current physical stock sitting in the downtown warehouse, per request item."""
    items = db.query(models.SampleRequestItem).filter(
        models.SampleRequestItem.qty_received_warehouse > 0
    ).all()
    out = []
    for i in items:
        in_wh = i.qty_in_warehouse
        if in_wh <= 0:
            continue
        if q:
            hay = f"{i.product.code} {i.product.family} {i.product.color}".lower()
            if q.lower() not in hay:
                continue
        out.append({
            **serializers.item_out(i),
            "request_number": i.request.request_number,
            "distributor_name": i.request.distributor.name if i.request.distributor else None,
            "showroom_name": i.request.showroom.name if i.request.showroom else None,
        })
    return out


# ---------------------------------------------------------------------------
# Dismissal approvals - warehouse/assembly can SEE stock but need admin sign-off
# to move anything out (new assignment OR reassignment between traders)
# ---------------------------------------------------------------------------

@router.post("/dismissal-requests")
def request_dismissal(payload: schemas.DismissalRequestIn, db: Session = Depends(get_db),
                       user: models.User = Depends(require_roles(models.Role.WAREHOUSE, models.Role.ASSEMBLY))):
    item = db.query(models.SampleRequestItem).filter(models.SampleRequestItem.id == payload.item_id).first()
    if not item:
        raise HTTPException(status_code=404, detail="Item not found")
    showroom = db.query(models.Showroom).filter(models.Showroom.id == payload.showroom_id).first()
    if not showroom:
        raise HTTPException(status_code=404, detail="Showroom not found")
    if payload.qty > item.qty_in_warehouse and not payload.reassign_from_assignment_id:
        raise HTTPException(status_code=400, detail=f"Only {item.qty_in_warehouse} in warehouse stock for this item")

    dr = models.DismissalApproval(
        item_id=item.id, showroom_id=payload.showroom_id, qty=payload.qty,
        requested_by=user.id, reason=payload.reason,
        reassign_from_assignment_id=payload.reassign_from_assignment_id,
    )
    db.add(dr)
    log_action(db, user, "sample_request_item", item.id, "dismissal_requested",
               f"qty={payload.qty} showroom={payload.showroom_id}")
    db.commit()
    db.refresh(dr)
    return serializers.dismissal_out(dr)


@router.get("/dismissal-requests")
def list_dismissal_requests(status: Optional[str] = "pending", db: Session = Depends(get_db),
                             user: models.User = Depends(get_current_user)):
    query = db.query(models.DismissalApproval)
    if status:
        try:
            query = query.filter(models.DismissalApproval.status == models.DismissalStatus(status))
        except ValueError:
            raise HTTPException(status_code=400, detail="Invalid status")
    drs = query.order_by(models.DismissalApproval.id.desc()).all()
    return [serializers.dismissal_out(d) for d in drs]


@router.post("/dismissal-requests/{dismissal_id}/decide")
def decide_dismissal(dismissal_id: int, payload: schemas.DismissalDecisionIn, db: Session = Depends(get_db),
                      user: models.User = Depends(require_roles(models.Role.ADMIN))):
    dr = db.query(models.DismissalApproval).filter(models.DismissalApproval.id == dismissal_id).first()
    if not dr:
        raise HTTPException(status_code=404, detail="Dismissal request not found")
    if dr.status != models.DismissalStatus.PENDING:
        raise HTTPException(status_code=400, detail="Already decided")
    if payload.decision not in ("approve", "reject"):
        raise HTTPException(status_code=400, detail="decision must be approve or reject")
    dr.status = models.DismissalStatus.APPROVED if payload.decision == "approve" else models.DismissalStatus.REJECTED
    dr.decided_by = user.id
    dr.decision_notes = payload.decision_notes
    dr.date_decided = models.now()
    log_action(db, user, "dismissal_approval", dr.id, f"dismissal_{payload.decision}", payload.decision_notes or "")
    db.commit()
    db.refresh(dr)
    return serializers.dismissal_out(dr)


# ---------------------------------------------------------------------------
# Showroom assignment (the assembly team physically displaying the sample)
# ---------------------------------------------------------------------------

@router.get("/showroom/{showroom_id}/current")
def showroom_current(showroom_id: int, db: Session = Depends(get_db), user: models.User = Depends(get_current_user)):
    """What's currently displayed at a showroom - used to catch 'we gave them 2 of the same sample'."""
    assignments = db.query(models.ShowroomAssignment).filter(
        models.ShowroomAssignment.showroom_id == showroom_id,
        models.ShowroomAssignment.status == models.AssignmentStatus.DISPLAYED,
    ).all()
    return [serializers.assignment_out(a) for a in assignments]


@router.post("/assignments")
def create_assignment(dismissal_id: int, qty: Optional[int] = None, confirm_duplicate: bool = False,
                       db: Session = Depends(get_db),
                       user: models.User = Depends(require_roles(models.Role.ASSEMBLY, models.Role.WAREHOUSE))):
    dr = db.query(models.DismissalApproval).filter(models.DismissalApproval.id == dismissal_id).first()
    if not dr:
        raise HTTPException(status_code=404, detail="Dismissal request not found")
    if dr.status != models.DismissalStatus.APPROVED:
        raise HTTPException(status_code=400, detail="This dismissal has not been approved by the admin yet")

    already_used = db.query(models.ShowroomAssignment).filter(
        models.ShowroomAssignment.dismissal_approval_id == dr.id
    ).first()
    if already_used:
        raise HTTPException(status_code=400, detail="This approval has already been used to create an assignment")

    place_qty = qty or dr.qty
    if place_qty > dr.qty:
        raise HTTPException(status_code=400, detail=f"Approved for at most {dr.qty} pieces")

    # duplicate-display guard: same product code+color already live at this showroom
    duplicate = db.query(models.ShowroomAssignment).join(
        models.SampleRequestItem, models.ShowroomAssignment.item_id == models.SampleRequestItem.id
    ).filter(
        models.ShowroomAssignment.showroom_id == dr.showroom_id,
        models.ShowroomAssignment.status == models.AssignmentStatus.DISPLAYED,
        models.SampleRequestItem.product_id == dr.item.product_id,
    ).first()
    if duplicate and not confirm_duplicate:
        raise HTTPException(
            status_code=409,
            detail=f"This exact sample ({dr.item.product.code} / {dr.item.product.color}) is already displayed "
                   f"at this showroom (assignment #{duplicate.id}, {duplicate.date_assigned.strftime('%Y-%m-%d')}). "
                   f"Resend with confirm_duplicate=true to place it anyway.",
        )

    assignment = models.ShowroomAssignment(
        item_id=dr.item_id, showroom_id=dr.showroom_id, dismissal_approval_id=dr.id,
        qty=place_qty, assigned_by=user.id,
        reassigned_from_id=dr.reassign_from_assignment_id,
    )
    db.add(assignment)

    item = dr.item
    item.qty_assigned_showroom += place_qty
    recompute_item_status(item)

    if dr.reassign_from_assignment_id:
        old = db.query(models.ShowroomAssignment).filter(
            models.ShowroomAssignment.id == dr.reassign_from_assignment_id
        ).first()
        if old:
            old.status = models.AssignmentStatus.REASSIGNED

    recompute_request_status(item.request)

    log_action(db, user, "showroom_assignment", 0, "assign",
               f"item={item.id} showroom={dr.showroom_id} qty={place_qty}")
    db.commit()
    db.refresh(assignment)
    return serializers.assignment_out(assignment)


# ---------------------------------------------------------------------------
# Returns
# ---------------------------------------------------------------------------

@router.post("/returns")
def record_return(payload: schemas.ReturnEventIn, db: Session = Depends(get_db),
                   user: models.User = Depends(require_roles(models.Role.WAREHOUSE, models.Role.ASSEMBLY))):
    assignment = db.query(models.ShowroomAssignment).filter(
        models.ShowroomAssignment.id == payload.assignment_id
    ).first()
    if not assignment:
        raise HTTPException(status_code=404, detail="Assignment not found")
    already_returned = sum(r.qty_returned for r in assignment.returns)
    remaining = assignment.qty - already_returned
    if payload.qty_returned > remaining:
        raise HTTPException(status_code=400, detail=f"Only {remaining} pieces remain displayed for this assignment")
    try:
        reason = models.ReturnReason(payload.reason)
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid return reason")

    ret = models.ReturnEvent(
        assignment_id=assignment.id, qty_returned=payload.qty_returned, reason=reason,
        notes=payload.notes, recorded_by=user.id, restocked=payload.restocked,
    )
    db.add(ret)
    if payload.qty_returned >= remaining:
        assignment.status = models.AssignmentStatus.RETURNED

    item = assignment.item
    item.qty_assigned_showroom -= payload.qty_returned
    if payload.restocked:
        item.qty_returned_warehouse += payload.qty_returned
    else:
        # scrapped / sent for repair - no longer counts as received stock either
        item.qty_received_warehouse -= payload.qty_returned
    recompute_item_status(item)
    recompute_request_status(item.request)

    log_action(db, user, "showroom_assignment", assignment.id, "return",
               f"qty={payload.qty_returned} reason={reason.value}")
    db.commit()
    db.refresh(ret)
    return serializers.return_out(ret)


# ---------------------------------------------------------------------------
# Historical archive - per distributor / per showroom
# ---------------------------------------------------------------------------

@router.get("/history/distributor/{distributor_id}")
def distributor_history(distributor_id: int, db: Session = Depends(get_db), user: models.User = Depends(get_current_user)):
    dist = db.query(models.Distributor).filter(models.Distributor.id == distributor_id).first()
    if not dist:
        raise HTTPException(status_code=404, detail="Distributor not found")
    requests = db.query(models.SampleRequest).filter(models.SampleRequest.distributor_id == distributor_id).order_by(models.SampleRequest.id.desc()).all()

    timeline = []
    for r in requests:
        timeline.append({"date": r.date_created.isoformat() if r.date_created else None, "type": "request_submitted",
                          "detail": f"{r.request_number} ({r.showroom.name if r.showroom else ''}) - {len(r.items)} SKUs"})
        for it in r.items:
            for sh in it.shipments:
                timeline.append({"date": sh.date_sent.isoformat() if sh.date_sent else None, "type": "factory_shipment",
                                  "detail": f"{r.request_number} {it.product.code}: shipped {sh.qty_sent}"})
            for rc in it.receipts:
                timeline.append({"date": rc.date_received.isoformat() if rc.date_received else None, "type": "warehouse_receipt",
                                  "detail": f"{r.request_number} {it.product.code}: received {rc.qty_received}"})
            for asg in it.assignments:
                timeline.append({"date": asg.date_assigned.isoformat() if asg.date_assigned else None, "type": "showroom_assignment",
                                  "detail": f"{it.product.code} / {it.product.color}: placed at {asg.showroom.name if asg.showroom else ''} (qty {asg.qty}) [{asg.status.value}]"})
                for ret in asg.returns:
                    timeline.append({"date": ret.date_returned.isoformat() if ret.date_returned else None, "type": "return",
                                      "detail": f"{it.product.code}: returned {ret.qty_returned} from {asg.showroom.name if asg.showroom else ''} - {ret.reason.value}"})

    timeline.sort(key=lambda x: x["date"] or "", reverse=True)
    return {
        "distributor": serializers.distributor_out(dist),
        "showrooms": [serializers.showroom_out(s) for s in dist.showrooms],
        "requests": [serializers.request_out(r, include_items=False) for r in requests],
        "timeline": timeline,
    }


@router.get("/history/showroom/{showroom_id}")
def showroom_history(showroom_id: int, db: Session = Depends(get_db), user: models.User = Depends(get_current_user)):
    sr = db.query(models.Showroom).filter(models.Showroom.id == showroom_id).first()
    if not sr:
        raise HTTPException(status_code=404, detail="Showroom not found")
    assignments = db.query(models.ShowroomAssignment).filter(models.ShowroomAssignment.showroom_id == showroom_id).order_by(models.ShowroomAssignment.id.desc()).all()
    currently_displayed = [a for a in assignments if a.status == models.AssignmentStatus.DISPLAYED]
    return {
        "showroom": serializers.showroom_out(sr),
        "currently_displayed": [serializers.assignment_out(a) for a in currently_displayed],
        "all_assignments": [serializers.assignment_out(a) for a in assignments],
        "returns": [serializers.return_out(r) for a in assignments for r in a.returns],
    }
