import { query, input, s, ref, inp, expr, c } from "@xanots/sdk";
import { servicing } from "./servicing.js";
import { users } from "../tables/users.js";

/**
 * Verify credentials against the auth table and mint a role-scoped token.
 * The submitted password is taken as `input.text` (not `input.password`, which
 * would double-hash it), and `output` names the internal `password` column so
 * `check_password` can read the stored hash.
 */
export const authLogin = query({
  name: "auth/login",
  verb: "POST",
  apiGroup: servicing,
  auth: false,
  input: {
    email: input.email({ required: true }),
    password: input.text({ required: true }),
  },
  stack: [
    s.db.get({
      table: users,
      fieldName: "email",
      fieldValue: inp("email"),
      output: ["id", "name", "email", "role", "password"],
      as: "u",
    }),
    s.precondition({
      expr: expr(ref("u", { safe: true }), "!=", c.null()),
      error_type: "unauthorized",
      error: c.text("Invalid email or password."),
    }),
    s.security.check_password({ text_password: inp("password"), hash_password: ref("u.password"), as: "ok" }),
    s.precondition({
      expr: expr(ref("ok"), "=", c.bool(true)),
      error_type: "unauthorized",
      error: c.text("Invalid email or password."),
    }),
    s.security.create_auth_token({ table: users, id: ref("u.id"), as: "token" }),
  ],
  response: { token: ref("token"), id: ref("u.id"), name: ref("u.name"), role: ref("u.role") },
});
