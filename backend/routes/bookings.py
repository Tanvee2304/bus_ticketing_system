import random
import string
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session, joinedload
from typing import List
from models.database import get_db, Bus, Booking, BookingSeat, User, BookingStatus
from models.schemas import BookingCreate, BookingOut, SeatPreviewRequest, SeatPreviewResponse, SeatPreviewSeat
from services.auth import get_current_user, require_admin
from services.seat_optimizer import find_best_seat_block, describe_seats

router = APIRouter(prefix="/bookings", tags=["Bookings"])


def generate_reference(length=8) -> str:
    return "BUS-" + "".join(random.choices(string.ascii_uppercase + string.digits, k=length))


def get_taken_seats(db: Session, bus_id: int) -> set[int]:
    """Seat numbers currently held by any confirmed booking on this bus."""
    taken_rows = (
        db.query(BookingSeat.seat_number)
        .join(Booking, Booking.id == BookingSeat.booking_id)
        .filter(BookingSeat.bus_id == bus_id, Booking.status == BookingStatus.confirmed)
        .all()
    )
    return {row[0] for row in taken_rows}


@router.post("/preview-seats", response_model=SeatPreviewResponse)
def preview_seats(
    request: SeatPreviewRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Smart Seat Optimizer — preview which seats would be assigned for a given
    seat_count, before the customer commits to booking. Lets the customer see
    *why* those seats were picked (adjacent block, split rows, or scattered)
    and back out if the layout doesn't suit them.
    """
    bus = db.query(Bus).filter(Bus.id == request.bus_id).first()
    if not bus:
        raise HTTPException(status_code=404, detail="Bus not found")
    if bus.available_seats < request.seat_count:
        raise HTTPException(
            status_code=400,
            detail=f"Only {bus.available_seats} seat(s) available, but {request.seat_count} requested",
        )

    taken = get_taken_seats(db, bus.id)
    try:
        block = find_best_seat_block(
            total_seats=bus.total_seats,
            seats_per_row=bus.seats_per_row,
            taken_seats=taken,
            seat_count=request.seat_count,
        )
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))

    seat_details = describe_seats(block.seat_numbers, bus.seats_per_row)
    return SeatPreviewResponse(
        seat_numbers=sorted(block.seat_numbers),
        seats=[SeatPreviewSeat(**s) for s in seat_details],
        is_fully_adjacent=block.is_fully_adjacent,
        quality_score=block.score,
        reason=block.reason,
    )


@router.post("/", response_model=BookingOut, status_code=201)
def create_booking(
    data: BookingCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    bus = db.query(Bus).filter(Bus.id == data.bus_id).first()
    if not bus:
        raise HTTPException(status_code=404, detail="Bus not found")
    if not bus.is_active:
        raise HTTPException(status_code=400, detail="Bus is not active")

    requested = data.seat_count
    if bus.available_seats < requested:
        raise HTTPException(
            status_code=400,
            detail=f"Only {bus.available_seats} seat(s) available, but {requested} requested",
        )

    # ── Smart Seat Optimizer: find the best block instead of "next N free" ──
    taken = get_taken_seats(db, bus.id)
    try:
        block = find_best_seat_block(
            total_seats=bus.total_seats,
            seats_per_row=bus.seats_per_row,
            taken_seats=taken,
            seat_count=requested,
        )
    except ValueError:
        # Counter and actual free-seat set disagree — fail safe rather than overbook
        raise HTTPException(status_code=400, detail="Not enough seats available")

    # Generate unique reference
    ref = generate_reference()
    while db.query(Booking).filter(Booking.booking_reference == ref).first():
        ref = generate_reference()

    booking = Booking(
        booking_reference=ref,
        customer_id=current_user.id,
        bus_id=bus.id,
        passenger_name=data.passenger_name,
        passenger_email=data.passenger_email,
        passenger_phone=data.passenger_phone,
        seat_count=requested,
        seat_allocation_note=block.reason,
        total_fare=bus.price * requested,
        status=BookingStatus.confirmed,
    )
    db.add(booking)
    db.flush()  # get booking.id before adding child seats

    for seat_num in block.seat_numbers:
        db.add(BookingSeat(booking_id=booking.id, bus_id=bus.id, seat_number=seat_num))

    bus.available_seats -= requested

    db.commit()
    db.refresh(booking)
    return booking


@router.get("/my", response_model=List[BookingOut])
def my_bookings(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    return (
        db.query(Booking)
        .filter(Booking.customer_id == current_user.id)
        .order_by(Booking.booked_at.desc())
        .all()
    )


@router.get("/all", response_model=List[BookingOut])
def all_bookings(
    db: Session = Depends(get_db),
    admin: User = Depends(require_admin),
):
    return db.query(Booking).order_by(Booking.booked_at.desc()).all()


@router.get("/{booking_id}", response_model=BookingOut)
def get_booking(
    booking_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    booking = db.query(Booking).filter(Booking.id == booking_id).first()
    if not booking:
        raise HTTPException(status_code=404, detail="Booking not found")
    from models.database import UserRole
    if current_user.role != UserRole.admin and booking.customer_id != current_user.id:
        raise HTTPException(status_code=403, detail="Access denied")
    return booking


@router.patch("/{booking_id}/cancel", response_model=BookingOut)
def cancel_booking(
    booking_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    booking = db.query(Booking).filter(Booking.id == booking_id).first()
    if not booking:
        raise HTTPException(status_code=404, detail="Booking not found")
    from models.database import UserRole
    if current_user.role != UserRole.admin and booking.customer_id != current_user.id:
        raise HTTPException(status_code=403, detail="Access denied")
    if booking.status == BookingStatus.cancelled:
        raise HTTPException(status_code=400, detail="Booking already cancelled")

    booking.status = BookingStatus.cancelled
    bus = db.query(Bus).filter(Bus.id == booking.bus_id).first()
    if bus:
        # Release all seats held by this booking — not just one
        bus.available_seats += booking.seat_count
    db.commit()
    db.refresh(booking)
    return booking
