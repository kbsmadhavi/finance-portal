import aiosqlite
import os

DATABASE_PATH = os.environ.get("DATABASE_PATH", "/data/app.db")

async def get_db():
    db = await aiosqlite.connect(DATABASE_PATH)
    db.row_factory = aiosqlite.Row
    try:
        yield db
    finally:
        await db.close()

async def init_db():
    os.makedirs(os.path.dirname(DATABASE_PATH), exist_ok=True)
    db = await aiosqlite.connect(DATABASE_PATH)
    await db.executescript("""
        CREATE TABLE IF NOT EXISTS categories (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT NOT NULL UNIQUE,
            type TEXT NOT NULL CHECK(type IN ('income', 'expense')),
            color TEXT NOT NULL DEFAULT '#6366f1',
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );

        CREATE TABLE IF NOT EXISTS transactions (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            amount REAL NOT NULL,
            description TEXT NOT NULL,
            type TEXT NOT NULL CHECK(type IN ('income', 'expense')),
            category_id INTEGER,
            date TEXT NOT NULL,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (category_id) REFERENCES categories(id) ON DELETE SET NULL
        );

        CREATE TABLE IF NOT EXISTS budgets (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            category_id INTEGER NOT NULL,
            amount REAL NOT NULL,
            month TEXT NOT NULL,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (category_id) REFERENCES categories(id) ON DELETE CASCADE,
            UNIQUE(category_id, month)
        );

        -- Seed default categories if empty
        INSERT OR IGNORE INTO categories (name, type, color) VALUES
            ('Salary', 'income', '#22c55e'),
            ('Freelance', 'income', '#3b82f6'),
            ('Investments', 'income', '#8b5cf6'),
            ('Other Income', 'income', '#06b6d4'),
            ('Housing', 'expense', '#ef4444'),
            ('Food & Dining', 'expense', '#f97316'),
            ('Transportation', 'expense', '#eab308'),
            ('Utilities', 'expense', '#14b8a6'),
            ('Entertainment', 'expense', '#ec4899'),
            ('Healthcare', 'expense', '#6366f1'),
            ('Shopping', 'expense', '#a855f7'),
            ('Education', 'expense', '#0ea5e9'),
            ('Savings', 'expense', '#10b981'),
            ('Other Expense', 'expense', '#64748b');
    """)
    await db.commit()
    await db.close()
