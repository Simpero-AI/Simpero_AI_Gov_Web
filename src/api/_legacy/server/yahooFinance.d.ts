/**
 * Direct Yahoo Finance integration via Yahoo's public API.
 * No API key or external package required — uses fetch to query1.finance.yahoo.com.
 */
export interface PublicCompResult {
    symbol: string;
    shortName: string | null;
    currentPrice: number | null;
    revenueGrowth: number | null;
    grossMargins: number | null;
    trailingPE: number | null;
    priceToSalesTrailing12Months: number | null;
    enterpriseToRevenue: number | null;
    returnOnEquity: number | null;
    error?: string;
}
export declare function getStockInsights(symbol: string): Promise<PublicCompResult>;
