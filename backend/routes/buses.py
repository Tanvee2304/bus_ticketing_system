from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from sqlalchemy import or_
from typing import Optional, List
from datetime import datetime
from models.database import get_db, Bus, Booking, BookingSeat, User, BusType, BookingStatus
from models.schemas import BusCreate, BusUpdate, BusOut, SeatMapResponse, SeatMapSeat
from services.auth import get_current_user, require_admin
from services.seat_optimizer import build_layout

router = APIRouter(prefix="/buses", tags=["Buses"])


@router.post("/", response_model=BusOut, status_code=201)
def create_bus(
    bus_data: BusCreate,
    db: Session = Depends(get_db),
    admin: User = Depends(require_admin),
):
    bus = Bus(
        **bus_data.model_dump(),
        available_seats=bus_data.total_seats,
    )
    db.add(bus)
    db.commit()
    db.refresh(bus)
    return bus


@router.get("/", response_model=List[BusOut])
def list_buses(
    origin: Optional[str] = Query(None),
    destination: Optional[str] = Query(None),
    date: Optional[str] = Query(None),
    bus_type: Optional[BusType] = Query(None),
    available_only: bool = Query(True),
    db: Session = Depends(get_db),
):
    q = db.query(Bus)
    if available_only:
        q = q.filter(Bus.is_active == True, Bus.available_seats > 0)
    if origin:
        q = q.filter(Bus.origin.ilike(f"%{origin}%"))
    if destination:
        q = q.filter(Bus.destination.ilike(f"%{destination}%"))
    if bus_type:
        q = q.filter(Bus.bus_type == bus_type)
    if date:
        try:
            search_date = datetime.strptime(date, "%Y-%m-%d").date()
            from sqlalchemy import cast, Date
            q = q.filter(cast(Bus.departure_time, Date) == search_date)
        except ValueError:
            pass
    return q.order_by(Bus.departure_time).all()


@router.get("/all", response_model=List[BusOut])
def list_all_buses(
    db: Session = Depends(get_db),
    admin: User = Depends(require_admin),
):
    return db.query(Bus).order_by(Bus.departure_time).all()


@router.get("/{bus_id}", response_model=BusOut)
def get_bus(bus_id: int, db: Session = Depends(get_db)):
    bus = db.query(Bus).filter(Bus.id == bus_id).first()
    if not bus:
        raise HTTPException(status_code=404, detail="Bus not found")
    return bus


@router.get("/{bus_id}/seat-map", response_model=SeatMapResponse)
def get_seat_map(bus_id: int, db: Session = Depends(get_db)):
    """
    Full seat grid for this bus — every seat with its row, window/aisle/middle
    position, and whether it's currently taken. Used to render the visual
    seat picker and to show the customer where the Smart Seat Optimizer's
    suggested block sits relative to everything else.
    """
    bus = db.query(Bus).filter(Bus.id == bus_id).first()
    if not bus:
        raise HTTPException(status_code=404, detail="Bus not found")

    taken_rows = (
        db.query(BookingSeat.seat_number)
        .join(Booking, Booking.id == BookingSeat.booking_id)
        .filter(BookingSeat.bus_id == bus.id, Booking.status == BookingStatus.confirmed)
        .all()
    )
    taken = {row[0] for row in taken_rows}

    layout = build_layout(bus.total_seats, bus.seats_per_row)
    seats = [
        SeatMapSeat(
            seat_number=pos.seat_number,
            row=pos.row + 1,
            position="Window" if pos.is_window else "Aisle" if pos.is_aisle else "Middle",
            is_taken=pos.seat_number in taken,
        )
        for pos in layout
    ]
    return SeatMapResponse(
        bus_id=bus.id,
        total_seats=bus.total_seats,
        seats_per_row=bus.seats_per_row,
        seats=seats,
    )


@router.put("/{bus_id}", response_model=BusOut)
def update_bus(
    bus_id: int,
    bus_data: BusUpdate,
    db: Session = Depends(get_db),
    admin: User = Depends(require_admin),
):
    bus = db.query(Bus).filter(Bus.id == bus_id).first()
    if not bus:
        raise HTTPException(status_code=404, detail="Bus not found")

    update_dict = bus_data.model_dump(exclude_unset=True)

    # If total_seats changed, adjust available_seats proportionally
    if "total_seats" in update_dict:
        booked = bus.total_seats - bus.available_seats
        new_total = update_dict["total_seats"]
        if new_total < booked:
            raise HTTPException(
                status_code=400,
                detail=f"Cannot reduce total seats below booked count ({booked})",
            )
        update_dict["available_seats"] = new_total - booked

    for key, val in update_dict.items():
        setattr(bus, key, val)

    db.commit()
    db.refresh(bus)
    return bus


@router.delete("/{bus_id}", status_code=204)
def delete_bus(
    bus_id: int,
    db: Session = Depends(get_db),
    admin: User = Depends(require_admin),
):
    bus = db.query(Bus).filter(Bus.id == bus_id).first()
    if not bus:
        raise HTTPException(status_code=404, detail="Bus not found")
    db.delete(bus)
    db.commit()
