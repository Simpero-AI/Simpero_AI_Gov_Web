export type TrendWindow = "week" | "month" | "quarter";
export interface WindowBounds {
    currentStart: Date;
    currentEnd: Date;
    priorStart: Date;
    priorEnd: Date;
}
export declare function computeWindowBounds(window: TrendWindow, now?: Date): WindowBounds;
export type PipelineValueDelta = number | "new" | null;
export declare function computePipelineValueDelta(current: number, prior: number): PipelineValueDelta;
export interface DashboardStatsPayload {
    window: TrendWindow;
    totalDeals: {
        value: number;
        delta: number;
    };
    pipelineValueUsd: {
        value: number;
        delta: PipelineValueDelta;
    };
    avgAiScore: {
        value: number | null;
        delta: number | null;
    };
    ddCompletionPct: {
        value: number;
        deltaPp: number;
    };
}
export declare function computeDashboardStats(userId: number): Promise<DashboardStatsPayload>;
