# Contracts — Aequor Intelligence (Frozen Interfaces)

These contracts are the single source of truth. UI and services MUST depend only on these contracts.
Adapters may change internally, but must not break these schemas or method signatures.

Notation: JSON-like schema with required fields and validation rules.

---

## 1) Shared primitives

### ID
- type: string
- rule: non-empty; stable across storage

### ISODateTime
- type: string
- rule: ISO 8601 (e.g., 2026-01-24T17:00:00Z)

### Visibility
- enum: "public" | "private"
- rule: private content MUST NOT be shown in public mode

### Confidence
- enum: "low" | "medium" | "high"
- rule: required for public events

### FuelType
- enum (MVP): "methanol_green" | "methanol_conventional" | "vlsfo" | "ulsfo" | "mgo" | "lng" | "ammonia" | "hydrogen" | "other"
- rule: extensible; UI must handle unknown gracefully

### Region
- enum (MVP): "north_europe" | "mediterranean" | "middle_east" | "asia" | "north_america" | "south_america" | "africa" | "oceania" | "global" | "other"

### EventType
- enum (MVP): "supply" | "demand" | "regulation" | "disruption" | "project" | "port_update" | "price_proxy" | "analysis" | "other"

---

## 2) SourceRef (MANDATORY)

### SourceRef schema
{
  "source_id": string (required),
  "source_type": "public" | "user_input" | "private_byod" (required),
  "title": string (required),
  "url": string (optional; required if source_type="public"),
  "publisher": string (optional),
  "retrieved_at": ISODateTime (required),
  "license_notes": string (required),
  "display_policy": "public" | "private" (required)
}

Validation rules:
- If source_type="private_byod" then display_policy MUST be "private"
- If display_policy="private" then any FeedEvent referencing this SourceRef MUST be visibility="private"
- Every FeedEvent MUST have at least one SourceRef

---

## 3) FeedEvent (core object)

### FeedEvent schema
{
  "id": ID (required),
  "created_at": ISODateTime (required),
  "event_time": ISODateTime (required),
  "visibility": Visibility (required),

  "title": string (required; max 120),
  "summary": string (required; max 280),
  "details": string (optional; max 2000),

  "event_type": EventType (required),
  "fuel_types": FuelType[] (required; min 1),
  "regions": Region[] (required; min 1),
  "ports": string[] (optional),
  "tags": string[] (optional; max 12),

  "confidence": Confidence (required if visibility="public"),
  "source_refs": SourceRef[] (required; min 1),

  "metrics": {
    "unit": string (optional),
    "value_low": number (optional),
    "value_base": number (optional),
    "value_high": number (optional),
    "notes": string (optional; max 200)
  }
}

Validation rules:
- visibility="public" requires confidence and at least one SourceRef with display_policy="public"
- visibility="public" MUST NOT include any SourceRef where source_type="private_byod"
- If any source_ref.display_policy="private" then visibility MUST be "private"
- Any event missing source_refs is invalid and cannot be published

---

## 4) Port

### Port schema
{
  "id": ID (required),
  "name": string (required),
  "region": Region (required),
  "country": string (optional),
  "locode": string (optional),
  "is_major_hub": boolean (default false),
  "notes": string (optional; max 500)
}

---

## 5) Indicator (price proxy / driver)

### Indicator schema
{
  "id": ID (required),
  "name": string (required),
  "indicator_type": "price_proxy" | "driver" | "regulatory_signal" | "other" (required),
  "unit": string (optional),
  "visibility": Visibility (required),
  "latest": {
    "value": number (optional),
    "as_of": ISODateTime (required),
    "value_low": number (optional),
    "value_high": number (optional),
    "notes": string (optional; max 200)
  },
  "source_refs": SourceRef[] (required; min 1)
}

Validation rules:
- visibility="public" MUST NOT reference private_byod sources
- All indicators must have sources

---

## 6) Voyage calculator contracts

