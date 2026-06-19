import os
import json
from urllib import response
from groq import Groq
from datetime import datetime
from sqlalchemy.orm import Session
from sqlalchemy import and_, or_
from models.database import Bus, BusType
from dotenv import load_dotenv

load_dotenv()

client = Groq(api_key=os.getenv("GROQ_API_KEY"))


def parse_natural_language_search(query: str) -> dict:
    """Use Claude to extract structured search parameters from natural language."""
    today = datetime.now().strftime("%Y-%m-%d")
    system_prompt = f"""You are a bus ticketing search assistant. Today's date is {today}.
Extract travel parameters from the user's natural language query and return ONLY a valid JSON object (no markdown, no explanation).

JSON schema:
{{
  "origin": "city name or null",
  "destination": "city name or null", 
  "date": "YYYY-MM-DD or null",
  "time_preference": "morning|afternoon|evening|night|null",
  "bus_type": "AC|Non-AC|Sleeper|null",
  "max_price": number or null,
  "passengers": number (default 1)
}}

Time mappings: morning=06:00-12:00, afternoon=12:00-17:00, evening=17:00-21:00, night=21:00-06:00.
Interpret "tomorrow" relative to today ({today}).
Normalize city names to title case."""

    response = client.chat.completions.create(
    model="llama-3.1-8b-instant",  # or "mixtral-8x7b-32768"
    max_tokens=500,
    messages=[
        {"role": "system", "content": system_prompt},
        {"role": "user", "content": query},
    ],
)
    text = response.choices[0].message.content.strip()
    # Strip markdown fences if present
    if text.startswith("```"):
        text = text.split("```")[1]
        if text.startswith("json"):
            text = text[4:]
    return json.loads(text.strip())


def search_buses_ai(query: str, db: Session) -> dict:
    """Parse NL query, search DB, return ranked results."""
    interpreted = parse_natural_language_search(query)

    filters = [Bus.is_active == True, Bus.available_seats > 0]

    if interpreted.get("origin"):
        filters.append(Bus.origin.ilike(f"%{interpreted['origin']}%"))
    if interpreted.get("destination"):
        filters.append(Bus.destination.ilike(f"%{interpreted['destination']}%"))
    if interpreted.get("bus_type"):
        try:
            bt = BusType(interpreted["bus_type"])
            filters.append(Bus.bus_type == bt)
        except ValueError:
            pass
    if interpreted.get("max_price"):
        filters.append(Bus.price <= interpreted["max_price"])
    if interpreted.get("date"):
        try:
            search_date = datetime.strptime(interpreted["date"], "%Y-%m-%d").date()
            from sqlalchemy import func, cast, Date
            filters.append(cast(Bus.departure_time, Date) == search_date)
        except ValueError:
            pass

    buses = db.query(Bus).filter(and_(*filters)).all()

    # Time preference ranking
    time_pref = interpreted.get("time_preference")
    if time_pref and buses:
        def time_score(bus: Bus) -> int:
            hour = bus.departure_time.hour
            pref_ranges = {
                "morning": (6, 12),
                "afternoon": (12, 17),
                "evening": (17, 21),
                "night": (21, 24),
            }
            if time_pref in pref_ranges:
                lo, hi = pref_ranges[time_pref]
                if lo <= hour < hi:
                    return 0
            return 1
        buses = sorted(buses, key=time_score)

    message = f"Found {len(buses)} bus(es) matching your search."
    if not buses:
        message = "No buses found matching your criteria. Try adjusting your search."

    return {"interpreted": interpreted, "buses": buses, "message": message}
