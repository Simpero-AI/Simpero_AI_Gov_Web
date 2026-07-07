/**
 * Blue notice band summarizing the evidence corpus the LLM
 * composer drew from. Pure deterministic — counts are pre-computed by Pass-3
 * and stored on `deliverable.aiGenerationNotice`.
 */
import { Sparkles } from "lucide-react";
import type { ICMemoDeliverable } from "@shared/simperoTypes";

export interface ICMemoAIGenerationNoticeProps {
  notice: ICMemoDeliverable["aiGenerationNotice"];
}

export function ICMemoAIGenerationNotice({ notice }: ICMemoAIGenerationNoticeProps) {
  return (
    <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border-2 border-blue-200 rounded-xl p-4">
      <div className="flex items-start gap-3">
        <Sparkles className="w-6 h-6 text-blue-600 mt-0.5 shrink-0" />
        <div>
          <div className="font-medium text-blue-900 mb-1">AI-Enhanced Memo Generation</div>
          <div className="text-sm text-blue-800">
            This memo was automatically generated from{" "}
            <strong>{notice.ddResponseCount}</strong> verified due diligence claims,{" "}
            <strong>{notice.documentCount}</strong> document chunks,{" "}
            <strong>{notice.financialModelCount}</strong> financial model(s), and{" "}
            <strong>{notice.comparableTxnCount}</strong> comparable transactions/competitors. All
            sections are editable — click any Edit pencil.
          </div>
        </div>
      </div>
    </div>
  );
}
