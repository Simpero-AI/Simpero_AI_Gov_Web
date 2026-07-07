/**
 * Pure card for one management team / founder entry.
 *
 * Extracted from ICMemoManagementTeam so the same card layout backs both the
 * polished /memo §6 grid and the /analysis Team + Founders tabs. The
 * initials-avatar helper is co-located here since it is only meaningful for
 * the card body.
 */
import type { SourcedSentence, Claim } from "@shared/simperoTypes";
import { ProseWithClaims } from "@/components/mvp/primitives/ClaimText";

export interface TeamMember {
  name: string;
  title: string;
  background: string | SourcedSentence[];
  keyAchievement?: string | SourcedSentence[];
}

export interface TeamMemberCardProps {
  member: TeamMember;
  claims?: Claim[];
}

export function initials(name: string): string {
  return name
    .split(/\s+/)
    .map((p) => p[0])
    .filter(Boolean)
    .slice(0, 2)
    .join("")
    .toUpperCase();
}

export function TeamMemberCard({ member, claims = [] }: TeamMemberCardProps) {
  return (
    <div className="bg-white rounded-xl border p-6">
      <div className="flex items-start gap-4 mb-4">
        <div className="w-16 h-16 bg-gray-200 rounded-full flex items-center justify-center text-xl font-semibold text-gray-600">
          {initials(member.name)}
        </div>
        <div>
          <h3 className="font-semibold text-lg text-gray-900">{member.name}</h3>
          <p className="text-blue-600">{member.title}</p>
        </div>
      </div>
      <p className="text-sm text-gray-700 leading-relaxed mb-3">
        <ProseWithClaims content={member.background} claims={claims} />
      </p>
      {member.keyAchievement && (
        <div className="bg-blue-50 rounded-lg p-3 border-l-4 border-blue-600">
          <p className="text-sm text-blue-900">
            <strong>Key Achievement:</strong>{" "}
            <ProseWithClaims content={member.keyAchievement} claims={claims} />
          </p>
        </div>
      )}
    </div>
  );
}
