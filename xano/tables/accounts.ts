import { table, f } from "@xanots/sdk";
import { customers } from "./customers.js";

/**
 * A deposit account. `balance` is the current POSTED balance, never edited by
 * hand: it is only moved by the posting engine, which also appends the matching
 * ledger row. Available balance is DERIVED (balance minus active holds), so it
 * is computed in a shared function, not stored here.
 */
export const accounts = table({
  name: "accounts",
  schema: {
    customer_id: f.tableRef(customers, { required: true }),
    account_number: f.text({ required: true }),
    type: f.enum(["checking", "savings"], { required: true }),
    status: f.enum(["active", "frozen", "closed"], { required: true, default: "active" }),
    balance: f.decimal({ required: true, default: 0 }),
    // How far below zero a checking account may go. Savings uses 0.
    overdraft_limit: f.decimal({ required: true, default: 0 }),
  },
  index: [{ type: "unique", fields: [{ name: "account_number" }] }],
});
