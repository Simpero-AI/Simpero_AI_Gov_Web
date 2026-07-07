import { Sparkles } from "lucide-react";
import { ComingSoonPage } from "./ComingSoonPage";

export default function AskMePage() {
  return (
    <ComingSoonPage
      pageTitle="Ask Me"
      topbarSegments={["Intelligence", "Ask Me"]}
      Icon={Sparkles}
      headline="Ask Me is coming"
      description="Ask questions across your institutional memory using natural language."
      gapRef="G-28"
    />
  );
}
