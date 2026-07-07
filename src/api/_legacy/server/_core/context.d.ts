import type { CreateExpressContextOptions } from "@trpc/server/adapters/express";
import type { User } from "../../drizzle/schema";
export type TrpcContext = {
    req: CreateExpressContextOptions["req"];
    res: CreateExpressContextOptions["res"];
    user: User | null;
    /** Clerk active-organization id. Null under SKIP_AUTH_DEV or when unauthenticated. */
    orgId: string | null;
};
export declare function createContext(opts: CreateExpressContextOptions): Promise<TrpcContext>;
