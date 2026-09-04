import { table, f } from "@xanots/sdk";

/** The account holder. One customer owns many accounts. */
export const customers = table({
  name: "customers",
  schema: {
    name: f.text({ required: true }),
    email: f.email({ required: true }),
    status: f.enum(["active", "inactive"], { required: true, default: "active" }),
  },
});
