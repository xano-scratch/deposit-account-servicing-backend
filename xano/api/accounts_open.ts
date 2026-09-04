import { query, input, s, ref, inp, auth, expr, or, c } from "@xanots/sdk";
import { servicing } from "./servicing.js";
import { users } from "../tables/users.js";
import { customers } from "../tables/customers.js";
import { accounts } from "../tables/accounts.js";
import { servicing_events } from "../tables/servicing_events.js";

/**
 * Open an account for an existing customer, starting at a zero balance with a
 * chosen overdraft limit. RULE: teller or supervisor only (viewers cannot open
 * accounts). Writes an `account_opened` audit event.
 */
export const accountsOpen = query({
  name: "accounts/open",
  verb: "POST",
  apiGroup: servicing,
  auth: users,
  input: {
    customer_id: input.int({ required: true }),
    account_number: input.text({ required: true }),
    type: input.enum(["checking", "savings"], { required: true }),
    overdraft_limit: input.decimal({ required: true, default: 0 }),
  },
  stack: [
    s.db.get({ table: users, fieldName: "id", fieldValue: auth("id"), output: ["id", "name", "role"], as: "me" }),
    s.precondition({
      expr: or(expr(ref("me.role"), "=", c.text("teller")), expr(ref("me.role"), "=", c.text("supervisor"))),
      error_type: "accessdenied",
      error: c.text("Opening an account needs a teller or supervisor role."),
    }),
    s.db.get({ table: customers, fieldName: "id", fieldValue: inp("customer_id"), as: "customer" }),
    s.precondition({
      expr: expr(ref("customer", { safe: true }), "!=", c.null()),
      error_type: "notfound",
      error: c.text("Customer not found."),
    }),
    s.db.add({
      table: accounts,
      row: {
        customer_id: inp("customer_id"),
        account_number: inp("account_number"),
        type: inp("type"),
        status: "active",
        balance: 0,
        overdraft_limit: inp("overdraft_limit"),
      },
      as: "account",
    }),
    s.db.add({
      table: servicing_events,
      row: {
        account_id: ref("account.id"),
        event_type: "account_opened",
        actor: auth("id"),
        detail: c.text("Account opened"),
      },
    }),
  ],
  response: { account: ref("account") },
});
