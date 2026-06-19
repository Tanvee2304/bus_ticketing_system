"""Seed the database with sample data for demo."""
import sys
import os
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from datetime import datetime, timedelta
from models.database import create_tables, SessionLocal, User, Bus, BusType, UserRole
from services.auth import hash_password


def seed():
    create_tables()
    db = SessionLocal()

    # Check if already seeded
    if db.query(User).first():
        print("Database already seeded.")
        db.close()
        return

    # Create admin
    admin = User(
        name="Admin User",
        email="admin@busticket.com",
        hashed_password=hash_password("admin123"),
        role=UserRole.admin,
    )
    db.add(admin)

    # Create customers
    customers = [
        User(name="Rahul Sharma", email="rahul@example.com", hashed_password=hash_password("customer123"), role=UserRole.customer),
        User(name="Priya Patel", email="priya@example.com", hashed_password=hash_password("customer123"), role=UserRole.customer),
        User(name="Amit Singh", email="amit@example.com", hashed_password=hash_password("customer123"), role=UserRole.customer),
    ]
    for c in customers:
        db.add(c)

    # Create buses
    now = datetime.now()
    buses = [
        Bus(name="KPN Travels Express", origin="Hyderabad", destination="Bangalore",
            departure_time=now + timedelta(days=1, hours=6), arrival_time=now + timedelta(days=1, hours=14),
            bus_type=BusType.AC, total_seats=40, available_seats=25, price=850.0, is_active=True),
        Bus(name="Orange Travels Sleeper", origin="Hyderabad", destination="Bangalore",
            departure_time=now + timedelta(days=1, hours=21), arrival_time=now + timedelta(days=2, hours=5),
            bus_type=BusType.SLEEPER, total_seats=30, available_seats=18, price=1200.0, is_active=True),
        Bus(name="APSRTC Garuda", origin="Hyderabad", destination="Bangalore",
            departure_time=now + timedelta(days=1, hours=8, minutes=30), arrival_time=now + timedelta(days=1, hours=16, minutes=30),
            bus_type=BusType.AC, total_seats=45, available_seats=32, price=750.0, is_active=True),
        Bus(name="VRL Travels Non-AC", origin="Hyderabad", destination="Bangalore",
            departure_time=now + timedelta(days=1, hours=14), arrival_time=now + timedelta(days=1, hours=22),
            bus_type=BusType.NON_AC, total_seats=50, available_seats=40, price=500.0, is_active=True),
        Bus(name="Kaveri Express", origin="Bangalore", destination="Chennai",
            departure_time=now + timedelta(days=1, hours=7), arrival_time=now + timedelta(days=1, hours=13),
            bus_type=BusType.AC, total_seats=40, available_seats=15, price=650.0, is_active=True),
        Bus(name="TNSTC Super Deluxe", origin="Chennai", destination="Bangalore",
            departure_time=now + timedelta(days=1, hours=22), arrival_time=now + timedelta(days=2, hours=4),
            bus_type=BusType.AC, total_seats=45, available_seats=0, price=700.0, is_active=True),
        Bus(name="Parveen Travels", origin="Mumbai", destination="Pune",
            departure_time=now + timedelta(days=1, hours=9), arrival_time=now + timedelta(days=1, hours=12),
            bus_type=BusType.AC, total_seats=35, available_seats=20, price=400.0, is_active=True),
        Bus(name="Shivneri Deluxe", origin="Pune", destination="Mumbai",
            departure_time=now + timedelta(days=1, hours=16), arrival_time=now + timedelta(days=1, hours=19),
            bus_type=BusType.AC, total_seats=35, available_seats=28, price=380.0, is_active=True),
        Bus(name="Neeta Travels", origin="Mumbai", destination="Goa",
            departure_time=now + timedelta(days=2, hours=21), arrival_time=now + timedelta(days=3, hours=7),
            bus_type=BusType.SLEEPER, total_seats=36, available_seats=12, price=1500.0, is_active=True),
        Bus(name="Paulo Travels", origin="Hyderabad", destination="Goa",
            departure_time=now + timedelta(days=2, hours=18), arrival_time=now + timedelta(days=3, hours=8),
            bus_type=BusType.SLEEPER, total_seats=40, available_seats=22, price=1350.0, is_active=True),
    ]
    for b in buses:
        db.add(b)

    db.commit()
    db.close()
    print("✅ Database seeded successfully!")
    print("\nDemo credentials:")
    print("  Admin    → admin@busticket.com / admin123")
    print("  Customer → rahul@example.com   / customer123")


if __name__ == "__main__":
    seed()
