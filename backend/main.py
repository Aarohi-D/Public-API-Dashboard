from fastapi import FastAPI, Request, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from slowapi import Limiter, _rate_limit_exceeded_handler
from slowapi.util import get_remote_address
from slowapi.errors import RateLimitExceeded
from pydantic import BaseModel, field_validator
import httpx
import os
from dotenv import load_dotenv

load_dotenv()

DISNEY_API_BASE_URL = os.getenv("DISNEY_API_BASE_URL")
ALLOWED_ORIGIN = os.getenv("ALLOWED_ORIGIN")
RATE_LIMIT = os.getenv("RATE_LIMIT")

# ── Rate limiter setup ──────────────────────────────────────────────────────
limiter = Limiter(key_func=get_remote_address, default_limits=[RATE_LIMIT])

app = FastAPI(title="Disney Dashboard API")

app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)

# ── CORS ────────────────────────────────────────────────────────────────────
app.add_middleware(
    CORSMiddleware,
    allow_origins=[ALLOWED_ORIGIN],
    allow_credentials=True,
    allow_methods=["GET"],
    allow_headers=["*"],
)

# ── Security headers middleware ──────────────────────────────────────────────
@app.middleware("http")
async def add_security_headers(request: Request, call_next):
    response = await call_next(request)
    response.headers["X-Content-Type-Options"] = "nosniff"
    response.headers["X-Frame-Options"] = "DENY"
    response.headers["X-XSS-Protection"] = "1; mode=block"
    response.headers["Referrer-Policy"] = "no-referrer"
    response.headers["Cache-Control"] = "no-store"
    return response

# ── Helper: fetch from Disney API ───────────────────────────────────────────
async def fetch_disney(url: str, params: dict = {}):
    try:
        async with httpx.AsyncClient(timeout=10.0) as client:
            response = client.get(url, params=params)
            response = await client.get(url, params=params)
            if response.status_code != 200:
                raise HTTPException(status_code=502, detail="Failed to fetch data from Disney API")
            return response.json()
    except httpx.TimeoutException:
        raise HTTPException(status_code=504, detail="Disney API request timed out")
    except httpx.RequestError:
        raise HTTPException(status_code=502, detail="Could not connect to Disney API")

# ── Global exception handler ────────────────────────────────────────────────
@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    return JSONResponse(
        status_code=500,
        content={"error": "Something went wrong. Please try again later."}
    )

# ── Routes ───────────────────────────────────────────────────────────────────

@app.get("/characters")
@limiter.limit(RATE_LIMIT)
async def get_characters(
    request: Request,
    page: int = Query(default=1, ge=1, description="Page number, must be >= 1"),
    pageSize: int = Query(default=20, ge=1, le=50, description="Results per page, max 50")
):
    data = await fetch_disney(f"{DISNEY_API_BASE_URL}/character", {"page": page, "pageSize": pageSize})
    return data


@app.get("/characters/search")
@limiter.limit(RATE_LIMIT)
async def search_characters(
    request: Request,
    name: str = Query(..., min_length=1, max_length=50, description="Character name to search")
):
    sanitized_name = name.strip()
    data = await fetch_disney(f"{DISNEY_API_BASE_URL}/character", {"name": sanitized_name})
    return data


@app.get("/characters/{character_id}")
@limiter.limit(RATE_LIMIT)
async def get_character(
    request: Request,
    character_id: int
):
    if character_id <= 0:
        raise HTTPException(status_code=400, detail="Character ID must be a positive integer")
    data = await fetch_disney(f"{DISNEY_API_BASE_URL}/character/{character_id}")
    return data
