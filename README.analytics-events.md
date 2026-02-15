# Analytics Event Capture Specification (Portable)

This document is the single source of truth for reproducing the full analytics event capture stack in another environment.

## 1) Feature Overview

Goal:
- Capture frontend usage + API execution telemetry.
- Validate semantics at backend.
- Persist query-friendly records in S3.
- Enable Athena/QuickSight analysis.

Current endpoint:
- `POST https://29nac9o231.execute-api.sa-east-1.amazonaws.com/dev/frontend_event_reciever`

Flow:
1. Frontend emits events.
2. Frontend posts event JSON to API Gateway endpoint.
3. API Gateway invokes Go Lambda `frontend_event_reciever`.
4. Lambda validates contract and semantics.
5. Lambda writes flattened record to S3 partition path.
6. Analytics tools read S3 data.

## 2) Frontend Structure and Requirements

### 2.1 Frontend config

File:
- `src/environments/environment.ts`

Required config:
```ts
analyticsEventsApiUrl: 'https://29nac9o231.execute-api.sa-east-1.amazonaws.com/dev/frontend_event_reciever'
```

If empty, analytics sending is disabled.

### 2.2 Frontend components/services used

- `src/app/analytics/event-tracking.service.ts`
  - builds event payload
  - adds user context from session
  - sends POST to analytics endpoint
- `src/app/analytics/api-events.interceptor.ts`
  - tracks API responses globally
  - emits `api_call` for success/error responses
  - skips cognito domain, analytics endpoint itself, assets, and manually tracked endpoints
- `src/app/questions/questions-page/questions-page.component.ts`
  - emits `page_access` on page load
  - emits `button_click` for button interactions
- `src/app/questions/question/question.component.ts`
  - emits `api_call` for button-driven APIs (`create_exercise`, `create_user_metrics`)
- `src/app/questions/question-feedback/question-feedback.component.ts`
  - emits `api_call` for feedback API

### 2.3 Event model enforced by frontend

Event types:
- `page_access`
- `button_click`
- `api_call`

Rules:
- `page_access`: page/navigation intent (no `api` preferred)
- `button_click`: UI intent only (must not carry `api`)
- `api_call`: backend request execution/result (must carry `api`)

Required frontend behavior:
1. Page load:
- send `page_access` (`phase=start`, `source=page_load`)
- if page load triggers API request, send separate `api_call`

2. Button click:
- send `button_click` (`phase=start`, `source=user_click`)
- if click triggers API request, send separate `api_call`

Mapping currently implemented:
- page load:
  - `feature = page name`
  - `page = page name`
- button click:
  - `feature = button label`
  - `page = page name`
- api_call:
  - `feature = api name`
  - `page = page name`

## 3) Backend (Go Lambda) Structure and Requirements

### 3.1 Lambda purpose

Lambda `frontend_event_reciever`:
- receives one event per request
- validates schema + semantics
- persists flattened event record to S3
- returns ingestion acknowledgment

### 3.2 Contract (backend validation)

Required fields in every event:
- `eventId`
- `timestamp` (RFC3339)
- `app`
- `eventType`
- `phase` (`start` or `response`)
- `source` (`page_load` or `user_click`)
- `feature`
- `page`

Allowed values:
- `eventType`: `page_access | button_click | api_call`
- `phase`: `start | response`
- `source`: `page_load | user_click`

`api` object rules:
- `eventType=api_call`: `api` is required
- `eventType=button_click`: `api` is not allowed
- `eventType=page_access`: temporarily accepted for migration compatibility (target: no `api`)

If `api` exists:
- required: `api.name`, `api.endpoint`, `api.method`
- allowed methods: `GET | POST | PUT | DELETE`
- optional: `api.statusCode`
- optional outcome: `success | error`

### 3.3 HTTP behavior expected

- `OPTIONS` -> `204` (CORS preflight)
- valid `POST` -> `202` with ack
  - example: `{ "eventId": "...", "status": "accepted" }`
- duplicate event key -> `202` with `already_processed`
- invalid payload -> `400` with explicit error
- internal failure -> `500`

### 3.4 CORS behavior

Controlled by `ALLOWED_ORIGINS`:
- empty -> `*`
- `*` -> `*`
- comma list -> reflect matching origin

### 3.5 Lambda env vars

- `events_bucket_name` (required)
- `EVENTS_BUCKET` (fallback)
- `EVENTS_PREFIX` (default `analytics-events`)
- `ALLOWED_ORIGINS`
- `REQUIRE_AUTH` (future auth extension)
- `METRICS_NAMESPACE` (default `Veet/AnalyticsEvents`)
- `AWS_REGION` (optional)

### 3.6 Go package layout

