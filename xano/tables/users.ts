import { table, f } from "@xanots/sdk";

/**
 * Staff who service accounts. This is the workspace AUTH table: a login query
 * mints a token against it, and every protected endpoint names it as `auth:` and
 * reads the caller with `auth("id")`. Access is gated at the API layer by `role`
 * (RBAC), never at the row level.
 */
export const users = table({
  name: "users",
  auth: true,
  // `id` (int PK) + `created_at` (epochms) are auto-injected.
  schema: {
    name: f.text({ required: true }),
    email: f.email({ required: true }),
    // `f.password` hashes on write and is `access: "internal"`; a read must name
    // it in `output` to pull the hash for `check_password`.
    password: f.password({ required: true }),
    role: f.enum(["teller", "supervisor", "viewer"], { required: true }),
  },
  index: [{ type: "unique", fields: [{ name: "email" }] }],
});
