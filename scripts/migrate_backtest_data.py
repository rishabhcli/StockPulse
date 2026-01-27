"""
Migrate backtest data from local SQLite to Supabase PostgreSQL.

Usage:
    python scripts/migrate_backtest_data.py

Requires SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY env vars.
"""
import sqlite3
import os
import sys

# Add project root to path
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

try:
    from dotenv import load_dotenv
    load_dotenv()
except ImportError:
    pass

from lib.supabase_client import get_supabase, is_supabase_enabled

DB_PATH = os.environ.get('BACKTEST_DB_PATH', 'data/backtest.db')
BATCH_SIZE = 100


def migrate():
    if not is_supabase_enabled():
        print("Error: Supabase not configured. Set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY.")
        sys.exit(1)

    if not os.path.exists(DB_PATH):
        print(f"No SQLite database found at {DB_PATH}. Nothing to migrate.")
        sys.exit(0)

    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row

    # Check what tables exist
    cursor = conn.cursor()
    cursor.execute("SELECT name FROM sqlite_master WHERE type='table'")
    tables = [row['name'] for row in cursor.fetchall()]
    print(f"Found tables: {tables}")

    if 'score_history' not in tables:
        print("No score_history table found. Nothing to migrate.")
        conn.close()
        sys.exit(0)

    cursor.execute('SELECT COUNT(*) as cnt FROM score_history')
    total = cursor.fetchone()['cnt']
    print(f"Found {total} records to migrate")

    if total == 0:
        print("No records to migrate.")
        conn.close()
        sys.exit(0)

    supabase = get_supabase()
    migrated = 0

    cursor.execute('SELECT * FROM score_history ORDER BY timestamp')

    batch = []
    for row in cursor:
        record = {
            'ticker': row['ticker'],
            'score': float(row['score']),
            'recommendation': row['recommendation'],
            'price_at_scoring': float(row['price_at_scoring']),
            'timestamp': row['timestamp'],
        }
        batch.append(record)

        if len(batch) >= BATCH_SIZE:
            supabase.table('backtest_records').insert(batch).execute()
            migrated += len(batch)
            print(f"  Migrated {migrated}/{total} records")
            batch = []

    # Insert remaining
    if batch:
        supabase.table('backtest_records').insert(batch).execute()
        migrated += len(batch)

    conn.close()
    print(f"Migration complete: {migrated} records migrated to Supabase")


if __name__ == '__main__':
    migrate()
