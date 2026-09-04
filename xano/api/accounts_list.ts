import { query, s, ref } from "@xanots/sdk";
import { servicing } from "./servicing.js";
import { users } from "../tables/users.js";
import { accounts } from "../tables/accounts.js";
import { customers } from "../tables/customers.js";

/**
 * List every account with its customer directory, so the UI can show account
 * number, holder, type, balance, and status. Any authenticated role may read.
 */
export const accountsList = query({
  name: "accounts/list",
  verb: "GET",
  apiGroup: servicing,
  auth: users,
  stack: [
    s.db.query({ table: accounts, sort: [{ sortBy: "account_number", dir: "asc" }], as: "accounts" }),
    s.db.query({ table: customers, as: "customers" }),
  ],
  response: { accounts: ref("accounts"), customers: ref("customers") },
});
