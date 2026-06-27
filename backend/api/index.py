"""
SHERLOCK — Vercel Serverless Entry Point
Exports the FastAPI app for Vercel's Python runtime.
"""
import sys
import os

# Ensure the parent directory is in sys.path for importing main and other modules
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app import app
