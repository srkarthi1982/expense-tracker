import type { ActionAPIContext } from "astro:actions";
import { ActionError, defineAction } from "astro:actions";
import { z } from "astro:schema";
import { db, eq, and, Accounts, Categories, Transactions } from "astro:db";
import type { EntryType } from "../modules/expense-tracker/types";

function requireUser(context: ActionAPIContext) {
  const locals = context.locals as App.Locals | undefined;
  const user = locals?.user;

  if (!user) {
    throw new ActionError({
      code: "UNAUTHORIZED",
      message: "You must be signed in to perform this action.",
    });
  }

  return user;
}

async function getAccountForUser(id: string, userId: string) {
  const [account] = await db
    .select()
    .from(Accounts)
    .where(and(eq(Accounts.id, id), eq(Accounts.userId, userId)));

  return account ?? null;
}

async function getCategoryForUser(id: string, userId: string) {
  const [category] = await db
    .select()
    .from(Categories)
    .where(and(eq(Categories.id, id), eq(Categories.userId, userId)));

  return category ?? null;
}

async function getTransactionForUser(id: string, userId: string) {
  const [transaction] = await db
    .select()
    .from(Transactions)
    .where(and(eq(Transactions.id, id), eq(Transactions.userId, userId)));

  return transaction ?? null;
}

async function requireAccountForUser(id: string, userId: string) {
  const account = await getAccountForUser(id, userId);

  if (!account) {
    throw new ActionError({
      code: "NOT_FOUND",
      message: "Account not found.",
    });
  }

  return account;
}

async function requireCategoryForUser(id: string, userId: string) {
  const category = await getCategoryForUser(id, userId);

  if (!category) {
    throw new ActionError({
      code: "NOT_FOUND",
      message: "Category not found.",
    });
  }

  return category;
}

async function validateParentCategoryForUser(
  userId: string,
  parentCategoryId: string | undefined,
  options?: { currentCategoryId?: string },
) {
  const normalizedParentCategoryId = normalizeOptionalText(parentCategoryId);
  if (!normalizedParentCategoryId) {
    return undefined;
  }

  if (options?.currentCategoryId && normalizedParentCategoryId === options.currentCategoryId) {
    throw new ActionError({
      code: "BAD_REQUEST",
      message: "A category cannot be its own parent.",
    });
  }

  const parentCategory = await getCategoryForUser(normalizedParentCategoryId, userId);
  if (!parentCategory) {
    throw new ActionError({
      code: "BAD_REQUEST",
      message: "Selected parent category is invalid for this user.",
    });
  }

  return normalizedParentCategoryId;
}

async function requireTransactionForUser(id: string, userId: string) {
  const transaction = await getTransactionForUser(id, userId);

  if (!transaction) {
    throw new ActionError({
      code: "NOT_FOUND",
      message: "Transaction not found.",
    });
  }

  return transaction;
}

function normalizeOptionalText(value?: string | null) {
  const normalized = value?.trim();
  return normalized ? normalized : undefined;
}

function normalizeCurrencyCode(value?: string | null) {
  const normalized = normalizeOptionalText(value);
  return normalized ? normalized.toUpperCase() : undefined;
}

function validateSingleCurrency(expectedCurrency: string | null, inputCurrency: string | undefined, scope: string) {
  if (!expectedCurrency || !inputCurrency) {
    return;
  }

  if (expectedCurrency !== inputCurrency) {
    throw new ActionError({
      code: "BAD_REQUEST",
      message: `${scope} must use ${expectedCurrency}. Expense Tracker V1 supports a single currency per user.`,
    });
  }
}

async function getUserCurrencyState(userId: string) {
  const [accounts, transactions] = await Promise.all([
    db.select({ currency: Accounts.currency }).from(Accounts).where(eq(Accounts.userId, userId)),
    db.select({ currency: Transactions.currency }).from(Transactions).where(eq(Transactions.userId, userId)),
  ]);

  const currencies = new Set(
    [...accounts, ...transactions]
      .map((row) => normalizeCurrencyCode(row.currency))
      .filter((currency): currency is string => Boolean(currency)),
  );

  if (currencies.size > 1) {
    throw new ActionError({
      code: "BAD_REQUEST",
      message:
        "Mixed currencies were detected in this account. Expense Tracker V1 only supports one currency for trusted totals.",
    });
  }

  const [effectiveCurrency] = [...currencies];
  return effectiveCurrency ?? null;
}

