"""
Lightweight, idempotent schema patcher for columns added after the app first
went live (so the existing production database - which already has real
data in it - picks them up without a full migration framework). Safe to run
on every startup: only ALTERs a table when the column is actually missing.
"""
from sqlalchemy import inspect, text


def run_migrations(engine):
    insp = inspect(engine)
    if "users" not in insp.get_table_names():
        return  # fresh DB - create_all will make the table with every column already
    cols = {c["name"] for c in insp.get_columns("users")}
    if "language" not in cols:
        with engine.begin() as conn:
            conn.execute(text("ALTER TABLE users ADD COLUMN language VARCHAR(5) DEFAULT 'en'"))
        print("[migrate] added users.language column")
