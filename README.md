# Expense Tracker

Expense Tracker is an Ansiversa mini-app for logging personal income, expenses, and account-based money movement in one calm workflow.

## V1 Scope

- Create accounts with an optional starting balance.
- Create categories for expense, income, and transfer records.
- Create, edit, delete, and review transactions from `/app/expense-tracker`.
- Review current balance, period income, period expense, net flow, recent activity, and category insights.
- Use quick-add and reuse flows for common income and expense entries.

## Core Product Rules

- Auth comes from the parent Ansiversa app. This repo does not own login or user management.
- `Current balance` means: starting balances + transaction effects.
- `Net flow` means: income - expense for the selected period.
- Archived accounts still count in historical totals and current balance, but are hidden from normal account-management UI.
- Expense Tracker V1 is a single-currency app.
- Trusted totals and insights require one currency across the user’s accounts and transactions.
- Transaction-related records are validated server-side. Selected account, category, and transfer account must belong to the authenticated user.

## Main Pages

- `/`
  Auth-aware landing page. Signed-in users see their summary and recent activity. Public visitors see the product landing content.
- `/app/expense-tracker`
  Main working screen for accounts, categories, transactions, filters, charts, and quick actions.
- `/help`
  Production-facing usage guidance for the current V1 flow.

## Data Structure

### Accounts

- Represent where money sits, such as cash, bank, wallet, or card.
- Can store `currency` and `startingBalance`.
- Starting balances are included in current balance calculations.

### Categories

- Organize transactions by purpose.
- Support `expense`, `income`, and `transfer` types.

### Transactions

- Belong to the authenticated user.
- Can reference `accountId`, `categoryId`, and `transferAccountId`.
- `transfer` entries require both a source account and a destination account.
- Non-transfer entries must not send `transferAccountId`.

## User Flow

1. Create at least one account.
2. Set the app currency with the first account or transaction currency.
3. Create the categories needed for regular income, expense, or transfer tracking.
4. Add transactions from the main app page.
5. Review current balance, period net flow, recent activity, and category concentration.

## Current Constraints

- V1 supports a single effective currency per user. Mixed-currency totals are intentionally treated as untrusted.
- The app is SSR-first and action-driven through `astro:actions`.
- Freeze phase is active. Changes should stay limited to fixes, cleanup, and behavior hardening unless explicitly approved.

## Local Development

Install dependencies:

```bash
npm install
```

Start the dev server:

```bash
npm run dev
```

The dev server is pinned to `http://localhost:4321` with `--strictPort`.

Public routes:

- `/`
- `/help`

Protected routes redirect through the parent Ansiversa auth flow. In local DEV, the fallback parent URL is `http://localhost:2000` unless `PUBLIC_ROOT_APP_URL` is set.

If you need a local auth bypass for development only, add this to `.env`:

```bash
DEV_AUTH_BYPASS=true
DEV_AUTH_BYPASS_USER_ID=01e5cef7-b18d-4616-999c-454175356c24
DEV_AUTH_BYPASS_EMAIL=ansiversa-demo@local
DEV_AUTH_BYPASS_NAME=Ansiversa Demo
```

## Validation Commands

```bash
npm run typecheck
npm run build
```

## Deployment

The repo is configured for Astro server output and is intended for Vercel deployment within the Ansiversa ecosystem.

## License

MIT
