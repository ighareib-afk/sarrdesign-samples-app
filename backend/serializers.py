def user_out(u):
    if not u:
        return None
    return {
        "id": u.id, "name": u.name, "email": u.email, "role": u.role.value,
        "area": u.area, "phone": u.phone, "active": u.active,
        "language": u.language or "en",
    }


def product_out(p):
    return {
        "id": p.id, "code": p.code, "color": p.color, "family": p.family,
        "kind": p.kind, "application": p.application,
        "description_en": p.description_en, "description_ar": p.description_ar,
        "price": p.price, "default_dummy": p.default_dummy, "active": p.active,
    }


def distributor_out(d):
    return {
        "id": d.id, "name": d.name, "type": d.type.value if d.type else None,
        "brand": d.brand, "governorate": d.governorate, "phone": d.phone,
        "notes": d.notes, "active": d.active,
        "showroom_count": len(d.showrooms) if d.showrooms is not None else 0,
    }


def showroom_out(s):
    return {
        "id": s.id, "distributor_id": s.distributor_id,
        "distributor_name": s.distributor.name if s.distributor else None,
        "name": s.name, "address": s.address, "governorate": s.governorate,
        "area": s.area, "phone": s.phone, "contact_person": s.contact_person,
        "min_order_qty": s.min_order_qty, "active": s.active,
    }


def item_out(i):
    return {
        "id": i.id, "request_id": i.request_id, "product_id": i.product_id,
        "product_code": i.product.code if i.product else None,
        "product_color": i.product.color if i.product else None,
        "product_family": i.product.family if i.product else None,
        "product_description_en": i.product.description_en if i.product else None,
        "qty_requested": i.qty_requested, "is_dummy": i.is_dummy,
        "sku_matches_stock": i.sku_matches_stock,
        "distributor_order_qty": i.distributor_order_qty,
        "min_order_met": i.min_order_met,
        "qty_approved": i.qty_approved, "director_notes": i.director_notes,
        "status": i.status.value,
        "qty_shipped_from_factory": i.qty_shipped_from_factory,
        "qty_received_warehouse": i.qty_received_warehouse,
        "qty_assigned_showroom": i.qty_assigned_showroom,
        "qty_returned_warehouse": i.qty_returned_warehouse,
        "qty_in_warehouse": i.qty_in_warehouse,
        "open_flags": sum(1 for f in i.issue_flags if not f.resolved) if i.issue_flags is not None else 0,
    }


def request_out(r, include_items=True):
    out = {
        "id": r.id, "request_number": r.request_number,
        "date_created": r.date_created.isoformat() if r.date_created else None,
        "sales_manager_id": r.sales_manager_id,
        "sales_manager_name": r.sales_manager.name if r.sales_manager else None,
        "distributor_id": r.distributor_id,
        "distributor_name": r.distributor.name if r.distributor else None,
        "showroom_id": r.showroom_id,
        "showroom_name": r.showroom.name if r.showroom else None,
        "purpose": r.purpose,
        "distributor_order_ref": r.distributor_order_ref,
        "status": r.status.value,
        "notes": r.notes,
    }
    if include_items:
        out["items"] = [item_out(i) for i in r.items]
    return out


def approval_out(a):
    return {
        "id": a.id, "request_id": a.request_id, "item_id": a.item_id,
        "actor_id": a.actor_id, "actor_name": a.actor.name if a.actor else None,
        "action": a.action, "notes": a.notes,
        "created_at": a.created_at.isoformat() if a.created_at else None,
    }


def shipment_out(s):
    return {
        "id": s.id, "item_id": s.item_id, "qty_sent": s.qty_sent,
        "batch_ref": s.batch_ref,
        "date_sent": s.date_sent.isoformat() if s.date_sent else None,
        "notes": s.notes,
    }


def receipt_out(r):
    return {
        "id": r.id, "item_id": r.item_id, "factory_shipment_id": r.factory_shipment_id,
        "qty_received": r.qty_received,
        "date_received": r.date_received.isoformat() if r.date_received else None,
        "received_by": r.received_by, "notes": r.notes,
    }


def dismissal_out(d):
    return {
        "id": d.id, "item_id": d.item_id,
        "product_code": d.item.product.code if d.item and d.item.product else None,
        "showroom_id": d.showroom_id,
        "showroom_name": d.showroom.name if d.showroom else None,
        "distributor_name": d.showroom.distributor.name if d.showroom and d.showroom.distributor else None,
        "qty": d.qty, "requested_by": d.requested_by, "reason": d.reason,
        "reassign_from_assignment_id": d.reassign_from_assignment_id,
        "status": d.status.value,
        "decided_by": d.decided_by, "decision_notes": d.decision_notes,
        "date_requested": d.date_requested.isoformat() if d.date_requested else None,
        "date_decided": d.date_decided.isoformat() if d.date_decided else None,
    }


def assignment_out(a):
    return {
        "id": a.id, "item_id": a.item_id,
        "product_code": a.item.product.code if a.item and a.item.product else None,
        "product_color": a.item.product.color if a.item and a.item.product else None,
        "showroom_id": a.showroom_id,
        "showroom_name": a.showroom.name if a.showroom else None,
        "distributor_name": a.showroom.distributor.name if a.showroom and a.showroom.distributor else None,
        "qty": a.qty,
        "date_assigned": a.date_assigned.isoformat() if a.date_assigned else None,
        "assigned_by": a.assigned_by, "status": a.status.value,
        "reassigned_from_id": a.reassigned_from_id, "notes": a.notes,
    }


def return_out(r):
    return {
        "id": r.id, "assignment_id": r.assignment_id, "qty_returned": r.qty_returned,
        "reason": r.reason.value if r.reason else None, "notes": r.notes,
        "recorded_by": r.recorded_by,
        "date_returned": r.date_returned.isoformat() if r.date_returned else None,
        "restocked": r.restocked,
    }


def flag_out(f):
    item = f.item
    req = item.request if item else None
    return {
        "id": f.id, "item_id": f.item_id, "factory_shipment_id": f.factory_shipment_id,
        "reason": f.reason,
        "raised_by": f.raised_by, "raised_by_name": f.raised_by_user.name if f.raised_by_user else None,
        "created_at": f.created_at.isoformat() if f.created_at else None,
        "resolved": f.resolved,
        "resolved_by": f.resolved_by, "resolved_by_name": f.resolved_by_user.name if f.resolved_by_user else None,
        "resolved_at": f.resolved_at.isoformat() if f.resolved_at else None,
        "resolution_notes": f.resolution_notes,
        "product_code": item.product.code if item and item.product else None,
        "product_color": item.product.color if item and item.product else None,
        "request_id": req.id if req else None,
        "request_number": req.request_number if req else None,
        "distributor_name": req.distributor.name if req and req.distributor else None,
        "showroom_name": req.showroom.name if req and req.showroom else None,
    }


def audit_out(e):
    return {
        "id": e.id, "timestamp": e.timestamp.isoformat() if e.timestamp else None,
        "user_id": e.user_id, "entity_type": e.entity_type, "entity_id": e.entity_id,
        "action": e.action, "details": e.details,
    }
