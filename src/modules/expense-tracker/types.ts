export type EntryType = "expense" | "income" | "transfer";

export type AccountDTO = {
  id: string;
  userId: string;
  name: string;
  type?: string | null;
  currency?: string | null;
  startingBalance?: number | null;
  isArchived: boolean;
  createdAt?: string | Date;
  updatedAt?: string | Date;
};

export type CategoryDTO = {
  id: string;
  userId: string;
  name: string;
  type?: EntryType | null;
  icon?: string | null;
  parentCategoryId?: string | null;
  sortOrder?: number | null;
  isArchived: boolean;
  createdAt?: string | Date;
  updatedAt?: string | Date;
};

export type TransactionDTO = {
  id: string;
  userId: string;
  accountId?: string | null;
  categoryId?: string | null;
  type: EntryType;
  amount: number;
  currency?: string | null;
  transactionDate?: string | Date;
  description?: string | null;
  transferAccountId?: string | null;
  createdAt?: string | Date;
  updatedAt?: string | Date;
};

export type AccountForm = {
  name: string;
  type: string;
  currency: string;
  startingBalance: string;
};

export type CategoryForm = {
  name: string;
  type: EntryType;
};

export type TransactionForm = {
  accountId: string;
  categoryId: string;
  type: EntryType;
  amount: string;
  currency: string;
  transactionDate: string;
  description: string;
};
