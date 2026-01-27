# Data Policy — Aequor Intelligence (Non-Negotiable)

## 1) Core principle
Aequor Intelligence is a decision-support / market-intel tool. It must operate with a compliant data model:
- Public/open sources + user input are allowed for public mode
- Proprietary broker/paid data must never be redistributed publicly

## 2) Allowed data classes
### A) Public/Open sources (public feed allowed)
Examples:
- Public webpages, press releases, institutional pages
- Public market commentary and industry news
- Public indicators where terms allow referencing/summarizing

Policy:
- Prefer summarization + source linking
- Avoid large verbatim republication
- Store event metadata + the source reference

### B) User input (public or private depending on source)
Examples:
- Manual entries with explicit sources
- User-uploaded documents (e.g., PDFs) as personal references

Policy:
- User-uploaded content is private by default
- If user marks something public, it must still satisfy the SourceRef requirement and not violate terms

### C) BYOD broker/paid integrations (private only)
Broker/paid data is allowed ONLY if:
- The user provides credentials/tokens or explicitly uploads licensed data
- The display remains within the user’s private workspace (`visibility=private`)
- No broker-derived values, quotes, or text are published to public feed mode
- Retention/caching is documented and controllable

## 3) Data Register requirement
Maintain a Data Register (in `/docs` or in-app) with:
- Source name
- Type: public | user_input | private_byod
- Terms/notes (allowed usage)
- Retrieved date/time
- Storage: none | cached | retained (duration)
- Display policy: public | private
- Owner: system | user

No source may be integrated without a Data Register entry.

## 4) Retention policy (MVP default)
- Public events: store minimal metadata + source URL/title
- Private BYOD: store minimal metadata; cache only if needed; default retention 30 days unless user deletes sooner
- User can delete private data at any time

## 5) Publishing rules (hard rules)
- Public feed must contain only `visibility=public` events
- Any event without a SourceRef is invalid and cannot be published
- Private BYOD events may appear only in private mode (authenticated) and never in public mode

## 6) Disclaimer
Aequor Intelligence provides informational decision support only. It is not financial advice, does not execute trades, and does not provide compliance certification.
