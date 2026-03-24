// ── Sample Data ──────────────────────────────────────────────────────────────

const CATEGORY_COLORS = {
  Food: '#4f46e5',
  Transport: '#10b981',
  Housing: '#f59e0b',
  Entertainment: '#8b5cf6',
  Healthcare: '#ef4444',
  Shopping: '#06b6d4',
  Salary: '#22c55e',
  Other: '#94a3b8',
};

const accounts = [
  { name: 'Chase Checking', type: 'Checking', number: '••••4521', balance: 8_420.50 },
  { name: 'Savings Account', type: 'Savings', number: '••••9812', balance: 24_650.00 },
  { name: 'Investment Portfolio', type: 'Investment', number: '••••3307', balance: 52_180.75 },
  { name: 'Credit Card', type: 'Credit', number: '••••7743', balance: -1_240.00 },
];

const budgets = [
  { category: 'Food', limit: 600 },
  { category: 'Transport', limit: 200 },
  { category: 'Housing', limit: 1500 },
  { category: 'Entertainment', limit: 150 },
  { category: 'Healthcare', limit: 100 },
  { category: 'Shopping', limit: 300 },
];

// Seed transactions for the current month + 5 previous months
function seedTransactions() {
  const now = new Date();
  const data = [];
  const raw = [
    // income
    ['Salary', 'Salary', 'income', 5200],
    ['Freelance Project', 'Other', 'income', 850],
    // expenses
    ['Whole Foods Market', 'Food', 'expense', 142.30],
    ['Metro Card', 'Transport', 'expense', 33.00],
    ['Rent Payment', 'Housing', 'expense', 1400.00],
    ['Netflix', 'Entertainment', 'expense', 15.99],
    ['Dr. Smith Visit', 'Healthcare', 'expense', 45.00],
    ['Amazon Order', 'Shopping', 'expense', 67.45],
    ['Starbucks', 'Food', 'expense', 6.75],
    ['Uber', 'Transport', 'expense', 18.50],
    ['Gym Membership', 'Healthcare', 'expense', 35.00],
    ['H&M', 'Shopping', 'expense', 89.99],
    ['Spotify', 'Entertainment', 'expense', 9.99],
    ['Pizza Night', 'Food', 'expense', 38.50],
    ['Gas Station', 'Transport', 'expense', 55.20],
  ];
  for (let m = 5; m >= 0; m--) {
    const d = new Date(now.getFullYear(), now.getMonth() - m, 1);
    raw.forEach(([desc, cat, type, amt], i) => {
      const day = 1 + ((i * 2) % 27);
      const txDate = new Date(d.getFullYear(), d.getMonth(), day);
      // small variance
      const vary = 1 + (((i + m) % 5) - 2) * 0.04;
      data.push({
        id: `${m}-${i}`,
        description: desc,
        category: cat,
        type,
        amount: +(amt * vary).toFixed(2),
        date: txDate.toISOString().slice(0, 10),
      });
    });
  }
  return data.sort((a, b) => b.date.localeCompare(a.date));
}

let transactions = seedTransactions();

// ── Helpers ──────────────────────────────────────────────────────────────────

const fmt = (n) =>
  new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(n);

function currentMonthTx() {
  const now = new Date();
  const prefix = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  return transactions.filter((t) => t.date.startsWith(prefix));
}

function getMonthKey(offset) {
  const d = new Date();
  d.setMonth(d.getMonth() - offset);
  return d.toLocaleString('en-US', { month: 'short', year: '2-digit' });
}

// ── Navigation ───────────────────────────────────────────────────────────────

function navigate(sectionName) {
  document.querySelectorAll('.section').forEach((s) => s.classList.remove('active'));
  document.querySelectorAll('.nav-links li').forEach((li) => li.classList.remove('active'));
  document.getElementById(`section-${sectionName}`).classList.add('active');
  document.querySelector(`[data-section="${sectionName}"]`).classList.add('active');
  document.getElementById('page-title').textContent =
    sectionName.charAt(0).toUpperCase() + sectionName.slice(1);

  if (sectionName === 'transactions') renderAllTransactions();
  if (sectionName === 'budget') renderBudget();
  if (sectionName === 'accounts') renderAccounts();
}

document.querySelectorAll('[data-section]').forEach((el) => {
  el.addEventListener('click', (e) => {
    e.preventDefault();
    navigate(el.dataset.section);
  });
});

// ── Dashboard ────────────────────────────────────────────────────────────────

