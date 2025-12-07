/**
 * Expense Tracker - track income/expenses across accounts and categories.
 *
 * Design goals:
 * - Support multiple accounts (cash, bank, card).
 * - Categories for expenses/income.
 * - Simple transaction table, future-friendly for reports and budgets.
 */

import { defineTable, column, NOW } from "astro:db";

export const Accounts = defineTable({
  columns: {
    id: column.text({ primaryKey: true }),
    userId: column.text(),

    name: column.text(),                           // "Cash", "HDFC Savings", "Credit Card"
    type: column.text({ optional: true }),         // "cash", "bank", "card", "wallet"
    currency: column.text({ optional: true }),     // "AED", "INR", etc.
    startingBalance: column.number({ optional: true }),
    isArchived: column.boolean({ default: false }),

    createdAt: column.date({ default: NOW }),
    updatedAt: column.date({ default: NOW }),
  },
});

export const Categories = defineTable({
  columns: {
    id: column.text({ primaryKey: true }),
    userId: column.text(),

    name: column.text(),                           // "Groceries", "Rent", "Salary"
    type: column.text({ optional: true }),         // "expense", "income", "transfer"
    icon: column.text({ optional: true }),
    parentCategoryId: column.text({ optional: true }), // future nested categories (if ever used)

    sortOrder: column.number({ optional: true }),
    isArchived: column.boolean({ default: false }),

    createdAt: column.date({ default: NOW }),
    updatedAt: column.date({ default: NOW }),
  },
});

export const Transactions = defineTable({
  columns: {
    id: column.text({ primaryKey: true }),
    userId: column.text(),

    accountId: column.text({
      references: () => Accounts.columns.id,
      optional: true,
    }),
    categoryId: column.text({
      references: () => Categories.columns.id,
      optional: true,
    }),

    type: column.text(),                           // "expense", "income", "transfer"
    amount: column.number(),                       // positive number
    currency: column.text({ optional: true }),     // override if needed

    transactionDate: column.date({ default: NOW }),
    description: column.text({ optional: true }),

    // Optional fields for transfers
    transferAccountId: column.text({ optional: true }), // other side of transfer

    createdAt: column.date({ default: NOW }),
    updatedAt: column.date({ default: NOW }),
  },
});

export const tables = {
  Accounts,
  Categories,
  Transactions,
} as const;
