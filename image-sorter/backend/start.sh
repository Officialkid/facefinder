#!/usr/bin/env bash
# ============================================================
# FaceFinder AI - Backend Startup Script
# Daniel Mwalili Mutinda | JKUAT BSc IT 2026
# ============================================================
set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"

echo ""
echo "╔══════════════════════════════════════════╗"
echo "║       FaceFinder AI - Backend           ║"
echo "║  AI-Powered Image Recognition System     ║"
echo "╚══════════════════════════════════════════╝"
echo ""

# Create virtual environment if not exists
if [ ! -d "venv" ]; then
  echo "► Creating Python virtual environment..."
  python3 -m venv venv
fi

# Activate
source venv/bin/activate

# Install dependencies
echo "► Installing dependencies (first run may take a few minutes)..."
pip install -q --upgrade pip
pip install -q -r requirements.txt

# Create temp storage dir
mkdir -p temp_storage

echo ""
echo "► Starting FastAPI server on http://localhost:8000"
echo "► API docs available at http://localhost:8000/docs"
echo ""

uvicorn main:app --host 0.0.0.0 --port 8000 --reload