function renderDashboard() {
  const thisMonth = currentMonthTx();
  const income = thisMonth.filter((t) => t.type === 'income').reduce((s, t) => s + t.amount, 0);
  const expenses = thisMonth.filter((t) => t.type === 'expense').reduce((s, t) => s + t.amount, 0);
  const totalBalance = accounts.reduce((s, a) => s + a.balance, 0);
  const savingsRate = income > 0 ? Math.round(((income - expenses) / income) * 100) : 0;

  document.getElementById('total-balance').textContent = fmt(totalBalance);
  document.getElementById('monthly-income').textContent = fmt(income);
  document.getElementById('monthly-expenses').textContent = fmt(expenses);
  document.getElementById('savings-rate').textContent = `${savingsRate}%`;

  renderDonut(thisMonth);
  renderBarChart();
  renderRecentTransactions();
}

// Donut chart (CSS conic-gradient)
function renderDonut(txList) {
  const expenseTx = txList.filter((t) => t.type === 'expense');
  const total = expenseTx.reduce((s, t) => s + t.amount, 0);
  const byCategory = {};
  expenseTx.forEach((t) => {
    byCategory[t.category] = (byCategory[t.category] || 0) + t.amount;
  });

  let gradient = 'conic-gradient(';
  let deg = 0;
  const entries = Object.entries(byCategory).sort((a, b) => b[1] - a[1]);
  entries.forEach(([cat, amt], i) => {
    const slice = (amt / total) * 360;
    gradient += `${CATEGORY_COLORS[cat] || '#94a3b8'} ${deg}deg ${deg + slice}deg`;
    deg += slice;
    if (i < entries.length - 1) gradient += ', ';
  });
  gradient += ')';

  const donut = document.getElementById('donut-chart');
  donut.style.background = total > 0
    ? gradient
    : 'conic-gradient(#e2e8f0 0deg 360deg)';
  // punch out centre
  donut.style.webkitMask = donut.style.mask =
    'radial-gradient(transparent 45%, black 46%)';

  const legend = document.getElementById('chart-legend');
  legend.innerHTML = entries
    .slice(0, 5)
    .map(
      ([cat, amt]) => `
      <div class="legend-item">
        <div class="legend-dot" style="background:${CATEGORY_COLORS[cat] || '#94a3b8'}"></div>
        <span>${cat}</span>
        <span style="margin-left:auto;color:var(--text-muted)">${fmt(amt)}</span>
      </div>`
    )
    .join('');
}

// Bar chart (last 6 months)
function renderBarChart() {
  const now = new Date();
  const months = [];
  for (let i = 5; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const prefix = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    const mtx = transactions.filter((t) => t.date.startsWith(prefix));
    months.push({
      label: getMonthKey(i),
      income: mtx.filter((t) => t.type === 'income').reduce((s, t) => s + t.amount, 0),
      expense: mtx.filter((t) => t.type === 'expense').reduce((s, t) => s + t.amount, 0),
    });
  }

  const maxVal = Math.max(...months.flatMap((m) => [m.income, m.expense]), 1);

  document.getElementById('bar-chart').innerHTML = months
    .map(
      (m) => `
      <div class="bar-group">
        <div class="bar bar-income" style="height:${(m.income / maxVal) * 100}%" title="Income: ${fmt(m.income)}"></div>
        <div class="bar bar-expense" style="height:${(m.expense / maxVal) * 100}%" title="Expenses: ${fmt(m.expense)}"></div>
      </div>`
    )
    .join('');

  document.getElementById('bar-labels').innerHTML = months
    .map((m) => `<div class="bar-label">${m.label}</div>`)
    .join('');
}

function renderRecentTransactions() {
  const recent = transactions.slice(0, 8);
  document.getElementById('recent-transactions-body').innerHTML = recent
    .map((t) => txRow(t, false))
    .join('');
}

function txRow(t, showType) {
  return `<tr>
    <td>${t.description}</td>
    <td><span class="badge" style="background:${CATEGORY_COLORS[t.category]}22;color:${CATEGORY_COLORS[t.category]}">${t.category}</span></td>
    <td>${formatDate(t.date)}</td>
    ${showType ? `<td><span class="badge badge-${t.type}">${t.type}</span></td>` : ''}
    <td class="amount-${t.type}">${t.type === 'income' ? '+' : '-'}${fmt(t.amount)}</td>
  </tr>`;
}

