import { apiGroup } from "@xanots/sdk";

/**
 * All endpoints hang off one group with a PINNED canonical slug, so public paths
 * stay stable (`/api:servicing/...`) and `getPath()` resolves in the browser
 * bundle without a lock file.
 */
export const servicing = apiGroup({ name: "servicing", canonical: "servicing" });
