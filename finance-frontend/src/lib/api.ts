const API_URL = import.meta.env.VITE_API_URL || "http://localhost:8000";

async function request<T>(path: string, options?: RequestInit): Promise<T> {
  const res = await fetch(`${API_URL}${path}`, {
    headers: { "Content-Type": "application/json" },
    ...options,
  });
  if (!res.ok) {
    const error = await res.json().catch(() => ({ detail: res.statusText }));
    throw new Error(error.detail || "Request failed");
  }
  if (res.status === 204) return undefined as T;
  return res.json();
}

// Types
export interface Category {
  id: number;
  name: string;
  type: "income" | "expense";
  color: string;
  created_at: string;
}

export interface Transaction {
  id: number;
  amount: number;
  description: string;
  type: "income" | "expense";
  category_id: number | null;
  category_name: string | null;
  category_color: string | null;
  date: string;
  created_at: string;
}

export interface Budget {
  id: number;
  category_id: number;
  category_name: string | null;
  category_color: string | null;
  amount: number;
  spent: number;
  month: string;
  created_at: string;
}

export interface DashboardSummary {
  total_income: number;
  total_expenses: number;
  balance: number;
  transaction_count: number;
  recent_transactions: Transaction[];
}

export interface MonthlyTrend {
  month: string;
  income: number;
  expenses: number;
}

export interface CategoryBreakdown {
  category_name: string;
  category_color: string;
  total: number;
  percentage: number;
}

// API functions
export const api = {
  // Categories
  getCategories: (type?: string) =>
    request<Category[]>(`/api/categories${type ? `?type=${type}` : ""}`),

  createCategory: (data: { name: string; type: string; color: string }) =>
    request<Category>("/api/categories", {
      method: "POST",
      body: JSON.stringify(data),
    }),

  deleteCategory: (id: number) =>
    request<void>(`/api/categories/${id}`, { method: "DELETE" }),

  // Transactions
  getTransactions: (params?: {
    type?: string;
    category_id?: number;
    month?: string;
    limit?: number;
    offset?: number;
  }) => {
    const searchParams = new URLSearchParams();
    if (params?.type) searchParams.set("type", params.type);
    if (params?.category_id) searchParams.set("category_id", String(params.category_id));
    if (params?.month) searchParams.set("month", params.month);
    if (params?.limit) searchParams.set("limit", String(params.limit));
    if (params?.offset) searchParams.set("offset", String(params.offset));
    const qs = searchParams.toString();
    return request<Transaction[]>(`/api/transactions${qs ? `?${qs}` : ""}`);
  },

  createTransaction: (data: {
    amount: number;
    description: string;
    type: string;
    category_id: number | null;
    date: string;
  }) =>
    request<Transaction>("/api/transactions", {
      method: "POST",
      body: JSON.stringify(data),
    }),

  updateTransaction: (
    id: number,
    data: Partial<{
      amount: number;
      description: string;
      type: string;
      category_id: number | null;
      date: string;
    }>
  ) =>
    request<Transaction>(`/api/transactions/${id}`, {
      method: "PUT",
      body: JSON.stringify(data),
    }),

  deleteTransaction: (id: number) =>
    request<void>(`/api/transactions/${id}`, { method: "DELETE" }),

  // Budgets
  getBudgets: (month?: string) =>
    request<Budget[]>(`/api/budgets${month ? `?month=${month}` : ""}`),

  createBudget: (data: { category_id: number; amount: number; month: string }) =>
    request<Budget>("/api/budgets", {
      method: "POST",
      body: JSON.stringify(data),
    }),

  updateBudget: (id: number, data: { amount: number }) =>
    request<Budget>(`/api/budgets/${id}`, {
      method: "PUT",
      body: JSON.stringify(data),
    }),

  deleteBudget: (id: number) =>
    request<void>(`/api/budgets/${id}`, { method: "DELETE" }),

  // Dashboard
  getDashboardSummary: (month?: string) =>
    request<DashboardSummary>(
      `/api/dashboard/summary${month ? `?month=${month}` : ""}`
    ),

  getMonthlyTrends: () => request<MonthlyTrend[]>("/api/dashboard/monthly-trends"),

  getCategoryBreakdown: (type?: string, month?: string) => {
    const params = new URLSearchParams();
    if (type) params.set("type", type);
    if (month) params.set("month", month);
    const qs = params.toString();
    return request<CategoryBreakdown[]>(
      `/api/dashboard/category-breakdown${qs ? `?${qs}` : ""}`
    );
  },
};
