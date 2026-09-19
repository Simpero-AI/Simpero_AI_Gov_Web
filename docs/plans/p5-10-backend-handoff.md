# P5-10 backend handoff — GET /api/deals/{deal_id}/intake-activity

Copy-pastable prompt for a Claude Code session running in `Simpero_AI_Gov_Alpha`.
Written from the Web side per this repo's CLAUDE.md rule ("Backend changes
belong in the backend repo's own session") — the frontend half (P5-10) is
built and merged against this contract; nothing here has been implemented in
Alpha.

---

## Prompt

Implement `GET /api/deals/{deal_id}/intake-activity` for ticket P5-10 (Web
repo) — a deal-scoped read of the intake audit trail, for a new Step 3 panel
on the New Deal wizard.

**Endpoint:** `GET /deals/{deal_id}/intake-activity`, same router/auth as the
other deal-scoped reads (`GET /deals/{deal_id}/intake-link`,
`GET /deals/{deal_id}/intake-response` — P3-02/P3-05 in `app/api/deals.py`).
Org-authenticated, RLS-scoped the same way.

**What it reads:** `human_audit_log` rows for this deal, filtered to the
intake `event_type` values only — do not return the general activity feed
scoped to a deal, that is a different, larger surface
(`GET /logs/recent-activity`) with no `deal_id` on it today and is out of
scope here. The intake event types, confirmed by reading `app/api/deals.py`,
`app/api/public_intake.py` and `app/api/public_uploads.py` on `staging`:

```
intake_link_generated
intake_link_reissued
intake_link_revoked
intake_email_attempt_succeeded
intake_email_attempt_failed
intake_document_uploaded
intake_document_rejected
intake_submitted
```

(The ticket's own description says "seven intake event_types" — there are
eight. `intake_link_generated` and `intake_link_reissued` are written from one
conditional expression in the generate handler, `deals.py`'s
`"intake_link_reissued" if reissued else "intake_link_generated"`, which is
almost certainly why the brief counted them as one. The Web-side panel labels
them differently — "link created" vs "link reissued" — so please keep both as
distinct values on the wire rather than collapsing them.)

**Response shape** (`IntakeActivityResponse`, `CamelModel` per this codebase's
convention, `app/schemas/`):

```python
class IntakeActivityRowResponse(CamelModel):
    id: int
    created_at: datetime
    event_type: Literal[
        "intake_link_generated",
        "intake_link_reissued",
        "intake_link_revoked",
        "intake_email_attempt_succeeded",
        "intake_email_attempt_failed",
        "intake_document_uploaded",
        "intake_document_rejected",
        "intake_submitted",
    ]
    actor_email: str | None
    payload: dict | None  # whatever human_audit_log.payload already holds for that row


class IntakeActivityResponse(CamelModel):
    rows: list[IntakeActivityRowResponse]
```

Ordered newest first (`created_at DESC`), matching the other list reads in
this feature. No pagination for v1 — an intake trail for one deal is at most a
few dozen rows.

**404 vs empty:** the Web client
(`src/api/intakeActivity.ts::parseIntakeActivityResponse`) already treats a
404 as "no intake history for this deal" and renders an empty list — it does
NOT treat 404 as an error. Either a 404 (deal has no `deal_intake_link` row at
all) or a 200 with `rows: []` works from the frontend's side; pick whichever
is more consistent with `GET /intake-link`'s own 404 behavior on this deal, so
the two endpoints agree about what "no intake activity" means for the same
deal.

**Auth/authorization:** identical to `GET /deals/{deal_id}/intake-link` and
`GET /deals/{deal_id}/intake-response` — same dependency, same 404-for-unknown-
or-cross-tenant-deal behavior (do not distinguish "deal doesn't exist" from
"deal belongs to another org" in the response, same as those two).

**Payload field:** loosely typed (`dict | None`) deliberately, mirroring
`RecentActivityRow.payload` in the existing `GET /logs/recent-activity`
endpoint's own contract. The Web panel reads only one key out of it —
`filename`, on `intake_document_uploaded` / `intake_document_rejected` rows —
and renders defensively if it's absent, so no new payload shape needs to be
introduced; whatever `HumanAuditRepo.append` already receives for these event
types today is sufficient. Please confirm document events already carry a
`filename` key in their payload (they're written from `app/api/public_uploads.py`) and note it in the PR if the key is named something else.

**Testing convention (per this repo's own rules — see CLAUDE.md's pre-PR
checklist and P3-05's real precedent):**
- A DB-level test alongside any endpoint test, not just an endpoint test that
  happens to exercise it indirectly.
- Cross-tenant negative case (same idiom as `test_intake_response_rls.py` /
  `test_intake_link_rls.py`).
- 404-for-unknown-deal case.
- A case with a genuinely empty trail (deal has an intake link but no events
  yet reachable — arguably impossible today since generating a link itself
  writes `intake_link_generated`, so this may just be the "no link at all"
  case; worth confirming which is real).

## Context you don't need to re-derive

- `docs/plans/external-deal-intake-link-web-status.md` (Web repo) has the full
  P5-10 status row and links back here.
- The Web-side contract this must match is
  `Simpero_AI_Gov_Web/src/api/intakeActivity.ts` — read it directly; every
  field name, the `IntakeActivityEventType` union, and the 404 handling are
  pinned there in `camelCase`, and the backend's `CamelModel` should serialize
  to exactly that shape.
- The panel itself is `Simpero_AI_Gov_Web/src/pages/newDealWizard/IntakeActivityPanel.tsx`, wired into `Step3Confirm.tsx` and gated on
  `intakeStatus != null` (i.e. only shown once a deal has ever had an intake
  link, same gate as the answers/documents panels above it).
