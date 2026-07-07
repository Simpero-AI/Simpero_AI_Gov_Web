/**
 * §6 Management Team & Board.
 *
 * Renders one card per person (name, title, background, key achievement)
 * with an initials avatar where the Figma reference used emoji photos, plus
 * a Board of Directors grid below. Wrapped in EditableSection for
 * per-section regenerate (composeKey = management_team).
 *
 * The card body lives in TeamMemberCard so the same layout is reused by the
 * /analysis Team + Founders tabs.
 */
import type { ICMemoDeliverable, MemoSection, Claim } from "@shared/simperoTypes";
import { EditableSection } from "@/components/mvp/primitives/EditableSection";
import { MissingDataPlaceholder } from "@/components/mvp/primitives/MissingDataPlaceholder";
import { TeamMemberCard } from "./TeamMemberCard";

export interface ICMemoManagementTeamProps {
  managementTeam: ICMemoDeliverable["managementTeam"];
  board: ICMemoDeliverable["board"];
  sections: MemoSection[];
  onRegenerate: (steering?: string) => void;
  onEditText: () => void;
}

export function ICMemoManagementTeam({
  managementTeam,
  board,
  sections,
  onRegenerate,
  onEditText,
}: ICMemoManagementTeamProps) {
  const allClaims: Claim[] = sections.flatMap((s) => s.claims);
  return (
    <EditableSection
      sectionLabel="Management Team & Board"
      onRegenerate={onRegenerate}
      onEditText={onEditText}
    >
      <div className="p-10 border-b bg-gray-50">
        <h2 className="text-2xl font-semibold mb-6">6. Management Team &amp; Board</h2>
        {managementTeam.provenance === "missing" ? (
          <MissingDataPlaceholder
            gapRef={managementTeam.gapRef}
            reason={managementTeam.reason}
          />
        ) : (
          <div className="grid grid-cols-2 gap-6">
            {managementTeam.value.map((p, i) => (
              <TeamMemberCard key={i} member={p} claims={allClaims} />
            ))}
          </div>
        )}
        <div className="mt-8 bg-white rounded-xl border p-6">
          <h3 className="font-semibold text-lg mb-4">Board of Directors</h3>
          {board.provenance === "missing" ? (
            <MissingDataPlaceholder gapRef={board.gapRef} reason={board.reason} />
          ) : (
            <div className="grid grid-cols-4 gap-4">
              {board.value.map((m, i) => (
                <div key={i} className="bg-gray-50 rounded-lg p-4 text-center">
                  <div className="font-medium text-gray-900">{m.name}</div>
                  <div className="text-xs text-gray-600 mt-1">{m.role}</div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </EditableSection>
  );
}
