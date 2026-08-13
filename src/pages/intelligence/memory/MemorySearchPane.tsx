import { AlertTriangle, Clock, Compass, FileText, Network, Sparkles, TrendingUp } from "lucide-react";
import { Input } from "@/components/mvp/primitives/input";

interface Suggestion {
  icon: typeof Sparkles;
  question: string;
}

const SUGGESTIONS: Suggestion[] = [
  { icon: Network, question: "What patterns led us to pass on deals?" },
  { icon: AlertTriangle, question: "How did we handle customer concentration >35%?" },
  { icon: Clock, question: "Which sectors have the fastest cycle times?" },
  { icon: TrendingUp, question: "What made our strongest deal a good pass?" },
  { icon: Compass, question: "Where have we deviated from mandate?" },
  { icon: FileText, question: "What are our top rejection reasons?" },
];

// All four stats are honest zeros, not fabricated placeholder numbers — there
// is no retrieval/indexing backend behind Memory Search yet (backend prompt
// flagged this needs its own retrieval-architecture scoping, not a reuse of
// anything existing — see tmp/backend-prompts.md Prompt 5).
const INDEX_STATS: Array<{ label: string }> = [
  { label: "deals indexed" },
  { label: "analyst notes" },
  { label: "patterns detected" },
  { label: "decisions logged" },
];

/**
 * Institutional Memory → Memory Search pane. Folds in AskMe.tsx's intent
 * (deleted, plan §5 Q9). Hero + suggestion grid mirror the mockup, but the
 * input and suggestion buttons are disabled — there's no retrieval backend
 * to answer a query yet, so a working-looking chat box would silently do
 * nothing rather than honestly show it isn't wired up.
 */
export function MemorySearchPane() {
  return (
    <div className="mx-auto max-w-[760px] pt-2 text-center">
      <div
        className="mx-auto mb-6 flex h-14 w-14 items-center justify-center rounded-2xl"
        style={{ background: "linear-gradient(140deg,#3B6FF5,#2F5FEA)" }}
      >
        <Sparkles className="h-6 w-6 text-white" aria-hidden="true" />
      </div>
      <h2 className="mb-3 font-serif text-[26px] font-semibold text-[color:var(--rev-text-1)]">Ask me anything</h2>
      <p className="mx-auto mb-6 max-w-[560px] text-[15px] leading-relaxed text-[color:var(--rev-text-5)]">
        I have full access to your deal history, analyst notes, detected patterns, and sector intelligence. What
        would you like to know?
      </p>

      <Input
        disabled
        title="Not yet wired to a backend"
        placeholder="Ask about deals, patterns, or lessons learned…"
        className="mb-5 h-auto rounded-[10px] border-[color:var(--rev-border)] px-[18px] py-3.5 text-sm"
      />

      <div className="grid grid-cols-1 gap-3 text-left sm:grid-cols-2">
        {SUGGESTIONS.map(({ icon: Icon, question }) => (
          <button
            key={question}
            type="button"
            disabled
            title="Not yet wired to a backend"
            className="flex items-center gap-3 rounded-[10px] border border-[color:var(--rev-border-strong)] bg-[color:var(--rev-surface)] px-4 py-[15px] text-left disabled:cursor-not-allowed disabled:opacity-70"
          >
            <span className="flex h-[30px] w-[30px] shrink-0 items-center justify-center rounded-lg bg-[color:var(--rev-tint-neutral)]">
              <Icon className="h-[15px] w-[15px] text-[color:var(--rev-text-4)]" aria-hidden="true" />
            </span>
            <span className="text-[13.5px] leading-snug text-[color:var(--rev-text-3)]">{question}</span>
          </button>
        ))}
      </div>

      <div className="mt-8 flex items-center justify-center gap-2.5 border-t border-[color:var(--rev-border-subtle)] pt-5 font-mono text-[12.5px] text-[color:var(--rev-text-6)]">
        {INDEX_STATS.map((stat, i) => (
          <span key={stat.label} className="flex items-center gap-2.5">
            {i > 0 ? <span aria-hidden="true">·</span> : null}
            <span>0 {stat.label}</span>
          </span>
        ))}
      </div>
    </div>
  );
}
