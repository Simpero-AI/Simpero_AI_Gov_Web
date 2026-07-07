/**
 * Empty-state CTA shown on /memo/:sessionId when the memo
 * predates Pass-3 (`deliverable === undefined`). Calls `onGenerate` which
 * invokes `memo.regenerateDeliverable` to compose for the first time.
 */
import { Sparkles } from "lucide-react";
import { Button } from "@/components/mvp/primitives/button";

export interface ICMemoEmptyStateProps {
  onGenerate: () => void;
  isPending: boolean;
}

export function ICMemoEmptyState({ onGenerate, isPending }: ICMemoEmptyStateProps) {
  return (
    <div className="rounded-xl border-2 border-dashed border-slate-200 p-12 text-center bg-white">
      <Sparkles className="w-12 h-12 text-emerald-600 mx-auto mb-4" />
      <h2 className="text-2xl font-semibold mb-2">Generate IC Memo</h2>
      <p className="text-sm text-muted-foreground max-w-md mx-auto mb-6">
        This deal's analysis is complete. Click below to generate the polished IC Memo deliverable
        from the extracted evidence. Takes about 10–30 seconds.
      </p>
      <Button
        onClick={onGenerate}
        disabled={isPending}
        className="border-emerald-600 bg-emerald-600 text-white hover:bg-emerald-700"
      >
        <Sparkles className="w-4 h-4 mr-1.5" />
        {isPending ? "Generating…" : "Generate IC Memo"}
      </Button>
    </div>
  );
}
