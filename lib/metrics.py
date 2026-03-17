"""Request metrics middleware for StockPulse."""
import time
import logging

from flask import request, g

logger = logging.getLogger('metrics')


def setup_metrics(app):
    """Register before/after request hooks for request timing."""

    @app.before_request
    def start_timer():
        g.start_time = time.time()

    @app.after_request
    def log_request(response):
        if not hasattr(g, 'start_time'):
            return response
        if response.headers.get('X-Response-Time'):
            return response
        duration = (time.time() - g.start_time) * 1000
        logger.info(
            "request_completed path=%s method=%s status=%d duration_ms=%.2f",
            request.path,
            request.method,
            response.status_code,
            duration,
        )
        response.headers['X-Response-Time'] = f'{duration:.2f}ms'
        return response
