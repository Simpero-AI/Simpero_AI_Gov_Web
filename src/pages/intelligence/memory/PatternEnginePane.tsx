import { Network } from "lucide-react";
import { EmptyState } from "@/components/mvp/common/EmptyState";

/**
 * Institutional Memory → Pattern Engine pane. The mockup renders pattern
 * cards (title, deal-count badge, description, the deals it groups) — no
 * pattern-detection or manual-curation backend exists yet (tmp/backend-
 * prompts.md Prompt 5 leaves curated-vs-computed as an open backend call),
 * so this is an honest empty state rather than fabricated pattern cards.
 */
export function PatternEnginePane() {
  return (
    <EmptyState
      icon={Network}
      title="No patterns detected yet"
      description="Pattern Engine isn't wired to a backend yet — once it is, this will group deals under named patterns (e.g. shared pass reasons, common red flags) with a deal-count badge per pattern."
    />
  );
}
