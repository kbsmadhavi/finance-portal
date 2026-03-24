# Finance Portal

A lightweight, single-page personal finance dashboard built with vanilla HTML, CSS, and JavaScript — no build step required.

## Features

- **Dashboard** – live summary cards (total balance, monthly income/expenses, savings rate), a CSS-only donut chart for spending by category, and a bar chart for the last 6 months of income vs expenses.
- **Transactions** – full transaction history with real-time search and filters by category and type (income/expense).
- **Budget** – per-category progress bars that turn amber/red as you approach your limit.
- **Accounts** – overview of all linked bank and investment accounts.
- **Add Transaction** – modal form to record new income or expense entries; updates all views instantly.

## Getting Started

Open `index.html` directly in your browser — no server or installation needed.

```bash
open index.html   # macOS
xdg-open index.html  # Linux
start index.html  # Windows
```

## Project Structure

```
finance-portal/
├── index.html   # Application shell and markup
├── style.css    # Layout, components, and responsive styles
└── app.js       # Data, rendering logic, and event handling
```

