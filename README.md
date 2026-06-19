# bus_ticketing_system
# Bus Ticketing System — KPi-Tech Assessment

A full-stack web application for a bus ticketing platform with AI-powered natural language search, built with **FastAPI + React**.

---

## Tech Stack

| Layer | Technology |
|---|---|
| Backend | Python 3.11, FastAPI, SQLAlchemy (SQLite), Pydantic v2 |
| Auth | JWT (python-jose), bcrypt (passlib) |
| AI Search | Anthropic Claude API (`claude-sonnet-4-6`) |
| Frontend | React 18, Vite, React Router v6 |
| Styling | Custom CSS (no component library) |
| HTTP Client | Axios |

---

## Architecture

```
bus-ticketing/
├── backend/
│   ├── main.py              # FastAPI app, CORS, router registration
│   ├── models/
│   │   ├── database.py      # SQLAlchemy models (User, Bus, Booking)
│   │   └── schemas.py       # Pydantic request/response schemas
│   ├── routes/
│   │   ├── auth.py          # /auth/register, /auth/login, /auth/me
│   │   ├── buses.py         # CRUD for buses (admin-protected)
│   │   ├── bookings.py      # Booking create, list, cancel
│   │   ├── dashboard.py     # Admin stats, occupancy, route demand
│   │   └── ai_search.py     # AI-powered natural language search
│   ├── services/
│   │   ├── auth.py          # JWT helpers, password hashing, guards
│   │   └── ai_search.py     # Claude API integration + DB query
│   ├── seed.py              # Database seeding script
│   └── requirements.txt
└── frontend/
    └── src/
        ├── App.jsx           # Routes + role-based guards
        ├── context/AuthContext.jsx
        ├── services/api.js   # Axios + all API calls
        ├── components/
        │   ├── Layout.jsx    # Sidebar + navigation
        │   ├── BusCard.jsx   # Bus listing card
        │   └── BookingModal.jsx
        └── pages/
            ├── LoginPage.jsx
            ├── RegisterPage.jsx
            ├── customer/
            │   ├── CustomerDashboard.jsx
            │   ├── SearchBuses.jsx   # AI + Manual search
            │   └── MyBookings.jsx    # View + Cancel
            └── admin/
                ├── AdminDashboard.jsx  # Stats + Occupancy + Routes
                ├── ManageBuses.jsx     # Full CRUD
                └── AdminBookings.jsx   # All bookings + Search
```

---

## Setup Instructions

### 1. Clone / Navigate

```bash
cd bus-ticketing
```

### 2. Backend Setup

```bash
cd backend

# Create and activate virtual environment
python -m venv venv
source venv/bin/activate    # Windows: venv\Scripts\activate

# Install dependencies
pip install -r requirements.txt

# Create .env file
cp .env.example .env
# Edit .env and add your ANTHROPIC_API_KEY

# Seed the database with sample data
python seed.py

# Start the server
uvicorn main:app --reload --port 8000
```

Backend runs at: **http://localhost:8000**  
API docs: **http://localhost:8000/docs**

### 3. Frontend Setup

```bash
cd frontend
npm install
npm run dev
```

Frontend runs at: **http://localhost:5173**

---

## Demo Credentials

| Role | Email | Password |
|---|---|---|
| Admin | admin@busticket.com | admin123 |
| Customer | rahul@example.com | customer123 |

---

## Features Implemented

### Admin
- ✅ Add/Edit/Delete buses (name, route, departure/arrival, bus type, seats, price, status)
- ✅ Dashboard: total bookings today, revenue today, total vs active buses, customers, all-time revenue
- ✅ Bus occupancy rate visualization (color-coded bars)
- ✅ Route-wise demand and revenue
- ✅ View and cancel any booking

### Customer
- ✅ AI-powered natural language search (Claude API)
- ✅ Manual filter search (origin, destination, date, type)
- ✅ View available buses with seat count and pricing
- ✅ Book a ticket (passenger details → seat auto-assigned)
- ✅ **Multi-seat booking** — one passenger can book multiple seats (1–10) in a single transaction; fare scales automatically
- ✅ **Smart Seat Optimizer** *(differentiator — see below)* — group bookings get adjacent seats automatically, with a live preview before confirming
- ✅ View booking history with status
- ✅ Cancel bookings (seats released automatically)

