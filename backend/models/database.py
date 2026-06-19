from sqlalchemy import create_engine, Column, Integer, String, Float, DateTime, Boolean, ForeignKey, Enum
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker, relationship
from datetime import datetime
import enum
import os
from dotenv import load_dotenv

load_dotenv()

DATABASE_URL = os.getenv("DATABASE_URL", "sqlite:///./bus_ticketing.db")

engine = create_engine(DATABASE_URL, connect_args={"check_same_thread": False})
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()


class UserRole(str, enum.Enum):
    admin = "admin"
    customer = "customer"


class BusType(str, enum.Enum):
    AC = "AC"
    NON_AC = "Non-AC"
    SLEEPER = "Sleeper"


class BookingStatus(str, enum.Enum):
    confirmed = "Confirmed"
    cancelled = "Cancelled"


class User(Base):
    __tablename__ = "users"
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, nullable=False)
    email = Column(String, unique=True, index=True, nullable=False)
    hashed_password = Column(String, nullable=False)
    role = Column(Enum(UserRole), default=UserRole.customer)
    created_at = Column(DateTime, default=datetime.utcnow)

    bookings = relationship("Booking", back_populates="customer")


class Bus(Base):
    __tablename__ = "buses"
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, nullable=False)
    origin = Column(String, nullable=False)
    destination = Column(String, nullable=False)
    departure_time = Column(DateTime, nullable=False)
    arrival_time = Column(DateTime, nullable=True)
    bus_type = Column(Enum(BusType), nullable=False)
    total_seats = Column(Integer, nullable=False)
    available_seats = Column(Integer, nullable=False)
    price = Column(Float, nullable=False)
    is_active = Column(Boolean, default=True)
    seats_per_row = Column(Integer, nullable=False, default=4)  # e.g. 4 = 2+2 layout, 3 = 2+1 layout
    created_at = Column(DateTime, default=datetime.utcnow)

    bookings = relationship("Booking", back_populates="bus")


class Booking(Base):
    """One booking transaction for a single passenger — may cover multiple seats."""
    __tablename__ = "bookings"
    id = Column(Integer, primary_key=True, index=True)
    booking_reference = Column(String, unique=True, index=True)
    customer_id = Column(Integer, ForeignKey("users.id"))
    bus_id = Column(Integer, ForeignKey("buses.id"))
    passenger_name = Column(String, nullable=False)
    passenger_email = Column(String, nullable=False)
    passenger_phone = Column(String, nullable=False)
    seat_count = Column(Integer, nullable=False, default=1)
    seat_allocation_note = Column(String, nullable=True)  # why these seats were chosen (Smart Seat Optimizer)
    status = Column(Enum(BookingStatus), default=BookingStatus.confirmed)
    booked_at = Column(DateTime, default=datetime.utcnow)
    total_fare = Column(Float, nullable=False)

    customer = relationship("User", back_populates="bookings")
    bus = relationship("Bus", back_populates="bookings")
    seats = relationship("BookingSeat", back_populates="booking", cascade="all, delete-orphan")


class BookingSeat(Base):
    """Individual seat tied to a booking. One booking can have many seats."""
    __tablename__ = "booking_seats"
    id = Column(Integer, primary_key=True, index=True)
    booking_id = Column(Integer, ForeignKey("bookings.id"), nullable=False)
    bus_id = Column(Integer, ForeignKey("buses.id"), nullable=False)
    seat_number = Column(Integer, nullable=False)

    booking = relationship("Booking", back_populates="seats")


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


def create_tables():
    Base.metadata.create_all(bind=engine)
