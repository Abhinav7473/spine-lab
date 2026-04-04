# Single-image build — FastAPI serves the React static build on one port.
# Stage 1 builds the frontend, stage 2 bakes it into the backend image.

# ── Frontend build ────────────────────────────────────────────────────────────
FROM node:20-alpine AS frontend-builder
WORKDIR /frontend
COPY frontend/package.json frontend/package-lock.json* ./
RUN npm install --silent
COPY frontend/ .
RUN npm run build

# ── Backend base ──────────────────────────────────────────────────────────────
FROM python:3.13-slim AS base
WORKDIR /app
COPY backend/requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt
COPY backend/ .
COPY --from=frontend-builder /frontend/dist ./static

# ── Development ───────────────────────────────────────────────────────────────
FROM base AS development
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000", "--reload"]

# ── Production ────────────────────────────────────────────────────────────────
FROM base AS production
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000", "--workers", "2"]
