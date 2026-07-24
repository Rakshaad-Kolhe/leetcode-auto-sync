"""Retry decorators and backoff utilities for network and Git operations."""

from __future__ import annotations

import functools
import logging
import time
from typing import Any, Callable, Tuple, Type, TypeVar

logger = logging.getLogger(__name__)

F = TypeVar("F", bound=Callable[..., Any])


def retry_with_backoff(
    max_retries: int = 3,
    initial_delay: float = 0.1,
    backoff_factor: float = 2.0,
    exceptions: Tuple[Type[BaseException], ...] = (Exception,),
) -> Callable[[F], F]:
    """Decorator to retry a callable with exponential backoff."""

    def decorator(func: F) -> F:
        func_name = getattr(func, "__name__", str(func))

        @functools.wraps(func)
        def wrapper(*args: Any, **kwargs: Any) -> Any:
            delay = initial_delay
            last_exception: BaseException | None = None

            for attempt in range(1, max_retries + 1):
                try:
                    return func(*args, **kwargs)
                except exceptions as exc:
                    last_exception = exc
                    if attempt == max_retries:
                        logger.warning(
                            f"[RETRY_FAILED] {func_name} failed after {attempt} attempts: {exc}"
                        )
                        raise exc
                    logger.info(
                        f"[RETRY] {func_name} failed (attempt {attempt}/{max_retries}), retrying in {delay:.2f}s: {exc}"
                    )
                    time.sleep(delay)
                    delay *= backoff_factor

            if last_exception:
                raise last_exception

        return wrapper  # type: ignore[return-value]

    return decorator
