import type { Alpine } from "alpinejs";
import { actions } from "astro:actions";
import { AvBaseStore } from "@ansiversa/components/alpine";
import type {
  AccountDTO,
  AccountForm,
  CategoryDTO,
  CategoryForm,
  EntryType,
  TransactionDTO,
  TransactionForm,
} from "./types";

const toIsoDate = (value?: string | Date | null) => {
  if (!value) return new Date().toISOString().slice(0, 10);
  if (typeof value === "string") return value.slice(0, 10);
  return value.toISOString().slice(0, 10);
};

const defaultAccountForm = (): AccountForm => ({
  name: "",
  type: "",
  currency: "",
  startingBalance: "",
});

const defaultCategoryForm = (): CategoryForm => ({
  name: "",
  type: "expense",
});

const defaultTransactionForm = (): TransactionForm => ({
  accountId: "",
  categoryId: "",
  transferAccountId: "",
  type: "expense",
  amount: "",
  currency: "",
  transactionDate: new Date().toISOString().slice(0, 10),
  description: "",
});

const toDateOrNow = (value: string) => {
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? new Date() : parsed;
};

const getTransactionTime = (transaction: TransactionDTO) => {
  const rawDate = transaction.transactionDate ?? transaction.createdAt ?? null;
  if (!rawDate) return 0;
  const parsed = new Date(rawDate).getTime();
  return Number.isNaN(parsed) ? 0 : parsed;
};

const formatMonthKey = (value: string | Date | undefined) => {
  const parsed = value ? new Date(value) : new Date();
  const normalized = Number.isNaN(parsed.getTime()) ? new Date() : parsed;
  const year = normalized.getFullYear();
  const month = String(normalized.getMonth() + 1).padStart(2, "0");
  return `${year}-${month}`;
};

type PeriodPreset = "all-time" | "this-month" | "last-month" | "this-year" | "last-30-days";
type InsightTone = "info" | "watch" | "positive";

type FinancialInsight = {
  id: string;
  tone: InsightTone;
  text: string;
};

type QuickEntryType = "expense" | "income";

type TransactionPreset = Partial<{
  accountId: string;
  categoryId: string;
  transferAccountId: string;
  type: EntryType;
  amount: string;
  currency: string;
  transactionDate: string;
  description: string;
}>;

const getSafeTransactionDate = (transaction: TransactionDTO) => {
  const rawDate = transaction.transactionDate ?? transaction.createdAt;
  const parsed = rawDate ? new Date(rawDate) : new Date();
  return Number.isNaN(parsed.getTime()) ? new Date() : parsed;
};

const startOfDay = (date: Date) => {
  const next = new Date(date);
  next.setHours(0, 0, 0, 0);
  return next;
};

const endOfDay = (date: Date) => {
  const next = new Date(date);
  next.setHours(23, 59, 59, 999);
  return next;
};

export class ExpenseTrackerStore extends AvBaseStore {
  accounts: AccountDTO[] = [];
  categories: CategoryDTO[] = [];
  transactions: TransactionDTO[] = [];

  accountForm: AccountForm = defaultAccountForm();
  categoryForm: CategoryForm = defaultCategoryForm();
  transactionForm: TransactionForm = defaultTransactionForm();

  editingTransactionId: string | null = null;
  loading = false;
  error: string | null = null;
  success: string | null = null;
  selectedPeriodPreset: PeriodPreset = "all-time";
  customStartDate = "";
  customEndDate = "";
  customAppliedStartDate = "";
  customAppliedEndDate = "";
  dateFilterError: string | null = null;
  quickEntryType: QuickEntryType | null = null;
  quickEntryLabel: string | null = null;

  init(initial?: {
    accounts?: AccountDTO[];
    categories?: CategoryDTO[];
    transactions?: TransactionDTO[];
  }) {
    this.accounts = initial?.accounts ?? [];
    this.categories = initial?.categories ?? [];
    this.transactions = initial?.transactions ?? [];
    this.accountForm.currency = this.effectiveCurrencyCode;
  }

  get visibleAccounts() {
    return this.accounts.filter((account) => !account.isArchived);
  }

  get visibleCategories() {
    return this.categories.filter((category) => !category.isArchived);
  }

  private categoriesForType(type: EntryType) {
    if (type === "transfer") {
      return [];
    }

    return this.visibleCategories.filter((category) => category.type === type);
  }

