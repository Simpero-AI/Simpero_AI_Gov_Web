/**
 * Rollup of LLM token usage for one async analysis job (or any grouped context).
 * Stored JSON in `analysis_jobs.usageRollupJson` on job completion.
 */

export type LlmUsageByModelRow = {
  provider: string;
  modelAlias: string;
  requestedModelId: string;
  apiModel: string | null;
  llmCalls: number;
  promptTokens: number;
  completionTokens: number;
  totalTokens: number;
};

export type LlmUsageRollup = {
  llmCalls: number;
  promptTokens: number;
  completionTokens: number;
  totalTokens: number;
  totalLatencyMs: number;
  byModel: LlmUsageByModelRow[];
};

function isRecord(x: unknown): x is Record<string, unknown> {
  return typeof x === "object" && x !== null && !Array.isArray(x);
}

function isByModelRow(x: unknown): x is LlmUsageByModelRow {
  if (!isRecord(x)) return false;
  return (
    typeof x.provider === "string" &&
    typeof x.modelAlias === "string" &&
    typeof x.requestedModelId === "string" &&
    (x.apiModel === null || typeof x.apiModel === "string") &&
    typeof x.llmCalls === "number" &&
    typeof x.promptTokens === "number" &&
    typeof x.completionTokens === "number" &&
    typeof x.totalTokens === "number"
  );
}

export function parseUsageRollupJson(raw: string | null | undefined): LlmUsageRollup | null {
  if (!raw?.trim()) return null;
  try {
    const o = JSON.parse(raw) as unknown;
    if (!isRecord(o)) return null;
    if (
      typeof o.llmCalls !== "number" ||
      typeof o.promptTokens !== "number" ||
      typeof o.completionTokens !== "number" ||
      typeof o.totalTokens !== "number" ||
      typeof o.totalLatencyMs !== "number" ||
      !Array.isArray(o.byModel) ||
      !o.byModel.every(isByModelRow)
    ) {
      return null;
    }
    return o as LlmUsageRollup;
  } catch {
    return null;
  }
}