function formatDate(iso) {
  return new Date(iso + 'T12:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

// ── All Transactions ──────────────────────────────────────────────────────────

function renderAllTransactions() {
  const cats = [...new Set(transactions.map((t) => t.category))].sort();
  const sel = document.getElementById('category-filter');
  if (sel.options.length === 1) {
    cats.forEach((c) => {
      const o = document.createElement('option');
      o.value = c; o.textContent = c;
      sel.appendChild(o);
    });
  }
  filterTransactions();
}

function filterTransactions() {
  const q = document.getElementById('search-input').value.toLowerCase();
  const cat = document.getElementById('category-filter').value;
  const type = document.getElementById('type-filter').value;

  const filtered = transactions.filter((t) => {
    return (
      (!q || t.description.toLowerCase().includes(q) || t.category.toLowerCase().includes(q)) &&
      (!cat || t.category === cat) &&
      (!type || t.type === type)
    );
  });

  document.getElementById('all-transactions-body').innerHTML = filtered
    .map((t) => txRow(t, true))
    .join('');
}

document.getElementById('search-input').addEventListener('input', filterTransactions);
document.getElementById('category-filter').addEventListener('change', filterTransactions);
document.getElementById('type-filter').addEventListener('change', filterTransactions);

// ── Budget ────────────────────────────────────────────────────────────────────

function renderBudget() {
  const thisMonth = currentMonthTx();
  let totalLimit = 0, totalSpent = 0;

  const html = budgets.map((b) => {
    const spent = thisMonth
      .filter((t) => t.type === 'expense' && t.category === b.category)
      .reduce((s, t) => s + t.amount, 0);
    const pct = Math.min((spent / b.limit) * 100, 100);
    totalLimit += b.limit;
    totalSpent += spent;
    const color = pct > 90 ? 'var(--danger)' : pct > 70 ? 'var(--warning)' : 'var(--success)';
    return `
      <div class="budget-item">
        <div class="budget-row">
          <strong>${b.category}</strong>
          <span>${fmt(spent)} / ${fmt(b.limit)}</span>
        </div>
        <div class="progress-track">
          <div class="progress-fill" style="width:${pct}%;background:${color}"></div>
        </div>
      </div>`;
  }).join('');

  document.getElementById('budget-bars').innerHTML = html;
  document.getElementById('total-budget').textContent = fmt(totalLimit);
  document.getElementById('total-spent').textContent = fmt(totalSpent);
  document.getElementById('total-remaining').textContent = fmt(totalLimit - totalSpent);
}

// ── Accounts ──────────────────────────────────────────────────────────────────

function renderAccounts() {
  document.getElementById('accounts-grid').innerHTML = accounts
    .map(
      (a) => `
      <div class="account-card">
        <div class="account-type">${a.type}</div>
        <div class="account-name">${a.name}</div>
        <div class="account-number">${a.number}</div>
        <div class="account-balance ${a.balance >= 0 ? 'green' : ''}">${fmt(a.balance)}</div>
        <div class="account-footer">Last updated: Today</div>
      </div>`
    )
    .join('');
}

// ── Modal ─────────────────────────────────────────────────────────────────────

const modalOverlay = document.getElementById('modal-overlay');

function openModal() {
  const today = new Date().toISOString().slice(0, 10);
  document.getElementById('transaction-form').reset();
  document.getElementById('form-date').value = today;
  modalOverlay.classList.add('open');
}

function closeModal() {
  modalOverlay.classList.remove('open');
}

document.getElementById('add-transaction-btn').addEventListener('click', openModal);
document.getElementById('modal-close').addEventListener('click', closeModal);
document.getElementById('cancel-btn').addEventListener('click', closeModal);
modalOverlay.addEventListener('click', (e) => { if (e.target === modalOverlay) closeModal(); });

document.getElementById('transaction-form').addEventListener('submit', (e) => {
  e.preventDefault();
  const tx = {
    id: Date.now().toString(),
    description: document.getElementById('form-description').value.trim(),
    amount: +parseFloat(document.getElementById('form-amount').value).toFixed(2),
    type: document.getElementById('form-type').value,
    category: document.getElementById('form-category').value,
    date: document.getElementById('form-date').value,
  };
  transactions.unshift(tx);
  closeModal();
  renderDashboard();
  const activeSection = document.querySelector('.section.active').id.replace('section-', '');
  if (activeSection === 'transactions') filterTransactions();
  if (activeSection === 'budget') renderBudget();
});

// ── Init ──────────────────────────────────────────────────────────────────────

document.getElementById('current-date').textContent = new Date().toLocaleDateString('en-US', {
  weekday: 'long', year: 'numeric', month: 'long', day: 'numeric',
});

renderDashboard();
