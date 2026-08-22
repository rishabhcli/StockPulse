"""Backend observability helpers for structured logging and API metadata."""

from __future__ import annotations

import json
import logging
import os
import uuid
from datetime import datetime, timezone
from typing import Any, Dict, Optional

try:
    from pythonjsonlogger.json import JsonFormatter  # type: ignore
except Exception:  # pragma: no cover - optional dependency
    try:
        from pythonjsonlogger import jsonlogger  # type: ignore
        JsonFormatter = jsonlogger.JsonFormatter
    except Exception:
        JsonFormatter = None

try:
    import sentry_sdk
    from sentry_sdk.integrations.flask import FlaskIntegration
except Exception:  # pragma: no cover - optional dependency
    sentry_sdk = None
    FlaskIntegration = None


class _FallbackJsonFormatter(logging.Formatter):
    """Serialize log records as compact JSON when python-json-logger is absent."""

    def format(self, record: logging.LogRecord) -> str:
        payload: Dict[str, Any] = {
            'timestamp': datetime.now(timezone.utc).isoformat(),
            'level': record.levelname,
            'logger': record.name,
            'message': record.getMessage(),
        }
        for key, value in record.__dict__.items():
            if key.startswith('_') or key in {
                'args',
                'asctime',
                'created',
                'exc_info',
                'exc_text',
                'filename',
                'funcName',
                'levelname',
                'levelno',
                'lineno',
                'module',
                'msecs',
                'message',
                'msg',
                'name',
                'pathname',
                'process',
                'processName',
                'relativeCreated',
                'stack_info',
                'thread',
                'threadName',
            }:
                continue
            payload[key] = value
        if record.exc_info:
            payload['exception'] = self.formatException(record.exc_info)
        return json.dumps(payload, default=str, separators=(',', ':'))


if JsonFormatter is not None:
    class _StockPulseJsonFormatter(JsonFormatter):
        """Add consistent fields that are not native LogRecord attributes."""

        def add_fields(self, log_record, record, message_dict):
            super().add_fields(log_record, record, message_dict)
            log_record['timestamp'] = datetime.now(timezone.utc).isoformat()
            log_record['level'] = record.levelname
            log_record['logger'] = record.name


def configure_json_logging(level: int = logging.INFO) -> None:
    """Configure root logging to emit JSON records."""
    root = logging.getLogger()
    if getattr(root, '_stockpulse_json_logging', False):
        return

    handler = logging.StreamHandler()
    if JsonFormatter is not None:
        formatter = _StockPulseJsonFormatter(
            '%(timestamp)s %(level)s %(logger)s %(message)s %(request_id)s %(endpoint)s %(path)s %(method)s'
        )
    else:
        formatter = _FallbackJsonFormatter()

    handler.setFormatter(formatter)
    root.handlers = [handler]
    root.setLevel(level)
    setattr(root, '_stockpulse_json_logging', True)


def configure_sentry() -> bool:
    """Initialize Sentry when a DSN is configured."""
    dsn = os.environ.get('SENTRY_DSN')
    if not dsn or sentry_sdk is None or FlaskIntegration is None:
        return False

    sentry_sdk.init(
        dsn=dsn,
        integrations=[FlaskIntegration()],
        environment=os.environ.get('FLASK_ENV', 'development'),
        traces_sample_rate=float(os.environ.get('SENTRY_TRACES_SAMPLE_RATE', '0.0')),
        profiles_sample_rate=float(os.environ.get('SENTRY_PROFILES_SAMPLE_RATE', '0.0')),
        send_default_pii=False,
    )
    return True


def get_request_id() -> str:
    """Return the active request ID or generate a new one."""
    try:
        from flask import g, request

        request_id = getattr(g, 'request_id', None)
        if request_id:
            return request_id
        header_request_id = request.headers.get('X-Request-ID')
        if header_request_id:
            return header_request_id
    except Exception:
        pass
    return uuid.uuid4().hex


def build_freshness_metadata(
    *,
    generated_at: Optional[str] = None,
    sources_used: Optional[Dict[str, Any]] = None,
    stale_inputs: Optional[list[str]] = None,
    status: Optional[str] = None,
    details: Optional[Dict[str, Any]] = None,
) -> Dict[str, Any]:
    """Build a top-level freshness summary for list endpoints."""
    stale_inputs = stale_inputs or []
    sources_used = sources_used or {}
    available_sources = 0
    for group in sources_used.values():
        if isinstance(group, dict):
            available_sources += sum(1 for meta in group.values() if isinstance(meta, dict) and meta.get('available'))

    freshness_status = status or ('stale' if stale_inputs else 'fresh')
    summary = 'fresh data' if freshness_status == 'fresh' else 'partial or stale inputs present'
    freshness = {
        'status': freshness_status,
        'summary': summary,
        'generated_at': generated_at or datetime.now(timezone.utc).isoformat(),
        'stale_inputs': stale_inputs,
        'sources_used': sources_used,
        'available_sources': available_sources,
    }
    if details:
        freshness.update(details)
    return freshness


def build_request_log_payload(response: Any, duration_ms: float) -> Dict[str, Any]:
    """Extract a structured request log payload from a Flask response."""
    payload: Dict[str, Any] = {
        'request_id': get_request_id(),
        'endpoint': None,
        'path': None,
        'method': None,
        'status_code': getattr(response, 'status_code', None),
        'duration_ms': round(duration_ms, 2),
        'ticker': None,
        'filter': None,
        'request_type': 'api',
    }
    try:
        from flask import request

        payload['endpoint'] = request.endpoint
        payload['path'] = request.path
        payload['method'] = request.method
        payload['ticker'] = request.args.get('ticker')
        payload['filter'] = request.args.get('filter')

        if request.is_json:
            body = request.get_json(silent=True) or {}
            if isinstance(body, dict):
                payload['ticker'] = payload['ticker'] or body.get('ticker')
                payload['filter'] = payload['filter'] or body.get('filter')
    except Exception:
        pass

    try:
        response_json = response.get_json(silent=True) if hasattr(response, 'get_json') else None
        if isinstance(response_json, dict):
            payload['response_code'] = response_json.get('code')
            payload['response_status'] = response_json.get('status')
            payload['request_id'] = response_json.get('request_id', payload['request_id'])
            freshness = response_json.get('freshness')
            if isinstance(freshness, dict):
                payload['freshness_status'] = freshness.get('status')
                payload['stale_inputs_count'] = len(freshness.get('stale_inputs', []) or [])
            sources_used = response_json.get('sources_used')
            if isinstance(sources_used, dict):
                payload['sources_groups'] = list(sources_used.keys())
    except Exception:
        pass

    return payload


def log_request(logger: logging.Logger, response: Any, duration_ms: float) -> None:
    """Log a request summary with structured fields."""
    logger.info(
        'request_completed',
        extra=build_request_log_payload(response, duration_ms),
    )
