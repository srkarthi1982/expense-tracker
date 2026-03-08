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

  init(initial?: {
    accounts?: AccountDTO[];
    categories?: CategoryDTO[];
    transactions?: TransactionDTO[];
  }) {
    this.accounts = initial?.accounts ?? [];
    this.categories = initial?.categories ?? [];
    this.transactions = initial?.transactions ?? [];
  }

  get totalIncome() {
    return this.transactions
      .filter((transaction) => transaction.type === "income")
      .reduce((sum, transaction) => sum + Number(transaction.amount || 0), 0);
  }

  get totalExpense() {
    return this.transactions
      .filter((transaction) => transaction.type === "expense")
      .reduce((sum, transaction) => sum + Number(transaction.amount || 0), 0);
  }

  get balance() {
    return this.totalIncome - this.totalExpense;
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
    if (!this.transactionForm.amount.trim()) return "Amount is required.";

    const parsedAmount = Number(this.transactionForm.amount);
    if (!Number.isFinite(parsedAmount) || parsedAmount <= 0) {
      return "Amount must be a positive number.";
    }

    if (!this.transactionForm.transactionDate.trim()) {
      return "Transaction date is required.";
    }

    return null;
  }

  openCreateTransaction() {
    this.editingTransactionId = null;
    this.transactionForm = defaultTransactionForm();
    this.resetMessages();
    this.emitDrawerEvent("expense-drawer-open", { key: "createTransaction" });
  }

  openEditTransaction(transaction: TransactionDTO) {
    this.editingTransactionId = transaction.id;
    this.transactionForm = {
      accountId: transaction.accountId ?? "",
      categoryId: transaction.categoryId ?? "",
      type: transaction.type,
      amount: String(transaction.amount ?? ""),
      currency: transaction.currency ?? "",
      transactionDate: toIsoDate(transaction.transactionDate),
      description: transaction.description ?? "",
    };
    this.resetMessages();
    this.emitDrawerEvent("expense-drawer-open", { key: "editTransaction" });
  }

  closeDrawer() {
    this.editingTransactionId = null;
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
        currency: this.accountForm.currency || undefined,
        startingBalance: this.accountForm.startingBalance
          ? Number(this.accountForm.startingBalance)
          : undefined,
      });
      const data = this.unwrapResult<{ account: AccountDTO }>(res);
      if (data?.account) {
        this.accounts = [data.account, ...this.accounts];
      }
      this.accountForm = defaultAccountForm();
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
      type: this.transactionForm.type,
      amount: Number(this.transactionForm.amount),
      currency: this.transactionForm.currency || undefined,
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

  async quickUpdateType(id: string, type: EntryType) {
    const existing = this.transactions.find((transaction) => transaction.id === id);
    if (!existing || this.loading || existing.type === type) return;

    this.loading = true;
    this.resetMessages();

    try {
      const res = await actions.updateTransaction({
        id,
        accountId: existing.accountId ?? undefined,
        categoryId: existing.categoryId ?? undefined,
        type,
        amount: Number(existing.amount),
        currency: existing.currency ?? undefined,
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
