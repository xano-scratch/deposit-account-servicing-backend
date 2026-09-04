// The one contract: paths and request/response TYPES are derived from the xanots
// query defs, never hand-typed. Change a def and this client follows. Types are
// imported type-only (they erase to nothing); each lean def value is imported for
// its getPath()/verb.

import type { InferInput, InferResponse } from "@xanots/sdk";

import { authLogin as authLoginQuery } from "../../../xano/api/auth_login.js";
import { seed as seedQuery } from "../../../xano/api/seed.js";
import { accountsList as accountsListQuery } from "../../../xano/api/accounts_list.js";
import { accountGet as accountGetQuery } from "../../../xano/api/account_get.js";
import { accountsOpen as accountsOpenQuery } from "../../../xano/api/accounts_open.js";
import { transactionsPost as transactionsPostQuery } from "../../../xano/api/transactions_post.js";
import { holdsPlace as holdsPlaceQuery } from "../../../xano/api/holds_place.js";
import { holdsRelease as holdsReleaseQuery } from "../../../xano/api/holds_release.js";
import { accountsFreeze as accountsFreezeQuery } from "../../../xano/api/accounts_freeze.js";

/**
 * The deployed Xano backend's base URL. Injected as `window.XANO_HOST` by
 * `xanots deploy <entry> --static <dir>`, or read from `VITE_XANO_HOST` in dev.
 */
export const XANO_HOST: string =
  (typeof window !== "undefined" && (window as { XANO_HOST?: string }).XANO_HOST) ||
  import.meta.env.VITE_XANO_HOST ||
  "";

// ── Auth token, held in memory for the session ──────────────────────────────
let authToken: string | null = null;
export function setToken(token: string | null): void {
  authToken = token;
}

async function request<T>(
  path: string,
  verb: string,
  opts: { body?: unknown; auth?: boolean } = {},
): Promise<T> {
  const headers: Record<string, string> = { "content-type": "application/json" };
  if (opts.auth && authToken) headers["Authorization"] = `Bearer ${authToken}`;

  const res = await fetch(XANO_HOST + path, {
    method: verb,
    headers,
    body: opts.body !== undefined ? JSON.stringify(opts.body) : undefined,
  });

  if (!res.ok) {
    // Rule rejections come back as 4xx with the reason in the body's `message`.
    let message = `Request failed (${res.status})`;
    try {
      const text = await res.text();
      try {
        message = (JSON.parse(text) as { message?: string }).message ?? text ?? message;
      } catch {
        message = text || message;
      }
    } catch {
      // keep the default message
    }
    throw new Error(message);
  }
  return (await res.json()) as T;
}

// Seeded demo logins (see xano/api/seed.ts). Used by the quick-login buttons and
// the `?demo=<role>` deep link. These are demo credentials on a throwaway
// ephemeral, not real secrets.
export const DEMO_CREDENTIALS: Record<string, { email: string; password: string }> = {
  teller: { email: "tara@bank.example", password: "teller-demo" },
  supervisor: { email: "sam@bank.example", password: "supervisor-demo" },
  viewer: { email: "val@bank.example", password: "viewer-demo" },
};

// ── Auth ────────────────────────────────────────────────────────────────────
export type LoginBody = InferInput<typeof authLoginQuery>;
export type LoginResponse = InferResponse<typeof authLoginQuery>;
export type Role = LoginResponse["role"];

export function login(body: LoginBody): Promise<LoginResponse> {
  return request<LoginResponse>(authLoginQuery.getPath(), authLoginQuery.verb, { body });
}

export function seed(): Promise<InferResponse<typeof seedQuery>> {
  return request(seedQuery.getPath(), seedQuery.verb);
}

// ── Accounts ─────────────────────────────────────────────────────────────────
export type AccountsListResponse = InferResponse<typeof accountsListQuery>;
export type Account = AccountsListResponse["accounts"][number];
export type Customer = AccountsListResponse["customers"][number];

export function listAccounts(): Promise<AccountsListResponse> {
  return request<AccountsListResponse>(accountsListQuery.getPath(), accountsListQuery.verb, { auth: true });
}

export type AccountDetail = InferResponse<typeof accountGetQuery>;
export type Hold = AccountDetail["holds"][number];
export type LedgerEntry = AccountDetail["ledger"][number];
export type ServicingEvent = AccountDetail["events"][number];
export type Staff = AccountDetail["staff"][number];

export function getAccount(id: number): Promise<AccountDetail> {
  // The id is a path segment, so getPath builds `/api:servicing/account/<id>`.
  const path = accountGetQuery.getPath({ params: { account_id: id } });
  return request<AccountDetail>(path, accountGetQuery.verb, { auth: true });
}

export type OpenAccountBody = InferInput<typeof accountsOpenQuery>;
export type OpenAccountResult = InferResponse<typeof accountsOpenQuery>;
export function openAccount(body: OpenAccountBody): Promise<OpenAccountResult> {
  return request<OpenAccountResult>(accountsOpenQuery.getPath(), accountsOpenQuery.verb, { body, auth: true });
}

export type FreezeBody = InferInput<typeof accountsFreezeQuery>;
export type FreezeResult = InferResponse<typeof accountsFreezeQuery>;
export function freezeAccount(body: FreezeBody): Promise<FreezeResult> {
  return request<FreezeResult>(accountsFreezeQuery.getPath(), accountsFreezeQuery.verb, { body, auth: true });
}

// ── Transactions ─────────────────────────────────────────────────────────────
export type PostTransactionBody = InferInput<typeof transactionsPostQuery>;
export type PostTransactionResult = InferResponse<typeof transactionsPostQuery>;

export function postTransaction(body: PostTransactionBody): Promise<PostTransactionResult> {
  return request<PostTransactionResult>(transactionsPostQuery.getPath(), transactionsPostQuery.verb, {
    body,
    auth: true,
  });
}

// ── Holds ────────────────────────────────────────────────────────────────────
export type PlaceHoldBody = InferInput<typeof holdsPlaceQuery>;
export type PlaceHoldResult = InferResponse<typeof holdsPlaceQuery>;
export function placeHold(body: PlaceHoldBody): Promise<PlaceHoldResult> {
  return request<PlaceHoldResult>(holdsPlaceQuery.getPath(), holdsPlaceQuery.verb, { body, auth: true });
}

export type ReleaseHoldBody = InferInput<typeof holdsReleaseQuery>;
export type ReleaseHoldResult = InferResponse<typeof holdsReleaseQuery>;
export function releaseHold(body: ReleaseHoldBody): Promise<ReleaseHoldResult> {
  return request<ReleaseHoldResult>(holdsReleaseQuery.getPath(), holdsReleaseQuery.verb, { body, auth: true });
}
