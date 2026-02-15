import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { NavigationStart, Router } from '@angular/router';
import { filter, firstValueFrom } from 'rxjs';
import { environment } from '../../environments/environment';
import { AuthService } from '../auth/auth.service';

type AnalyticsEventType = 'page_access' | 'button_click' | 'api_call';
type AnalyticsEventPhase = 'start' | 'response';
type EventSource = 'page_load' | 'user_click';

interface UserContext {
  sub?: string;
  email?: string;
}

interface ApiContext {
  name: string;
  endpoint: string;
  method: string;
  statusCode?: number;
  outcome?: 'success' | 'error';
}

interface AnalyticsEvent {
  eventId: string;
  timestamp: string;
  app: string;
  eventType: AnalyticsEventType;
  phase: AnalyticsEventPhase;
  source: EventSource;
  feature: string;
  page: string;
  label?: string;
  api?: ApiContext;
  user: UserContext;
  metadata?: Record<string, unknown>;
}

interface AnalyticsBatchPayload {
  batchId: string;
  sentAt: string;
  reason: string;
  app: string;
  events: AnalyticsEvent[];
}

@Injectable({
  providedIn: 'root'
})
export class EventTrackingService {
  private readonly apiUrl = environment.analyticsEventsApiUrl;
  private readonly appName = 'veet-app-web';

  private readonly MAX_BATCH_SIZE = 4;
  private readonly FLUSH_INTERVAL_MS = 10000;

  // Safety controls.
  private readonly RATE_LIMIT_WINDOW_MS = 60_000;
  private readonly MAX_FLUSHES_PER_WINDOW = 12;

  private readonly BACKOFF_BASE_MS = 500;
  private readonly BACKOFF_MAX_MS = 30_000;
  private backoffAttempt = 0;
  private backoffUntilMs = 0;

  private readonly CIRCUIT_BREAKER_THRESHOLD = 3;
  private readonly CIRCUIT_BREAKER_OPEN_MS = 120_000;
  private consecutiveBreakerFailures = 0;
  private breakerOpenUntilMs = 0;

  private readonly GUARD_LOG_THROTTLE_MS = 30_000;
  private lastGuardLogMs = 0;

  private queue: AnalyticsEvent[] = [];
  private isFlushing = false;
  private flushAttemptTimestamps: number[] = [];

  constructor(
    private readonly http: HttpClient,
    private readonly authService: AuthService,
    private readonly router: Router
  ) {
    this.setupRouteFlush();
    this.setupExitFlush();
    this.setupPeriodicFlush();
  }

  trackPageAccess(): void {
    const pageName = this.getCurrentPageName();

    this.sendEvent({
      eventType: 'page_access',
      phase: 'start',
      source: 'page_load',
      feature: pageName,
      page: pageName
    });
  }

  trackButtonClick(buttonLabel: string, metadata?: Record<string, unknown>): void {
    this.sendEvent({
      eventType: 'button_click',
      phase: 'start',
      source: 'user_click',
      feature: buttonLabel || 'unknown_button',
      page: this.getCurrentPageName(),
      label: buttonLabel,
      metadata
    });
  }

  trackApiResult(
    eventType: Extract<AnalyticsEventType, 'api_call'>,
    apiName: string,
    apiMethod: string,
    apiEndpoint: string,
    apiStatusCode: number,
    outcome: 'success' | 'error',
    source: EventSource,
    label?: string,
    metadata?: Record<string, unknown>
  ): void {
    this.sendEvent({
      eventType,
      phase: 'response',
      source,
      feature: apiName || 'unknown_api',
      page: this.getCurrentPageName(),
      label,
      api: {
        name: apiName,
        method: apiMethod,
        endpoint: apiEndpoint,
        statusCode: apiStatusCode,
        outcome
      },
      metadata
    });
  }

