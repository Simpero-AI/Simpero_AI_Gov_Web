/**
 * Pure deterministic title banner for the IC Memo.
 *
 * Confidential pill + deal name + round label + meta row
 * (prepared by, optional IC meeting date, firm name).
 */
import { Users, Calendar, Building } from "lucide-react";

export interface ICMemoTitleBlockProps {
  dealName: string;
  /** e.g. "Series B Growth Capital Investment". */
  roundLabel: string;
  preparedByName: string;
  icMeetingDate?: string;
  firmName: string;
}

export function ICMemoTitleBlock({
  dealName,
  roundLabel,
  preparedByName,
  icMeetingDate,
  firmName,
}: ICMemoTitleBlockProps) {
  return (
    <div className="p-10 border-b bg-gradient-to-b from-slate-50 to-white text-center">
      <div className="inline-block px-4 py-1.5 bg-red-100 text-red-700 rounded-full text-xs font-medium mb-4">
        CONFIDENTIAL — FOR IC MEMBERS ONLY
      </div>
      <h1 className="text-4xl mb-3">{dealName}</h1>
      <div className="text-xl text-gray-700 mb-6">{roundLabel}</div>
      <div className="flex justify-center gap-12 text-sm text-gray-600">
        <div className="flex items-center gap-2">
          <Users className="w-4 h-4" />
          <span>Prepared by: {preparedByName}</span>
        </div>
        {icMeetingDate ? (
          <div className="flex items-center gap-2">
            <Calendar className="w-4 h-4" />
            <span>IC Meeting: {icMeetingDate}</span>
          </div>
        ) : null}
        <div className="flex items-center gap-2">
          <Building className="w-4 h-4" />
          <span>{firmName}</span>
        </div>
      </div>
    </div>
  );
}
