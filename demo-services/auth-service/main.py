"""
SHERLOCK Demo — Auth Service
Primary failure mode: Database connection pool exhaustion
"""
import os
import sys
import time
import random
import uuid

sys.path.insert(0, "/app/shared")

from fastapi import HTTPException
from loguru import logger
from service_base import (
    create_service_app, record_request, simulate_latency,
    should_fail, failure_state, SERVICE_NAME
)

SERVICE = os.getenv("SERVICE_NAME", "auth-service")
PORT = int(os.getenv("SERVICE_PORT", "8001"))

app = create_service_app(SERVICE, PORT)


@app.post("/auth/login")
async def login(username: str = "demo_user", password: str = "demo_pass"):
    """Authenticate user — primary endpoint affected by DB exhaustion."""
    start = time.time()
    logger.info(f"[{SERVICE}] Login attempt for user={username}")

    latency = simulate_latency(base_ms=30.0)

    if should_fail():
        duration = time.time() - start
        record_request("POST", "/auth/login", 503, duration, SERVICE)
        logger.error(
            f"[{SERVICE}] ❌ Login FAILED for user={username} | "
            f"db_pool={failure_state['db_pool_used']}/{failure_state['db_pool_max']} | "
            f"latency={duration:.3f}s"
        )
        raise HTTPException(
            status_code=503,
            detail=f"Database connection pool exhausted: {failure_state['db_pool_used']}/{failure_state['db_pool_max']} active connections"
        )

    token = str(uuid.uuid4())
    duration = time.time() - start
    record_request("POST", "/auth/login", 200, duration, SERVICE)
    logger.info(f"[{SERVICE}] ✅ Login OK user={username} latency={duration:.3f}s")
    return {"token": token, "user": username, "latency_ms": round(duration * 1000, 2)}


@app.post("/auth/validate")
async def validate_token(token: str = "test-token"):
    """Validate JWT token — secondary DB-dependent operation."""
    start = time.time()
    latency = simulate_latency(base_ms=15.0)

    if should_fail():
        duration = time.time() - start
        record_request("POST", "/auth/validate", 503, duration, SERVICE)
        logger.error(f"[{SERVICE}] ❌ Token validation FAILED | latency={duration:.3f}s")
        raise HTTPException(status_code=503, detail="Auth service unavailable — DB pool exhausted")

    duration = time.time() - start
    record_request("POST", "/auth/validate", 200, duration, SERVICE)
    return {"valid": True, "user_id": "usr_" + token[:8], "latency_ms": round(duration * 1000, 2)}


@app.get("/auth/sessions")
async def active_sessions():
    """List active sessions — heavy DB read."""
    start = time.time()
    latency = simulate_latency(base_ms=50.0)

    if should_fail():
        duration = time.time() - start
        record_request("GET", "/auth/sessions", 500, duration, SERVICE)
        logger.error(f"[{SERVICE}] ❌ Session query TIMEOUT — unindexed query detected!")
        raise HTTPException(status_code=500, detail="Query timeout on sessions table — missing index")

    duration = time.time() - start
    record_request("GET", "/auth/sessions", 200, duration, SERVICE)
    sessions = [{"id": str(uuid.uuid4()), "user": f"user_{i}", "created": time.time()} for i in range(random.randint(5, 20))]
    return {"sessions": sessions, "count": len(sessions), "latency_ms": round(duration * 1000, 2)}


# ━━━ Background traffic generator ━━━
import threading
import asyncio

def _generate_traffic():
    """Generate background traffic to produce realistic telemetry."""
    import httpx
    time.sleep(5)  # Wait for startup
    logger.info(f"[{SERVICE}] Starting background traffic generator")
    while True:
        try:
            with httpx.Client(timeout=10) as client:
                # Mix of endpoints
                endpoints = [
                    ("POST", f"http://localhost:{PORT}/auth/login?username=bg_user_{random.randint(1,100)}"),
                    ("POST", f"http://localhost:{PORT}/auth/validate?token={uuid.uuid4()}"),
                    ("GET", f"http://localhost:{PORT}/auth/sessions"),
                ]
                method, url = random.choice(endpoints)
                if method == "POST":
                    client.post(url)
                else:
                    client.get(url)
        except Exception:
            pass
        time.sleep(random.uniform(1, 4))

threading.Thread(target=_generate_traffic, daemon=True).start()


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=PORT)
