from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from sqlalchemy import func
from datetime import datetime, date
from models.database import get_db, Bus, Booking, User, BookingStatus
from models.schemas import DashboardStats, BusOccupancy, RouteStats
from services.auth import require_admin
from typing import List

router = APIRouter(prefix="/dashboard", tags=["Dashboard"])


@router.get("/stats", response_model=DashboardStats)
def get_stats(db: Session = Depends(get_db), admin=Depends(require_admin)):
    today = date.today()
    today_bookings = (
        db.query(Booking)
        .filter(
            func.date(Booking.booked_at) == today,
            Booking.status == BookingStatus.confirmed,
        )
        .all()
    )
    revenue_today = sum(b.total_fare for b in today_bookings)
    total_revenue = (
        db.query(func.sum(Booking.total_fare))
        .filter(Booking.status == BookingStatus.confirmed)
        .scalar()
        or 0.0
    )
    total_buses = db.query(Bus).count()
    active_buses = db.query(Bus).filter(Bus.is_active == True).count()
    total_customers = db.query(User).filter(User.role == "customer").count()

    return DashboardStats(
        total_bookings_today=len(today_bookings),
        revenue_today=revenue_today,
        total_buses=total_buses,
        active_buses=active_buses,
        total_customers=total_customers,
        total_revenue_all_time=total_revenue,
    )


@router.get("/occupancy", response_model=List[BusOccupancy])
def get_occupancy(db: Session = Depends(get_db), admin=Depends(require_admin)):
    buses = db.query(Bus).all()
    result = []
    for bus in buses:
        booked = (
            db.query(func.count(Booking.id))
            .filter(Booking.bus_id == bus.id, Booking.status == BookingStatus.confirmed)
            .scalar()
            or 0
        )
        rate = round((booked / bus.total_seats) * 100, 1) if bus.total_seats else 0
        result.append(
            BusOccupancy(
                bus_id=bus.id,
                bus_name=bus.name,
                origin=bus.origin,
                destination=bus.destination,
                total_seats=bus.total_seats,
                booked_seats=booked,
                occupancy_rate=rate,
            )
        )
    return sorted(result, key=lambda x: x.occupancy_rate, reverse=True)


@router.get("/routes", response_model=List[RouteStats])
def get_route_stats(db: Session = Depends(get_db), admin=Depends(require_admin)):
    buses = db.query(Bus).all()
    route_map = {}
    for bus in buses:
        route = f"{bus.origin} → {bus.destination}"
        bookings = (
            db.query(Booking)
            .filter(Booking.bus_id == bus.id, Booking.status == BookingStatus.confirmed)
            .all()
        )
        if route not in route_map:
            route_map[route] = {"total_bookings": 0, "revenue": 0.0}
        route_map[route]["total_bookings"] += len(bookings)
        route_map[route]["revenue"] += sum(b.total_fare for b in bookings)

    return [
        RouteStats(route=route, total_bookings=v["total_bookings"], revenue=v["revenue"])
        for route, v in sorted(route_map.items(), key=lambda x: x[1]["total_bookings"], reverse=True)
    ]