  get transactionSelectableCategories() {
    const baseCategories = this.categoriesForType(this.transactionForm.type);
    const selectedCategoryId = this.transactionForm.categoryId;

    if (!selectedCategoryId) {
      return baseCategories;
    }

    const selectedCategory = this.categories.find((category) => category.id === selectedCategoryId);
    if (!selectedCategory) {
      return baseCategories;
    }

    const shouldPreserveSelectedCategory =
      selectedCategory.type === this.transactionForm.type
      && !baseCategories.some((category) => category.id === selectedCategory.id);

    return shouldPreserveSelectedCategory
      ? [selectedCategory, ...baseCategories]
      : baseCategories;
  }

  get totalIncome() {
    return this.transactions
      .filter((transaction) => transaction.type === "income")
      .reduce((sum, transaction) => sum + Number(transaction.amount || 0), 0);
  }

  get totalStartingBalance() {
    return this.accounts.reduce((sum, account) => sum + Number(account.startingBalance || 0), 0);
  }

  private collectCurrencies() {
    const currencies = new Set<string>();

    this.accounts.forEach((account) => {
      const currency = String(account.currency ?? "").trim().toUpperCase();
      if (currency) {
        currencies.add(currency);
      }
    });

    this.transactions.forEach((transaction) => {
      const currency = String(transaction.currency ?? "").trim().toUpperCase();
      if (currency) {
        currencies.add(currency);
      }
    });

    return currencies;
  }

  get effectiveCurrencyCode() {
    const currencies = this.collectCurrencies();
    if (currencies.size !== 1) {
      return "";
    }

    return [...currencies][0];
  }

  get hasMixedCurrencies() {
    return this.collectCurrencies().size > 1;
  }

  get supportsTrustedTotals() {
    return !this.hasMixedCurrencies;
  }

  get currentBalance() {
    return this.totalStartingBalance + this.totalIncome - this.totalExpense;
  }

  get currencyStatusMessage() {
    if (this.hasMixedCurrencies) {
      return "Mixed currencies detected. Expense Tracker V1 only supports trusted totals when one currency is used across the app.";
    }

    if (this.effectiveCurrencyCode) {
      return `V1 app currency: ${this.effectiveCurrencyCode}`;
    }

    return "Set one currency on your first account or transaction to lock the app into a single-currency V1 flow.";
  }

