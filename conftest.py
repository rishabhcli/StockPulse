import os
import pytest

# Ensure test environment variables — must be set BEFORE app import
# Override any system env vars that would cause external connections
os.environ['SUPABASE_URL'] = ''
os.environ['SUPABASE_SERVICE_ROLE_KEY'] = ''
os.environ['SUPABASE_JWT_SECRET'] = 'test-secret-for-jwt-verification'
os.environ['REDIS_URL'] = 'memory://'
# Prevent dotenv from overwriting our test env vars
os.environ['FLASK_ENV'] = 'testing'


@pytest.fixture
def app():
    """Create Flask app configured for testing."""
    from app import app as flask_app
    flask_app.config['TESTING'] = True
    # Disable rate limiter in tests
    from app import limiter
    if hasattr(limiter, 'enabled'):
        limiter.enabled = False
    return flask_app


@pytest.fixture
def client(app):
    """Create Flask test client."""
    return app.test_client()
