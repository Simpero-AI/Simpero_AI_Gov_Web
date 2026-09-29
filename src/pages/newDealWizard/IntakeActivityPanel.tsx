import {
  INTAKE_ACTIVITY_LABELS,
  intakeActivityFilename,
  isAdverseIntakeEvent,
  type IntakeActivityRow,
} from "@/api/intakeActivity";

interface IntakeActivityPanelProps {
  rows: IntakeActivityRow[];
  loading: boolean;
  /**
   * True when the fetch failed. Rendered as a stated failure rather than as an
   * empty trail: "nothing happened" and "we could not read what happened" are
   * different claims, and on an audit surface conflating them is the one thing
   * that would make the panel actively misleading.
   */
  errored?: boolean;
}

/**
 * P5-10 — one deal's intake history, on Step 3.
 *
 * Deliberately read-only and deliberately narrow: it shows the eight intake
 * event types and nothing else. The alternative shape considered in the ticket
 * (a `dealId` filter on the general activity endpoint) would have put these
 * rows in the same feed as `mandate_saved` and `analysis_requested`, where the
 * question this panel answers — what happened to the link I sent, and did it
 * reach the right person — gets buried.
 */
export function IntakeActivityPanel({
  rows,
  loading,
  errored = false,
}: IntakeActivityPanelProps) {
  return (
    <div
      className="bg-white rounded-xl border border-gray-200 p-6"
      data-testid="wizard-intake-activity"
    >
      <h2 className="text-sm font-bold text-gray-900 uppercase tracking-wider mb-4">
        Intake Activity
      </h2>

      {loading ? (
        <p className="text-sm text-gray-500" data-testid="wizard-intake-activity-loading">
          Loading intake history…
        </p>
      ) : errored ? (
        <p className="text-sm text-amber-700" data-testid="wizard-intake-activity-error">
          Could not load the intake history for this deal. The events are still
          recorded — this view failed, not the audit trail.
        </p>
      ) : rows.length === 0 ? (
        <p className="text-sm text-gray-500" data-testid="wizard-intake-activity-empty">
          No intake activity recorded for this deal yet.
        </p>
      ) : (
        <ol className="space-y-3" data-testid="wizard-intake-activity-list">
          {rows.map(row => {
            const filename = intakeActivityFilename(row.payload);
            const adverse = isAdverseIntakeEvent(row.eventType);
            return (
              <li
                key={row.id}
                className="flex items-start justify-between gap-4"
                data-testid={`wizard-intake-activity-row-${row.id}`}
              >
                <div className="min-w-0">
                  <p
                    className={`text-sm font-medium ${
                      adverse ? "text-amber-700" : "text-gray-900"
                    }`}
                  >
                    {/* Falls back to the raw event type rather than rendering
                        nothing, so an event added backend-side before this map
                        catches up is visible instead of silently dropped. */}
                    {INTAKE_ACTIVITY_LABELS[row.eventType] ?? row.eventType}
                  </p>
                  {filename !== null && (
                    <p className="text-xs text-gray-500 mt-0.5 truncate">
                      {filename}
                    </p>
                  )}
                  {row.actorEmail !== null && (
                    <p className="text-xs text-gray-500 mt-0.5 truncate">
                      {row.actorEmail}
                    </p>
                  )}
                </div>
                <time
                  className="text-xs text-gray-500 shrink-0"
                  dateTime={row.createdAt}
                >
                  {new Date(row.createdAt).toLocaleString()}
                </time>
              </li>
            );
          })}
        </ol>
      )}
    </div>
  );
}
