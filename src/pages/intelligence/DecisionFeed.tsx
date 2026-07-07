import { MessageSquare } from "lucide-react";
import { ComingSoonPage } from "./ComingSoonPage";

export default function DecisionFeedPage() {
  return (
    <ComingSoonPage
      pageTitle="Decision Feed"
      topbarSegments={["Intelligence", "Decision Feed"]}
      Icon={MessageSquare}
      headline="Decision Feed is coming"
      description="A live feed of AI decisions, alerts, and pattern-detected risks across your pipeline."
      gapRef="G-28"
    />
  );
}
