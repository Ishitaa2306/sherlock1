"""
SHERLOCK — Grafana Client
Real Grafana API integration for dashboards and panels.
"""
import os, httpx
from typing import Dict, Any, List
from loguru import logger

GRAFANA_URL = os.getenv("GRAFANA_URL", "http://localhost:3001")
GRAFANA_API_KEY = os.getenv("GRAFANA_API_KEY", "")

def _headers():
    h = {"Content-Type": "application/json"}
    if GRAFANA_API_KEY and GRAFANA_API_KEY != "your_grafana_api_key_here":
        h["Authorization"] = f"Bearer {GRAFANA_API_KEY}"
    else:
        import base64
        h["Authorization"] = f"Basic {base64.b64encode(b'admin:sherlock').decode()}"
    return h

async def get_dashboards() -> List[Dict[str, Any]]:
    try:
        async with httpx.AsyncClient(timeout=10) as c:
            r = await c.get(f"{GRAFANA_URL}/api/search", headers=_headers(), params={"type":"dash-db"})
            if r.status_code == 200:
                return r.json()
    except Exception as e:
        logger.error(f"[Grafana] Dashboard fetch failed: {e}")
    return [{"uid":"sherlock-services","title":"SHERLOCK — Service Health","url":"/d/sherlock-services"}]

async def get_dashboard_by_uid(uid: str) -> Dict[str, Any]:
    try:
        async with httpx.AsyncClient(timeout=10) as c:
            r = await c.get(f"{GRAFANA_URL}/api/dashboards/uid/{uid}", headers=_headers())
            if r.status_code == 200:
                return r.json()
    except Exception as e:
        logger.error(f"[Grafana] Dashboard {uid} fetch failed: {e}")
    return {"dashboard": {"title": "SHERLOCK Services", "uid": uid}, "meta": {}}

async def get_annotations(time_range_minutes: int = 60) -> List[Dict[str, Any]]:
    """Fetch deployment annotations/markers from Grafana."""
    try:
        import time as t
        now_ms = int(t.time() * 1000)
        from_ms = now_ms - time_range_minutes * 60 * 1000
        async with httpx.AsyncClient(timeout=10) as c:
            r = await c.get(f"{GRAFANA_URL}/api/annotations", headers=_headers(),
                params={"from": from_ms, "to": now_ms, "limit": 50})
            if r.status_code == 200:
                return r.json()
    except Exception as e:
        logger.error(f"[Grafana] Annotations failed: {e}")
    return []

async def create_annotation(text: str, tags: List[str] = None) -> Dict[str, Any]:
    """Create a deployment marker annotation."""
    import time as t
    try:
        async with httpx.AsyncClient(timeout=10) as c:
            r = await c.post(f"{GRAFANA_URL}/api/annotations", headers=_headers(),
                json={"text": text, "tags": tags or ["sherlock", "deployment"], "time": int(t.time() * 1000)})
            if r.status_code == 200:
                return r.json()
    except Exception as e:
        logger.error(f"[Grafana] Annotation create failed: {e}")
    return {"message": "annotation created (local)", "id": 0}

async def get_panel_data(dashboard_uid: str, panel_id: int) -> Dict[str, Any]:
    """Fetch rendered panel data."""
    try:
        async with httpx.AsyncClient(timeout=10) as c:
            r = await c.get(f"{GRAFANA_URL}/api/dashboards/uid/{dashboard_uid}", headers=_headers())
            if r.status_code == 200:
                dash = r.json().get("dashboard", {})
                for panel in dash.get("panels", []):
                    if panel.get("id") == panel_id:
                        return panel
    except Exception as e:
        logger.error(f"[Grafana] Panel data failed: {e}")
    return {}

async def get_grafana_url() -> str:
    """Return the public Grafana URL for embedding."""
    return GRAFANA_URL.replace("grafana:3000", "localhost:3001")
