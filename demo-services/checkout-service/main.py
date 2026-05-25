"""
SHERLOCK Demo — Checkout Service
Depends on auth-service and payment-service. Cascading failure victim.
"""
import os
import sys
import time
import random
import uuid

sys.path.insert(0, "/app/shared")

from fastapi import HTTPException
from loguru import logger
import httpx
from service_base import (
    create_service_app, record_request, simulate_latency,
    should_fail, failure_state
)

SERVICE = os.getenv("SERVICE_NAME", "checkout-service")
PORT = int(os.getenv("SERVICE_PORT", "8002"))
AUTH_URL = os.getenv("AUTH_SERVICE_URL", "http://auth-service:8001")
PAYMENT_URL = os.getenv("PAYMENT_SERVICE_URL", "http://payment-service:8004")

app = create_service_app(SERVICE, PORT)


@app.post("/checkout/create")
async def create_checkout(user_id: str = "user_demo", items: int = 3):
    """Create checkout session — calls auth-service for validation."""
    start = time.time()
    order_id = f"ord_{uuid.uuid4().hex[:10]}"
    logger.info(f"[{SERVICE}] Creating checkout order={order_id} user={user_id} items={items}")

    # Call auth-service
    try:
        async with httpx.AsyncClient(timeout=5.0) as client:
            auth_resp = await client.post(f"{AUTH_URL}/auth/validate?token=demo-token")
            if auth_resp.status_code != 200:
                logger.error(f"[{SERVICE}] ❌ Auth validation failed for order={order_id}: {auth_resp.status_code}")
                raise HTTPException(status_code=502, detail="Upstream auth-service returned error")
    except httpx.TimeoutException:
        duration = time.time() - start
        record_request("POST", "/checkout/create", 504, duration, SERVICE)
        logger.error(f"[{SERVICE}] ❌ Auth service TIMEOUT for order={order_id}")
        raise HTTPException(status_code=504, detail="Auth service timeout — checkout cannot proceed")
    except Exception as e:
        duration = time.time() - start
        record_request("POST", "/checkout/create", 502, duration, SERVICE)
        logger.error(f"[{SERVICE}] ❌ Auth service UNREACHABLE: {e}")
        raise HTTPException(status_code=502, detail=f"Auth service unreachable: {str(e)}")

    latency = simulate_latency(base_ms=40.0)
    duration = time.time() - start
    record_request("POST", "/checkout/create", 200, duration, SERVICE)
    logger.info(f"[{SERVICE}] ✅ Checkout created order={order_id} latency={duration:.3f}s")
    return {
        "order_id": order_id,
        "user_id": user_id,
        "items": items,
        "total": round(items * random.uniform(19.99, 149.99), 2),
        "status": "created",
        "latency_ms": round(duration * 1000, 2)
    }


@app.post("/checkout/complete")
async def complete_checkout(order_id: str = "ord_demo", amount: float = 99.99):
    """Complete checkout — calls payment-service."""
    start = time.time()
    logger.info(f"[{SERVICE}] Completing checkout order={order_id} amount={amount}")

    # Call payment-service
    try:
        async with httpx.AsyncClient(timeout=8.0) as client:
            pay_resp = await client.post(f"{PAYMENT_URL}/payment/charge?amount={amount}")
            if pay_resp.status_code != 200:
                logger.error(f"[{SERVICE}] ❌ Payment failed for order={order_id}: {pay_resp.status_code}")
                raise HTTPException(status_code=502, detail="Payment processing failed")
    except httpx.TimeoutException:
        duration = time.time() - start
        record_request("POST", "/checkout/complete", 504, duration, SERVICE)
        logger.error(f"[{SERVICE}] ❌ Payment service TIMEOUT for order={order_id}")
        raise HTTPException(status_code=504, detail="Payment gateway timeout — checkout failed")
    except HTTPException:
        raise
    except Exception as e:
        duration = time.time() - start
        record_request("POST", "/checkout/complete", 502, duration, SERVICE)
        logger.error(f"[{SERVICE}] ❌ Payment service ERROR: {e}")
        raise HTTPException(status_code=502, detail=f"Payment service error: {str(e)}")

    latency = simulate_latency(base_ms=50.0)
    duration = time.time() - start
    record_request("POST", "/checkout/complete", 200, duration, SERVICE)
    logger.info(f"[{SERVICE}] ✅ Checkout completed order={order_id} latency={duration:.3f}s")
    return {"order_id": order_id, "status": "completed", "amount": amount, "latency_ms": round(duration * 1000, 2)}


# ━━━ Background traffic ━━━
import threading

def _generate_traffic():
    time.sleep(8)
    logger.info(f"[{SERVICE}] Starting background traffic generator")
    while True:
        try:
            with httpx.Client(timeout=10) as client:
                client.post(f"http://localhost:{PORT}/checkout/create?user_id=bg_user_{random.randint(1,50)}&items={random.randint(1,5)}")
        except Exception:
            pass
        time.sleep(random.uniform(3, 8))

threading.Thread(target=_generate_traffic, daemon=True).start()

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=PORT)
