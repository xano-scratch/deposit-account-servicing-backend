import { workspace } from "@xanots/sdk";

import { users } from "./tables/users.js";
import { customers } from "./tables/customers.js";
import { accounts } from "./tables/accounts.js";
import { transactions } from "./tables/transactions.js";
import { holds } from "./tables/holds.js";
import { servicing_events } from "./tables/servicing_events.js";

import { accountSnapshot } from "./functions/account_snapshot.js";

import { servicing } from "./api/servicing.js";
import { seed } from "./api/seed.js";
import { authLogin } from "./api/auth_login.js";
import { accountsOpen } from "./api/accounts_open.js";
import { accountsList } from "./api/accounts_list.js";
import { accountGet } from "./api/account_get.js";
import { transactionsPost } from "./api/transactions_post.js";
import { holdsPlace } from "./api/holds_place.js";
import { holdsRelease } from "./api/holds_release.js";
import { accountsFreeze } from "./api/accounts_freeze.js";

/**
 * Deposit Account Servicing Backend — a governed deposit-servicing slice for a
 * core-banking modernization: accounts, a posting engine, holds, and an
 * immutable ledger, with API-layer RBAC and readable rules a human can audit.
 */
export default workspace("deposit-account-servicing-backend")
  .registerTables([users, customers, accounts, transactions, holds, servicing_events])
  .registerFunctions([accountSnapshot])
  .registerApiGroups([servicing])
  .registerQueries([
    seed,
    authLogin,
    accountsOpen,
    accountsList,
    accountGet,
    transactionsPost,
    holdsPlace,
    holdsRelease,
    accountsFreeze,
  ]);
