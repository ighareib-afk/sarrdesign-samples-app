import datetime
import enum

from sqlalchemy import (
    Boolean, Column, DateTime, Enum, Float, ForeignKey, Integer, String, Text
)
from sqlalchemy.orm import relationship

from database import Base


def now():
    return datetime.datetime.utcnow()


# ---------------------------------------------------------------------------
# Enums
# ---------------------------------------------------------------------------

class Role(str, enum.Enum):
    ADMIN = "admin"                        # Ibrahim - full control, dismissal approval authority
    SALES_MANAGER = "sales_manager"        # creates sample requests
    COMMERCIAL_DIRECTOR = "commercial_director"  # reviews / approves requests
    FACTORY = "factory"                    # produces samples, exports lists
    WAREHOUSE = "warehouse"                # downtown warehouse stock control
    ASSEMBLY = "assembly"                  # 4-person team that displays samples in showrooms


class PartnerType(str, enum.Enum):
    DISTRIBUTOR = "distributor"
    TRADER = "trader"


class RequestStatus(str, enum.Enum):
    DRAFT = "draft"
    SUBMITTED = "submitted"
    DIRECTOR_APPROVED = "director_approved"
    DIRECTOR_REJECTED = "director_rejected"
    SENT_TO_FACTORY = "sent_to_factory"
    IN_PRODUCTION = "in_production"
    PARTIALLY_RECEIVED = "partially_received"
    FULLY_RECEIVED = "fully_received"
    PARTIALLY_ASSIGNED = "partially_assigned"
    COMPLETED = "completed"
    CANCELLED = "cancelled"


class ItemStatus(str, enum.Enum):
    PENDING_REVIEW = "pending_review"
    APPROVED = "approved"
    REJECTED = "rejected"
    SENT_TO_FACTORY = "sent_to_factory"
    IN_PRODUCTION = "in_production"
    PARTIALLY_SHIPPED = "partially_shipped"
    FULLY_SHIPPED = "fully_shipped"
    PARTIALLY_RECEIVED = "partially_received"
    FULLY_RECEIVED = "fully_received"
    ASSIGNED = "assigned"
    PARTIALLY_ASSIGNED = "partially_assigned"
    CANCELLED = "cancelled"


class DismissalStatus(str, enum.Enum):
    PENDING = "pending"
    APPROVED = "approved"
    REJECTED = "rejected"


class ReturnReason(str, enum.Enum):
    DELISTED = "delisted"
    DEFECT = "defect"
    SHADE_REPLACEMENT = "shade_replacement"
    TRADER_ISSUE_REASSIGN = "trader_issue_reassign"
    OTHER = "other"


class AssignmentStatus(str, enum.Enum):
    DISPLAYED = "displayed"
    RETURNED = "returned"
    REASSIGNED = "reassigned"


# ---------------------------------------------------------------------------
# Core entities
# ---------------------------------------------------------------------------

class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True)
    name = Column(String(120), nullable=False)
    email = Column(String(160), unique=True, nullable=False, index=True)
    password_hash = Column(String(255), nullable=False)
    role = Column(Enum(Role), nullable=False)
    area = Column(String(120))          # free text region, mainly for sales managers
    phone = Column(String(40))
    language = Column(String(5), default="en")   # "en" or "ar" - each user's own dashboard language
    active = Column(Boolean, default=True)
    created_at = Column(DateTime, default=now)


class Product(Base):
    __tablename__ = "products"

    id = Column(Integer, primary_key=True)
    code = Column(String(60), unique=True, nullable=False, index=True)   # SKU e.g. SD1090-D-CP
    color = Column(String(60))
    family = Column(String(120))         # product line name e.g. Escala
    kind = Column(String(120))           # e.g. single lever
    application = Column(String(120))    # e.g. basin
    description_en = Column(Text)
    description_ar = Column(Text)
    price = Column(Float)
    default_dummy = Column(Boolean, default=True)   # most samples are dummy (not sellable)
    active = Column(Boolean, default=True)           # False = delisted, kept for history
    created_at = Column(DateTime, default=now)
    updated_at = Column(DateTime, default=now, onupdate=now)


