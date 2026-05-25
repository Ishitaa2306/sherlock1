"""
SHERLOCK — Shared metrics and instrumentation base for demo services.
Every demo microservice imports this to get consistent Prometheus metrics + logging.
"""
import os
import time
import random
import threading
import psutil
from prometheus_client import (
    Counter, Histogram, Gauge, generate_latest, CONTENT_TYPE_LATEST
)
from loguru import logger
from fastapi import FastAPI, Response
from fastapi.middleware.cors import CORSMiddleware

SERVICE_NAME = os.getenv("SERVICE_NAME", "unknown-service")

# ━━━ Prometheus Metrics ━━━
REQUEST_COUNT = Counter(
    "http_requests_total",
    "Total HTTP requests",
    ["method", "endpoint", "status", "service"]
)
REQUEST_LATENCY = Histogram(
    "http_request_duration_seconds",
    "Request latency in seconds",
    ["method", "endpoint", "service"],
    buckets=[0.005, 0.01, 0.025, 0.05, 0.1, 0.25, 0.5, 1.0, 2.5, 5.0, 10.0]
)
MEMORY_USAGE = Gauge(
    "process_memory_usage_bytes",
    "Process memory usage",
    ["service"]
)
DB_CONNECTIONS = Gauge(
    "db_connections_active",
    "Active database connections",
    ["service"]
)
DB_CONNECTIONS_MAX = Gauge(
    "db_connections_max",
    "Max database connections",
    ["service"]
)
QUEUE_DEPTH = Gauge(
    "queue_depth",
    "Queue depth",
    ["service", "queue"]
)
THREAD_POOL_ACTIVE = Gauge(
    "thread_pool_active",
    "Active threads in pool",
    ["service"]
)
THREAD_POOL_MAX = Gauge(
    "thread_pool_max",
    "Max threads in pool",
    ["service"]
)
ERROR_RATE = Gauge(
    "error_rate_percent",
    "Current error rate percentage",
    ["service"]
)
CPU_USAGE = Gauge(
    "process_cpu_percent",
    "Process CPU utilization percentage",
    ["service"]
)

# ━━━ Failure state flags (toggled by incident simulators) ━━━
failure_state = {
    "db_exhaustion": False,
    "memory_leak": False,
    "api_timeout": False,
    "error_injection": False,
    "cpu_stress": False,
    "latency_multiplier": 1.0,
    "db_pool_used": 2,
    "db_pool_max": 25,
    "leaked_memory": [],
    "thread_pool_active": 3,
    "thread_pool_max": 16,
    "queue_depth": 0,
}


def create_service_app(service_name: str, port: int) -> FastAPI:
    """Create a FastAPI app with standard observability middleware."""
    app = FastAPI(title=f"SHERLOCK Demo — {service_name}", version="1.0.0")

    app.add_middleware(
        CORSMiddleware,
        allow_origins=["*"],
        allow_methods=["*"],
        allow_headers=["*"],
    )

    # Configure loguru
    logger.add(
        f"/tmp/{service_name}.log",
        rotation="10 MB",
        format="{time:YYYY-MM-DD HH:mm:ss.SSS} | {level:<8} | {name}:{function}:{line} | {message}",
        level="DEBUG",
    )

    @app.get("/metrics")
    async def metrics():
        """Prometheus metrics endpoint."""
        MEMORY_USAGE.labels(service=service_name).set(
            psutil.Process().memory_info().rss
        )
        try:
            cpu = psutil.Process().cpu_percent()
        except:
            cpu = 0.0
        CPU_USAGE.labels(service=service_name).set(cpu)
        DB_CONNECTIONS.labels(service=service_name).set(
            failure_state["db_pool_used"]
        )
        DB_CONNECTIONS_MAX.labels(service=service_name).set(
            failure_state["db_pool_max"]
        )
        THREAD_POOL_ACTIVE.labels(service=service_name).set(
            failure_state["thread_pool_active"]
        )
        THREAD_POOL_MAX.labels(service=service_name).set(
            failure_state["thread_pool_max"]
        )
        QUEUE_DEPTH.labels(service=service_name, queue="main").set(
            failure_state["queue_depth"]
        )
        return Response(
            content=generate_latest(),
            media_type=CONTENT_TYPE_LATEST,
        )

    @app.get("/health")
    async def health():
        """Health check endpoint."""
        healthy = not failure_state["db_exhaustion"] and not failure_state["error_injection"]
        status = "healthy" if healthy else "degraded"
        return {
            "service": service_name,
            "status": status,
            "db_pool_used": failure_state["db_pool_used"],
            "db_pool_max": failure_state["db_pool_max"],
            "memory_leak_active": failure_state["memory_leak"],
            "api_timeout_active": failure_state["api_timeout"],
        }

    # ━━━ Failure injection endpoints ━━━
    @app.post("/chaos/db-exhaustion")
    async def trigger_db_exhaustion():
        """Simulate database connection pool exhaustion."""
        failure_state["db_exhaustion"] = True
        failure_state["latency_multiplier"] = 8.0
        logger.critical(f"[{service_name}] 🔥 DB CONNECTION POOL EXHAUSTION triggered!")
        _start_db_exhaustion_simulation(service_name)
        return {"status": "chaos_active", "type": "db_exhaustion"}

    @app.post("/chaos/memory-leak")
    async def trigger_memory_leak():
        """Simulate memory leak."""
        failure_state["memory_leak"] = True
        logger.critical(f"[{service_name}] 🔥 MEMORY LEAK triggered!")
        _start_memory_leak_simulation(service_name)
        return {"status": "chaos_active", "type": "memory_leak"}

    @app.post("/chaos/api-timeout")
    async def trigger_api_timeout():
        """Simulate third-party API timeout."""
        failure_state["api_timeout"] = True
        failure_state["latency_multiplier"] = 15.0
        logger.critical(f"[{service_name}] 🔥 API TIMEOUT triggered!")
        _start_api_timeout_simulation(service_name)
        return {"status": "chaos_active", "type": "api_timeout"}

    @app.post("/chaos/cpu-stress")
    async def trigger_cpu_stress():
        """Simulate CPU starvation."""
        failure_state["cpu_stress"] = True
        logger.critical(f"[{service_name}] 🔥 CPU STRESS triggered!")
        _start_cpu_stress_simulation(service_name)
        return {"status": "chaos_active", "type": "cpu_stress"}

    @app.post("/chaos/reset")
    async def reset_chaos():
        """Reset all failure modes."""
        failure_state["db_exhaustion"] = False
        failure_state["memory_leak"] = False
        failure_state["api_timeout"] = False
        failure_state["error_injection"] = False
        failure_state["cpu_stress"] = False
        failure_state["latency_multiplier"] = 1.0
        failure_state["db_pool_used"] = 2
        failure_state["leaked_memory"] = []
        failure_state["thread_pool_active"] = 3
        failure_state["queue_depth"] = 0
        logger.info(f"[{service_name}] ✅ All chaos modes RESET")
        return {"status": "reset", "service": service_name}

    return app


