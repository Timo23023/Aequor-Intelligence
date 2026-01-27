# Acceptance Tests — Aequor Intelligence (MVP)

All tests must be passable using DummyAdapter data.

## A) Market Overview Feed (Flagship)
1) Mandatory SourceRef
- Given any FeedEvent displayed in the feed, it MUST display at least one source reference.
- If an event lacks SourceRef, it MUST NOT appear.

2) Public vs Private boundary
- In Public mode, feed shows ONLY visibility=public events.
- In Public mode, no event may include SourceRef.source_type=private_byod.
- In Private mode (authenticated), feed may show both public and private events (if allowed by user scope).

3) Filters
- Given dummy data across at least 5 regions and 3 fuels, applying a Region filter reduces results to matching events only.
- Fuel filter reduces results to matching events only.
- Port filter reduces results to matching events only.
- EventType filter reduces results to matching events only.

4) Search
- Query matches title and summary (case-insensitive).
- Search + filters combined behaves deterministically (same inputs => same outputs).

5) Time window
- Setting time_from/time_to returns only events inside the window.

6) Expand view
- Clicking an event reveals details and source links without navigation errors.

Definition of Done:
- All above tests pass with DummyAdapter and UI supports the demo flow.

## B) Voyage/Route Cost Impact Calculator
1) Input validation
- Must reject missing consumption inputs (must provide total OR (per_day + days)).
- Must reject invalid scenario ordering (low > base or base > high).

2) Output correctness (basic)
- For a known preset, output is deterministic and equals expected values.
- Output includes an explicit disclaimer string.

3) Scenario display
- UI shows low/base/high cost outputs clearly with currency.
- UI shows assumptions block (fuel type, price inputs, consumption method).

Definition of Done:
- One preset can be run end-to-end in under 20 seconds.

## C) Alerts / Watchlists
1) Rule creation
- User can create an alert rule with at least one filter (keyword or port or fuel).

2) Triggering
- When a new event matching the rule is added, an in-app alert is created with reason.

3) Boundary enforcement
- Private BYOD events can trigger ONLY private alert rules.
- Public mode cannot view private alerts.

Definition of Done:
- In demo, create a “Rotterdam + methanol” alert and trigger it with a dummy event insertion.

## D) Compliance checks (must always hold)
1) Public feed never shows private_byod content.
2) Every displayed item has a source.
3) Docs exist in repo and are linkable from the UI: Data Policy + Methods & Limitations (can be a simple page).

## MVP completion criteria (portfolio-ready)
- Live demo shows: Feed → filter → open source link → run voyage scenario → create and trigger alert.
- Repo includes: README, PRD, DATA_POLICY, CONTRACTS, ACCEPTANCE_TESTS.
- Short demo video recorded (60–90 seconds).
