import { db, eq, Transactions } from "astro:db";
import type { EntryType } from "../modules/expense-tracker/types";

export type ExpenseTrackerSummaryV1 = {
  appId: "expense-tracker";
  version: 1;
  updatedAt: string;
  totalIncome: number;
  totalExpense: number;
  balance: number;
  recentTransactionCount: number;
};

export const buildExpenseTrackerSummary = async (userId: string): Promise<ExpenseTrackerSummaryV1> => {
  const rows = await db
    .select({ type: Transactions.type, amount: Transactions.amount })
    .from(Transactions)
    .where(eq(Transactions.userId, userId));

  let totalIncome = 0;
  let totalExpense = 0;

  for (const row of rows) {
    const type = String(row.type ?? "") as EntryType;
    const amount = Number(row.amount ?? 0);

    if (type === "income") totalIncome += amount;
    if (type === "expense") totalExpense += amount;
  }

  return {
    appId: "expense-tracker",
    version: 1,
    updatedAt: new Date().toISOString(),
    totalIncome,
    totalExpense,
    balance: totalIncome - totalExpense,
    recentTransactionCount: rows.length,
  };
};
