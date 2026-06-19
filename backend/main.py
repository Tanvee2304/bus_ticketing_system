from fastapi import FastAPI, Depends
from fastapi.middleware.cors import CORSMiddleware
from models.database import create_tables, get_db, User
from models.schemas import UserOut
from services.auth import get_current_user
from routes import auth, buses, bookings, dashboard, ai_search

app = FastAPI(
    title="Bus Ticketing System API",
    description="Full-stack bus ticketing platform with AI-powered natural language search",
    version="1.0.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://localhost:3000", "http://127.0.0.1:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include routers
app.include_router(auth.router)
app.include_router(buses.router)
app.include_router(bookings.router)
app.include_router(dashboard.router)
app.include_router(ai_search.router)


@app.on_event("startup")
def startup():
    create_tables()


@app.get("/", tags=["Health"])
def root():
    return {"status": "ok", "message": "Bus Ticketing API is running"}


@app.get("/auth/me", response_model=UserOut, tags=["Authentication"])
def me(current_user: User = Depends(get_current_user)):
    return current_user