### Business Rules
- ✅ Zero available seats → booking blocked (HTTP 400)
- ✅ Cancelled bookings restore available seat count
- ✅ Booking references are unique (`BUS-XXXXXXXX`)
- ✅ Admin updates to total_seats validated against existing bookings
- ✅ Role-based access control (JWT + role field)

### AI Search
- Sends natural language query to Claude API
- Claude extracts: origin, destination, date, time preference, bus type, max price
- Results filtered in DB, ranked by time preference match
- Interpreted parameters shown to user for transparency

### Smart Seat Optimizer — the platform differentiator

**The problem it solves:** RedBus and most Indian bus-booking platforms either don't expose a seat map for the customer to reason about adjacency themselves, or — for single-seat selection — leave it entirely manual. Neither helps with the actual hard case: booking 3–4 seats for a family or group and getting seats that are *actually next to each other*, not just "the next N free numbers," which can scatter a group across the bus as other single-seat bookings fill in around them.

**How it works:**
1. Each bus has a `seats_per_row` layout (4 = 2+2 standard, 3 = 2+1 sleeper/premium), set by the admin per bus.
2. `services/seat_optimizer.py` maps every seat number to a row/column/window-aisle-middle position deterministically — no AI involved in this part, intentionally. Seat geometry is exact math, not something that benefits from an LLM call.
3. When a customer requests N seats, the optimizer searches in priority order:
   - A full, unbroken row (best case — whole group together, no aisle crossing)
   - A same-row block that crosses the aisle but is still physically touching
   - A block that's numerically contiguous across a row boundary (still physically adjacent)
   - **Honest fallback**: if no adjacent block of size N exists anywhere on the bus, it says so explicitly — `is_fully_adjacent: false`, with a plain-language explanation of the gap — instead of silently handing over scattered seats.
4. The customer sees this **before** confirming, via a live preview (`POST /bookings/preview-seats`) that updates as they change the seat count.
5. On `POST /bookings`, the same optimizer assigns the actual seats, and the reasoning (`seat_allocation_note`) is stored on the booking and shown in "My Bookings."

**Where AI is and isn't used here, to be precise for the demo:** the optimization itself is deterministic — same input always gives the same output, and it's auditable. This is correct on purpose: seat geometry doesn't benefit from non-determinism, and a panelist asking "is this just an LLM guessing seat numbers?" should get a clear "no." The natural-language search feature elsewhere in the app is the genuine LLM integration; this feature is presented as "AI-powered" in spirit (smart, automatic reasoning a human travel agent would do) but its actual implementation is a scored search algorithm, not a model call.

---

## Design Decisions

1. **SQLite for development** — zero-config, swap DATABASE_URL for PostgreSQL in production.
2. **JWT in Bearer header** — stateless auth, works with Vite dev proxy or direct API.
3. **Claude for NL parsing** — structured JSON output; fallback: all buses returned on parse error.
4. **Seat assignment** — Smart Seat Optimizer (see above) replaces naive "lowest free number" allocation; falls back to an explicit, honest "not adjacent" result rather than silently splitting a group.
5. **Single-file seed** — run once, idempotent check prevents duplicate data.

---

## Assumptions

- One passenger record per booking, but that booking can cover 1–10 seats (group/family travel under one contact)
- Prices are per-person, one-way; total_fare = price × seat_count
- No payment gateway (ticketing flow only)
- SQLite is sufficient for demo; schema is DB-agnostic via SQLAlchemy
- Admin accounts can be created via /auth/register (set role=admin) or via seed

---

## What I Would Improve with More Time

- Email confirmation on booking (SMTP / SendGrid)
- PDF ticket generation
- Real-time seat map (WebSocket)
- Seat selection UI
- Multi-leg journeys
- Pagination for large booking lists
- Rate limiting on AI search endpoint
- Containerization with Docker Compose
