import { table, f } from "@xanots/sdk";
import { accounts } from "./accounts.js";
import { users } from "./users.js";

/**
 * The immutable ledger. Every posted debit and credit appends one row with the
 * balance snapshot AFTER it applied. There is deliberately NO endpoint that
 * edits or deletes a row here: the ledger is append-only, and the account
 * balance is derived from it.
 */
export const transactions = table({
  name: "transactions",
  schema: {
    account_id: f.tableRef(accounts, { required: true }),
    direction: f.enum(["debit", "credit"], { required: true }),
    amount: f.decimal({ required: true }),
    balance_after: f.decimal({ required: true }),
    description: f.text(),
    posted_by: f.tableRef(users, { required: true }),
  },
});
