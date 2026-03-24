from fastapi import APIRouter, Depends, HTTPException, Query
from typing import Optional
import aiosqlite

from app.database import get_db
from app.models import (
    CategoryCreate, CategoryResponse,
    TransactionCreate, TransactionUpdate, TransactionResponse,
    BudgetCreate, BudgetUpdate, BudgetResponse,
    DashboardSummary, MonthlyTrend, CategoryBreakdown,
)

router = APIRouter(prefix="/api")


# ─── Categories ───────────────────────────────────────────────

@router.get("/categories", response_model=list[CategoryResponse])
async def list_categories(
    type: Optional[str] = Query(None, pattern=r"^(income|expense)$"),
    db: aiosqlite.Connection = Depends(get_db),
):
    if type:
        cursor = await db.execute(
            "SELECT * FROM categories WHERE type = ? ORDER BY name", (type,)
        )
    else:
        cursor = await db.execute("SELECT * FROM categories ORDER BY type, name")
    rows = await cursor.fetchall()
    return [dict(row) for row in rows]


@router.post("/categories", response_model=CategoryResponse, status_code=201)
async def create_category(
    data: CategoryCreate, db: aiosqlite.Connection = Depends(get_db)
):
    try:
        cursor = await db.execute(
            "INSERT INTO categories (name, type, color) VALUES (?, ?, ?)",
            (data.name, data.type, data.color),
        )
        await db.commit()
        cat = await db.execute("SELECT * FROM categories WHERE id = ?", (cursor.lastrowid,))
        row = await cat.fetchone()
        return dict(row)
    except aiosqlite.IntegrityError:
        raise HTTPException(status_code=400, detail="Category already exists")


@router.delete("/categories/{category_id}", status_code=204)
async def delete_category(category_id: int, db: aiosqlite.Connection = Depends(get_db)):
    cursor = await db.execute("DELETE FROM categories WHERE id = ?", (category_id,))
    await db.commit()
    if cursor.rowcount == 0:
        raise HTTPException(status_code=404, detail="Category not found")


# ─── Transactions ─────────────────────────────────────────────

@router.get("/transactions", response_model=list[TransactionResponse])
async def list_transactions(
    type: Optional[str] = Query(None, pattern=r"^(income|expense)$"),
    category_id: Optional[int] = None,
    month: Optional[str] = None,
    limit: int = Query(50, le=500),
    offset: int = 0,
    db: aiosqlite.Connection = Depends(get_db),
):
    query = """
        SELECT t.*, c.name as category_name, c.color as category_color
        FROM transactions t
        LEFT JOIN categories c ON t.category_id = c.id
        WHERE 1=1
    """
    params: list = []
    if type:
        query += " AND t.type = ?"
        params.append(type)
    if category_id:
        query += " AND t.category_id = ?"
        params.append(category_id)
    if month:
        query += " AND t.date LIKE ?"
        params.append(f"{month}%")
    query += " ORDER BY t.date DESC, t.id DESC LIMIT ? OFFSET ?"
    params.extend([limit, offset])

    cursor = await db.execute(query, params)
    rows = await cursor.fetchall()
    return [dict(row) for row in rows]


@router.post("/transactions", response_model=TransactionResponse, status_code=201)
async def create_transaction(
    data: TransactionCreate, db: aiosqlite.Connection = Depends(get_db)
):
    cursor = await db.execute(
        "INSERT INTO transactions (amount, description, type, category_id, date) VALUES (?, ?, ?, ?, ?)",
        (data.amount, data.description, data.type, data.category_id, data.date),
    )
    await db.commit()
    row_cursor = await db.execute(
        """SELECT t.*, c.name as category_name, c.color as category_color
           FROM transactions t LEFT JOIN categories c ON t.category_id = c.id
           WHERE t.id = ?""",
        (cursor.lastrowid,),
    )
    row = await row_cursor.fetchone()
    return dict(row)