  formatMoney(value: number | null | undefined) {
    if (value == null || this.hasMixedCurrencies) {
      return "Unavailable";
    }

    if (!this.effectiveCurrencyCode) {
      return Number(value || 0).toFixed(2);
    }

    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: this.effectiveCurrencyCode,
      minimumFractionDigits: 2,
    }).format(Number(value || 0));
  }

  formatCurrencyAmount(value: number | null | undefined, currency?: string | null) {
    const normalizedCurrency = String(currency ?? "").trim().toUpperCase();
    const amount = Number(value || 0);

    if (!normalizedCurrency) {
      return this.formatMoney(amount);
    }

    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: normalizedCurrency,
      minimumFractionDigits: 2,
    }).format(amount);
  }

  getTransactionCurrency(transaction: TransactionDTO) {
    const directCurrency = String(transaction.currency ?? "").trim().toUpperCase();
    if (directCurrency) return directCurrency;

    const accountCurrency = String(
      this.accounts.find((account) => account.id === transaction.accountId)?.currency ?? "",
    ).trim().toUpperCase();
    if (accountCurrency) return accountCurrency;

    return this.effectiveCurrencyCode;
  }

  formatTransactionAmount(transaction: TransactionDTO) {
    return this.formatCurrencyAmount(Number(transaction.amount || 0), this.getTransactionCurrency(transaction));
  }

  get periodLabel() {
    if (this.customAppliedStartDate && this.customAppliedEndDate) {
      return `${this.customAppliedStartDate} to ${this.customAppliedEndDate}`;
    }

    const labels: Record<PeriodPreset, string> = {
      "all-time": "All time",
      "this-month": "This month",
      "last-month": "Last month",
      "this-year": "This year",
      "last-30-days": "Last 30 days",
    };

    return labels[this.selectedPeriodPreset];
  }

  get activeDateRange() {
    if (this.customAppliedStartDate && this.customAppliedEndDate) {
      const start = new Date(this.customAppliedStartDate);
      const end = new Date(this.customAppliedEndDate);

      if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) {
        return null;
      }

      return {
        start: startOfDay(start),
        end: endOfDay(end),
      };
    }

    const now = new Date();
    if (this.selectedPeriodPreset === "all-time") return null;

    if (this.selectedPeriodPreset === "this-month") {
      return {
        start: new Date(now.getFullYear(), now.getMonth(), 1),
        end: endOfDay(new Date(now)),
      };
    }

    if (this.selectedPeriodPreset === "last-month") {
      return {
        start: new Date(now.getFullYear(), now.getMonth() - 1, 1),
        end: endOfDay(new Date(now.getFullYear(), now.getMonth(), 0)),
      };
    }

    if (this.selectedPeriodPreset === "this-year") {
      return {
        start: new Date(now.getFullYear(), 0, 1),
        end: endOfDay(new Date(now)),
      };
    }

    return {
      start: startOfDay(new Date(now.getFullYear(), now.getMonth(), now.getDate() - 29)),
      end: endOfDay(now),
    };
  }

  get filteredTransactions() {
    const range = this.activeDateRange;
    if (!range) return this.sortedTransactions;

    return this.sortedTransactions.filter((transaction) => {
      const date = getSafeTransactionDate(transaction);
      return date >= range.start && date <= range.end;
    });
  }

  get filteredSummary() {
    if (!this.supportsTrustedTotals) {
      return {
        income: null,
        expense: null,
        netFlow: null,
        count: this.filteredTransactions.length,
      };
    }

    const income = this.filteredTransactions
      .filter((transaction) => transaction.type === "income")
      .reduce((sum, transaction) => sum + Number(transaction.amount || 0), 0);

    const expense = this.filteredTransactions
      .filter((transaction) => transaction.type === "expense")
      .reduce((sum, transaction) => sum + Number(transaction.amount || 0), 0);

    return {
      income,
      expense,
      netFlow: income - expense,
      count: this.filteredTransactions.length,
    };
  }

  get filteredExpenseByCategory() {
    if (!this.supportsTrustedTotals) {
      return [];
    }

    const categoryMap = new Map(this.categories.map((category) => [category.id, category.name]));
    const grouped = new Map<string, { categoryName: string; total: number; count: number }>();

    this.filteredTransactions
      .filter((transaction) => transaction.type === "expense")
      .forEach((transaction) => {
        const key = transaction.categoryId || "uncategorized";
        const current = grouped.get(key) ?? {
          categoryName: categoryMap.get(transaction.categoryId || "") || "Uncategorized",
          total: 0,
          count: 0,
        };

        current.total += Number(transaction.amount || 0);
        current.count += 1;
        grouped.set(key, current);
      });

    return [...grouped.values()].sort((a, b) => b.total - a.total);
  }

  get filteredTopExpenseCategory() {
    return this.filteredExpenseByCategory[0] ?? null;
  }

  get filteredMonthlyTransactionGroups() {
    const groups = new Map<string, { label: string; transactions: TransactionDTO[]; sortValue: number }>();

    this.filteredTransactions.forEach((transaction) => {
      const safeDate = getSafeTransactionDate(transaction);
      const key = formatMonthKey(safeDate);
      const label = safeDate.toLocaleDateString("en-US", {
        month: "long",
        year: "numeric",
      });

      const existing = groups.get(key) ?? {
        label,
        transactions: [],
        sortValue: new Date(`${key}-01T00:00:00`).getTime(),
      };

      existing.transactions.push(transaction);
      groups.set(key, existing);
    });

    return [...groups.values()].sort((a, b) => b.sortValue - a.sortValue);
  }

  get filteredLargestRecentExpenses() {
    if (!this.supportsTrustedTotals) {
      return [];
    }

    return this.filteredTransactions
      .filter((transaction) => transaction.type === "expense")
      .slice(0, 20)
      .sort((a, b) => Number(b.amount || 0) - Number(a.amount || 0))
      .slice(0, 3);
  }

  get categoryChartItems() {
    return this.filteredExpenseByCategory.map((item) => ({
      label: item.categoryName,
      value: item.total,
      meta: `${item.count} transactions`,
    }));
  }

  get monthlyTrendItems() {
    if (!this.supportsTrustedTotals) {
      return [];
    }

    const grouped = new Map<string, number>();

    this.filteredTransactions
      .filter((transaction) => transaction.type === "expense")
      .forEach((transaction) => {
        const safeDate = getSafeTransactionDate(transaction);
        const key = formatMonthKey(safeDate);
        const current = grouped.get(key) ?? 0;
        grouped.set(key, current + Number(transaction.amount || 0));
      });

    return [...grouped.entries()]
      .sort((a, b) => a[0].localeCompare(b[0]))
      .map(([key, value]) => {
        const labelDate = new Date(`${key}-01T00:00:00`);
        const label = labelDate.toLocaleDateString("en-US", {
          month: "short",
          year: "2-digit",
        });

        return {
          label,
          value,
        };
      })
      .slice(-8);
  }

  get incomeVsExpenseComparison() {
    return {
      leftLabel: "Income",
      leftValue: this.filteredSummary.income,
      rightLabel: "Expense",
      rightValue: this.filteredSummary.expense,
    };
  }

  get periodExpenseMonthComparison() {
    const points = this.monthlyTrendItems;
    if (points.length < 2) return null;

    const previous = points[points.length - 2];
    const current = points[points.length - 1];
    const difference = current.value - previous.value;

    return {
      current,
      previous,
      difference,
    };
  }

  get smartInsights(): FinancialInsight[] {
    if (this.hasMixedCurrencies) {
      return [
        {
          id: "currency-warning",
          tone: "watch",
          text: "Mixed currencies detected. Standardize records to one currency before trusting totals or insights in V1.",
        },
      ];
    }

    const insights: FinancialInsight[] = [];
    const summary = this.filteredSummary;
    const topCategory = this.filteredTopExpenseCategory;
    const comparison = this.periodExpenseMonthComparison;
    const summaryIncome = summary.income ?? 0;
    const summaryExpense = summary.expense ?? 0;

    if (topCategory) {
      insights.push({
        id: "top-category",
        tone: "info",
        text: `Your top expense category this period is ${topCategory.categoryName}.`,
      });
    }

    if (summaryExpense > 0 || summaryIncome > 0) {
      if ((summary.netFlow ?? 0) < 0) {
        insights.push({
          id: "balance-watch",
          tone: "watch",
          text: "Expenses exceeded income in this period.",
        });
      } else {
        insights.push({
          id: "balance-positive",
          tone: "positive",
          text: "You stayed cash-positive in this period.",
        });
      }
    }

    if (topCategory && summaryExpense > 0) {
      const share = topCategory.total / summaryExpense;
      insights.push({
        id: "spend-concentration",
        tone: share >= 0.55 ? "watch" : "info",
        text:
          share >= 0.55
            ? `${topCategory.categoryName} accounts for ${Math.round(share * 100)}% of this period's spending, which is highly concentrated.`
            : "Your spending is more evenly distributed across categories this period.",
      });
    }

    if (this.filteredLargestRecentExpenses.length > 0) {
      const [first, second] = this.filteredLargestRecentExpenses;
      const firstAmount = Number(first.amount || 0);
      const secondAmount = Number(second?.amount || 0);

      if (firstAmount > 0 && secondAmount >= firstAmount * 0.7) {
        insights.push({
          id: "recent-high-expense-two",
          tone: "watch",
          text: "Recent spending is being driven by two high-value purchases.",
        });
      } else {
        insights.push({
          id: "recent-high-expense-one",
          tone: "info",
          text: `Your largest recent expense was ${first.description || "an uncategorized purchase"}.`,
        });
      }
    }

    if (comparison) {
      if (comparison.difference > 0) {
        insights.push({
          id: "month-over-month-up",
          tone: "watch",
          text: `Expenses increased compared to ${comparison.previous.label}.`,
        });
      } else if (comparison.difference < 0) {
        insights.push({
          id: "month-over-month-down",
          tone: "positive",
          text: `Expenses decreased compared to ${comparison.previous.label}.`,
        });
      } else {
        insights.push({
          id: "month-over-month-flat",
          tone: "info",
          text: `Expenses were flat compared to ${comparison.previous.label}.`,
        });
      }
    }

    return insights.slice(0, 5);
  }

  get quickInsightTake() {
    if (this.hasMixedCurrencies) {
      return "Standardize currencies before relying on aggregated totals.";
    }

    if (this.filteredTransactions.length === 0) {
      return "Add transactions to unlock smart insights.";
    }

    if ((this.filteredSummary.netFlow ?? 0) < 0) {
      return "This period is expense-heavy.";
    }

    const comparison = this.periodExpenseMonthComparison;
    if (comparison && comparison.difference < 0) {
      return "Spending is trending down versus the previous month.";
    }

    const topCategory = this.filteredTopExpenseCategory;
    const summaryExpense = this.filteredSummary.expense ?? 0;
    if (topCategory && summaryExpense > 0) {
      const share = topCategory.total / summaryExpense;
      if (share >= 0.55) {
        return "One category is dominating your spending.";
      }
    }

    return "Your finances look stable this period.";
  }

  get totalExpense() {
    return this.transactions
      .filter((transaction) => transaction.type === "expense")
      .reduce((sum, transaction) => sum + Number(transaction.amount || 0), 0);
  }

  get balance() {
    return this.currentBalance;
  }

  get sortedTransactions() {
    return [...this.transactions].sort((a, b) => getTransactionTime(b) - getTransactionTime(a));
  }

  get currentMonthSummary() {
    const monthKey = formatMonthKey(new Date());
    const monthTransactions = this.transactions.filter((transaction) =>
      formatMonthKey(transaction.transactionDate ?? transaction.createdAt) === monthKey
    );

    if (!this.supportsTrustedTotals) {
      return {
        income: null,
        expense: null,
        netFlow: null,
        count: monthTransactions.length,
      };
    }

    const income = monthTransactions
      .filter((transaction) => transaction.type === "income")
      .reduce((sum, transaction) => sum + Number(transaction.amount || 0), 0);

    const expense = monthTransactions
      .filter((transaction) => transaction.type === "expense")
      .reduce((sum, transaction) => sum + Number(transaction.amount || 0), 0);

    return {
      income,
      expense,
      netFlow: income - expense,
      count: monthTransactions.length,
    };
  }

  get expenseByCategory() {
    if (!this.supportsTrustedTotals) {
      return [];
    }

    const categoryMap = new Map(this.categories.map((category) => [category.id, category.name]));
    const grouped = new Map<string, { categoryName: string; total: number; count: number }>();

    this.transactions
      .filter((transaction) => transaction.type === "expense")
      .forEach((transaction) => {
        const key = transaction.categoryId || "uncategorized";
        const current = grouped.get(key) ?? {
          categoryName: categoryMap.get(transaction.categoryId || "") || "Uncategorized",
          total: 0,
          count: 0,
        };

        current.total += Number(transaction.amount || 0);
        current.count += 1;
        grouped.set(key, current);
      });

    return [...grouped.values()].sort((a, b) => b.total - a.total);
  }

  get topExpenseCategory() {
    return this.expenseByCategory[0] ?? null;
  }

  get monthlyTransactionGroups() {
    const groups = new Map<string, { label: string; transactions: TransactionDTO[]; sortValue: number }>();

    this.sortedTransactions.forEach((transaction) => {
      const rawDate = transaction.transactionDate ?? transaction.createdAt;
      const parsedDate = rawDate ? new Date(rawDate) : new Date();
      const safeDate = Number.isNaN(parsedDate.getTime()) ? new Date() : parsedDate;
      const key = formatMonthKey(safeDate);
      const label = safeDate.toLocaleDateString("en-US", {
        month: "long",
        year: "numeric",
      });

      const existing = groups.get(key) ?? {
        label,
        transactions: [],
        sortValue: new Date(`${key}-01T00:00:00`).getTime(),
      };

      existing.transactions.push(transaction);
      groups.set(key, existing);
    });

    return [...groups.values()].sort((a, b) => b.sortValue - a.sortValue);
  }

  get largestRecentExpenses() {
    return this.sortedTransactions
      .filter((transaction) => transaction.type === "expense")
      .slice(0, 20)
      .sort((a, b) => Number(b.amount || 0) - Number(a.amount || 0))
      .slice(0, 3);
  }

  get lastExpenseTransaction() {
    return this.sortedTransactions.find((transaction) => transaction.type === "expense") ?? null;
  }

  get lastIncomeTransaction() {
    return this.sortedTransactions.find((transaction) => transaction.type === "income") ?? null;
  }

  get recentReusableTransactions() {
    return this.sortedTransactions
      .filter((transaction) => transaction.type === "expense" || transaction.type === "income")
      .slice(0, 5);
  }

  private prependOrReplaceAccount(nextAccount: AccountDTO) {
    const remainingAccounts = this.accounts.filter((account) => account.id !== nextAccount.id);
    this.accounts = [nextAccount, ...remainingAccounts];
  }

  private lastUsedCategoryIdByType(type: QuickEntryType) {
    const match = this.sortedTransactions.find((transaction) =>
      transaction.type === type
      && Boolean(transaction.categoryId)
      && this.visibleCategories.some((category) => category.id === transaction.categoryId)
    );
    return match?.categoryId ?? "";
  }

  private commonCategoryIdsByType(type: QuickEntryType) {
    const counts = new Map<string, number>();

    this.sortedTransactions
      .filter((transaction) => transaction.type === type && Boolean(transaction.categoryId))
      .slice(0, 30)
      .forEach((transaction) => {
        const key = transaction.categoryId || "";
        if (!key) return;
        const current = counts.get(key) ?? 0;
        counts.set(key, current + 1);
      });

    return [...counts.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, 4)
      .map(([categoryId]) => categoryId);
  }

  get quickEntryCommonCategories() {
    if (!this.quickEntryType) return [];

    const preferredIds = this.commonCategoryIdsByType(this.quickEntryType);
    return preferredIds
      .map((categoryId) => this.visibleCategories.find((category) => category.id === categoryId))
      .filter((category): category is CategoryDTO => Boolean(category));
  }

  private applyTransactionPreset(preset?: TransactionPreset) {
    this.transactionForm = {
      ...defaultTransactionForm(),
      ...preset,
      currency: preset?.currency || this.effectiveCurrencyCode,
      transactionDate: preset?.transactionDate || new Date().toISOString().slice(0, 10),
    };
  }

  setTransactionType(type: EntryType) {
    this.transactionForm.type = type;

    if (type === "transfer") {
      this.transactionForm.categoryId = "";
      return;
    }

    this.transactionForm.transferAccountId = "";

    const stillValidCategory = this.transactionSelectableCategories.some(
      (category) => category.id === this.transactionForm.categoryId,
    );
    if (!stillValidCategory) {
      this.transactionForm.categoryId = "";
    }
  }

  setPeriodPreset(period: PeriodPreset) {
    this.selectedPeriodPreset = period;
    this.customStartDate = "";
    this.customEndDate = "";
    this.customAppliedStartDate = "";
    this.customAppliedEndDate = "";
    this.dateFilterError = null;
  }

  applyCustomDateRange() {
    this.dateFilterError = null;

    if (!this.customStartDate || !this.customEndDate) {
      this.dateFilterError = "Please select both a start date and end date.";
      return;
    }

    const start = new Date(this.customStartDate);
    const end = new Date(this.customEndDate);
    if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) {
      this.dateFilterError = "Please enter valid dates for the selected range.";
      return;
    }

    if (start > end) {
      this.dateFilterError = "Start date must be before or equal to end date.";
      return;
    }

    this.customAppliedStartDate = this.customStartDate;
    this.customAppliedEndDate = this.customEndDate;
  }

  clearDateFilters() {
    this.setPeriodPreset("all-time");
  }

  private unwrapResult<T = any>(result: any): T {
    if (result?.error) {
      const message = result.error?.message || result.error;
      throw new Error(message || "Request failed.");
    }
    return (result?.data ?? result) as T;
  }

  private resetMessages() {
    this.error = null;
    this.success = null;
  }

  private emitDrawerEvent(name: "expense-drawer-open" | "expense-drawer-close", detail?: Record<string, unknown>) {
    if (typeof window === "undefined") return;
    window.dispatchEvent(new CustomEvent(name, { detail }));
  }

  private validateAccountForm() {
    if (!this.accountForm.name.trim()) return "Account name is required.";
    return null;
  }

  private validateCategoryForm() {
    if (!this.categoryForm.name.trim()) return "Category name is required.";
    return null;
  }

  private validateTransactionForm() {
    if (!this.transactionForm.type) return "Transaction type is required.";
    if (!this.transactionForm.accountId.trim()) return "Account is required.";
    if (!this.transactionForm.amount.trim()) return "Amount is required.";

    const parsedAmount = Number(this.transactionForm.amount);
    if (!Number.isFinite(parsedAmount) || parsedAmount <= 0) {
      return "Amount must be a positive number.";
    }

    if (!this.transactionForm.transactionDate.trim()) {
      return "Transaction date is required.";
    }

    if (this.transactionForm.type === "transfer") {
      if (!this.transactionForm.transferAccountId.trim()) {
        return "Destination account is required for transfers.";
      }

      if (this.transactionForm.transferAccountId === this.transactionForm.accountId) {
        return "Transfer source and destination accounts must be different.";
      }
    }

    return null;
  }

  openCreateTransaction(preset?: TransactionPreset, options?: { quickEntryType?: QuickEntryType; label?: string }) {
    this.editingTransactionId = null;
    this.quickEntryType = options?.quickEntryType ?? null;
    this.quickEntryLabel = options?.label ?? null;
    this.applyTransactionPreset(preset);
    this.resetMessages();
    this.emitDrawerEvent("expense-drawer-open", { key: "createTransaction" });
  }

  openQuickAdd(type: QuickEntryType) {
    const lastUsedCategoryId = this.lastUsedCategoryIdByType(type);
    this.openCreateTransaction(
      {
        type,
        categoryId: lastUsedCategoryId,
        currency: this.effectiveCurrencyCode,
      },
      { quickEntryType: type, label: `Quick add ${type}` },
    );
  }

  repeatLastTransaction(type: QuickEntryType) {
    const source = type === "expense" ? this.lastExpenseTransaction : this.lastIncomeTransaction;
    if (!source) return;

    this.openCreateTransaction(
      {
        accountId: source.accountId ?? "",
        categoryId: source.categoryId ?? "",
        type,
        amount: String(source.amount ?? ""),
        currency: source.currency ?? this.effectiveCurrencyCode,
        transactionDate: new Date().toISOString().slice(0, 10),
        description: source.description ?? "",
      },
      { quickEntryType: type, label: `Repeat last ${type}` },
    );
  }

  reuseTransaction(transaction: TransactionDTO) {
    const quickEntryType = transaction.type === "income" ? "income" : "expense";

    this.openCreateTransaction(
      {
        accountId: transaction.accountId ?? "",
        categoryId: transaction.categoryId ?? "",
        type: transaction.type,
        amount: String(transaction.amount ?? ""),
        currency: transaction.currency ?? this.effectiveCurrencyCode,
        transactionDate: new Date().toISOString().slice(0, 10),
        description: transaction.description ?? "",
        transferAccountId: transaction.transferAccountId ?? "",
      },
      { quickEntryType, label: "Reuse recent transaction" },
    );
  }

  setQuickCategory(categoryId: string) {
    this.transactionForm.categoryId = categoryId;
  }

  openEditTransaction(transaction: TransactionDTO) {
    this.editingTransactionId = transaction.id;
    this.quickEntryType = null;
    this.quickEntryLabel = null;
    this.transactionForm = {
      accountId: transaction.accountId ?? "",
      categoryId: transaction.type === "transfer" ? "" : transaction.categoryId ?? "",
      transferAccountId: transaction.transferAccountId ?? "",
      type: transaction.type,
      amount: String(transaction.amount ?? ""),
      currency: transaction.currency ?? this.effectiveCurrencyCode,
      transactionDate: toIsoDate(transaction.transactionDate),
      description: transaction.description ?? "",
    };
    this.resetMessages();
    this.emitDrawerEvent("expense-drawer-open", { key: "editTransaction" });
  }

  closeDrawer() {
    this.editingTransactionId = null;
    this.quickEntryType = null;
    this.quickEntryLabel = null;
    this.transactionForm = defaultTransactionForm();
    this.emitDrawerEvent("expense-drawer-close");
  }

  async createAccount() {
    const validationError = this.validateAccountForm();
    if (validationError) {
      this.error = validationError;
      return;
    }
    if (this.loading) return;

    this.loading = true;
    this.resetMessages();

    try {
      const res = await actions.createAccount({
        name: this.accountForm.name,
        type: this.accountForm.type || undefined,
        currency: this.accountForm.currency || this.effectiveCurrencyCode || undefined,
        startingBalance: this.accountForm.startingBalance
          ? Number(this.accountForm.startingBalance)
          : undefined,
      });
      const data = this.unwrapResult<{ account: AccountDTO }>(res);
      if (data?.account) {
        this.prependOrReplaceAccount(data.account);
      }
      this.accountForm = defaultAccountForm();
      this.accountForm.currency = this.effectiveCurrencyCode;
      this.success = "Account created.";
    } catch (err: any) {
      this.error = err?.message || "Unable to create account.";
    } finally {
      this.loading = false;
    }
  }

  async createCategory() {
    const validationError = this.validateCategoryForm();
    if (validationError) {
      this.error = validationError;
      return;
    }
    if (this.loading) return;

    this.loading = true;
    this.resetMessages();

    try {
      const res = await actions.createCategory({
        name: this.categoryForm.name,
        type: this.categoryForm.type,
      });
      const data = this.unwrapResult<{ category: CategoryDTO }>(res);
      if (data?.category) {
        this.categories = [data.category, ...this.categories];
      }
      this.categoryForm = defaultCategoryForm();
      this.success = "Category created.";
    } catch (err: any) {
      this.error = err?.message || "Unable to create category.";
    } finally {
      this.loading = false;
    }
  }

  private transactionPayload() {
    return {
      accountId: this.transactionForm.accountId || undefined,
      categoryId: this.transactionForm.categoryId || undefined,
      transferAccountId:
        this.transactionForm.type === "transfer"
          ? this.transactionForm.transferAccountId || undefined
          : undefined,
      type: this.transactionForm.type,
      amount: Number(this.transactionForm.amount),
      currency: this.transactionForm.currency || this.effectiveCurrencyCode || undefined,
      transactionDate: toDateOrNow(this.transactionForm.transactionDate),
      description: this.transactionForm.description || undefined,
    };
  }

  async submitCreateTransaction() {
    const validationError = this.validateTransactionForm();
    if (validationError) {
      this.error = validationError;
      return;
    }
    if (this.loading) return;

    this.loading = true;
    this.resetMessages();

    try {
      const res = await actions.createTransaction(this.transactionPayload());
      const data = this.unwrapResult<{ transaction: TransactionDTO }>(res);
      if (data?.transaction) {
        this.transactions = [data.transaction, ...this.transactions];
      }
      this.success = "Transaction created.";
      this.closeDrawer();
    } catch (err: any) {
      this.error = err?.message || "Unable to create transaction.";
    } finally {
      this.loading = false;
    }
  }

  async submitUpdateTransaction() {
    if (!this.editingTransactionId) return;

    const validationError = this.validateTransactionForm();
    if (validationError) {
      this.error = validationError;
      return;
    }
    if (this.loading) return;

    this.loading = true;
    this.resetMessages();

    try {
      const res = await actions.updateTransaction({
        id: this.editingTransactionId,
        ...this.transactionPayload(),
      });

      const data = this.unwrapResult<{ transaction: TransactionDTO }>(res);
      if (data?.transaction) {
        this.transactions = this.transactions.map((transaction) =>
          transaction.id === data.transaction.id ? data.transaction : transaction,
        );
      }
      this.success = "Transaction updated.";
      this.closeDrawer();
    } catch (err: any) {
      this.error = err?.message || "Unable to update transaction.";
    } finally {
      this.loading = false;
    }
  }

  async deleteTransaction(id: string) {
    if (!id || this.loading) return;

    const approved = typeof window !== "undefined"
      ? window.confirm("Delete this transaction?")
      : true;

    if (!approved) return;

    this.loading = true;
    this.resetMessages();

    try {
      const res = await actions.deleteTransaction({ id });
      this.unwrapResult(res);
      this.transactions = this.transactions.filter((transaction) => transaction.id !== id);
      this.success = "Transaction deleted.";
    } catch (err: any) {
      this.error = err?.message || "Unable to delete transaction.";
    } finally {
      this.loading = false;
    }
  }

  async quickUpdateType(id: string, type: "expense" | "income") {
    const existing = this.transactions.find((transaction) => transaction.id === id);
    if (!existing || this.loading || existing.type === type) return;

    const nextCategoryId = this.visibleCategories.some(
      (category) => category.id === existing.categoryId && category.type === type,
    )
      ? existing.categoryId ?? undefined
      : undefined;

    this.loading = true;
    this.resetMessages();

    try {
      const res = await actions.updateTransaction({
        id,
        accountId: existing.accountId ?? undefined,
        categoryId: nextCategoryId,
        type,
        amount: Number(existing.amount),
        currency: existing.currency ?? (this.effectiveCurrencyCode || undefined),
        transactionDate: toDateOrNow(toIsoDate(existing.transactionDate)),
        description: existing.description ?? undefined,
      });
      const data = this.unwrapResult<{ transaction: TransactionDTO }>(res);
      if (data?.transaction) {
        this.transactions = this.transactions.map((transaction) =>
          transaction.id === data.transaction.id ? data.transaction : transaction,
        );
      }
      this.success = "Transaction type updated.";
    } catch (err: any) {
      this.error = err?.message || "Unable to update type.";
    } finally {
      this.loading = false;
    }
  }
}

export const registerExpenseTrackerStore = (Alpine: Alpine) => {
  Alpine.store("expenseTracker", new ExpenseTrackerStore());
};
