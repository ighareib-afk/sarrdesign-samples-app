from typing import Optional, List
from pydantic import BaseModel, EmailStr


# ---------- Auth ----------
class LoginIn(BaseModel):
    email: str
    password: str


class UserIn(BaseModel):
    name: str
    email: str
    password: str
    role: str
    area: Optional[str] = None
    phone: Optional[str] = None


class UserUpdateIn(BaseModel):
    name: Optional[str] = None
    role: Optional[str] = None
    area: Optional[str] = None
    phone: Optional[str] = None
    active: Optional[bool] = None
    password: Optional[str] = None
    language: Optional[str] = None


class LanguageIn(BaseModel):
    language: str  # "en" or "ar"


# ---------- Products ----------
class ProductIn(BaseModel):
    code: str
    color: Optional[str] = None
    family: Optional[str] = None
    kind: Optional[str] = None
    application: Optional[str] = None
    description_en: Optional[str] = None
    description_ar: Optional[str] = None
    price: Optional[float] = None
    default_dummy: Optional[bool] = True


class ProductUpdateIn(BaseModel):
    color: Optional[str] = None
    family: Optional[str] = None
    kind: Optional[str] = None
    application: Optional[str] = None
    description_en: Optional[str] = None
    description_ar: Optional[str] = None
    price: Optional[float] = None
    default_dummy: Optional[bool] = None
    active: Optional[bool] = None


# ---------- Distributors / Showrooms ----------
class DistributorIn(BaseModel):
    name: str
    type: Optional[str] = "distributor"
    brand: Optional[str] = "Sarrdesign"
    governorate: Optional[str] = None
    phone: Optional[str] = None
    notes: Optional[str] = None


class ShowroomIn(BaseModel):
    distributor_id: int
    name: str
    address: Optional[str] = None
    governorate: Optional[str] = None
    area: Optional[str] = None
    phone: Optional[str] = None
    contact_person: Optional[str] = None
    min_order_qty: Optional[int] = 5


# ---------- Sample requests ----------
class RequestItemIn(BaseModel):
    product_id: int
    qty_requested: int
    is_dummy: bool = True
    distributor_order_qty: Optional[int] = None


class RequestCreateIn(BaseModel):
    distributor_id: int
    showroom_id: int
    purpose: Optional[str] = "new_stand"
    distributor_order_ref: Optional[str] = None
    notes: Optional[str] = None
    items: List[RequestItemIn]


class ItemReviewIn(BaseModel):
    item_id: int
    decision: str  # approve / reject
    qty_approved: Optional[int] = None
    sku_matches_stock: Optional[bool] = None
    min_order_met: Optional[bool] = None
    director_notes: Optional[str] = None


class RequestDecisionIn(BaseModel):
    items: List[ItemReviewIn]
    notes: Optional[str] = None


class ItemReRequestIn(BaseModel):
    """Sent when re-requesting a director-rejected line - only the fields being
    changed need to be included, everything else stays as it was."""
    qty_requested: Optional[int] = None
    is_dummy: Optional[bool] = None
    distributor_order_qty: Optional[int] = None
    notes: Optional[str] = None


class FactoryShipmentIn(BaseModel):
    item_id: int
    qty_sent: int
    batch_ref: Optional[str] = None
    notes: Optional[str] = None


class WarehouseReceiptIn(BaseModel):
    item_id: int
    factory_shipment_id: Optional[int] = None
    qty_received: int
    notes: Optional[str] = None


class DismissalRequestIn(BaseModel):
    item_id: int
    showroom_id: int
    qty: int
    reason: Optional[str] = None
    reassign_from_assignment_id: Optional[int] = None


class DismissalDecisionIn(BaseModel):
    decision: str  # approve / reject
    decision_notes: Optional[str] = None


class ReturnEventIn(BaseModel):
    assignment_id: int
    qty_returned: int
    reason: str
    notes: Optional[str] = None
    restocked: Optional[bool] = True


# ---------- Shipment issue flags (warehouse-raised mismatch reports) ----------
class ShipmentFlagIn(BaseModel):
    item_id: int
    factory_shipment_id: Optional[int] = None
    reason: str


class FlagResolveIn(BaseModel):
    resolution_notes: Optional[str] = None


# ---------- Bulk delete (clearing several wrongly-entered / demo requests at once) ----------
class BulkDeleteRequestsIn(BaseModel):
    request_ids: List[int]
    reason: Optional[str] = None
    force: bool = False
