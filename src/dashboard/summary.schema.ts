import { db, eq, Accounts, Transactions } from "astro:db";
import type { EntryType } from "../modules/expense-tracker/types";

export type ExpenseTrackerSummaryV1 = {
  appId: "expense-tracker";
  version: 1;
  updatedAt: string;
  totalIncome: number;
  totalExpense: number;
  totalStartingBalance: number;
  netFlow: number;
  currentBalance: number;
  recentTransactionCount: number;
  currencyCode: string | null;
  currencyMode: "unset" | "single" | "mixed";
};

export const buildExpenseTrackerSummary = async (userId: string): Promise<ExpenseTrackerSummaryV1> => {
  const [accounts, rows] = await Promise.all([
    db
      .select({ currency: Accounts.currency, startingBalance: Accounts.startingBalance })
      .from(Accounts)
      .where(eq(Accounts.userId, userId)),
    db
      .select({ type: Transactions.type, amount: Transactions.amount, currency: Transactions.currency })
      .from(Transactions)
      .where(eq(Transactions.userId, userId)),
  ]);

  let totalIncome = 0;
  let totalExpense = 0;
  let totalStartingBalance = 0;

  const currencies = new Set<string>();

  for (const account of accounts) {
    totalStartingBalance += Number(account.startingBalance ?? 0);

    const currency = String(account.currency ?? "").trim().toUpperCase();
    if (currency) {
      currencies.add(currency);
    }
  }

  for (const row of rows) {
    const type = String(row.type ?? "") as EntryType;
    const amount = Number(row.amount ?? 0);
    const currency = String(row.currency ?? "").trim().toUpperCase();

    if (currency) {
      currencies.add(currency);
    }

    if (type === "income") totalIncome += amount;
    if (type === "expense") totalExpense += amount;
  }

  const netFlow = totalIncome - totalExpense;
  const currencyMode = currencies.size > 1 ? "mixed" : currencies.size === 1 ? "single" : "unset";
  const [currencyCode] = [...currencies];

  return {
    appId: "expense-tracker",
    version: 1,
    updatedAt: new Date().toISOString(),
    totalIncome,
    totalExpense,
    totalStartingBalance,
    netFlow,
    currentBalance: totalStartingBalance + netFlow,
    recentTransactionCount: rows.length,
    currencyCode: currencyMode === "single" ? currencyCode : null,
    currencyMode,
  };
};
