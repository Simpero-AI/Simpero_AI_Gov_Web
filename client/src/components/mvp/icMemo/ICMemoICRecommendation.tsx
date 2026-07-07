/**
 * §11 Investment Committee Recommendation.
 *
 * Big verdict header (APPROVE INVESTMENT / PROCEED WITH CAUTION / DECLINE
 * INVESTMENT — coloured per verdict.value), prose block, highlight bullets
 * (each rendered via SourcedValue), and a 3-card IC voting block. The
 * current user's card (isCurrentUser: true) gets interactive Approve /
 * Decline buttons wired to onSubmitVote; the other cards show a stub
 * caption flagging the deferred multi-member IC voting work.
 *
 * Wrapped in EditableSection for per-section regenerate
 * (composeKey = ic_recommendation_prose).
 *
 * Class lookups use static maps because Tailwind v4 JIT cannot pick up
 * dynamically interpolated class names like `bg-${color}-50`.
 */
import type { ICMemoDeliverable } from "@shared/simperoTypes";
import { CheckCircle, Users, ThumbsUp, XCircle, AlertTriangle } from "lucide-react";
import { Button } from "@/components/mvp/primitives/button";
import { SourcedValue } from "@/components/mvp/primitives/SourcedValue";
import { EditableSection } from "@/components/mvp/primitives/EditableSection";
import { MissingDataPlaceholder } from "@/components/mvp/primitives/MissingDataPlaceholder";

type VerdictKey = "PROCEED" | "CAUTION" | "DECLINE" | "UNKNOWN";

interface VerdictTheme {
  label: string;
  outerWrap: string;
  heading: string;
  cardBorder: string;
  iconColor: string;
  verdictText: string;
  Icon: typeof CheckCircle;
}

const VERDICT_THEME: Record<VerdictKey, VerdictTheme> = {
  PROCEED: {
    label: "APPROVE INVESTMENT",
    outerWrap:
      "p-10 bg-gradient-to-br from-emerald-50 to-green-50 border-t-4 border-emerald-600",
    heading: "text-3xl font-semibold text-emerald-900 mb-6 text-center",
    cardBorder: "bg-white rounded-xl border-4 border-emerald-400 p-8 mb-6",
    iconColor: "w-16 h-16 text-emerald-600",
    verdictText: "text-4xl font-bold text-emerald-900 mb-2",
    Icon: CheckCircle,
  },
  CAUTION: {
    label: "PROCEED WITH CAUTION",
    outerWrap:
      "p-10 bg-gradient-to-br from-amber-50 to-orange-50 border-t-4 border-amber-600",
    heading: "text-3xl font-semibold text-amber-900 mb-6 text-center",
    cardBorder: "bg-white rounded-xl border-4 border-amber-400 p-8 mb-6",
    iconColor: "w-16 h-16 text-amber-600",
    verdictText: "text-4xl font-bold text-amber-900 mb-2",
    Icon: AlertTriangle,
  },
  DECLINE: {
    label: "DECLINE INVESTMENT",
    outerWrap:
      "p-10 bg-gradient-to-br from-red-50 to-rose-50 border-t-4 border-red-600",
    heading: "text-3xl font-semibold text-red-900 mb-6 text-center",
    cardBorder: "bg-white rounded-xl border-4 border-red-400 p-8 mb-6",
    iconColor: "w-16 h-16 text-red-600",
    verdictText: "text-4xl font-bold text-red-900 mb-2",
    Icon: XCircle,
  },
  UNKNOWN: {
    label: "—",
    outerWrap:
      "p-10 bg-gradient-to-br from-slate-50 to-gray-50 border-t-4 border-slate-400",
    heading: "text-3xl font-semibold text-slate-900 mb-6 text-center",
    cardBorder: "bg-white rounded-xl border-4 border-slate-300 p-8 mb-6",
    iconColor: "w-16 h-16 text-slate-500",
    verdictText: "text-4xl font-bold text-slate-700 mb-2",
    Icon: CheckCircle,
  },
};

