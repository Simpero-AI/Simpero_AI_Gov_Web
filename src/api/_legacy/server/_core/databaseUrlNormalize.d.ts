/**
 * Hardens DATABASE_URL from env dashboards where users paste "KEY=value",
 * duplicate query starters (?foo?bar), or stray whitespace.
 */
export declare function normalizeDatabaseConnectionString(raw: string | undefined): string;
