/**
 * §2 Investment Thesis — six themed cards.
 *
 * Each card maps an LLM-emitted iconKey (from the closed IcMemoIconKey allowlist)
 * to a lucide icon via lucideIconForKey, and cycles through a six-color theme
 * palette (emerald / blue / purple / amber / indigo / rose). Tailwind classes
 * are written out as literals (not interpolated) so the JIT compiler picks
 * them up — Tailwind v4 in this repo has no safelist.
 *
 * Wrapped in EditableSection for per-section regenerate
 * (composeKey = investment_thesis_cards). When the composer refused
 * (provenance === "missing"), we render a MissingDataPlaceholder pinned to
 * the gapRef so analysts can jump to the parity-gaps page.
 */
import type { ICMemoDeliverable, MemoSection, Claim } from "@shared/simperoTypes";
import { CheckCircle } from "lucide-react";
import { EditableSection } from "@/components/mvp/primitives/EditableSection";
import { MissingDataPlaceholder } from "@/components/mvp/primitives/MissingDataPlaceholder";
import { ProseWithClaims } from "@/components/mvp/primitives/ClaimText";
import { lucideIconForKey } from "./lucideIconForKey";

export interface ICMemoInvestmentThesisProps {
  cards: ICMemoDeliverable["investmentThesisCards"];
  sections: MemoSection[];
  onRegenerate: (steering?: string) => void;
  onEditText: () => void;
}

type ThemeClasses = {
  iconWrap: string;
  iconText: string;
};

// Literal class strings — Tailwind v4 needs to see them in source.
const THEME_PALETTE: ThemeClasses[] = [
  { iconWrap: "bg-emerald-100", iconText: "text-emerald-600" },
  { iconWrap: "bg-blue-100", iconText: "text-blue-600" },
  { iconWrap: "bg-purple-100", iconText: "text-purple-600" },
  { iconWrap: "bg-amber-100", iconText: "text-amber-600" },
  { iconWrap: "bg-indigo-100", iconText: "text-indigo-600" },
  { iconWrap: "bg-rose-100", iconText: "text-rose-600" },
];

export function ICMemoInvestmentThesis({
  cards,
  sections,
  onRegenerate,
  onEditText,
}: ICMemoInvestmentThesisProps) {
  const allClaims: Claim[] = sections.flatMap((s) => s.claims);
  return (
    <EditableSection
      sectionLabel="Investment Thesis"
      onRegenerate={onRegenerate}
      onEditText={onEditText}
    >
      <div className="p-10 border-b bg-gray-50">
        <h2 className="text-2xl font-semibold mb-6">2. Investment Thesis</h2>
        {cards.provenance === "missing" || cards.value === null ? (
          <MissingDataPlaceholder gapRef={cards.gapRef} reason={cards.reason} />
        ) : (
          <div className="grid grid-cols-2 gap-6">
            {cards.value.map((card, i) => {
              const Icon = lucideIconForKey(card.iconKey);
              const theme = THEME_PALETTE[i % THEME_PALETTE.length]!;
              return (
                <div
                  key={i}
                  className="bg-white rounded-xl border-2 p-6 hover:shadow-lg transition"
                >
                  <div className="flex items-start gap-4 mb-4">
                    <div
                      className={`w-12 h-12 ${theme.iconWrap} rounded-lg flex items-center justify-center flex-shrink-0`}
                    >
                      <Icon className={`w-6 h-6 ${theme.iconText}`} />
                    </div>
                    <div>
                      <h3 className="font-semibold text-lg text-gray-900">
                        {card.theme}
                      </h3>
                    </div>
                  </div>
                  <ul className="space-y-2">
                    {card.bullets.map((b, j) => (
                      <li
                        key={j}
                        className="flex items-start gap-2 text-sm text-gray-700"
                      >
                        <CheckCircle
                          className={`w-4 h-4 ${theme.iconText} mt-0.5 flex-shrink-0`}
                        />
                        <ProseWithClaims content={typeof b === "string" ? b : [b]} claims={allClaims} />
                      </li>
                    ))}
                  </ul>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </EditableSection>
  );
}
