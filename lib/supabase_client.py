"""
Supabase client singleton for Flask backend.
Uses service role key to bypass RLS for server-side operations.
"""
import os
import logging

logger = logging.getLogger(__name__)

_supabase_client = None

SUPABASE_URL = os.environ.get('SUPABASE_URL')
SUPABASE_KEY = os.environ.get('SUPABASE_SERVICE_ROLE_KEY')


def get_supabase():
    """Get or create Supabase client instance."""
    global _supabase_client

    if _supabase_client is None:
        if not SUPABASE_URL or not SUPABASE_KEY:
            raise ValueError(
                "Missing Supabase credentials. Set SUPABASE_URL and "
                "SUPABASE_SERVICE_ROLE_KEY environment variables."
            )
        from supabase import create_client
        _supabase_client = create_client(SUPABASE_URL, SUPABASE_KEY)
        logger.info("Supabase client initialized")

    return _supabase_client


def is_supabase_enabled():
    """Check if Supabase is configured."""
    return bool(SUPABASE_URL and SUPABASE_KEY)
