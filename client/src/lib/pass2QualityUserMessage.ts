import type { Pass2QualitySummary } from "@shared/simperoTypes";

/** Short, non-technical copy for the Pass 2 degradation banner (details live under Technical details). */
export function getPass2BannerUserSummary(q: Pass2QualitySummary): string {
  const ratioWeak =
    q.pendingAfterPass1 >= 3 && q.verifiedByPass2 / q.pendingAfterPass1 < 0.25;

  if (q.mode === "pinecone_fallback_tfidf" || q.mode === "tfidf") {
    const base =
      q.mode === "pinecone_fallback_tfidf"
        ? "Full automatic citation verification did not finish for this run, so a lighter method was used."
        : "Citation matching used a lighter automatic method for this run.";
    const tail = ratioWeak
      ? " Only a small share of open citations were tied to the source automatically—check the rest against the document."
      : " Confirm important facts against the source document before you rely on them.";
    return base + tail;
  }

  if (q.mode === "pinecone" && ratioWeak) {
    return "Automatic verification linked only a small share of citations that still needed source support. Review those claims manually against the document.";
  }

  return "Review citations carefully for this memo before reliance.";
}
