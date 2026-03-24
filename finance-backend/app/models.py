from pydantic import BaseModel, Field
from typing import Optional


class CategoryCreate(BaseModel):
    name: str
    type: str = Field(pattern=r"^(income|expense)$")
    color: str = "#6366f1"


class CategoryResponse(BaseModel):
    id: int
    name: str
    type: str
    color: str
    created_at: str


class TransactionCreate(BaseModel):
    amount: float = Field(gt=0)
    description: str
    type: str = Field(pattern=r"^(income|expense)$")
    category_id: Optional[int] = None
    date: str


class TransactionUpdate(BaseModel):
    amount: Optional[float] = Field(default=None, gt=0)
    description: Optional[str] = None
    type: Optional[str] = Field(default=None, pattern=r"^(income|expense)$")
    category_id: Optional[int] = None
    date: Optional[str] = None


class TransactionResponse(BaseModel):
    id: int
    amount: float
    description: str
    type: str
    category_id: Optional[int]
    category_name: Optional[str] = None
    category_color: Optional[str] = None
    date: str
    created_at: str


class BudgetCreate(BaseModel):
    category_id: int
    amount: float = Field(gt=0)
    month: str  # YYYY-MM format


class BudgetUpdate(BaseModel):
    amount: Optional[float] = Field(default=None, gt=0)


class BudgetResponse(BaseModel):
    id: int
    category_id: int
    category_name: Optional[str] = None
    category_color: Optional[str] = None
    amount: float
    spent: float = 0.0
    month: str
    created_at: str


class DashboardSummary(BaseModel):
    total_income: float
    total_expenses: float
    balance: float
    transaction_count: int
    recent_transactions: list[TransactionResponse]


class MonthlyTrend(BaseModel):
    month: str
    income: float
    expenses: float


class CategoryBreakdown(BaseModel):
    category_name: str
    category_color: str
    total: float
    percentage: float