### VoyageScenarioInput
{
  "id": ID (required),
  "name": string (required),
  "visibility": Visibility (required),
  "route": {
    "origin_port": string (optional),
    "destination_port": string (optional),
    "distance_nm": number (optional; min 0)
  },
  "consumption": {
    "fuel_total_tonnes": number (optional; min 0),
    "fuel_tonnes_per_day": number (optional; min 0),
    "days_at_sea": number (optional; min 0)
  },
  "assumptions": {
    "fuel_price_per_tonne_low": number (required; min 0),
    "fuel_price_per_tonne_base": number (required; min 0),
    "fuel_price_per_tonne_high": number (required; min 0),
    "currency": string (default "USD"),
    "fuel_type": FuelType (required),
    "notes": string (optional; max 200)
  }
}

Validation rules:
- Must provide either fuel_total_tonnes OR (fuel_tonnes_per_day AND days_at_sea)
- low <= base <= high

### VoyageScenarioOutput
{
  "input_id": ID (required),
  "computed_at": ISODateTime (required),
  "fuel_total_tonnes_used": number (required),
  "results": {
    "cost_low": number (required),
    "cost_base": number (required),
    "cost_high": number (required),
    "currency": string (required)
  },
  "sensitivity": {
    "primary_driver": "fuel_price" | "consumption" | "days_at_sea" | "other",
    "notes": string (optional; max 200)
  },
  "disclaimer": string (required)
}

---

## 7) Alerts

### AlertRule schema
{
  "id": ID (required),
  "name": string (required),
  "visibility": Visibility (required),
  "enabled": boolean (required),
  "filters": {
    "fuels": FuelType[] (optional),
    "regions": Region[] (optional),
    "ports": string[] (optional),
    "event_types": EventType[] (optional),
    "keywords": string[] (optional),
    "time_window_hours": number (optional; default 168)
  },
  "delivery": {
    "in_app": boolean (default true),
    "email": boolean (default false)
  }
}

### AlertEvent schema
{
  "id": ID (required),
  "alert_rule_id": ID (required),
  "feed_event_id": ID (required),
  "triggered_at": ISODateTime (required),
  "reason": string (required; max 200)
}

Validation rules:
- keywords match on title/summary/details (case-insensitive, MVP)
- private_byod-derived events can only trigger private alert rules

---

## 8) Filters (for list methods)

### EventFilters
{
  "query": string (optional),
  "fuels": FuelType[] (optional),
  "regions": Region[] (optional),
  "ports": string[] (optional),
  "event_types": EventType[] (optional),
  "visibility": Visibility (required),
  "time_from": ISODateTime (optional),
  "time_to": ISODateTime (optional),
  "limit": number (optional; default 50),
  "cursor": string (optional)
}

### PortFilters
{
  "query": string (optional),
  "regions": Region[] (optional),
  "is_major_hub": boolean (optional),
  "limit": number (optional; default 200)
}

### IndicatorFilters
{
  "indicator_type": string (optional),
  "visibility": Visibility (required),
  "limit": number (optional; default 100)
}

---

## 9) Adapter interfaces (frozen)

All adapters must implement:

- listEvents(filters: EventFilters) -> FeedEvent[]
  Behavior:
  - MUST enforce visibility boundary (public returns only public)
  - MUST return only valid FeedEvents (with SourceRefs)

- getEvent(id: ID) -> FeedEvent
  Behavior:
  - MUST enforce access (cannot fetch private in public mode)

- listPorts(filters: PortFilters) -> Port[]

- listIndicators(filters: IndicatorFilters) -> Indicator[]

### Adapter types
1) DummyAdapter (MVP start)
- Provides deterministic dummy events/ports/indicators for UI and acceptance tests.

2) PublicSourcesAdapter (later)
- Ingests public sources, normalizes into public FeedEvents with public SourceRefs.

3) BYODBrokerAdapter (later, private only)
- Uses user-authorized credentials/uploads.
- Produces ONLY visibility="private" events/indicators.
- MUST NOT publish to public feed.
