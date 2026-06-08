# Aegis ReID — Production Run Guide

This repository contains the backend (FastAPI) and frontend (Next.js) for the Aegis ReID project.

Local development

1. Create and activate a Python virtualenv and install backend deps:

```bash
python -m venv .venv
.venv/Scripts/activate  # Windows
pip install -r requirements.txt
```

2. Start backend (dev):

```bash
uvicorn app.api.main:app --reload --port 8000
```

3. Frontend (dev):

```bash
cd frontend
npm install
npm run dev
```

Docker (production)

Build and run backend + frontend via docker-compose:

```bash
docker compose build
docker compose up -d
```

Services
- Backend: http://localhost:8000
- Frontend: http://localhost:3000

CI

A GitHub Actions workflow is provided at `.github/workflows/ci.yml` to run backend tests and build the frontend.

Notes
- Configure environment variables via `.env` at the project root (e.g. `LOG_LEVEL`, `DEFAULT_VIDEO_PATH`, `BACKEND_URL` for frontend builds).
- For production, use a secrets manager for camera credentials; do not store plain text credentials in the database or client code.
 - For production, use a secrets manager for camera credentials; do not store plain text credentials in the database or client code.
 - The API will now mask sensitive connection strings when listing cameras. To fully secure credentials, consider using an encrypted store and a server-side secrets manager.
 - Example environment variables are provided in `.env.example`.
