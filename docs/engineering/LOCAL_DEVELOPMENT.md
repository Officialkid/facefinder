# LOCAL DEVELOPMENT & OPERATIONAL RUNBOOK — FACEFINDER AI

**Project:** FaceFinder AI  
**Author:** Senior Full-Stack Engineer / CTO  
**Date:** November 19, 2026  

---

## 1. PREREQUISITES

- **Operating System:** Windows, macOS, or Linux
- **Python:** Python 3.12 (Virtual environment required)
- **Node.js:** Node.js v18+ or v20+
- **npm:** v9+ or v10+

---

## 2. QUICKSTART SETUP

### 2.1 Backend Setup
```powershell
# 1. Navigate to repository root
cd "c:\Users\DANIEL\Documents\WebApp Projects\facefinderai\facefinder"

# 2. Activate Python 3.12 virtual environment
.\.venv\Scripts\Activate.ps1

# 3. Navigate to backend and run tests
cd image-sorter\backend
python -m pytest tests -v

# 4. Start backend development server
uvicorn main:app --host 127.0.0.1 --port 8000 --reload
```
The backend API documentation is accessible at `http://127.0.0.1:8000/docs`.

### 2.2 Frontend Setup
```powershell
# Open a new terminal
cd "c:\Users\DANIEL\Documents\WebApp Projects\facefinderai\facefinder\image-sorter\frontend"

# Install dependencies (if needed)
npm install

# Start Next.js development server
npm run dev
```
The user interface is accessible at `http://localhost:3000`.

---

## 3. ROOT MONOREPO COMMANDS

From the repository root, you can also run:
```powershell
# Start frontend
npm run dev

# Build frontend for production
npm run build

# Run full backend test suite
npm run backend:test
```

---

## 4. TROUBLESHOOTING

- **DeepFace Model Download on First Run:** On first execution, DeepFace downloads ArcFace weights (~130MB) into `~/.deepface/weights/arcface_weights.h5`. Ensure internet access is available on the first run.
- **Port Conflicts:** If port 8000 or 3000 is occupied, set custom ports via `--port` in Uvicorn or `-p` in Next.js, and update `NEXT_PUBLIC_API_URL` accordingly.
