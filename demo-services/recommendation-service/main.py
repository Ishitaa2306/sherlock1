"""
SHERLOCK Demo — Recommendation Service
Primary failure mode: Memory leak from unbounded caching
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

SERVICE = os.getenv("SERVICE_NAME", "recommendation-service")
PORT = int(os.getenv("SERVICE_PORT", "8003"))

app = create_service_app(SERVICE, PORT)

# Simulated recommendation cache (grows unbounded during memory leak)
_recommendation_cache = {}


@app.get("/recommendations/{user_id}")
async def get_recommendations(user_id: str):
    """Get product recommendations — memory leak from unbounded cache."""
    start = time.time()
    logger.info(f"[{SERVICE}] Generating recommendations for user={user_id}")

    # Memory leak: cache grows without eviction
    if failure_state["memory_leak"]:
        # Store large payloads in cache without cleanup
        cache_key = f"{user_id}_{uuid.uuid4().hex}"
        _recommendation_cache[cache_key] = {
            "embeddings": [random.random() for _ in range(10000)],  # Large embedding vector
            "scores": [random.random() for _ in range(5000)],
            "metadata": str(uuid.uuid4()) * 100
        }
        cache_size = len(_recommendation_cache)
        logger.warning(
            f"[{SERVICE}] ⚠️ Cache size: {cache_size} entries | "
            f"Memory leak active — no eviction policy"
        )

    latency = simulate_latency(base_ms=60.0)

    if should_fail():
        duration = time.time() - start
        record_request("GET", "/recommendations", 500, duration, SERVICE)
        logger.error(f"[{SERVICE}] ❌ Recommendation engine OOM for user={user_id}")
        raise HTTPException(status_code=500, detail="Recommendation service out of memory")

    products = [
        {
            "product_id": f"prod_{uuid.uuid4().hex[:8]}",
            "name": random.choice(["Widget Pro", "Gadget X", "Module Z", "Toolkit Alpha", "Component Beta"]),
            "score": round(random.uniform(0.7, 0.99), 3),
            "category": random.choice(["electronics", "software", "hardware", "accessories"])
        }
        for _ in range(random.randint(5, 15))
    ]

    duration = time.time() - start
    record_request("GET", "/recommendations", 200, duration, SERVICE)
    logger.info(f"[{SERVICE}] ✅ Recommendations generated for user={user_id} count={len(products)} latency={duration:.3f}s")
    return {"user_id": user_id, "recommendations": products, "latency_ms": round(duration * 1000, 2)}


@app.get("/recommendations/trending")
async def trending():
    """Get trending products."""
    start = time.time()
    latency = simulate_latency(base_ms=35.0)
    duration = time.time() - start
    record_request("GET", "/recommendations/trending", 200, duration, SERVICE)
    return {
        "trending": [f"prod_{i}" for i in range(10)],
        "cache_size": len(_recommendation_cache),
        "latency_ms": round(duration * 1000, 2)
    }


# ━━━ Background traffic ━━━
import threading

def _generate_traffic():
    import httpx
    time.sleep(6)
    logger.info(f"[{SERVICE}] Starting background traffic generator")
    while True:
        try:
            with httpx.Client(timeout=10) as client:
                user_id = f"user_{random.randint(1, 200)}"
                client.get(f"http://localhost:{PORT}/recommendations/{user_id}")
        except Exception:
            pass
        time.sleep(random.uniform(2, 5))

threading.Thread(target=_generate_traffic, daemon=True).start()

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=PORT)
