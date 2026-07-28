"""Top-level entry point and facade for the FastAPI application."""

from server.api.app import app, main

__all__ = ["app", "main"]

if __name__ == "__main__":
    main()