  async flush(reason = 'manual'): Promise<void> {
    if (!this.apiUrl || this.queue.length === 0 || this.isFlushing) {
      return;
    }

    if (!this.canAttemptFlush(reason)) {
      return;
    }

    this.isFlushing = true;
    const batch = this.queue.splice(0, this.queue.length);
    const payload = this.buildBatchPayload(batch, reason);

    try {
      await firstValueFrom(this.http.post(this.apiUrl, payload));
      this.resetBackoff();
      this.consecutiveBreakerFailures = 0;
    } catch (error) {
      const status = (error as HttpErrorResponse | undefined)?.status;

      if (this.shouldRequeueAfterFailure(status)) {
        this.queue = [...batch, ...this.queue];
        const now = this.nowMs();
        this.applyBackoff(now);
        this.recordBreakerFailure(status, now);
        console.warn('[EventTracking] Failed to flush analytics batch', { status, error });
      } else {
        // Non-retriable failures (usually 4xx) would otherwise cause infinite retries.
        console.warn('[EventTracking] Dropping analytics batch due to non-retriable error', { status, error });
        this.resetBackoff();
        this.consecutiveBreakerFailures = 0;
      }
    } finally {
      this.isFlushing = false;
    }
  }

  private sendEvent(payload: Omit<AnalyticsEvent, 'eventId' | 'timestamp' | 'app' | 'user'>): void {
    if (!this.apiUrl) {
      return;
    }

    const session = this.authService.getSession();
    const user = {
      sub: session?.profile?.sub as string | undefined,
      email: session?.profile?.email as string | undefined
    };

    const event: AnalyticsEvent = {
      eventId: this.generateEventId(),
      timestamp: new Date().toISOString(),
      app: this.appName,
      eventType: payload.eventType,
      phase: payload.phase,
      source: payload.source,
      feature: payload.feature,
      page: payload.page,
      label: payload.label,
      api: payload.api,
      user,
      metadata: payload.metadata
    };

    this.queue.push(event);
    if (this.queue.length >= this.MAX_BATCH_SIZE && !this.isFlushing) {
      void this.flush('max_batch_size');
    }
  }

  private shouldRequeueAfterFailure(status: number | undefined): boolean {
    if (typeof status !== 'number') {
      return true;
    }

    if (status == 0) {
      return true;
    }

    if (status === 429) {
      return true;
    }

    if (status >= 500) {
      return true;
    }

    return false;
  }

  private canAttemptFlush(reason: string): boolean {
    const now = this.nowMs();

    if (now < this.breakerOpenUntilMs) {
      this.guardLogOnce(
        `[EventTracking] Circuit breaker open (until ${new Date(this.breakerOpenUntilMs).toISOString()}), skipping flush (${reason})`,
        now
      );
      return false;
    }

    if (now < this.backoffUntilMs) {
      this.guardLogOnce(
        `[EventTracking] Backoff active (until ${new Date(this.backoffUntilMs).toISOString()}), skipping flush (${reason})`,
        now
      );
      return false;
    }

    // Hard per-session rate limit: rolling window.
    this.flushAttemptTimestamps = this.flushAttemptTimestamps.filter((t) => now - t < this.RATE_LIMIT_WINDOW_MS);
    if (this.flushAttemptTimestamps.length >= this.MAX_FLUSHES_PER_WINDOW) {
      this.guardLogOnce(
        `[EventTracking] Rate limit reached (${this.flushAttemptTimestamps.length}/${this.MAX_FLUSHES_PER_WINDOW} flushes/min), skipping flush (${reason})`,
        now
      );
      return false;
    }

    this.flushAttemptTimestamps.push(now);
    return true;
  }

  private applyBackoff(now: number): void {
    this.backoffAttempt = Math.min(this.backoffAttempt + 1, 10);
    const exp = this.BACKOFF_BASE_MS * (2 ** (this.backoffAttempt - 1));
    const jitter = Math.floor(Math.random() * 200);
    const delay = Math.min(exp + jitter, this.BACKOFF_MAX_MS);
    this.backoffUntilMs = Math.max(this.backoffUntilMs, now + delay);
  }

  private resetBackoff(): void {
    this.backoffAttempt = 0;
    this.backoffUntilMs = 0;
  }

