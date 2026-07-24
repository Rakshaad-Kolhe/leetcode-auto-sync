"""FastAPI application for the LeetCode Auto Sync backend foundation."""

from __future__ import annotations

import json
import logging
import sys
from contextlib import asynccontextmanager
from datetime import datetime, timezone
from pathlib import Path
from typing import Any, AsyncIterator, Dict

from fastapi import FastAPI, HTTPException, Request
from fastapi.encoders import jsonable_encoder
from fastapi.exceptions import RequestValidationError
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from starlette.responses import Response

from config import ALLOWED_EXTENSION_IDS, ENV, HOST, LEETCODE_REPO_PATH, LOG_LEVEL, PORT
from config.config_manager import ConfigManager
from diagnostics import generate_diagnostics_bundle
from git_service import GitService, GitServiceError, InvalidRepositoryError
from metadata.graphql_client import LeetCodeGraphQLClient
from schemas import Submission
from submit_service import process_submission

SERVICE_NAME = "leetcode-auto-sync"
SERVICE_VERSION = "1.0.1"


class JsonFormatter(logging.Formatter):
    """Format log records as structured JSON."""

    def format(self, record: logging.LogRecord) -> str:
        payload = {
            "timestamp": datetime.fromtimestamp(record.created, tz=timezone.utc).isoformat(),
            "level": record.levelname,
            "logger": record.name,
            "message": record.getMessage(),
        }

        if record.exc_info:
            payload["exception"] = self.formatException(record.exc_info)

        for field in ("service", "method", "path", "status_code"):
            value = getattr(record, field, None)
            if value is not None:
                payload[field] = value

        return json.dumps(payload, ensure_ascii=True)


def configure_logging() -> None:
    """Configure application logging with a JSON formatter."""

    root_logger = logging.getLogger()
    root_logger.handlers.clear()

    handler = logging.StreamHandler(sys.stdout)
    handler.setFormatter(JsonFormatter())
    root_logger.addHandler(handler)
    root_logger.setLevel(LOG_LEVEL)


configure_logging()
logger = logging.getLogger(SERVICE_NAME)


@asynccontextmanager
async def lifespan(_: FastAPI) -> AsyncIterator[None]:
    """Log service lifecycle events."""

    logger.info(
        "service_starting",
        extra={
            "service": SERVICE_NAME,
            "version": SERVICE_VERSION,
            "repository_path": str(LEETCODE_REPO_PATH),
            "host": HOST,
            "port": PORT,
        },
    )
    yield
    logger.info("service_stopping", extra={"service": SERVICE_NAME})


app = FastAPI(title=SERVICE_NAME, version=SERVICE_VERSION, lifespan=lifespan)


@app.middleware("http")
async def log_requests(request: Request, call_next: Any) -> Response:
    """Log requests using structured JSON fields."""

    response = await call_next(request)
    logger.info(
        "request_completed",
        extra={
            "service": SERVICE_NAME,
            "method": request.method,
            "path": request.url.path,
            "status_code": response.status_code,
        },
    )
    return response


