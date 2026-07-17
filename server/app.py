"""FastAPI application for the LeetCode Auto Sync backend foundation."""

from __future__ import annotations

import json
import logging
import sys
from contextlib import asynccontextmanager
from datetime import UTC, datetime
from typing import AsyncIterator, Any

from fastapi import FastAPI, HTTPException, Request
from fastapi.exceptions import RequestValidationError
from fastapi.encoders import jsonable_encoder
from fastapi.responses import JSONResponse
from starlette.responses import Response
from fastapi.middleware.cors import CORSMiddleware
from config import HOST, LEETCODE_REPO_PATH, LOG_LEVEL, PORT
from schemas import Submission
from submit_service import process_submission

SERVICE_NAME = "leetcode-auto-sync"
SERVICE_VERSION = "1.0.0"


class JsonFormatter(logging.Formatter):
	"""Format log records as structured JSON."""

	def format(self, record: logging.LogRecord) -> str:
		payload = {
			"timestamp": datetime.fromtimestamp(record.created, tz=UTC).isoformat(),
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

app.add_middleware(
    CORSMiddleware,
    allow_origin_regex="chrome-extension://.*",
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

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


@app.exception_handler(HTTPException)
async def http_exception_handler(_: Request, exc: HTTPException) -> JSONResponse:
	"""Return JSON for HTTP errors."""

	return JSONResponse(status_code=exc.status_code, content={"detail": exc.detail})


@app.exception_handler(RequestValidationError)
async def validation_exception_handler(request: Request, exc: RequestValidationError) -> JSONResponse:
	"""Return structured JSON for validation errors and avoid HTML responses."""

	# Log validation details (do not include raw request body here)
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

	return {"service": SERVICE_NAME, "status": "running"}


@app.get("/health")
async def health() -> dict[str, str]:
	"""Return a simple health check payload."""

	return {"status": "ok", "version": SERVICE_VERSION}


@app.post("/submit")
async def submit(submission: Submission, request: Request) -> dict:
	"""Accept a submission payload, validate it, and acknowledge receipt.

	The endpoint uses Pydantic validation via the `Submission` model and
	returns a small acknowledgement payload on success.
	"""

	# Structured logging: include metadata but never log the solution code
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
	except ValueError as exc:
		# Known business validation (e.g. unsupported language)
		raise HTTPException(status_code=400, detail=str(exc))

	return ack
