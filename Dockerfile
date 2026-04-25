# Stage 1 — build React frontend
FROM node:20-alpine AS frontend-builder
WORKDIR /app/frontend
COPY frontend/package*.json ./
RUN npm ci
COPY frontend/ ./
RUN npm run build

# Stage 2 — Python backend + compiled frontend
FROM python:3.13-slim
WORKDIR /app

COPY --from=frontend-builder /app/frontend/dist ./frontend/dist

COPY backend/requirements.txt ./backend/
RUN pip install --no-cache-dir -r backend/requirements.txt

COPY backend/ ./backend/

EXPOSE 8000
CMD ["sh", "-c", "cd backend && uvicorn main:app --host 0.0.0.0 --port ${PORT:-8000}"]
