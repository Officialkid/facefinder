#!/usr/bin/env bash
# ============================================================
# FaceFinder AI - Frontend Startup Script
# ============================================================
set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"

echo ""
echo "╔══════════════════════════════════════════╗"
echo "║      FaceFinder AI - Frontend          ║"
echo "║         Next.js + Tailwind CSS           ║"
echo "╚══════════════════════════════════════════╝"
echo ""

# Install if needed
if [ ! -d "node_modules" ]; then
  echo "► Installing Node dependencies..."
  npm install
fi

echo "► Starting Next.js dev server on http://localhost:3000"
echo ""

npm run dev
