# Expense Tracker Slice 3 Verification Checklist

## Functional checks
- [ ] App route loads and existing CRUD controls are available.
- [ ] Global top summary cards still show total income, expense, balance, and all-time transaction count.
- [ ] Current month summary section renders this month income, expense, balance, and transaction count.
- [ ] Monthly summary shows helpful empty message when there are no transactions in the current month.
- [ ] Category insights section lists expense totals grouped by category in descending order.
- [ ] Category insights includes transaction count per category when data exists.
- [ ] Top expense category highlight matches the highest grouped category total.
- [ ] Category insights empty state renders when no categorized expenses are available.
- [ ] Transactions render under clear month headings (for example, "March 2026").
- [ ] Largest recent expenses section shows a compact top-three recent high-value expense list.
- [ ] Largest recent expenses section shows an empty state when no expenses exist.
- [ ] Create transaction flow still works after insight updates.
- [ ] Edit transaction flow still works after insight updates.
- [ ] Delete transaction flow still works after insight updates.
- [ ] Global and monthly totals update correctly after create/edit/delete operations.

## Technical checks
- [ ] `npm run typecheck`
- [ ] `npm run build`

## UX checks
- [ ] Monthly summary is understandable at a glance.
- [ ] Category insight list is readable and scannable.
- [ ] Largest recent expense callout is compact and useful.
- [ ] Month-grouped transaction list feels organized and clean.
- [ ] Mobile layout remains usable across summary, insights, and transaction sections.