class Distributor(Base):
    __tablename__ = "distributors"

    id = Column(Integer, primary_key=True)
    name = Column(String(200), nullable=False)
    type = Column(Enum(PartnerType), default=PartnerType.DISTRIBUTOR)
    brand = Column(String(60), default="Sarrdesign")
    governorate = Column(String(80))
    phone = Column(String(80))
    notes = Column(Text)
    active = Column(Boolean, default=True)
    created_at = Column(DateTime, default=now)

    showrooms = relationship("Showroom", back_populates="distributor")


class Showroom(Base):
    """A showroom / booth / stand belonging to a distributor or trader."""
    __tablename__ = "showrooms"

    id = Column(Integer, primary_key=True)
    distributor_id = Column(Integer, ForeignKey("distributors.id"), nullable=False)
    name = Column(String(200), nullable=False)     # e.g. area/branch name
    address = Column(Text)
    governorate = Column(String(80))
    area = Column(String(120))
    phone = Column(String(80))
    contact_person = Column(String(120))
    min_order_qty = Column(Integer, default=5)      # minimum order threshold to justify a displayed sample
    active = Column(Boolean, default=True)
    created_at = Column(DateTime, default=now)

    distributor = relationship("Distributor", back_populates="showrooms")


# ---------------------------------------------------------------------------
# Sample request workflow
# ---------------------------------------------------------------------------

class SampleRequest(Base):
    __tablename__ = "sample_requests"

    id = Column(Integer, primary_key=True)
    request_number = Column(String(30), unique=True, nullable=False, index=True)
    date_created = Column(DateTime, default=now)
    sales_manager_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    distributor_id = Column(Integer, ForeignKey("distributors.id"), nullable=False)
    showroom_id = Column(Integer, ForeignKey("showrooms.id"), nullable=False)
    purpose = Column(String(60), default="new_stand")   # new_stand / addition / replacement / live_show
    distributor_order_ref = Column(String(200))          # free text reference to distributor order
    status = Column(Enum(RequestStatus), default=RequestStatus.SUBMITTED)
    notes = Column(Text)
    created_at = Column(DateTime, default=now)
    updated_at = Column(DateTime, default=now, onupdate=now)

    sales_manager = relationship("User", foreign_keys=[sales_manager_id])
    distributor = relationship("Distributor")
    showroom = relationship("Showroom")
    items = relationship("SampleRequestItem", back_populates="request", cascade="all, delete-orphan")
    approvals = relationship("ApprovalAction", back_populates="request", cascade="all, delete-orphan")
    attachments = relationship("Attachment", back_populates="request", cascade="all, delete-orphan")


class SampleRequestItem(Base):
    __tablename__ = "sample_request_items"

    id = Column(Integer, primary_key=True)
    request_id = Column(Integer, ForeignKey("sample_requests.id"), nullable=False)
    product_id = Column(Integer, ForeignKey("products.id"), nullable=False)
    qty_requested = Column(Integer, default=1)
    is_dummy = Column(Boolean, default=True)     # False = sellable sample (to simulate live water flow)

    # commercial director review fields
    sku_matches_stock = Column(Boolean)          # confirmed same SKU exists in distributor stock
    distributor_order_qty = Column(Integer)      # qty of this SKU in the distributor's order (for MOQ check)
    min_order_met = Column(Boolean)              # qty_requested/order >= showroom.min_order_qty
    qty_approved = Column(Integer, default=0)
    director_notes = Column(Text)

    status = Column(Enum(ItemStatus), default=ItemStatus.PENDING_REVIEW)

    # rolling quantity counters (all in "pieces")
    qty_shipped_from_factory = Column(Integer, default=0)
    qty_received_warehouse = Column(Integer, default=0)
    qty_assigned_showroom = Column(Integer, default=0)
    qty_returned_warehouse = Column(Integer, default=0)

    created_at = Column(DateTime, default=now)
    updated_at = Column(DateTime, default=now, onupdate=now)

    request = relationship("SampleRequest", back_populates="items")
    product = relationship("Product")
    shipments = relationship("FactoryShipment", back_populates="item", cascade="all, delete-orphan")
    receipts = relationship("WarehouseReceipt", back_populates="item", cascade="all, delete-orphan")
    dismissal_approvals = relationship("DismissalApproval", back_populates="item", cascade="all, delete-orphan")
    assignments = relationship("ShowroomAssignment", back_populates="item", cascade="all, delete-orphan")
    issue_flags = relationship("ShipmentIssueFlag", back_populates="item", cascade="all, delete-orphan")

    @property
    def qty_in_warehouse(self):
        # Physical stock sitting in the downtown warehouse right now.
        # qty_assigned_showroom is already net of returns (returns decrement it),
        # so this is simply what's been received minus what's currently out.
        return (self.qty_received_warehouse or 0) - (self.qty_assigned_showroom or 0)


