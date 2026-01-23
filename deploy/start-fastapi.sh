#!/bin/bash
# Wrapper script for FastAPI with enhanced error logging
# Used for debugging startup issues in Cloud Run

echo "=== Starting FastAPI ===" >&2
echo "PWD: $(pwd)" >&2
echo "PYTHONPATH: $PYTHONPATH" >&2
echo "Python: $(which python)" >&2
echo "Uvicorn: $(which uvicorn)" >&2

# Test Python can import
echo "=== Testing imports ===" >&2
python -c "import fastapi; print('FastAPI OK')" 2>&1 >&2
python -c "from app.main import app; print('App import OK')" 2>&1 >&2

echo "=== Starting Uvicorn ===" >&2
exec /opt/venv/bin/uvicorn app.main:app --host 127.0.0.1 --port 8000 --log-level debug