def record_request(method: str, endpoint: str, status: int, duration: float, service: str):
    """Record a request in Prometheus metrics."""
    REQUEST_COUNT.labels(
        method=method, endpoint=endpoint, status=str(status), service=service
    ).inc()
    REQUEST_LATENCY.labels(
        method=method, endpoint=endpoint, service=service
    ).observe(duration)


def simulate_latency(base_ms: float = 20.0) -> float:
    """Simulate request latency with failure amplification."""
    jitter = random.uniform(0.8, 1.3)
    latency = (base_ms / 1000.0) * jitter * failure_state["latency_multiplier"]
    time.sleep(latency)
    return latency


def should_fail() -> bool:
    """Decide whether this request should fail based on failure state."""
    if failure_state["db_exhaustion"] and failure_state["db_pool_used"] >= failure_state["db_pool_max"]:
        return True
    if failure_state["error_injection"]:
        return random.random() < 0.6
    return random.random() < 0.02  # 2% baseline error rate


# ━━━ Background failure simulation threads ━━━

def _start_db_exhaustion_simulation(service_name: str):
    def _exhaust():
        for i in range(25):
            if not failure_state["db_exhaustion"]:
                break
            failure_state["db_pool_used"] = min(i + 3, 25)
            logger.warning(
                f"[{service_name}] DB pool: {failure_state['db_pool_used']}/{failure_state['db_pool_max']} connections"
            )
            time.sleep(2)
        if failure_state["db_exhaustion"]:
            failure_state["error_injection"] = True
            logger.error(f"[{service_name}] ❌ DB POOL SATURATED — service entering error state!")
    threading.Thread(target=_exhaust, daemon=True).start()


def _start_memory_leak_simulation(service_name: str):
    def _leak():
        while failure_state["memory_leak"]:
            # Allocate ~1MB per iteration
            chunk = bytearray(1024 * 1024)
            failure_state["leaked_memory"].append(chunk)
            leaked_mb = len(failure_state["leaked_memory"])
            logger.warning(
                f"[{service_name}] Memory leak: {leaked_mb}MB leaked, total RSS growing"
            )
            if leaked_mb >= 100:
                logger.critical(
                    f"[{service_name}] ❌ OOM IMMINENT — {leaked_mb}MB leaked! Pod would restart!"
                )
                failure_state["error_injection"] = True
            time.sleep(3)
    threading.Thread(target=_leak, daemon=True).start()


def _start_api_timeout_simulation(service_name: str):
    def _timeout():
        retries = 0
        while failure_state["api_timeout"]:
            retries += 1
            failure_state["thread_pool_active"] = min(retries + 3, 16)
            failure_state["queue_depth"] = min(retries * 5, 500)
            logger.warning(
                f"[{service_name}] API timeout retry #{retries}, "
                f"threads={failure_state['thread_pool_active']}/{failure_state['thread_pool_max']}, "
                f"queue={failure_state['queue_depth']}"
            )
            if failure_state["thread_pool_active"] >= failure_state["thread_pool_max"]:
                logger.error(
                    f"[{service_name}] ❌ THREAD POOL EXHAUSTED — requests backing up!"
                )
                failure_state["error_injection"] = True
            time.sleep(2)
    threading.Thread(target=_timeout, daemon=True).start()

def _start_cpu_stress_simulation(service_name: str):
    def _stress():
        while failure_state["cpu_stress"]:
            # Busy-wait loop to consume CPU
            for _ in range(500000):
                pass
            time.sleep(0.05) # Yield enough CPU for uvicorn to process reset requests
    
    # Spawn multiple threads to stress multiple cores if possible
    for _ in range(psutil.cpu_count() or 2):
        threading.Thread(target=_stress, daemon=True).start()

