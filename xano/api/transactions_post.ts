import { query, input, s, ref, inp, auth, expr, and, or, c, withFilters, fl } from "@xanots/sdk";
import { servicing } from "./servicing.js";
import { users } from "../tables/users.js";
import { transactions } from "../tables/transactions.js";
import { accounts } from "../tables/accounts.js";
import { servicing_events } from "../tables/servicing_events.js";
import { accountSnapshot } from "../functions/account_snapshot.js";

/**
 * The posting engine: the one governed job. A transaction posts only if it obeys
 * every rule, then it is recorded immutably.
 *
 *   1. viewers cannot post at all (RBAC).
 *   2. a frozen or closed account rejects every posting.
 *   3. a debit cannot push available balance below the negative overdraft limit
 *      (available already nets out active holds, so a hold blocks a debit that
 *      the posted balance alone would allow).
 *   4. a debit over the teller limit needs a supervisor.
 *
 * A rejected posting writes a `posting_rejected` audit event with the reason and
 * writes NO ledger row. On accept it appends the ledger row (with the snapshot
 * balance) and moves the posted balance. The ledger row is never edited after.
 */
export const transactionsPost = query({
  name: "transactions/post",
  verb: "POST",
  apiGroup: servicing,
  auth: users,
  input: {
    account_id: input.int({ required: true }),
    direction: input.enum(["debit", "credit"], { required: true }),
    amount: input.decimal({ required: true }),
    description: input.text(),
  },
  stack: [
    s.db.get({ table: users, fieldName: "id", fieldValue: auth("id"), output: ["id", "name", "role"], as: "me" }),
    // Rule 1 — a viewer cannot post.
    s.precondition({
      expr: or(expr(ref("me.role"), "=", c.text("teller")), expr(ref("me.role"), "=", c.text("supervisor"))),
      error_type: "accessdenied",
      error: c.text("Viewers cannot post transactions."),
    }),

    // The snapshot supplies the account (and 404s an unknown id) plus the derived
    // available balance the debit rule enforces.
    s.function.run({ fn: accountSnapshot, input: { account_id: inp("account_id") }, as: "snap" }),

    // Work out the rejection reason (null = allowed).
    s.set_var("reason", c.null()),
    // Rule 2 — status.
    s.conditional({
      when: or(expr(ref("snap.account.status"), "=", c.text("frozen")), expr(ref("snap.account.status"), "=", c.text("closed"))),
      then: [s.update_var("reason", c.text("Account is frozen or closed; postings are blocked."))],
    }),
    // Rules 3 + 4 apply to debits only.
    s.conditional({
      when: expr(inp("direction"), "=", c.text("debit")),
      then: [
        s.set_var("projected", withFilters(ref("snap.available"), fl.sub(inp("amount")))),
        s.set_var("floor", withFilters(ref("snap.account.overdraft_limit"), fl.mul(c.decimal(-1)))),
        // Rule 3 — overdraft / available balance.
        s.conditional({
          when: expr(ref("projected"), "<", ref("floor")),
          then: [s.update_var("reason", c.text("Debit exceeds the available balance and overdraft limit."))],
        }),
        // Rule 4 — supervisor threshold (500).
        s.conditional({
          when: and(expr(inp("amount"), ">", c.decimal(500)), expr(ref("me.role"), "!=", c.text("supervisor"))),
          then: [s.update_var("reason", c.text("Debits over the teller limit of 500 need a supervisor."))],
        }),
      ],
    }),

    // On rejection: record the audit event, THEN abort with the reason (400).
    s.conditional({
      when: expr(ref("reason"), "!=", c.null()),
      then: [
        s.db.add({
          table: servicing_events,
          row: {
            account_id: inp("account_id"),
            event_type: "posting_rejected",
            actor: auth("id"),
            detail: ref("reason"),
          },
        }),
      ],
    }),
    s.precondition({
      expr: expr(ref("reason"), "=", c.null()),
      error_type: "badrequest",
      error: ref("reason"),
    }),

    // Success path (reason is null here): move the balance and append the ledger.
    s.set_var("new_balance", ref("snap.account.balance")),
    s.conditional({
      when: expr(inp("direction"), "=", c.text("credit")),
      then: [s.update_var("new_balance", withFilters(ref("snap.account.balance"), fl.add(inp("amount"))))],
      else: [s.update_var("new_balance", withFilters(ref("snap.account.balance"), fl.sub(inp("amount"))))],
    }),
    s.db.add({
      table: transactions,
      row: {
        account_id: inp("account_id"),
        direction: inp("direction"),
        amount: inp("amount"),
        balance_after: ref("new_balance"),
        description: inp("description"),
        posted_by: auth("id"),
      },
      as: "txn",
    }),
    s.db.edit({ table: accounts, fieldName: "id", fieldValue: inp("account_id"), row: { balance: ref("new_balance") } }),
  ],
  response: { transaction: ref("txn"), balance_after: ref("new_balance") },
});
