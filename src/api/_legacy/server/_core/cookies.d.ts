import type { CookieOptions, Request } from "express";
export declare function getSessionCookieOptions(req: Request): Pick<CookieOptions, "domain" | "httpOnly" | "path" | "sameSite" | "secure">;