async function validateTransactionReferencesForUser(
  userId: string,
  input: {
    accountId?: string;
    categoryId?: string;
    transferAccountId?: string;
    type: EntryType;
  },
) {
  const accountId = normalizeOptionalText(input.accountId);
  const categoryId = normalizeOptionalText(input.categoryId);
  const transferAccountId = normalizeOptionalText(input.transferAccountId);

  const [account, category, transferAccount] = await Promise.all([
    accountId ? getAccountForUser(accountId, userId) : Promise.resolve(null),
    categoryId ? getCategoryForUser(categoryId, userId) : Promise.resolve(null),
    transferAccountId ? getAccountForUser(transferAccountId, userId) : Promise.resolve(null),
  ]);

  if (accountId && !account) {
    throw new ActionError({
      code: "BAD_REQUEST",
      message: "Selected account is invalid for this user.",
    });
  }

  if (categoryId && !category) {
    throw new ActionError({
      code: "BAD_REQUEST",
      message: "Selected category is invalid for this user.",
    });
  }

  if (transferAccountId && !transferAccount) {
    throw new ActionError({
      code: "BAD_REQUEST",
      message: "Selected transfer account is invalid for this user.",
    });
  }

  if (input.type === "transfer") {
    if (!accountId || !transferAccountId) {
      throw new ActionError({
        code: "BAD_REQUEST",
        message: "Transfer transactions require both a source account and a destination account.",
      });
    }

    if (accountId === transferAccountId) {
      throw new ActionError({
        code: "BAD_REQUEST",
        message: "Transfer source and destination accounts must be different.",
      });
    }
  }

  if (input.type !== "transfer" && transferAccountId) {
    throw new ActionError({
      code: "BAD_REQUEST",
      message: "Transfer account can only be used with transfer transactions.",
    });
  }

  if (input.type === "transfer" && categoryId) {
    throw new ActionError({
      code: "BAD_REQUEST",
      message: "Transfer transactions cannot use a category in Expense Tracker V1.",
    });
  }

  if ((input.type === "expense" || input.type === "income") && category) {
    if (category.type !== input.type) {
      throw new ActionError({
        code: "BAD_REQUEST",
        message: `${input.type[0].toUpperCase()}${input.type.slice(1)} transactions must use a matching ${input.type} category.`,
      });
    }
  }

  return {
    account,
    category,
    transferAccount,
    accountId,
    categoryId,
    transferAccountId,
  };
}