logger.info("CORS: configured to allow all chrome extensions via regex")
app.add_middleware(
    CORSMiddleware,
    allow_origin_regex=r"chrome-extension://.*",
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.exception_handler(HTTPException)
async def http_exception_handler(_: Request, exc: HTTPException) -> JSONResponse:
    """Return JSON for HTTP errors."""

    return JSONResponse(status_code=exc.status_code, content={"detail": exc.detail})


@app.exception_handler(RequestValidationError)
async def validation_exception_handler(request: Request, exc: RequestValidationError) -> JSONResponse:
    """Return structured JSON for validation errors and avoid HTML responses."""

    logger.info(
        "validation_error",
        extra={"service": SERVICE_NAME, "path": request.url.path, "errors": exc.errors()},
    )

    return JSONResponse(status_code=422, content=jsonable_encoder({"detail": exc.errors()}))


@app.exception_handler(Exception)
async def unhandled_exception_handler(request: Request, exc: Exception) -> JSONResponse:
    """Return JSON for unexpected errors."""

    logger.exception(
        "unhandled_exception",
        extra={"service": SERVICE_NAME, "path": request.url.path},
    )
    return JSONResponse(status_code=500, content={"detail": "Internal Server Error"})


@app.get("/")
async def root() -> dict[str, str]:
    """Return service metadata for the root endpoint."""

    return {"service": SERVICE_NAME, "status": "running", "version": SERVICE_VERSION}


@app.get("/health")
async def health() -> dict[str, str]:
    """Return a simple health check payload."""

    return {"status": "ok", "version": SERVICE_VERSION}


from metrics import MetricsCollector


@app.get("/metrics")
async def get_metrics() -> dict[str, Any]:
    """Return runtime performance metrics and telemetry counters."""
    return MetricsCollector.get_instance().get_summary()


@app.get("/status")
async def get_status() -> dict[str, Any]:
    """Return detailed health dashboard status for backend, Git, GraphQL, and repository."""
    repo_path = Path(LEETCODE_REPO_PATH).expanduser().resolve()

    git_status = "disconnected"
    try:
        git_srv = GitService(repo_path=repo_path)
        if git_srv.verify_repository().get("valid"):
            git_status = "connected"
    except Exception:
        git_status = "disconnected"

    graphql_status = "available"
    try:
        cfg = ConfigManager.get_instance(repo_root=repo_path).get_config()
        if not cfg.metadata.enable_graphql:
            graphql_status = "disabled"
    except Exception:
        graphql_status = "unavailable"

    cache_status = "active" if (repo_path / ".cache").exists() else "ready"
    metrics_summary = MetricsCollector.get_instance().get_summary()

    doc_count = len(list(repo_path.rglob("*.md"))) if repo_path.exists() else 0

    return {
        "server": "healthy",
        "git": git_status,
        "repository": str(repo_path),
        "graphql": graphql_status,
        "cache": cache_status,
        "version": SERVICE_VERSION,
        "metrics": metrics_summary,
        "avg_sync_duration_ms": metrics_summary["avg_sync_duration_ms"],
        "cache_hit_ratio": metrics_summary["cache_hit_ratio"],
        "generated_documentation_count": doc_count,
        "last_sync_timestamp": metrics_summary["last_sync_timestamp"],
    }


@app.get("/diagnostics")
async def get_diagnostics() -> dict[str, Any]:
    """Return diagnostic support bundle."""
    return generate_diagnostics_bundle(LEETCODE_REPO_PATH)


@app.post("/setup")
async def setup_wizard(payload: Dict[str, Any]) -> dict[str, Any]:
    """First-time setup onboarding wizard endpoint."""
    repo_path_str = payload.get("repository_path")
    if repo_path_str:
        p = Path(repo_path_str).expanduser().resolve()
        if not p.exists() or not (p / ".git").exists():
            raise HTTPException(status_code=400, detail=f"Path is not a valid Git repository: {p}")

    cfg_mgr = ConfigManager.get_instance(repo_root=LEETCODE_REPO_PATH)
    if repo_path_str:
        cfg_mgr.update(repository={"repo_path": repo_path_str})

    return {"status": "setup_completed", "config": cfg_mgr.get_config().to_dict()}


@app.post("/submit")
async def submit(submission: Submission, request: Request) -> dict:
    """Accept a submission payload, validate it, and acknowledge receipt."""

    logger.info(
        "submission_received",
        extra={
            "service": SERVICE_NAME,
            "path": request.url.path,
            "problem_id": submission.id,
            "title": submission.title,
            "difficulty": submission.difficulty,
            "language": submission.language,
        },
    )

    try:
        ack = process_submission(submission)
    except (ValueError, InvalidRepositoryError, GitServiceError) as exc:
        raise HTTPException(status_code=400, detail=str(exc))

    return ack
