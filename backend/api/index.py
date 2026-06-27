"""
SHERLOCK — Vercel Serverless Entry Point
Exports the FastAPI app for Vercel's Python runtime.
"""
import sys
import os

# Ensure the parent directory is in sys.path for importing main and other modules
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

import traceback
from fastapi import FastAPI

import_error = None
try:
    from app import app
except Exception as e:
    import_error = traceback.format_exc()

if import_error:
    fallback_app = FastAPI()
    
    @fallback_app.get("/{path:path}")
    async def catch_all_get(path: str):
        return {
            "status": "error",
            "message": "Import failure during backend application startup",
            "traceback": import_error.split("\n")
        }
        
    @fallback_app.post("/{path:path}")
    async def catch_all_post(path: str):
        return {
            "status": "error",
            "message": "Import failure during backend application startup",
            "traceback": import_error.split("\n")
        }
        
    app = fallback_app
