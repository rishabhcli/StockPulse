"""Production Gunicorn defaults with environment-variable overrides."""

import os


bind = f"0.0.0.0:{os.environ.get('PORT', '8080')}"
workers = int(os.environ.get('WEB_CONCURRENCY', '2'))
threads = int(os.environ.get('GUNICORN_THREADS', '4'))
worker_class = 'gthread'
timeout = int(os.environ.get('GUNICORN_TIMEOUT', '120'))
graceful_timeout = int(os.environ.get('GUNICORN_GRACEFUL_TIMEOUT', '30'))
keepalive = int(os.environ.get('GUNICORN_KEEPALIVE', '5'))

# Recycle workers gradually to contain leaks from third-party market-data
# clients without dropping all warm caches at the same time.
max_requests = int(os.environ.get('GUNICORN_MAX_REQUESTS', '1000'))
max_requests_jitter = int(os.environ.get('GUNICORN_MAX_REQUESTS_JITTER', '100'))

accesslog = '-'
errorlog = '-'
capture_output = True