export const server = {
  createAccount: defineAction({
    input: z.object({
      name: z.string().min(1),
      type: z.string().optional(),
      currency: z.string().optional(),
      startingBalance: z.number().optional(),
    }),
    handler: async (input, context) => {
      const user = requireUser(context);
      const now = new Date();
      const effectiveCurrency = await getUserCurrencyState(user.id);
      const currency = normalizeCurrencyCode(input.currency) ?? effectiveCurrency ?? undefined;

      validateSingleCurrency(effectiveCurrency, currency, "Account currency");

      const account = {
        id: crypto.randomUUID(),
        userId: user.id,
        name: input.name.trim(),
        type: normalizeOptionalText(input.type),
        currency,
        startingBalance: input.startingBalance,
        isArchived: false,
        createdAt: now,
        updatedAt: now,
      };

      await db.insert(Accounts).values(account);
      const createdAccount = await requireAccountForUser(account.id, user.id);

      return { success: true, data: { account: createdAccount } };
    },
  }),

  updateAccount: defineAction({
    input: z.object({
      id: z.string(),
      name: z.string().min(1).optional(),
      type: z.string().optional(),
      currency: z.string().optional(),
      startingBalance: z.number().optional(),
      isArchived: z.boolean().optional(),
    }),
    handler: async (input, context) => {
      const user = requireUser(context);
      const account = await requireAccountForUser(input.id, user.id);

      const now = new Date();
      const effectiveCurrency = await getUserCurrencyState(user.id);
      const nextCurrency = normalizeCurrencyCode(input.currency) ?? account.currency ?? effectiveCurrency ?? undefined;

      validateSingleCurrency(effectiveCurrency, nextCurrency, "Account currency");

      await db
        .update(Accounts)
        .set({
          name: input.name?.trim() ?? account.name,
          type: normalizeOptionalText(input.type) ?? account.type,
          currency: nextCurrency,
          startingBalance: input.startingBalance ?? account.startingBalance,
          isArchived: input.isArchived ?? account.isArchived,
          updatedAt: now,
        })
        .where(and(eq(Accounts.id, input.id), eq(Accounts.userId, user.id)));
      const updatedAccount = await requireAccountForUser(input.id, user.id);

      return { success: true, data: { account: updatedAccount } };
    },
  }),

  archiveAccount: defineAction({
    input: z.object({ id: z.string() }),
    handler: async (input, context) => {
      const user = requireUser(context);
      await requireAccountForUser(input.id, user.id);

      const now = new Date();
      await db
        .update(Accounts)
        .set({ isArchived: true, updatedAt: now })
        .where(and(eq(Accounts.id, input.id), eq(Accounts.userId, user.id)));
      const archivedAccount = await requireAccountForUser(input.id, user.id);

      return { success: true, data: { account: archivedAccount } };
    },
  }),

  listAccounts: defineAction({
    input: z.object({ includeArchived: z.boolean().default(false) }),
    handler: async (input, context) => {
      const user = requireUser(context);

      const accounts = await db
        .select()
        .from(Accounts)
        .where(
          input.includeArchived
            ? eq(Accounts.userId, user.id)
            : and(eq(Accounts.userId, user.id), eq(Accounts.isArchived, false)),
        );

      return {
        success: true,
        data: {
          items: accounts,
          total: accounts.length,
        },
      };
    },
  }),

  createCategory: defineAction({
    input: z.object({
      name: z.string().min(1),
      type: z.enum(["expense", "income", "transfer"]).optional(),
      icon: z.string().optional(),
      parentCategoryId: z.string().optional(),
      sortOrder: z.number().optional(),
    }),
    handler: async (input, context) => {
      const user = requireUser(context);
      const now = new Date();
      const parentCategoryId = await validateParentCategoryForUser(user.id, input.parentCategoryId);

      const category = {
        id: crypto.randomUUID(),
        userId: user.id,
        name: input.name.trim(),
        type: input.type,
        icon: normalizeOptionalText(input.icon),
        parentCategoryId,
        sortOrder: input.sortOrder,
        isArchived: false,
        createdAt: now,
        updatedAt: now,
      };

      await db.insert(Categories).values(category);
      const createdCategory = await requireCategoryForUser(category.id, user.id);

      return { success: true, data: { category: createdCategory } };
    },
  }),

  updateCategory: defineAction({
    input: z.object({
      id: z.string(),
      name: z.string().min(1).optional(),
      type: z.enum(["expense", "income", "transfer"]).optional(),
      icon: z.string().optional(),
      parentCategoryId: z.string().optional(),
      sortOrder: z.number().optional(),
      isArchived: z.boolean().optional(),
    }),
    handler: async (input, context) => {
      const user = requireUser(context);
      const category = await requireCategoryForUser(input.id, user.id);

      const now = new Date();
      const parentCategoryId = await validateParentCategoryForUser(
        user.id,
        input.parentCategoryId ?? category.parentCategoryId ?? undefined,
        { currentCategoryId: input.id },
      );
      await db
        .update(Categories)
        .set({
          name: input.name?.trim() ?? category.name,
          type: input.type ?? category.type,
          icon: normalizeOptionalText(input.icon) ?? category.icon,
          parentCategoryId,
          sortOrder: input.sortOrder ?? category.sortOrder,
          isArchived: input.isArchived ?? category.isArchived,
          updatedAt: now,
        })
        .where(and(eq(Categories.id, input.id), eq(Categories.userId, user.id)));
      const updatedCategory = await requireCategoryForUser(input.id, user.id);

      return { success: true, data: { category: updatedCategory } };
    },
  }),

  archiveCategory: defineAction({
    input: z.object({ id: z.string() }),
    handler: async (input, context) => {
      const user = requireUser(context);
      await requireCategoryForUser(input.id, user.id);

      const now = new Date();
      await db
        .update(Categories)
        .set({ isArchived: true, updatedAt: now })
        .where(and(eq(Categories.id, input.id), eq(Categories.userId, user.id)));
      const archivedCategory = await requireCategoryForUser(input.id, user.id);

      return { success: true, data: { category: archivedCategory } };
    },
  }),

  listCategories: defineAction({
    input: z.object({ includeArchived: z.boolean().default(false) }),
    handler: async (input, context) => {
      const user = requireUser(context);

      const categories = await db
        .select()
        .from(Categories)
        .where(
          input.includeArchived
            ? eq(Categories.userId, user.id)
            : and(eq(Categories.userId, user.id), eq(Categories.isArchived, false)),
        );

      return {
        success: true,
        data: {
          items: categories,
          total: categories.length,
        },
      };
    },
  }),

  createTransaction: defineAction({
    input: z.object({
      accountId: z.string().optional(),
      categoryId: z.string().optional(),
      type: z.enum(["expense", "income", "transfer"]),
      amount: z.number().positive(),
      currency: z.string().optional(),
      transactionDate: z.coerce.date().optional(),
      description: z.string().optional(),
      transferAccountId: z.string().optional(),
    }),
    handler: async (input, context) => {
      const user = requireUser(context);
      const references = await validateTransactionReferencesForUser(user.id, input);
      const now = new Date();
      const effectiveCurrency = await getUserCurrencyState(user.id);
      const transactionCurrency =
        normalizeCurrencyCode(input.currency)
        ?? references.account?.currency
        ?? effectiveCurrency
        ?? undefined;

      validateSingleCurrency(effectiveCurrency, transactionCurrency, "Transaction currency");

      const transaction = {
        id: crypto.randomUUID(),
        userId: user.id,
        accountId: references.accountId,
        categoryId: references.categoryId,
        type: input.type,
        amount: input.amount,
        currency: transactionCurrency,
        transactionDate: input.transactionDate ?? new Date(),
        description: normalizeOptionalText(input.description),
        transferAccountId: references.transferAccountId,
        createdAt: now,
        updatedAt: now,
      };

      await db.insert(Transactions).values(transaction);
      const createdTransaction = await requireTransactionForUser(transaction.id, user.id);

      return { success: true, data: { transaction: createdTransaction } };
    },
  }),

  updateTransaction: defineAction({
    input: z.object({
      id: z.string(),
      accountId: z.string().optional(),
      categoryId: z.string().optional(),
      type: z.enum(["expense", "income", "transfer"]).optional(),
      amount: z.number().positive().optional(),
      currency: z.string().optional(),
      transactionDate: z.coerce.date().optional(),
      description: z.string().optional(),
      transferAccountId: z.string().optional(),
    }),
    handler: async (input, context) => {
      const user = requireUser(context);
      const transaction = await requireTransactionForUser(input.id, user.id);

      const now = new Date();
      const nextType = input.type ?? (String(transaction.type) as EntryType);
      const references = await validateTransactionReferencesForUser(user.id, {
        accountId: input.accountId ?? transaction.accountId ?? undefined,
        categoryId: input.categoryId ?? transaction.categoryId ?? undefined,
        transferAccountId: input.transferAccountId ?? transaction.transferAccountId ?? undefined,
        type: nextType,
      });
      const effectiveCurrency = await getUserCurrencyState(user.id);
      const transactionCurrency =
        normalizeCurrencyCode(input.currency)
        ?? references.account?.currency
        ?? transaction.currency
        ?? effectiveCurrency
        ?? undefined;

      validateSingleCurrency(effectiveCurrency, transactionCurrency, "Transaction currency");

      await db
        .update(Transactions)
        .set({
          accountId: references.accountId,
          categoryId: references.categoryId,
          type: nextType,
          amount: input.amount ?? transaction.amount,
          currency: transactionCurrency,
          transactionDate: input.transactionDate ?? transaction.transactionDate,
          description: normalizeOptionalText(input.description) ?? transaction.description,
          transferAccountId: references.transferAccountId,
          updatedAt: now,
        })
        .where(and(eq(Transactions.id, input.id), eq(Transactions.userId, user.id)));
      const updatedTransaction = await requireTransactionForUser(input.id, user.id);

      return { success: true, data: { transaction: updatedTransaction } };
    },
  }),

  deleteTransaction: defineAction({
    input: z.object({ id: z.string() }),
    handler: async (input, context) => {
      const user = requireUser(context);
      await requireTransactionForUser(input.id, user.id);

      await db
        .delete(Transactions)
        .where(and(eq(Transactions.id, input.id), eq(Transactions.userId, user.id)));

      return { success: true };
    },
  }),

  listTransactions: defineAction({
    input: z.object({
      accountId: z.string().optional(),
      categoryId: z.string().optional(),
      type: z.enum(["expense", "income", "transfer"]).optional(),
      page: z.number().int().positive().default(1),
      pageSize: z.number().int().positive().default(20),
    }),
    handler: async (input, context) => {
      const user = requireUser(context);
      const offset = (input.page - 1) * input.pageSize;

      const filters = [eq(Transactions.userId, user.id)];

      if (input.accountId) {
        const account = await getAccountForUser(input.accountId, user.id);

        if (!account) {
          throw new ActionError({
            code: "BAD_REQUEST",
            message: "Selected account filter is invalid for this user.",
          });
        }

        filters.push(eq(Transactions.accountId, input.accountId));
      }

      if (input.categoryId) {
        const category = await getCategoryForUser(input.categoryId, user.id);

        if (!category) {
          throw new ActionError({
            code: "BAD_REQUEST",
            message: "Selected category filter is invalid for this user.",
          });
        }

        filters.push(eq(Transactions.categoryId, input.categoryId));
      }

      if (input.type) {
        filters.push(eq(Transactions.type, input.type));
      }

      const whereClause = filters.length === 1 ? filters[0] : and(...filters);

      const transactions = await db
        .select()
        .from(Transactions)
        .where(whereClause)
        .limit(input.pageSize)
        .offset(offset);
      const total = (
        await db
          .select({ id: Transactions.id })
          .from(Transactions)
          .where(whereClause)
      ).length;

      return {
        success: true,
        data: {
          items: transactions,
          total,
          page: input.page,
          pageSize: input.pageSize,
        },
      };
    },
  }),
};
