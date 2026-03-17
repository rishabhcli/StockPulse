"""Shared pytest fixtures for Flask API and backend tests."""

import os
from collections.abc import Iterator

import pytest


# Configure test-time environment before importing the Flask app module.
os.environ.setdefault('FLASK_ENV', 'testing')
os.environ.setdefault('SUPABASE_JWT_SECRET', 'test-secret-for-jwt-verification')


@pytest.fixture(autouse=True)
def clear_test_cache() -> Iterator[None]:
    """Isolate tests from global cache state."""
    from data.cache import clear_global_cache

    clear_global_cache()
    yield
    clear_global_cache()


@pytest.fixture
def client():
    """Flask test client."""
    import app as app_module

    app_module.app.config.update(TESTING=True)
    with app_module.app.test_client() as test_client:
        yield test_client
