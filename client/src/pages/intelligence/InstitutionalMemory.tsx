import { Brain } from "lucide-react";
import { ComingSoonPage } from "./ComingSoonPage";

const SUB_TOPICS = [
  { title: "Memory Search", desc: "Full-text + semantic search across past memos and decisions." },
  { title: "Analyst Notes", desc: "Personal and team analyst commentary attached to deals." },
  { title: "Pattern Engine", desc: "Auto-detected patterns across declined / approved deals." },
  { title: "Playbooks", desc: "Reusable diligence sequences for sector or stage." },
  { title: "Sector Intel", desc: "Aggregated sector signal from your portfolio." },
  { title: "Decision Log", desc: "Append-only record of IC decisions with rationale." },
];

export default function InstitutionalMemoryPage() {
  return (
    <ComingSoonPage
      pageTitle="Institutional Memory"
      topbarSegments={["Intelligence", "Institutional Memory"]}
      Icon={Brain}
      headline="Institutional Memory is coming"
      description="A unified workspace for your fund's collective intelligence."
      gapRef="G-29"
      subTopics={SUB_TOPICS}
    />
  );
}