  private recordBreakerFailure(status: number | undefined, now: number): void {
    const trippingStatus = status === 429 || status === 0 || (typeof status === 'number' && status >= 500);
    if (!trippingStatus) {
      this.consecutiveBreakerFailures = 0;
      return;
    }

    this.consecutiveBreakerFailures += 1;
    if (this.consecutiveBreakerFailures < this.CIRCUIT_BREAKER_THRESHOLD) {
      return;
    }

    this.breakerOpenUntilMs = now + this.CIRCUIT_BREAKER_OPEN_MS;
    this.backoffUntilMs = Math.max(this.backoffUntilMs, this.breakerOpenUntilMs);
    this.consecutiveBreakerFailures = 0;

    console.warn(
      `[EventTracking] Circuit breaker opened for ${this.CIRCUIT_BREAKER_OPEN_MS}ms after repeated failures (last status ${status ?? 'unknown'}).`
    );
  }

  private guardLogOnce(message: string, now: number): void {
    if (now - this.lastGuardLogMs < this.GUARD_LOG_THROTTLE_MS) {
      return;
    }
    this.lastGuardLogMs = now;
    console.warn(message);
  }

  private nowMs(): number {
    return Date.now();
  }

  private generateEventId(): string {
    if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
      return crypto.randomUUID();
    }
    return `evt_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
  }

  private getCurrentPage(): string {
    if (typeof window !== 'undefined') {
      const page = `${window.location.pathname}${window.location.search}${window.location.hash}`;
      return page || '/';
    }

    const routerUrl = this.router.url?.trim();
    return routerUrl || '/';
  }

  private getCurrentPageName(): string {
    const currentPage = this.getCurrentPage();
    const route = currentPage.split('?')[0].split('#')[0];
    const segments = route.split('/').filter(Boolean);
    return segments[segments.length - 1] || 'home';
  }

  private setupRouteFlush(): void {
    this.router.events
      .pipe(filter((event): event is NavigationStart => event instanceof NavigationStart))
      .subscribe(() => {
        void this.flush('route_change');
      });
  }

  private setupExitFlush(): void {
    if (typeof window !== 'undefined') {
      window.addEventListener('pagehide', () => {
        this.flushOnExit('pagehide');
      });
    }

    if (typeof document !== 'undefined') {
      document.addEventListener('visibilitychange', () => {
        if (document.visibilityState === 'hidden') {
          this.flushOnExit('hidden');
        }
      });
    }
  }

  private setupPeriodicFlush(): void {
    if (typeof window === 'undefined') {
      return;
    }

    window.setInterval(() => {
      if (this.queue.length === 0 || this.isFlushing) {
        if (this.queue.length === 0) {
          console.log('[EventTracking] 10s check: no new events to flush');
        }
        return;
      }

      void this.flush('interval_10s');
    }, this.FLUSH_INTERVAL_MS);
  }

  private flushOnExit(reason: string): void {
    if (!this.apiUrl || this.queue.length === 0) {
      return;
    }

    if (!this.canAttemptFlush(reason)) {
      return;
    }

    const batch = this.queue.splice(0, this.queue.length);
    const payload = this.buildBatchPayload(batch, reason);
    const body = JSON.stringify(payload);

    try {
      if (typeof navigator !== 'undefined' && typeof navigator.sendBeacon === 'function') {
        const blob = new Blob([body], { type: 'application/json' });
        const sent = navigator.sendBeacon(this.apiUrl, blob);
        if (sent) {
          return;
        }
      }
    } catch {
      // Fallback below.
    }

    if (typeof fetch === 'function') {
      void fetch(this.apiUrl, {
        method: 'POST',
        body,
        keepalive: true,
        headers: {
          'Content-Type': 'application/json'
        }
      }).catch(() => undefined);
    }
  }

  private buildBatchPayload(events: AnalyticsEvent[], reason: string): AnalyticsBatchPayload {
    return {
      batchId: this.generateEventId(),
      sentAt: new Date().toISOString(),
      reason,
      app: this.appName,
      events
    };
  }
}
