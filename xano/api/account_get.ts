import { query, input, s, ref, inp, col, expr, c } from "@xanots/sdk";
import { servicing } from "./servicing.js";
import { users } from "../tables/users.js";
import { accounts } from "../tables/accounts.js";
import { customers } from "../tables/customers.js";
import { transactions } from "../tables/transactions.js";
import { holds } from "../tables/holds.js";
import { servicing_events } from "../tables/servicing_events.js";
import { accountSnapshot } from "../functions/account_snapshot.js";

/**
 * One account with everything needed to service it: the account row and its
 * customer, the DERIVED available balance and held total (from the shared
 * snapshot rule), the full immutable ledger (newest first), the holds, the audit
 * trail, and a staff directory so the UI can name who did what. The id is a path
 * segment (`/api:servicing/account/1`) so the route is addressable. Any
 * authenticated role may read.
 */
export const accountGet = query({
  name: "account/{account_id}",
  verb: "GET",
  apiGroup: servicing,
  auth: users,
  input: { account_id: input.int() },
  stack: [
    // The account row is fetched directly here so it types cleanly through
    // InferResponse; the snapshot supplies the derived scalars.
    s.db.get({ table: accounts, fieldName: "id", fieldValue: inp("account_id"), as: "account" }),
    s.precondition({
      expr: expr(ref("account", { safe: true }), "!=", c.null()),
      error_type: "notfound",
      error: c.text("Account not found."),
    }),
    s.function.run({ fn: accountSnapshot, input: { account_id: inp("account_id") }, as: "snap" }),
    s.db.get({ table: customers, fieldName: "id", fieldValue: ref("account.customer_id"), as: "customer" }),
    s.db.query({
      table: transactions,
      where: expr(col("account_id"), "=", inp("account_id")),
      sort: [{ sortBy: "created_at", dir: "desc" }],
      as: "ledger",
    }),
    s.db.query({
      table: holds,
      where: expr(col("account_id"), "=", inp("account_id")),
      sort: [{ sortBy: "created_at", dir: "desc" }],
      as: "holds",
    }),
    s.db.query({
      table: servicing_events,
      where: expr(col("account_id"), "=", inp("account_id")),
      sort: [{ sortBy: "created_at", dir: "desc" }],
      as: "events",
    }),
    s.db.query({ table: users, output: ["id", "name", "role"], as: "staff" }),
  ],
  response: {
    account: ref("account"),
    customer: ref("customer"),
    available: ref("snap.available"),
    held: ref("snap.held"),
    ledger: ref("ledger"),
    holds: ref("holds"),
    events: ref("events"),
    staff: ref("staff"),
  },
});
