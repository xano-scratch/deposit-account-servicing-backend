import { defineFunction, input, s, ref, inp, col, expr, c, withFilters, fl } from "@xanots/sdk";
import { accounts } from "../tables/accounts.js";
import { holds } from "../tables/holds.js";

/**
 * The available-balance rule, defined ONCE and called by both the posting engine
 * and the account read, so the number a reviewer sees on screen is the exact
 * number the posting rule enforces.
 *
 *   available = balance - sum(active holds)
 *
 * The sum runs as a foreach accumulator over the active-hold rows rather than a
 * database aggregate, which keeps it transparent and easy to smoke-test.
 */
export const accountSnapshot = defineFunction({
  name: "account_snapshot",
  input: { account_id: input.int({ required: true }) },
  stack: [
    // Field-match get binds `null` on an unknown id (get_by_id would 400 instead).
    s.db.get({ table: accounts, fieldName: "id", fieldValue: inp("account_id"), as: "account" }),
    s.precondition({
      expr: expr(ref("account", { safe: true }), "!=", c.null()),
      error_type: "notfound",
      error: c.text("Account not found."),
    }),
    s.db.query({
      table: holds,
      where: [expr(col("account_id"), "=", inp("account_id")), expr(col("status"), "=", c.text("active"))],
      sort: [{ sortBy: "created_at", dir: "desc" }],
      as: "active_holds",
    }),
    s.set_var("held", c.decimal(0)),
    s.foreach({
      list: ref("active_holds"),
      as: "h",
      body: [s.update_var("held", withFilters(ref("held"), fl.add(ref("h.amount"))))],
    }),
    s.set_var("available", withFilters(ref("account.balance"), fl.sub(ref("held")))),
  ],
  response: {
    account: ref("account"),
    held: ref("held"),
    available: ref("available"),
    active_holds: ref("active_holds"),
  },
});
