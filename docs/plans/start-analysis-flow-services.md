# Start Analysis → Parse Fan-Out — Services Design (Simpero_Gov_AI_Services)

> **This is a handoff document**, authored from a `Simpero_AI_Gov_Web` session (which cannot
> implement changes in either backend repo). Companion docs: `start-analysis-flow-alpha.md` (the
> actual implementation work for this feature — all of it) and `start-analysis-flow-frontend.md`.

## Bottom line

**No code changes are needed in this repo for this design.** This doc exists so an implementer
landing here can verify that claim against the actual contract, rather than take it on faith.

## Why no changes are needed

The new Alpha-side flow (`start-analysis-flow-alpha.md`) fans a deal's uploaded documents out to
this service's existing `"parse"` Valkey queue, one already-built call per document:

```python
enqueue_parse_job(storage_key, known_sha256s=None)
```

This is not a new integration — it's the same `enqueue_parse_job` /
`Simpero_AI_Gov_Alpha/app/jobs/parse_client.py` client that's existed, unused, since this queue
split was built. The only change is that Alpha will finally call it. Nothing about *what* gets
enqueued or *how it's consumed* is new.

## The contract Alpha depends on (verified, read-only)

- `parser_service/worker.py:38-45` — the consumer function signature:
  `parse_document(ctx, *, spaces_key, known_sha256s)`. Name and kwargs are dispatched-by-name via
  SAQ; Alpha's enqueue call must match exactly (it already does — see `parse_client.py`).
- `parser_service/worker.py:70-74` — a parse failure (including the "no text layer" / SIM-350
  case) comes back as a **returned dict**, not a raised exception on the queue:
  `{"status": "rejected", "code": exc.code, "message": exc.message}` — this is what lets Alpha
  read the outcome via `get_parse_job(key).result` without ever raising an unhandled worker
  exception.
- `parser_service/worker.py:95-102` — success returns
  `{"status": "parsed", "kind", "sha256", "bucket", "key", "count"}` — a Spaces bucket+key
  pointer to the parsed result, not the parsed body itself. Alpha's new flow records this pointer
  and does not fetch it (that's a later, out-of-scope stage — see the Alpha doc's D16).
- `parser_service/worker.py:105-122` — this service's own `before_process` hook already sets
  `timeout=1800, retries=2, ttl=86400` on the **consumer** side, because SAQ's default job timeout
  is 10 seconds. Alpha's enqueue side sets its own `timeout`/`retries`/`ttl` independently (see
  Alpha doc D8) — the two don't need to match, they're separate concerns (how long the parser will
  try vs. how long Alpha's fan-out task will wait).
- `parser_service/config.py:65` — `queue_name: str = "parse"`, matching Alpha's
  `PARSE_QUEUE_NAME` constant exactly. This is a cross-repo string contract with no code-level
  guard against drift on either side — if this ever changes here, `parse_client.py`'s constant
  must change in lockstep, and vice versa.
- `parser_service/docling_parser.py:457-461` — the SIM-350 detection signal already exists:
  `ParseError("no_extractable_text", "PDF contains no extractable text.", 422)`, raised when a PDF
  yields no text on any page. This is what surfaces to Alpha as
  `{"status": "rejected", "code": "no_extractable_text", ...}`.
- **`docling_parser.py:357-367` — a trap worth knowing about even though it doesn't require a
  change here.** `known_sha256s` is a *duplicate-rejection* list, not a "here's what this
  document's hash is" field — a digest present in it causes `ParseError("duplicate_pdf", ...,
  409)`. Alpha's fan-out task passes `None` for this parameter (per the Alpha doc's D12), so this
  never triggers for the new flow — flagging it here so nobody "fixes" that into passing the
  document's own fingerprint later, which would make every parse fail.
- `parser_service/worker.py:129` — this service's SAQ worker runs at `concurrency: 1`. A deal
  with multiple documents will have its parse jobs serialize on this side regardless of how many
  Alpha enqueues at once (see Alpha doc D9's cost note).

## Open item that touches this repo, not acted on here

`start-analysis-flow-alpha.md`'s Open Question 7 (OCR handoff) and its "G1 caveat" both note that
this design's dependency on this repo is narrow and stable (queue name + function contract only,
not any internal parsing behavior) — so a parse-pipeline internals change elsewhere shouldn't
require revisiting this doc. Worth a second look from whoever owns that work, but no action item
here.