export interface ICMemoICRecommendationProps {
  icRecommendation: ICMemoDeliverable["icRecommendation"];
  icVotingMembers: ICMemoDeliverable["icVotingMembers"];
  verdict: ICMemoDeliverable["recommendation"]["verdict"];
  onRegenerate: (steering?: string) => void;
  onEditText: () => void;
  onSubmitVote: (vote: "approved" | "declined") => void;
  isPending: boolean;
}

export function ICMemoICRecommendation({
  icRecommendation,
  icVotingMembers,
  verdict,
  onRegenerate,
  onEditText,
  onSubmitVote,
  isPending,
}: ICMemoICRecommendationProps) {
  const verdictKey: VerdictKey =
    verdict.value === "PROCEED" ||
    verdict.value === "CAUTION" ||
    verdict.value === "DECLINE"
      ? verdict.value
      : "UNKNOWN";
  const theme = VERDICT_THEME[verdictKey];
  const VerdictIcon = theme.Icon;
  const members =
    icVotingMembers.provenance === "missing" ? [] : icVotingMembers.value;
  return (
    <EditableSection
      sectionLabel="IC Recommendation"
      onRegenerate={onRegenerate}
      onEditText={onEditText}
    >
      <div className={theme.outerWrap}>
        <h2 className={theme.heading}>Investment Committee Recommendation</h2>
        <div className={theme.cardBorder}>
          <div className="flex items-center justify-center gap-4 mb-6">
            <VerdictIcon className={theme.iconColor} />
            <div className="text-center">
              <div className={theme.verdictText}>{theme.label}</div>
            </div>
          </div>
          <div className="prose max-w-none">
            <div className="text-gray-700 leading-relaxed mb-4 whitespace-pre-line">
              <SourcedValue sourced={icRecommendation.prose} />
            </div>
            {icRecommendation.highlightBullets.length > 0 && (
              <ul className="space-y-2 text-gray-700 mb-4 list-disc list-inside">
                {icRecommendation.highlightBullets.map((b, i) => (
                  <li key={i} className="leading-relaxed">
                    <SourcedValue
                      sourced={b}
                      format={(v) => (v === null ? "" : String(v))}
                    />
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
        <div className="bg-white rounded-xl border p-6">
          <h3 className="font-semibold text-lg mb-4">
            Investment Committee Voting
          </h3>
          {icVotingMembers.provenance === "missing" ? (
            <div className="mb-6">
              <MissingDataPlaceholder
                gapRef={icVotingMembers.gapRef}
                reason={icVotingMembers.reason}
              />
            </div>
          ) : (
            <div className="grid grid-cols-3 gap-4 mb-6">
              {members.map((m, i) => (
                <div
                  key={i}
                  className={`border-2 rounded-xl p-5 ${
                    m.isCurrentUser
                      ? "bg-blue-50 border-blue-300"
                      : "bg-gray-50 border-gray-200"
                  }`}
                >
                  <div className="flex items-center gap-3 mb-4">
                    <div className="w-12 h-12 bg-gray-200 rounded-full flex items-center justify-center">
                      <Users className="w-6 h-6 text-gray-600" />
                    </div>
                    <div>
                      <div className="font-semibold text-gray-900">
                        {m.name}
                        {m.isCurrentUser ? " (you)" : ""}
                      </div>
                      <div className="text-sm text-gray-600">{m.role}</div>
                    </div>
                  </div>
                  {m.isCurrentUser ? (
                    <div className="space-y-2">
                      <Button
                        onClick={() => onSubmitVote("approved")}
                        disabled={isPending}
                        className="w-full bg-emerald-600 text-white hover:bg-emerald-700"
                      >
                        <ThumbsUp className="w-4 h-4 mr-2" />
                        Approve
                      </Button>
                      <Button
                        onClick={() => onSubmitVote("declined")}
                        disabled={isPending}
                        variant="outline"
                        className="w-full"
                      >
                        <XCircle className="w-4 h-4 mr-2" />
                        Decline
                      </Button>
                    </div>
                  ) : (
                    <div className="text-xs text-muted-foreground italic">
                      Vote pending
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
          <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
            <p className="text-sm text-blue-900">
              <strong>Note:</strong> Multi-member IC voting is coming soon. Today only your vote affects the deal state via the existing workflow buttons.
            </p>
          </div>
        </div>
      </div>
    </EditableSection>
  );
}
