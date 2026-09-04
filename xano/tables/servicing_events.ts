import { table, f } from "@xanots/sdk";
import { accounts } from "./accounts.js";
import { users } from "./users.js";

/**
 * A readable audit trail of servicing actions: who did what to an account and
 * why a posting was rejected. Written alongside the action it records.
 */
export const servicing_events = table({
  name: "servicing_events",
  schema: {
    account_id: f.tableRef(accounts, { required: true }),
    event_type: f.enum(
      ["account_opened", "frozen", "unfrozen", "hold_placed", "hold_released", "posting_rejected"],
      { required: true },
    ),
    actor: f.tableRef(users, { required: true }),
    detail: f.text(),
  },
});