@router.put("/transactions/{transaction_id}", response_model=TransactionResponse)
async def update_transaction(
    transaction_id: int, data: TransactionUpdate, db: aiosqlite.Connection = Depends(get_db)
):
    existing = await db.execute("SELECT * FROM transactions WHERE id = ?", (transaction_id,))
    row = await existing.fetchone()
    if not row:
        raise HTTPException(status_code=404, detail="Transaction not found")

    updates = data.model_dump(exclude_unset=True)
    if not updates:
        raise HTTPException(status_code=400, detail="No fields to update")

    set_clause = ", ".join(f"{k} = ?" for k in updates)
    values = list(updates.values()) + [transaction_id]
    await db.execute(f"UPDATE transactions SET {set_clause} WHERE id = ?", values)
    await db.commit()

    row_cursor = await db.execute(
        """SELECT t.*, c.name as category_name, c.color as category_color
           FROM transactions t LEFT JOIN categories c ON t.category_id = c.id
           WHERE t.id = ?""",
        (transaction_id,),
    )
    row = await row_cursor.fetchone()
    return dict(row)


@router.delete("/transactions/{transaction_id}", status_code=204)
async def delete_transaction(transaction_id: int, db: aiosqlite.Connection = Depends(get_db)):
    cursor = await db.execute("DELETE FROM transactions WHERE id = ?", (transaction_id,))
    await db.commit()
    if cursor.rowcount == 0:
        raise HTTPException(status_code=404, detail="Transaction not found")


# ─── Budgets ──────────────────────────────────────────────────

@router.get("/budgets", response_model=list[BudgetResponse])
async def list_budgets(
    month: Optional[str] = None,
    db: aiosqlite.Connection = Depends(get_db),
):
    query = """
        SELECT b.*, c.name as category_name, c.color as category_color,
               COALESCE(
                   (SELECT SUM(t.amount) FROM transactions t
                    WHERE t.category_id = b.category_id
                      AND t.type = 'expense'
                      AND t.date LIKE b.month || '%'),
                   0
               ) as spent
        FROM budgets b
        LEFT JOIN categories c ON b.category_id = c.id
    """
    params: list = []
    if month:
        query += " WHERE b.month = ?"
        params.append(month)
    query += " ORDER BY c.name"
    cursor = await db.execute(query, params)
    rows = await cursor.fetchall()
    return [dict(row) for row in rows]


@router.post("/budgets", response_model=BudgetResponse, status_code=201)
async def create_budget(data: BudgetCreate, db: aiosqlite.Connection = Depends(get_db)):
    try:
        cursor = await db.execute(
            "INSERT INTO budgets (category_id, amount, month) VALUES (?, ?, ?)",
            (data.category_id, data.amount, data.month),
        )
        await db.commit()
        row_cursor = await db.execute(
            """SELECT b.*, c.name as category_name, c.color as category_color,
                      0 as spent
               FROM budgets b LEFT JOIN categories c ON b.category_id = c.id
               WHERE b.id = ?""",
            (cursor.lastrowid,),
        )
        row = await row_cursor.fetchone()
        return dict(row)
    except aiosqlite.IntegrityError:
        raise HTTPException(status_code=400, detail="Budget already exists for this category and month")


@router.put("/budgets/{budget_id}", response_model=BudgetResponse)
async def update_budget(budget_id: int, data: BudgetUpdate, db: aiosqlite.Connection = Depends(get_db)):
    existing = await db.execute("SELECT * FROM budgets WHERE id = ?", (budget_id,))
    if not await existing.fetchone():
        raise HTTPException(status_code=404, detail="Budget not found")

    if data.amount is not None:
        await db.execute("UPDATE budgets SET amount = ? WHERE id = ?", (data.amount, budget_id))
        await db.commit()

    row_cursor = await db.execute(
        """SELECT b.*, c.name as category_name, c.color as category_color,
                  COALESCE(
                      (SELECT SUM(t.amount) FROM transactions t
                       WHERE t.category_id = b.category_id
                         AND t.type = 'expense'
                         AND t.date LIKE b.month || '%'),
                      0
                  ) as spent
           FROM budgets b LEFT JOIN categories c ON b.category_id = c.id
           WHERE b.id = ?""",
        (budget_id,),
    )
    row = await row_cursor.fetchone()
    return dict(row)


