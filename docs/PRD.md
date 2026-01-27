# PRD — Aequor Intelligence (MVP)

## 1) Purpose
Aequor Intelligence is a decision-support / market-intelligence web app for marine fuels, with an early focus on green methanol. The MVP is designed to demonstrate shipping/trade-oriented reasoning via:
- a fast consolidated market overview feed,
- a transparent scenario calculator for voyage fuel-cost impact,
- configurable alerts,
- and professional documentation (data policy, methods/limitations, contracts).

Primary objective: portfolio-grade MVP suitable for a 60–90 second demo.

## 2) Target users (multi-persona)
- Shipowners/operators
- Bunker suppliers/traders
- PtX producers/developers
- Analysts/researchers

The MVP supports all personas through filters, tags, watchlists, and transparent assumptions (not through complex role-based UX).

## 3) MVP scope
### 3.1 Market Overview Feed (flagship)
Single tab for daily scanning:
- Event list: title + 1-sentence summary
- Mandatory source reference (SourceRef)
- Tags: fuel, region, port, event type
- Timestamp + confidence (low/medium/high)
- Filters + search + time window
- Public vs Private boundary (private is for BYOD data only)

### 3.2 Route/Voyage Fuel-Cost Impact (simple calculator)
- Inputs: route/voyage template + consumption method (total OR per-day x days)
- Scenarios: low/base/high price assumptions
- Outputs: cost low/base/high, and an assumptions panel
- Clear disclaimer in output

### 3.3 Alerts/Watchlists (in-app)
- Watchlists: ports, regions, fuels, keywords, event types
- Alerts triggered when new events match watchlist rules
- MVP delivery: in-app notifications (email optional later)

## 4) Out of scope (MVP)
- Trade execution, brokerage, order routing
- Public redistribution of proprietary broker quotes or paid price assessments
- Full voyage optimization / weather routing
- “Compliance certification” or claims of regulatory authority
- Claims of “real-time market prices” without licensing

## 5) Key design decisions (to prevent redesign)
- The feed uses one normalized object: `FeedEvent`
- Every feed event must contain at least one `SourceRef`
- Visibility is explicit: `visibility = public | private`
- Public feed cannot show any broker-derived content
- Data ingestion is via adapters; UI consumes only domain contracts

## 6) Demo success criteria (60–90 seconds)
A reviewer should be able to watch this sequence:
1) Open Market Overview Feed (pre-seeded dummy dataset)
2) Apply filters (Fuel=Methanol, Region=North Europe, Port=Rotterdam/Copenhagen)
3) Open an event and show its SourceRef
4) Run a voyage scenario preset (low/base/high) and show cost range
5) Create a “Rotterdam + methanol” watchlist and trigger an alert by adding a new matching dummy event

## 7) Non-functional requirements
- Traceability: every event shows its source(s)
- Determinism: same filters -> same results
- Boundary enforcement: private BYOD data never appears in public mode
- Documentation: data policy + methods/limitations available in repo and linked in-app

## 8) Future roadmap (post-MVP)
- Expand ports dataset and readiness notes (structured)
- Exportable daily brief per watchlist (PDF)
- Optional contract/offtake memo module (only with defensible sourcing)
- Stronger clustering/deduplication
