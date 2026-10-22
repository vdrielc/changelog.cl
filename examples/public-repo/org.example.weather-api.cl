# Changelog
Functional changes to the Example Weather API that affect integrations.

## [3.0.0] - 2026-10-01
### Removed
- The `/v2/forecast` endpoint. Integrations must move to `/v3/forecast`.

### Changed
- API keys are now sent in the `Authorization` header instead of the query string.

## [2.9.0] - 2026-06-15
### Deprecated
- The `/v2/forecast` endpoint will be removed in 3.0.0.

### Added
- Hourly forecasts on `/v3/forecast`.
