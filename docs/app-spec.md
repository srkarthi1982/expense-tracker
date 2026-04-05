# App Spec: expense-tracker

## 1) App Overview
- **App Name:** Expense Tracker
- **Category:** Finance / Productivity
- **Version:** V1
- **App Type:** DB-backed
- **Purpose:** Help an authenticated user manage accounts, categories, and transactions in one personal finance workspace with summaries, filters, and historical reporting.
- **Primary User:** A single signed-in Ansiversa user managing personal finances.

## 2) User Stories
- As a user, I want to create accounts and categories, so that I can structure my money records before entering transactions.
- As a user, I want to add, edit, archive, and review transactions, so that I can track spending, income, and transfers over time.
- As a user, I want period-aware summaries and insights, so that I can understand balances, net flow, and category concentration without manual calculations.

## 3) Core Workflow
1. User signs in through the parent Ansiversa session and opens `/app/expense-tracker`.
2. User creates one or more accounts and, when needed, categories for income or expense tracking.
3. User records transactions, including expenses, income, or transfers between owned accounts.
4. The app updates summaries, charts, grouped transaction views, and quick actions from the persisted user data.
5. User filters by period, reviews history, and archives accounts or categories without losing historical totals.

## 4) Functional Behavior
- The app is SSR-first and action-driven; authenticated data loads from Astro DB and user mutations go through `astro:actions`.
- Accounts support optional starting balances and archiving; archived accounts are hidden from normal management lists but still count in historical/current calculations.
- Categories support `expense`, `income`, and `transfer` types; archived categories remain visible in historical reporting but are excluded from normal new-entry selection.
- Transactions enforce ownership and reference validation server-side; transfers require source and destination accounts, while non-transfer entries use categories instead.
- Current balance includes starting balances plus transaction effects, while period cards represent period flow rather than lifetime balance.
- Current implementation appears to treat mixed-currency data conservatively; V1 expects one effective currency for trusted totals and insights.

## 5) Data & Storage
- **Storage type:** Astro DB
- **Main entities:** `Accounts`, `Categories`, `Transactions`
- **Persistence expectations:** User finance data is stored per authenticated user and persists across sessions.
- **User model:** Single-user per account boundary

## 6) Special Logic (Optional)
- Historical-truth rules intentionally keep archived accounts/categories in reporting while hiding them from normal active CRUD flows.
- Period presets, custom date filters, charts, and quick-entry helpers are derived from persisted transaction history.
- The app includes non-blocking parent integration hooks for dashboard/activity updates, but the finance source of truth remains local to this repo.

## 7) Edge Cases & Error Handling
- Invalid references: Transaction create/update rejects account, category, or transfer-account references that do not belong to the authenticated user.
- Invalid transaction combinations: Transfer rows require a destination account; expense/income rows require compatible categories.
- Mixed currency: Totals and insights should be treated cautiously if the user introduces multiple currencies in V1.
- Archived records: Archived accounts/categories should no longer appear in normal selectors, but existing history should remain readable.
- Missing route state: Public routes remain safe, while protected routes depend on the parent auth session.

## 8) Tester Verification Guide
### Core flow tests
- [ ] Create an account, create a category, and add income, expense, and transfer transactions.
- [ ] Edit and delete transactions, then confirm summaries, recent activity, and grouped history update correctly.
- [ ] Archive an account and a category, then confirm they disappear from active management UI but remain reflected in historical totals.

### Safety tests
- [ ] Attempt to create an expense or income transaction without a category and confirm the server rejects it with a clear error.
- [ ] Attempt an invalid transfer flow and confirm the app does not save broken data.
- [ ] Change date filters and confirm summary cards, charts, and insights reflect the selected period.

### Negative tests
- [ ] Confirm the app does not expose independent auth or multi-user collaboration inside this repo.
- [ ] Confirm mixed-currency behavior is conservative and does not present overconfident totals as if they were normalized exchange-rate values.

## 9) Out of Scope (V1)
- Budget planning or recurring budgets
- Currency conversion or exchange-rate normalization
- Shared household/collaborative finance workspaces
- External bank sync or automated statement import

## 10) Freeze Notes
- V1 freeze: this document reflects the current authenticated account/category/transaction implementation and historical-reporting rules.
- Current implementation appears production-oriented and DB-backed; browser-level verification should still confirm charts, filters, and archive visibility in final QA.
- During freeze, only verification, bug fixes, cleanup, and documentation hardening are allowed.
