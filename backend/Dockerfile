# Backend image — works on both arm64 (Oracle Ampere) and amd64.
FROM python:3.12-slim-bookworm

# Fast, reproducible installs via uv (arm64 + amd64 supported).
COPY --from=ghcr.io/astral-sh/uv:latest /uv /usr/local/bin/uv

WORKDIR /app

# Install dependencies first (better layer caching).
# Not using --frozen: uv.lock predates the boto3 dependency, so we let uv
# re-resolve and update the lock at build time to include it.
COPY pyproject.toml uv.lock ./
RUN uv sync --no-dev

# App code.
COPY . .

ENV PATH="/app/.venv/bin:$PATH"
ENV PYTHONUNBUFFERED=1

EXPOSE 8000

# Single process on purpose: the WebSocket room registry is in-memory,
# so multiple workers would break 1-on-1 signaling.
CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000"]