class ApprovalAction(Base):
    """Audit trail of who approved/rejected/commented on a request (or a specific item)."""
    __tablename__ = "approval_actions"

    id = Column(Integer, primary_key=True)
    request_id = Column(Integer, ForeignKey("sample_requests.id"), nullable=False)
    item_id = Column(Integer, ForeignKey("sample_request_items.id"), nullable=True)
    actor_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    action = Column(String(40), nullable=False)   # approve / reject / request_changes / comment / submit_to_factory
    notes = Column(Text)
    created_at = Column(DateTime, default=now)

    request = relationship("SampleRequest", back_populates="approvals")
    actor = relationship("User")


class Attachment(Base):
    __tablename__ = "attachments"

    id = Column(Integer, primary_key=True)
    request_id = Column(Integer, ForeignKey("sample_requests.id"), nullable=False)
    file_name = Column(String(255))
    file_path = Column(String(500))
    kind = Column(String(60), default="distributor_order")  # distributor_order / scanned_form / other
    uploaded_by = Column(Integer, ForeignKey("users.id"))
    created_at = Column(DateTime, default=now)

    request = relationship("SampleRequest", back_populates="attachments")


# ---------------------------------------------------------------------------
# Factory -> Warehouse pipeline (handles partial / delayed batches)
# ---------------------------------------------------------------------------

class FactoryShipment(Base):
    """A batch the factory says it sent from Alexandria (samples never arrive in one batch)."""
    __tablename__ = "factory_shipments"

    id = Column(Integer, primary_key=True)
    item_id = Column(Integer, ForeignKey("sample_request_items.id"), nullable=False)
    qty_sent = Column(Integer, nullable=False)
    batch_ref = Column(String(80))
    date_sent = Column(DateTime, default=now)
    notes = Column(Text)
    created_by = Column(Integer, ForeignKey("users.id"))

    item = relationship("SampleRequestItem", back_populates="shipments")


class WarehouseReceipt(Base):
    """Downtown warehouse confirming physical receipt of a (possibly partial) batch."""
    __tablename__ = "warehouse_receipts"

    id = Column(Integer, primary_key=True)
    item_id = Column(Integer, ForeignKey("sample_request_items.id"), nullable=False)
    factory_shipment_id = Column(Integer, ForeignKey("factory_shipments.id"), nullable=True)
    qty_received = Column(Integer, nullable=False)
    date_received = Column(DateTime, default=now)
    received_by = Column(Integer, ForeignKey("users.id"))
    notes = Column(Text)

    item = relationship("SampleRequestItem", back_populates="receipts")


# ---------------------------------------------------------------------------
# Dismissal (warehouse cannot move stock without admin approval) -> Showroom
# ---------------------------------------------------------------------------

class DismissalApproval(Base):
    """
    Gate before ANY sample leaves the warehouse (new assignment or reassignment
    between traders). Only the admin (Ibrahim) may approve.
    """
    __tablename__ = "dismissal_approvals"

    id = Column(Integer, primary_key=True)
    item_id = Column(Integer, ForeignKey("sample_request_items.id"), nullable=False)
    showroom_id = Column(Integer, ForeignKey("showrooms.id"), nullable=False)
    qty = Column(Integer, nullable=False)
    requested_by = Column(Integer, ForeignKey("users.id"), nullable=False)
    reason = Column(Text)
    reassign_from_assignment_id = Column(Integer, ForeignKey("showroom_assignments.id"), nullable=True)
    status = Column(Enum(DismissalStatus), default=DismissalStatus.PENDING)
    decided_by = Column(Integer, ForeignKey("users.id"), nullable=True)
    decision_notes = Column(Text)
    date_requested = Column(DateTime, default=now)
    date_decided = Column(DateTime)

    item = relationship("SampleRequestItem", back_populates="dismissal_approvals", foreign_keys=[item_id])
    showroom = relationship("Showroom")


