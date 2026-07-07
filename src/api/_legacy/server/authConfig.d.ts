/**
 * Auth bypass flag, shared by `requireSession` and tRPC `createContext`. Clerk is the sole
 * login path (see `server/_core/sdk.ts`'s `authenticateRequest`) — this file no longer gates
 * a separate OIDC login surface, which was removed once Clerk fully replaced it.
 */
/**
 * Auth bypass is **opt-in only** (`SKIP_AUTH_DEV` or `SKIP_AUTH`). There is no automatic
 * “development without OIDC” bypass — sign in via OIDC or set an explicit skip (e.g. Playwright sets `SKIP_AUTH_DEV`).
 */
export declare function isAuthBypassActive(): boolean;