- `main/main.go`: bootstrap
- `packages/handler/handler.go`: request orchestration
- `packages/handler/validation.go`: contract validation
- `packages/handler/cors.go`: CORS handling
- `packages/handler/response.go`: response helper
- `packages/handler/auth.go`: auth extension points
- `packages/handler/observability.go`: structured logs + metrics
- `packages/storage/s3.go`: S3 writes
- `packages/typesandstructs/typesandstructs.go`: DTOs

### 3.7 Storage format

S3 key format:
- `analytics-events/anomesdia=YYYYMMDD/app=<app>/eventType=<eventType>/<eventId>.json`

Persisted record:
- flattened fields for querying
- ingestion timestamp included
- newer version removes `raw` payload copy

## 4) Infra Structure and Requirements

### 4.1 API Gateway

- existing REST API reused: `hammocker-api`
- resource path: `/frontend_event_reciever`
- methods:
  - `POST` -> Lambda proxy integration (`AWS_PROXY`)
  - `OPTIONS` -> mock integration (`204`) for CORS
- authorization: `NONE`

### 4.2 Lambda infra

- function name: `frontend_event_reciever`
- artifact expected by infra:
  - `lambdas/frontend_event_reciever/frontend_event_reciever.zip`
- runtime from shared module defaults:
  - `provided.al2`, `bootstrap`

### 4.3 S3 + IAM

- dedicated bucket for frontend events
- public access blocked + versioning enabled
- lambda role permissions:
  - `s3:ListBucket`
  - `s3:PutObject`
  - `s3:GetObject`

### 4.4 Terraform variables

- `frontend_event_reciever_events_prefix` (default `analytics-events`)
- `frontend_event_reciever_allowed_origins` (default `*`)
- `frontend_event_reciever_require_auth` (default `false`)
- `frontend_event_reciever_metrics_namespace` (default `Veet/AnalyticsEvents`)
- `frontend_event_reciever_lambda_timeout` (default `30`)
- `frontend_event_reciever_lambda_memory_size` (default `256`)

### 4.5 Terraform outputs

- `frontend_event_reciever_events_bucket`
- `frontend_event_reciever_endpoint`

## 5) Technical Acceptance Criteria

1. Frontend sends:
- one `page_access` on page entry
- one `button_click` per click
- one `api_call` per API response (success/error)

2. Backend validation:
- rejects `button_click` with `api`
- requires `api` for `api_call`

3. Endpoint behavior:
- analytics endpoint returns ingestion ack, not business API payload

4. Storage:
- one record per event in S3 partition path

5. CORS:
- browser requests from app origin succeed

## 6) Troubleshooting (Most Common)

Symptom:
- `POST /frontend_event_reciever` returns business payload (example `metric_id` data)

Likely causes:
- API Gateway integration mapped to wrong Lambda
- stale API stage deployment
- proxy/catch-all route conflict
- wrong Lambda artifact deployed (binary mismatch)
- wrong handler branch/response mapping in Go Lambda

Must-check quickly:
1. Call `/frontend_event_reciever` with valid analytics payload -> expect ack.
2. Call `/create_user_metrics` -> expect metrics payload.
3. If responses are same, infra/backend mapping is wrong.

## 7) Recreate in Another Environment (Codex Handoff)

1. Create frontend event service + API interceptor using this contract.
2. Configure `analyticsEventsApiUrl` in frontend env.
3. Implement Go Lambda validation and S3 persistence with the rules above.
4. Provision infra:
- API route `/frontend_event_reciever`
- POST/OPTIONS methods
- lambda integration + permission
- S3 bucket + IAM policy
5. Deploy and verify with curl/browser network logs.
6. Confirm records appear in partitioned S3 path.

# Athena + Grafana OSS (Local)

Local analytics stack for `frontend_event_reciever` data:

- Source: S3 events bucket (`veet-code-frontend-events-<ACCOUNT_ID>`)
- Query engine: Athena
- Visualization: Grafana OSS + Athena datasource plugin
- Dashboard: provisioned from this repo

## Integrations and Flow

1. Frontend sends events to API Gateway `/frontend_event_reciever`.
2. Lambda writes JSON objects to S3 under:
   - `analytics-events/anomesdia=YYYYMMDD/app=<app>/eventType=<eventtype>/...`
3. Athena external table maps those files.
4. Grafana queries Athena and renders dashboards.

## Files in This Folder

- `athena_grafana/.env.example`: environment template
- `athena_grafana/docker-compose.yml`: local Grafana runtime
- `athena_grafana/scripts/bootstrap_athena.sh`: CLI bootstrap for Athena
- `athena_grafana/sql/frontend_events_ddl.sql`: Athena DDL
- `athena_grafana/grafana/provisioning/datasources/athena.yaml`: Athena datasource provisioning
- `athena_grafana/grafana/provisioning/dashboards/dashboard_provider.yaml`: dashboard provider
- `athena_grafana/grafana/provisioning/dashboards/frontend_events_overview.json`: dashboard definition
- `athena_grafana/README_GRAFANA_VIEW.md`: deep-dive on panel/debug history

