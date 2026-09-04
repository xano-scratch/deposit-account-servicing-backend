import { query, s, ref, c } from "@xanots/sdk";
import { servicing } from "./servicing.js";
import { users } from "../tables/users.js";
import { customers } from "../tables/customers.js";
import { accounts } from "../tables/accounts.js";
import { transactions } from "../tables/transactions.js";
import { holds } from "../tables/holds.js";
import { servicing_events } from "../tables/servicing_events.js";

/**
 * Reset and reload the demo data so the ephemeral is browsable immediately and a
 * reviewer can re-run any scenario from a clean state. Public on purpose (the
 * "Reset demo data" button on the sign-in screen calls it). The starter ledger
 * is written directly with consistent `balance_after` snapshots; live postings
 * afterward go through the posting engine.
 */
export const seed = query({
  name: "seed",
  verb: "POST",
  apiGroup: servicing,
  auth: false,
  stack: [
    // Wipe in FK order (children first) and restart id sequences.
    s.db.truncate({ table: servicing_events, reset: true }),
    s.db.truncate({ table: transactions, reset: true }),
    s.db.truncate({ table: holds, reset: true }),
    s.db.truncate({ table: accounts, reset: true }),
    s.db.truncate({ table: customers, reset: true }),
    s.db.truncate({ table: users, reset: true }),

    // Staff, one of each role. Passwords are demo-only and hash on write.
    s.db.add({ table: users, row: { name: "Tara Okafor", email: "tara@bank.example", password: "teller-demo", role: "teller" }, as: "teller" }),
    s.db.add({ table: users, row: { name: "Sam Rivera", email: "sam@bank.example", password: "supervisor-demo", role: "supervisor" }, as: "supervisor" }),
    s.db.add({ table: users, row: { name: "Val Chen", email: "val@bank.example", password: "viewer-demo", role: "viewer" }, as: "viewer" }),

    // Customers.
    s.db.add({ table: customers, row: { name: "Maria Gomez", email: "maria@example.com", status: "active" }, as: "c1" }),
    s.db.add({ table: customers, row: { name: "James Lee", email: "james@example.com", status: "active" }, as: "c2" }),
    s.db.add({ table: customers, row: { name: "Priya Nair", email: "priya@example.com", status: "active" }, as: "c3" }),

    // Account 1 — Maria, checking, overdraft 200, posted balance 900.
    s.db.add({ table: accounts, row: { customer_id: ref("c1.id"), account_number: "CHK-1001", type: "checking", status: "active", balance: 900, overdraft_limit: 200 }, as: "a1" }),
    s.db.add({ table: servicing_events, row: { account_id: ref("a1.id"), event_type: "account_opened", actor: ref("teller.id"), detail: "Account opened for Maria Gomez" } }),
    s.db.add({ table: transactions, row: { account_id: ref("a1.id"), direction: "credit", amount: 1200, balance_after: 1200, description: "Opening deposit", posted_by: ref("teller.id") } }),
    s.db.add({ table: transactions, row: { account_id: ref("a1.id"), direction: "debit", amount: 300, balance_after: 900, description: "Card payment", posted_by: ref("teller.id") } }),

    // Account 2 — James, savings, overdraft 0, posted balance 500, with a 300 active hold (available 200).
    s.db.add({ table: accounts, row: { customer_id: ref("c2.id"), account_number: "SAV-2002", type: "savings", status: "active", balance: 500, overdraft_limit: 0 }, as: "a2" }),
    s.db.add({ table: servicing_events, row: { account_id: ref("a2.id"), event_type: "account_opened", actor: ref("teller.id"), detail: "Account opened for James Lee" } }),
    s.db.add({ table: transactions, row: { account_id: ref("a2.id"), direction: "credit", amount: 500, balance_after: 500, description: "Transfer in", posted_by: ref("teller.id") } }),
    s.db.add({ table: holds, row: { account_id: ref("a2.id"), amount: 300, reason: "Pending check clearance", status: "active", placed_by: ref("teller.id") }, as: "h2" }),
    s.db.add({ table: servicing_events, row: { account_id: ref("a2.id"), event_type: "hold_placed", actor: ref("teller.id"), detail: "Hold of 300 placed: pending check clearance" } }),

    // Account 3 — Priya, checking, overdraft 500, currently overdrawn to -150 (within the limit).
    s.db.add({ table: accounts, row: { customer_id: ref("c3.id"), account_number: "CHK-3003", type: "checking", status: "active", balance: -150, overdraft_limit: 500 }, as: "a3" }),
    s.db.add({ table: servicing_events, row: { account_id: ref("a3.id"), event_type: "account_opened", actor: ref("teller.id"), detail: "Account opened for Priya Nair" } }),
    s.db.add({ table: transactions, row: { account_id: ref("a3.id"), direction: "credit", amount: 250, balance_after: 250, description: "Opening deposit", posted_by: ref("teller.id") } }),
    s.db.add({ table: transactions, row: { account_id: ref("a3.id"), direction: "debit", amount: 400, balance_after: -150, description: "Utility bill", posted_by: ref("teller.id") } }),
  ],
  response: { ok: c.bool(true), accounts: c.int(3), customers: c.int(3), users: c.int(3) },
});
