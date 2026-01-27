# Aequor Intelligence

Aequor Intelligence is a decision-support and market-intelligence web app for marine fuels (with an early focus on green methanol). It helps maritime stakeholders scan market signals quickly, apply filters by fuel/region/port, and translate assumptions into simple route/voyage fuel-cost impact scenarios.

## What it is
- **Market Overview Feed (flagship):** a consolidated feed of market events with sources, tags, timestamps, and confidence framing
- **Route/Voyage Cost Impact:** a simple scenario calculator (low/base/high assumptions)
- **Alerts/Watchlists:** notifications for ports, regions, fuels, and keywords
- **Documentation-first:** clear methods, limitations, and data policy

## What it is NOT
- Not a broker, not a trading venue, and does not execute trades
- Not financial advice
- Not a public redistributor of proprietary broker quotes or paid price assessments

## Data policy (non-negotiable)
- **Public/Open sources + user input** are allowed for the public experience
- **Broker/paid data** is allowed only via **user-authorized private integrations (BYOD)** and must remain **private**
- Every feed item must include at least one **SourceRef**; items without sources cannot be published

## MVP modules (Phase 1)
1) Market Overview Feed (dummy data first, real sources later)
2) Route/Voyage Cost Impact (simple calculator)
3) Alerts/Watchlists (in-app)

## Demo success criteria (60–90 seconds)
1) Open Market Overview Feed (seeded dummy data)
2) Apply filters (Fuel + Region + Port)
3) Open an event and show its source reference
4) Run a voyage scenario preset (low/base/high) and show cost range
5) Create a watchlist and trigger an alert with a new matching event

## Repo structure
- `/app` — application entry points
- `/domain` — schemas, validation rules, business logic
- `/adapters` — data adapters (Dummy, PublicSources, BYOD Broker)
- `/services` — feed service, calculator service, alert service
- `/ui` — UI components/pages
- `/docs` — PRD, Data Policy, Contracts, Acceptance Tests

## License / Disclaimer
Informational decision-support only. No warranty. No financial advice.