## 1) Configure Environment

Create `athena_grafana/.env`:

```env
AWS_REGION=sa-east-1
AWS_ACCOUNT_ID=149536475122
AWS_ACCESS_KEY_ID=<YOUR_ACCESS_KEY_ID>
AWS_SECRET_ACCESS_KEY=<YOUR_SECRET_ACCESS_KEY>
```

## 2) Bootstrap Athena (Recommended)

```bash
./athena_grafana/scripts/bootstrap_athena.sh
```

What this script does:

1. Verifies AWS auth (`sts get-caller-identity`)
2. Creates Athena result bucket if missing:
   - `aws-athena-query-results-<ACCOUNT_ID>-<REGION>`
3. Creates DB `frontend_events`
4. Recreates table `frontend_events.analytics_events`
5. Configures partition projection to match S3 `eventType=...` folder
6. Runs validation query and prints results

Manual alternative:

- Run `athena_grafana/sql/frontend_events_ddl.sql` in Athena.

## 3) Start Grafana

Preferred (compose plugin):

```bash
cd athena_grafana
docker compose up -d
```

If your Docker does not support `docker compose`, use `docker run` with:

- `--env-file athena_grafana/.env`
- mount `athena_grafana/grafana/provisioning` to `/etc/grafana/provisioning`
- plugin env: `GF_INSTALL_PLUGINS=grafana-athena-datasource`

Grafana URL:

- `http://localhost:3000`

## 4) Provisioned Data Source

Datasource file:

- `athena_grafana/grafana/provisioning/datasources/athena.yaml`

Configured values:

- Name: `Athena`
- UID: `athena`
- Region: `${AWS_REGION}`
- Catalog: `AwsDataCatalog`
- Database: `frontend_events`
- Workgroup: `primary`
- Output location:
  - `s3://aws-athena-query-results-${AWS_ACCOUNT_ID}-${AWS_REGION}/`

## 5) Provisioned Dashboard

Dashboard folder:

- `Frontend Analytics`

Dashboard:

- `Frontend Events Overview`

Panels included:

1. Total Events (Time Range)
2. Invalid `button_click` With API Fields
3. Events Per Day
4. Event Type Split
5. Top Pages
6. API Success/Error By API
7. Top Features
8. Invalid `button_click` Samples

## 6) Core Queries Used

Event type split:

```sql
SELECT eventtype, CAST(count(*) AS DOUBLE) AS total
FROM frontend_events.analytics_events
GROUP BY eventtype
ORDER BY total DESC;
```

Events per day:

```sql
SELECT anomesdia, CAST(count(*) AS DOUBLE) AS events
FROM frontend_events.analytics_events
GROUP BY anomesdia
ORDER BY anomesdia;
```

API success/error:

```sql
SELECT apiname, apioutcome, count(*) AS total
FROM frontend_events.analytics_events
WHERE eventtype = 'api_call'
GROUP BY apiname, apioutcome
ORDER BY total DESC;
```

Top pages:

```sql
SELECT page, count(*) AS total
FROM frontend_events.analytics_events
WHERE eventtype = 'page_access'
GROUP BY page
ORDER BY total DESC
LIMIT 20;
```

Contract regression (invalid button click carrying API fields):

```sql
SELECT count(*) AS invalid_button_click_with_api
FROM frontend_events.analytics_events
WHERE eventtype = 'button_click'
  AND (
    apiname IS NOT NULL OR
    apiendpoint IS NOT NULL OR
    apimethod IS NOT NULL OR
    apistatuscode IS NOT NULL OR
    apioutcome IS NOT NULL
  );
```

## 7) Validation Checklist

1. Athena returns counts:

```sql
SELECT eventtype, count(*) AS total
FROM frontend_events.analytics_events
GROUP BY 1
ORDER BY 2 DESC;
```

2. S3 has event objects:

```bash
aws s3 ls s3://veet-code-frontend-events-149536475122/analytics-events/ --recursive | head -50
```

3. Grafana datasource status:

- `Connections -> Data sources -> Athena -> Save & Test` should be green.

## 8) Troubleshooting

If panel shows no data:

1. Panel -> `Inspect` -> `Query` -> `Refresh`
2. Check `response.results.A.error`
3. Check container logs:

```bash
docker logs --tail 150 grafana-athena
```

Known issues already addressed in this repo:

- Athena partition path mapped to `eventType=` folders via projection
- Dashboard uses datasource UID (`athena`)
- Query `format` field removed (plugin unmarshal fix)
- Athena `connectionArgs` provided on each panel target
- Numeric casting added for bar charts

## 9) Security Notes

- Keep `athena_grafana/.env` local only (ignored by `.gitignore`).
- Rotate AWS keys if they were exposed.
