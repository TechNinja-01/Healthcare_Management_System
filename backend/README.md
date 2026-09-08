# Healthcare Management Backend

FastAPI + PostgreSQL + SQLAlchemy 2.x + JWT/RBAC.

## Setup

```bash
cd backend
uv sync
```

Configure `.env` (already present for local Postgres).

## Migrations

```bash
cd backend
uv run alembic upgrade head
```

## Run

```bash
cd backend
uv run uvicorn main:app --reload --host 127.0.0.1 --port 8000
```

Swagger: http://127.0.0.1:8000/docs