class ShowroomAssignment(Base):
    """A sample physically displayed at a showroom (the core of the historical archive)."""
    __tablename__ = "showroom_assignments"

    id = Column(Integer, primary_key=True)
    item_id = Column(Integer, ForeignKey("sample_request_items.id"), nullable=False)
    showroom_id = Column(Integer, ForeignKey("showrooms.id"), nullable=False)
    dismissal_approval_id = Column(Integer, ForeignKey("dismissal_approvals.id"), nullable=False)
    qty = Column(Integer, nullable=False)
    date_assigned = Column(DateTime, default=now)
    assigned_by = Column(Integer, ForeignKey("users.id"))
    status = Column(Enum(AssignmentStatus), default=AssignmentStatus.DISPLAYED)
    reassigned_from_id = Column(Integer, ForeignKey("showroom_assignments.id"), nullable=True)
    notes = Column(Text)

    item = relationship("SampleRequestItem", back_populates="assignments", foreign_keys=[item_id])
    showroom = relationship("Showroom")
    returns = relationship("ReturnEvent", back_populates="assignment", cascade="all, delete-orphan")


class ReturnEvent(Base):
    """Sample coming back from a showroom to the downtown warehouse."""
    __tablename__ = "return_events"

    id = Column(Integer, primary_key=True)
    assignment_id = Column(Integer, ForeignKey("showroom_assignments.id"), nullable=False)
    qty_returned = Column(Integer, nullable=False)
    reason = Column(Enum(ReturnReason), default=ReturnReason.OTHER)
    notes = Column(Text)
    recorded_by = Column(Integer, ForeignKey("users.id"))
    date_returned = Column(DateTime, default=now)
    restocked = Column(Boolean, default=True)   # False if it went straight to scrap / repair

    assignment = relationship("ShowroomAssignment", back_populates="returns")


# ---------------------------------------------------------------------------
# Warehouse-raised mismatch flags (receiving vs. what the factory shipped)
# ---------------------------------------------------------------------------

class ShipmentIssueFlag(Base):
    """
    An alert the warehouse raises when a factory shipment doesn't match what was
    expected (wrong quantity, wrong SKU/color, damage, etc). Purely informational -
    it never blocks receiving or anything downstream. Visible to the admin (and
    factory/director) on the Shipment Issues screen until the admin resolves it.
    """
    __tablename__ = "shipment_issue_flags"

    id = Column(Integer, primary_key=True)
    item_id = Column(Integer, ForeignKey("sample_request_items.id"), nullable=False)
    factory_shipment_id = Column(Integer, ForeignKey("factory_shipments.id"), nullable=True)
    reason = Column(Text, nullable=False)
    raised_by = Column(Integer, ForeignKey("users.id"), nullable=False)
    created_at = Column(DateTime, default=now)
    resolved = Column(Boolean, default=False)
    resolved_by = Column(Integer, ForeignKey("users.id"), nullable=True)
    resolved_at = Column(DateTime, nullable=True)
    resolution_notes = Column(Text)

    item = relationship("SampleRequestItem", back_populates="issue_flags")
    raised_by_user = relationship("User", foreign_keys=[raised_by])
    resolved_by_user = relationship("User", foreign_keys=[resolved_by])


# ---------------------------------------------------------------------------
# Audit log - everything dated and identified
# ---------------------------------------------------------------------------

class AuditLog(Base):
    __tablename__ = "audit_log"

    id = Column(Integer, primary_key=True)
    timestamp = Column(DateTime, default=now)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    entity_type = Column(String(60))
    entity_id = Column(Integer)
    action = Column(String(80))
    details = Column(Text)
