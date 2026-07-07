import type { Request } from "express";
import type { User } from "../../drizzle/schema";
export type AuthenticatedRequest = {
    user: User;
    orgId: string;
};
declare class SDKServer {
    /**
     * Verifies the Clerk bearer token on the request (Authorization header) —
     * Clerk is the sole login path; the legacy `simpero_session` cookie /
     * OIDC login route was removed once Clerk fully replaced it.
     */
    authenticateRequest(req: Request): Promise<AuthenticatedRequest>;
}
export declare const sdk: SDKServer;
export {};
