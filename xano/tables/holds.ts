import { table, f } from "@xanots/sdk";
import { accounts } from "./accounts.js";
import { users } from "./users.js";

/**
 * A hold reduces AVAILABLE balance while leaving the posted balance untouched.
 * A teller places it; a supervisor releases it. `released_by` is an OPTIONAL
 * foreign key, so it uses the `0` sentinel (not a nullable int, which Xano
 * cannot match on) until a supervisor releases the hold.
 */
export const holds = table({
  name: "holds",
  schema: {
    account_id: f.tableRef(accounts, { required: true }),
    amount: f.decimal({ required: true }),
    reason: f.text(),
    status: f.enum(["active", "released"], { required: true, default: "active" }),
    placed_by: f.tableRef(users, { required: true }),
    released_by: f.tableRef(users, { required: true, default: 0 }),
  },
});
