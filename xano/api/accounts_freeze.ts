import { query, input, s, ref, inp, auth, expr, c } from "@xanots/sdk";
import { servicing } from "./servicing.js";
import { users } from "../tables/users.js";
import { accounts } from "../tables/accounts.js";
import { servicing_events } from "../tables/servicing_events.js";

/**
 * Toggle an account between `active` and `frozen`. RULE: supervisor only. A
 * frozen account rejects every posting (enforced by the posting engine).
 * Writes a `frozen` or `unfrozen` audit event.
 */
export const accountsFreeze = query({
  name: "accounts/freeze",
  verb: "POST",
  apiGroup: servicing,
  auth: users,
  input: { account_id: input.int({ required: true }) },
  stack: [
    s.db.get({ table: users, fieldName: "id", fieldValue: auth("id"), output: ["id", "name", "role"], as: "me" }),
    s.precondition({
      expr: expr(ref("me.role"), "=", c.text("supervisor")),
      error_type: "accessdenied",
      error: c.text("Freezing an account needs a supervisor."),
    }),
    s.db.get({ table: accounts, fieldName: "id", fieldValue: inp("account_id"), as: "account" }),
    s.precondition({
      expr: expr(ref("account", { safe: true }), "!=", c.null()),
      error_type: "notfound",
      error: c.text("Account not found."),
    }),
    s.precondition({
      expr: expr(ref("account.status"), "!=", c.text("closed")),
      error_type: "badrequest",
      error: c.text("Closed accounts cannot be frozen or unfrozen."),
    }),
    // Default to freezing; flip to unfreeze when the account is already frozen.
    s.set_var("new_status", c.text("frozen")),
    s.set_var("event_type", c.text("frozen")),
    s.conditional({
      when: expr(ref("account.status"), "=", c.text("frozen")),
      then: [
        s.update_var("new_status", c.text("active")),
        s.update_var("event_type", c.text("unfrozen")),
      ],
    }),
    s.db.edit({ table: accounts, fieldName: "id", fieldValue: inp("account_id"), row: { status: ref("new_status") } }),
    s.db.add({
      table: servicing_events,
      row: {
        account_id: inp("account_id"),
        event_type: ref("event_type"),
        actor: auth("id"),
        detail: c.text("Account status changed"),
      },
    }),
  ],
  response: { account_id: inp("account_id"), status: ref("new_status") },
});