@router.delete("/budgets/{budget_id}", status_code=204)
async def delete_budget(budget_id: int, db: aiosqlite.Connection = Depends(get_db)):
    cursor = await db.execute("DELETE FROM budgets WHERE id = ?", (budget_id,))
    await db.commit()
    if cursor.rowcount == 0:
        raise HTTPException(status_code=404, detail="Budget not found")


# ─── Dashboard ────────────────────────────────────────────────

@router.get("/dashboard/summary", response_model=DashboardSummary)
async def dashboard_summary(
    month: Optional[str] = None,
    db: aiosqlite.Connection = Depends(get_db),
):
    date_filter = ""
    params: list = []
    if month:
        date_filter = " AND date LIKE ?"
        params.append(f"{month}%")

    income_cursor = await db.execute(
        f"SELECT COALESCE(SUM(amount), 0) FROM transactions WHERE type = 'income'{date_filter}",
        params,
    )
    total_income = (await income_cursor.fetchone())[0]

    expense_cursor = await db.execute(
        f"SELECT COALESCE(SUM(amount), 0) FROM transactions WHERE type = 'expense'{date_filter}",
        params,
    )
    total_expenses = (await expense_cursor.fetchone())[0]

    count_cursor = await db.execute(
        f"SELECT COUNT(*) FROM transactions WHERE 1=1{date_filter}", params
    )
    transaction_count = (await count_cursor.fetchone())[0]

    recent_cursor = await db.execute(
        f"""SELECT t.*, c.name as category_name, c.color as category_color
            FROM transactions t
            LEFT JOIN categories c ON t.category_id = c.id
            WHERE 1=1{date_filter}
            ORDER BY t.date DESC, t.id DESC LIMIT 5""",
        params,
    )
    recent_rows = await recent_cursor.fetchall()

    return DashboardSummary(
        total_income=total_income,
        total_expenses=total_expenses,
        balance=total_income - total_expenses,
        transaction_count=transaction_count,
        recent_transactions=[dict(r) for r in recent_rows],
    )


@router.get("/dashboard/monthly-trends", response_model=list[MonthlyTrend])
async def monthly_trends(db: aiosqlite.Connection = Depends(get_db)):
    cursor = await db.execute("""
        SELECT
            substr(date, 1, 7) as month,
            COALESCE(SUM(CASE WHEN type = 'income' THEN amount ELSE 0 END), 0) as income,
            COALESCE(SUM(CASE WHEN type = 'expense' THEN amount ELSE 0 END), 0) as expenses
        FROM transactions
        GROUP BY substr(date, 1, 7)
        ORDER BY month DESC
        LIMIT 12
    """)
    rows = await cursor.fetchall()
    return [dict(r) for r in reversed(rows)]


@router.get("/dashboard/category-breakdown", response_model=list[CategoryBreakdown])
async def category_breakdown(
    month: Optional[str] = None,
    type: str = Query("expense", pattern=r"^(income|expense)$"),
    db: aiosqlite.Connection = Depends(get_db),
):
    query = """
        SELECT c.name as category_name, c.color as category_color,
               COALESCE(SUM(t.amount), 0) as total
        FROM transactions t
        JOIN categories c ON t.category_id = c.id
        WHERE t.type = ?
    """
    params: list = [type]
    if month:
        query += " AND t.date LIKE ?"
        params.append(f"{month}%")
    query += " GROUP BY c.id HAVING total > 0 ORDER BY total DESC"

    cursor = await db.execute(query, params)
    rows = await cursor.fetchall()
    result = [dict(r) for r in rows]

    grand_total = sum(r["total"] for r in result)
    for r in result:
        r["percentage"] = round((r["total"] / grand_total * 100) if grand_total > 0 else 0, 1)

    return result
