# Security Policy 🔒

## Reporting Vulnerabilities

If you discover a security vulnerability in DevPulse, please report it privately:

- **Email**: `rakshaadkolhe@gmail.com`
- **Subject**: `[SECURITY] Vulnerability Report - DevPulse`

Please do NOT report security vulnerabilities via public GitHub issues.

## Security Practices

- **Token Masking**: Sensitive keys (passwords, tokens, API keys) are automatically redacted in diagnostic support bundles and logging.
- **Local Isolation**: All synchronization happens locally on your machine via loopback HTTP (`127.0.0.1`).
