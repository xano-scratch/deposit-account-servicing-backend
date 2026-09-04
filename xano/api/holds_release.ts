import { query, input, s, ref, inp, auth, expr, c } from "@xanots/sdk";
import { servicing } from "./servicing.js";
import { users } from "../tables/users.js";
import { holds } from "../tables/holds.js";
import { servicing_events } from "../tables/servicing_events.js";

/**
 * Release an active hold, which restores that amount to available balance. RULE:
 * supervisor only (a teller can place a hold but not release one). Records who
 * released it and writes a `hold_released` audit event.
 */
export const holdsRelease = query({
  name: "holds/release",
  verb: "POST",
  apiGroup: servicing,
  auth: users,
  input: { hold_id: input.int({ required: true }) },
  stack: [
    s.db.get({ table: users, fieldName: "id", fieldValue: auth("id"), output: ["id", "name", "role"], as: "me" }),
    s.precondition({
      expr: expr(ref("me.role"), "=", c.text("supervisor")),
      error_type: "accessdenied",
      error: c.text("Releasing a hold needs a supervisor."),
    }),
    s.db.get({ table: holds, fieldName: "id", fieldValue: inp("hold_id"), as: "hold" }),
    s.precondition({
      expr: expr(ref("hold", { safe: true }), "!=", c.null()),
      error_type: "notfound",
      error: c.text("Hold not found."),
    }),
    s.precondition({
      expr: expr(ref("hold.status"), "=", c.text("active")),
      error_type: "badrequest",
      error: c.text("That hold is already released."),
    }),
    s.db.edit({
      table: holds,
      fieldName: "id",
      fieldValue: inp("hold_id"),
      row: { status: "released", released_by: auth("id") },
    }),
    s.db.add({
      table: servicing_events,
      row: {
        account_id: ref("hold.account_id"),
        event_type: "hold_released",
        actor: auth("id"),
        detail: c.text("Hold released"),
      },
    }),
  ],
  response: { ok: c.bool(true), hold_id: inp("hold_id"), account_id: ref("hold.account_id") },
});
