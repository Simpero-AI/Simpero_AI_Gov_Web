export type ClerkIdentity = {
    /** Clerk user id (the JWT `sub` claim) — becomes `users.openId` in this app. */
    userId: string;
    /** Active organization id (`o.id` claim on current Clerk tokens; `org_id` on older ones). Required — see verifyClerkBearerToken. */
    orgId: string;
};
/**
 * Verifies a Clerk session JWT via the instance's public JWKS (RS256, no
 * CLERK_SECRET_KEY needed). Returns null on any missing/invalid/org-less
 * token — "no org, no access" is enforced here, not just on the client.
 */
export declare function verifyClerkBearerToken(authorizationHeader: string | undefined): Promise<ClerkIdentity | null>;
