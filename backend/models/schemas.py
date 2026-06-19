from pydantic import BaseModel, EmailStr, field_validator
from datetime import datetime
from typing import Optional
from models.database import UserRole, BusType, BookingStatus


# ─── Auth Schemas ────────────────────────────────────────────────────────────
class UserCreate(BaseModel):
    name: str
    email: EmailStr
    password: str
    role: UserRole = UserRole.customer


class UserLogin(BaseModel):
    email: EmailStr
    password: str


class UserOut(BaseModel):
    id: int
    name: str
    email: str
    role: UserRole
    created_at: datetime

    class Config:
        from_attributes = True


class Token(BaseModel):
    access_token: str
    token_type: str
    user: UserOut


# ─── Bus Schemas ─────────────────────────────────────────────────────────────
class BusCreate(BaseModel):
    name: str
    origin: str
    destination: str
    departure_time: datetime
    arrival_time: Optional[datetime] = None
    bus_type: BusType
    total_seats: int
    price: float
    is_active: bool = True
    seats_per_row: int = 4

    @field_validator("total_seats")
    @classmethod
    def seats_must_be_positive(cls, v):
        if v <= 0:
            raise ValueError("Total seats must be positive")
        return v

    @field_validator("price")
    @classmethod
    def price_must_be_positive(cls, v):
        if v <= 0:
            raise ValueError("Price must be positive")
        return v

    @field_validator("seats_per_row")
    @classmethod
    def seats_per_row_valid(cls, v):
        if v not in (3, 4):
            raise ValueError("seats_per_row must be 3 (2+1 layout) or 4 (2+2 layout)")
        return v


class BusUpdate(BaseModel):
    name: Optional[str] = None
    origin: Optional[str] = None
    destination: Optional[str] = None
    departure_time: Optional[datetime] = None
    arrival_time: Optional[datetime] = None
    bus_type: Optional[BusType] = None
    total_seats: Optional[int] = None
    price: Optional[float] = None
    is_active: Optional[bool] = None
    seats_per_row: Optional[int] = None


class BusOut(BaseModel):
    id: int
    name: str
    origin: str
    destination: str
    departure_time: datetime
    arrival_time: Optional[datetime]
    bus_type: BusType
    total_seats: int
    available_seats: int
    price: float
    is_active: bool
    seats_per_row: int
    created_at: datetime

    class Config:
        from_attributes = True


# ─── Booking Schemas ─────────────────────────────────────────────────────────
class BookingCreate(BaseModel):
    bus_id: int
    passenger_name: str
    passenger_email: EmailStr
    passenger_phone: str
    seat_count: int = 1

    @field_validator("seat_count")
    @classmethod
    def seat_count_valid(cls, v):
        if v < 1:
            raise ValueError("seat_count must be at least 1")
        if v > 10:
            raise ValueError("Cannot book more than 10 seats in a single booking")
        return v


class BookingSeatOut(BaseModel):
    seat_number: int

    class Config:
        from_attributes = True


class BookingOut(BaseModel):
    id: int
    booking_reference: str
    bus_id: int
    customer_id: int
    passenger_name: str
    passenger_email: str
    passenger_phone: str
    seat_count: int
    seats: list[BookingSeatOut] = []
    seat_allocation_note: Optional[str] = None
    status: BookingStatus
    booked_at: datetime
    total_fare: float
    bus: Optional[BusOut] = None

    class Config:
        from_attributes = True


# ─── Seat Optimizer Preview Schemas ──────────────────────────────────────────
class SeatPreviewRequest(BaseModel):
    bus_id: int
    seat_count: int = 1


class SeatPreviewSeat(BaseModel):
    seat_number: int
    row: int
    position: str  # Window | Aisle | Middle


class SeatPreviewResponse(BaseModel):
    seat_numbers: list[int]
    seats: list[SeatPreviewSeat]
    is_fully_adjacent: bool
    quality_score: float
    reason: str


class SeatMapSeat(BaseModel):
    seat_number: int
    row: int
    position: str  # Window | Aisle | Middle
    is_taken: bool


class SeatMapResponse(BaseModel):
    bus_id: int
    total_seats: int
    seats_per_row: int
    seats: list[SeatMapSeat]


# ─── AI Search Schema ─────────────────────────────────────────────────────────
class AISearchRequest(BaseModel):
    query: str


class AISearchResponse(BaseModel):
    interpreted: dict
    buses: list[BusOut]
    message: str


# ─── Dashboard Schemas ───────────────────────────────────────────────────────
class DashboardStats(BaseModel):
    total_bookings_today: int
    revenue_today: float
    total_buses: int
    active_buses: int
    total_customers: int
    total_revenue_all_time: float


class BusOccupancy(BaseModel):
    bus_id: int
    bus_name: str
    origin: str
    destination: str
    total_seats: int
    booked_seats: int
    occupancy_rate: float


class RouteStats(BaseModel):
    route: str
    total_bookings: int
    revenue: float
