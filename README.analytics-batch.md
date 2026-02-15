ANALYTICS BATCHING INSTRUCTIONS (Frontend + Backend)
Goal: Reduce API Gateway/Lambda calls by batching analytics events.
Batch policy:
- Send a request when buffer reaches 4 events, OR
- Send a request on Angular route change, OR
- Send a request on page/tab exit (pagehide/visibilitychange) to avoid losing last events.

------------------------------------------------------------
1) FRONTEND (Angular) CHANGES
------------------------------------------------------------

1.1 Add batching to EventTrackingService
File: src/app/analytics/event-tracking.service.ts

Implement an in-memory buffer:
- private queue: AnalyticsEvent[] = []
- private MAX_BATCH_SIZE = 4
- private isFlushing = false

Core behavior:
- trackEvent(event):
  - build payload as today (eventId, timestamp, app, eventType, phase, source, feature, page, api...)
  - push payload into queue
  - if queue.length >= MAX_BATCH_SIZE -> flush()

Important: do NOT use "polling" as the main mechanism.
Batching here means "append to array on event". That's O(1) and cheap.

1.2 Flush when route changes
File: src/app/analytics/event-tracking.service.ts OR a dedicated Router hook service

Subscribe to Angular Router events:
- Listen to NavigationStart or NavigationEnd
- On each navigation, call flush()

Recommended:
- Flush on NavigationStart (so the outgoing page events are sent before new view initializes)
- But NavigationEnd is also OK.

Pseudo:
router.events
  .pipe(filter(e => e instanceof NavigationStart))
  .subscribe(() => analytics.flush("route_change"))

1.3 Flush on page/tab exit to avoid lost events
File: src/app/analytics/event-tracking.service.ts

Add browser lifecycle handlers:
- window.addEventListener("pagehide", () => flush("pagehide"))
- document.addEventListener("visibilitychange", () => { if (document.visibilityState === "hidden") flush("hidden") })

For this "exit flush", prefer:
- navigator.sendBeacon(url, body) if available
Fallback:
- fetch(url, { method: "POST", body, keepalive: true, headers: {...} })

Notes:
- sendBeacon is designed exactly for "send analytics when the page is closing".
- keepalive fetch can also work in modern browsers.

1.4 Add a flush() method that sends a batch
Behavior:
- If analyticsEventsApiUrl is empty -> do nothing.
- If queue is empty -> return.
- Copy and clear queue quickly, then send (so new events can continue buffering).
- On failure, re-queue the batch (optional) or drop (depending on strictness).

Pseudo:
flush(reason):
  if isFlushing return
  if queue.length == 0 return

  isFlushing = true
  batch = queue.splice(0, queue.length)  // drain

  payload = {
    batchId: <uuid>,
    sentAt: <timestamp>,
    reason: reason,
    app: <app>,
    events: batch
  }

  POST payload to analyticsEventsApiUrl
  if fails:
    - option A (reliable): prepend back into queue (queue = batch + queue)
    - option B (simple): drop + console.warn

  isFlushing = false

1.5 Update skip rules in api-events.interceptor.ts
File: src/app/analytics/api-events.interceptor.ts

Ensure interceptor does NOT track the analytics endpoint itself:
- keep the existing skip list
- if it checks analytics endpoint, keep it correct after payload changes.

1.6 Update environment config (unchanged)
File: src/environments/environment.ts
analyticsEventsApiUrl: 'https://.../frontend_event_reciever'

No other changes needed here.

------------------------------------------------------------
2) BACKEND (Go Lambda) CHANGES
------------------------------------------------------------

Goal: Accept BOTH formats:
A) Single event (backward compatible)
B) Batch event payload: { events: [ ... ] }

2.1 Extend request parsing
In handler.go (or wherever request body is parsed):
- Try to parse as BatchRequest first:
  type BatchRequest struct {
    BatchId string `json:"batchId"`
    SentAt  string `json:"sentAt"`
    Reason  string `json:"reason"`
    App     string `json:"app"`
    Events  []AnalyticsEvent `json:"events"`
  }

If "events" exists and is an array -> treat as batch.
Else -> parse as a single AnalyticsEvent and wrap it into a batch of length 1.

2.2 Validation rules apply per event
Existing validation rules must still be applied:
- required fields: eventId, timestamp, app, eventType, phase, source, feature, page
- eventType rules:
  - api_call: api required
  - button_click: api not allowed
  - page_access: api temporarily allowed for migration compatibility

For a batch:
- validate each event independently
- If any event is invalid:
  - return 400 with details of which event failed (eventId + error)
  - OR accept partial with per-event status (optional, but more complex)

Recommended for simplicity:
- Reject the entire batch if any event fails validation.
This keeps the contract strict and easier to reason about.

2.3 Response format
Return 202 and an ack showing batch processing results.

Example success:
{
  "status": "accepted",
  "batchId": "...",
  "accepted": 4,
  "already_processed": 0
}

Example invalid:
400 + {
  "status": "rejected",
  "error": "invalid_event",
  "eventId": "...",
  "details": "button_click must not include api"
}

2.4 Deduplication
Current behavior: duplicate event key -> 202 already_processed

For batches:
- dedupe per eventId
- count duplicates and return in response summary

2.5 S3 writes (important)
You have two approaches:

Option A (minimal change; keep 1 file per event):
- Iterate over events in batch and write each one to:
  analytics-events/anomesdia=YYYYMMDD/app=<app>/eventType=<eventType>/<eventId>.json

This keeps Athena table unchanged.

Option B (better storage; 1 file per batch):
- Write one object per batch containing array of flattened events.
This is more efficient but requires changing Athena table/ETL.

Recommended NOW:
- Option A (keep existing layout, low risk).

2.6 Observability / Metrics
Add metrics:
- batch_size
- events_accepted
- events_duplicate
- validation_failures
This helps ensure batching is behaving as expected.

------------------------------------------------------------
3) QUICK TEST PLAN
------------------------------------------------------------

Frontend:
1) Click 4 buttons quickly -> expect 1 network request with 4 events.
2) Click 1 button then navigate route -> expect flush on route change.
3) Click 1 button then close tab -> expect flush via pagehide/visibilitychange.

Backend:
1) POST single event -> still accepted (backward compatible).
2) POST batch { events: [4 events] } -> accepted, writes 4 objects to S3.
3) POST batch containing an invalid event -> returns 400 with eventId + reason.

------------------------------------------------------------
4) NOTES / GUARANTEES
------------------------------------------------------------

- This batching is event-driven, not polling-heavy. It is cheap.
- Exit flush reduces risk of losing events when user closes the tab.
- Keeping 1 S3 object per event preserves your existing Athena + Grafana dashboards.
- You can later add compaction (JSON -> Parquet) without touching the frontend again.