import { query, input, s, ref, inp, auth, expr, or, c } from "@xanots/sdk";
import { servicing } from "./servicing.js";
import { users } from "../tables/users.js";
import { accounts } from "../tables/accounts.js";
import { holds } from "../tables/holds.js";
import { servicing_events } from "../tables/servicing_events.js";

/**
 * Place an active hold, which immediately lowers available balance while leaving
 * the posted balance unchanged. RULE: teller or supervisor only. Writes a
 * `hold_placed` audit event.
 */
export const holdsPlace = query({
  name: "holds/place",
  verb: "POST",
  apiGroup: servicing,
  auth: users,
  input: {
    account_id: input.int({ required: true }),
    amount: input.decimal({ required: true }),
    reason: input.text(),
  },
  stack: [
    s.db.get({ table: users, fieldName: "id", fieldValue: auth("id"), output: ["id", "name", "role"], as: "me" }),
    s.precondition({
      expr: or(expr(ref("me.role"), "=", c.text("teller")), expr(ref("me.role"), "=", c.text("supervisor"))),
      error_type: "accessdenied",
      error: c.text("Placing a hold needs a teller or supervisor role."),
    }),
    s.db.get({ table: accounts, fieldName: "id", fieldValue: inp("account_id"), as: "account" }),
    s.precondition({
      expr: expr(ref("account", { safe: true }), "!=", c.null()),
      error_type: "notfound",
      error: c.text("Account not found."),
    }),
    s.db.add({
      table: holds,
      row: {
        account_id: inp("account_id"),
        amount: inp("amount"),
        reason: inp("reason"),
        status: "active",
        placed_by: auth("id"),
      },
      as: "hold",
    }),
    s.db.add({
      table: servicing_events,
      row: {
        account_id: inp("account_id"),
        event_type: "hold_placed",
        actor: auth("id"),
        detail: c.text("Hold placed"),
      },
    }),
  ],
  response: { hold: ref("hold") },
});
