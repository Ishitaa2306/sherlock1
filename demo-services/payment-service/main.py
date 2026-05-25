"""
SHERLOCK Demo — Payment Service
Primary failure mode: Third-party API timeout → thread pool exhaustion
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
    should_fail, failure_state
)

SERVICE = os.getenv("SERVICE_NAME", "payment-service")
PORT = int(os.getenv("SERVICE_PORT", "8004"))

app = create_service_app(SERVICE, PORT)


@app.post("/payment/charge")
async def charge(amount: float = 99.99, currency: str = "USD"):
    """Process payment — affected by third-party gateway timeouts."""
    start = time.time()
    tx_id = f"tx_{uuid.uuid4().hex[:12]}"
    logger.info(f"[{SERVICE}] Processing charge tx={tx_id} amount={amount} {currency}")

    # Simulate payment gateway call
    if failure_state["api_timeout"]:
        # Simulate timeout with exponential backoff retries
        timeout_duration = random.uniform(5.0, 15.0)
        logger.warning(
            f"[{SERVICE}] ⏱️ Payment gateway TIMEOUT tx={tx_id} | "
            f"waiting {timeout_duration:.1f}s | "
            f"thread_pool={failure_state['thread_pool_active']}/{failure_state['thread_pool_max']}"
        )
        time.sleep(min(timeout_duration, 3.0))  # Cap actual sleep for demo

    latency = simulate_latency(base_ms=80.0)

    if should_fail():
        duration = time.time() - start
        record_request("POST", "/payment/charge", 504, duration, SERVICE)
        logger.error(
            f"[{SERVICE}] ❌ Payment FAILED tx={tx_id} | "
            f"Gateway timeout after {duration:.3f}s | "
            f"queue_depth={failure_state['queue_depth']}"
        )
        raise HTTPException(
            status_code=504,
            detail=f"Payment gateway timeout — tx={tx_id}, retries exhausted"
        )

    duration = time.time() - start
    record_request("POST", "/payment/charge", 200, duration, SERVICE)
    logger.info(f"[{SERVICE}] ✅ Payment OK tx={tx_id} latency={duration:.3f}s")
    return {
        "tx_id": tx_id,
        "status": "charged",
        "amount": amount,
        "currency": currency,
        "latency_ms": round(duration * 1000, 2)
    }


@app.post("/payment/refund")
async def refund(tx_id: str = "tx_demo"):
    """Process refund — also affected by gateway timeouts."""
    start = time.time()
    latency = simulate_latency(base_ms=100.0)

    if should_fail():
        duration = time.time() - start
        record_request("POST", "/payment/refund", 504, duration, SERVICE)
        logger.error(f"[{SERVICE}] ❌ Refund FAILED tx={tx_id}")
        raise HTTPException(status_code=504, detail="Refund gateway timeout")

    duration = time.time() - start
    record_request("POST", "/payment/refund", 200, duration, SERVICE)
    return {"tx_id": tx_id, "status": "refunded", "latency_ms": round(duration * 1000, 2)}


@app.get("/payment/status/{tx_id}")
async def payment_status(tx_id: str):
    """Check payment status."""
    start = time.time()
    latency = simulate_latency(base_ms=25.0)
    duration = time.time() - start
    record_request("GET", "/payment/status", 200, duration, SERVICE)
    return {"tx_id": tx_id, "status": random.choice(["completed", "pending", "processing"]), "latency_ms": round(duration * 1000, 2)}


# ━━━ Background traffic ━━━
import threading

def _generate_traffic():
    import httpx
    time.sleep(5)
    logger.info(f"[{SERVICE}] Starting background traffic generator")
    while True:
        try:
            with httpx.Client(timeout=10) as client:
                amount = round(random.uniform(9.99, 999.99), 2)
                client.post(f"http://localhost:{PORT}/payment/charge?amount={amount}")
        except Exception:
            pass
        time.sleep(random.uniform(2, 6))

threading.Thread(target=_generate_traffic, daemon=True).start()

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=PORT)
