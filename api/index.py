"""
SHERLOCK — Vercel Serverless Entry Point
Exposes the FastAPI app or a raw ASGI fallback handler to diagnose startup failures.
"""
import sys
import os
import traceback

# Ensure the backend directory is in sys.path for importing app and routes
root_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
backend_dir = os.path.join(root_dir, 'backend')

for path in ['/var/task/backend', backend_dir, root_dir, '/var/task', os.getcwd()]:
    if path not in sys.path:
        sys.path.insert(0, path)

import_error = None
try:
    from fastapi import FastAPI
    from app import app
except Exception as e:
    import_error = traceback.format_exc()

if import_error:
    # Fallback raw ASGI application
    async def app(scope, receive, send):
        if scope['type'] == 'http':
            import json
            response_body = json.dumps({
                "status": "error",
                "message": "Critical import failure in Vercel Python runtime",
                "traceback": import_error.split("\n"),
                "sys_path": sys.path,
                "root_dir": root_dir,
                "backend_dir": backend_dir,
                "cwd": os.getcwd()
            }, indent=2).encode('utf-8')
            
            await send({
                'type': 'http.response.start',
                'status': 200,
                'headers': [
                    (b'content-type', b'application/json'),
                    (b'content-length', str(len(response_body)).encode('utf-8'))
                ]
            })
            await send({
                'type': 'http.response.body',
                'body': response_body,
                'more_body': False
            })
