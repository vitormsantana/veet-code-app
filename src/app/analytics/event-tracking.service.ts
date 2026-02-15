import { HttpClient } from '@angular/common/http';
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
  private queue: AnalyticsEvent[] = [];
  private isFlushing = false;

  constructor(
    private readonly http: HttpClient,
    private readonly authService: AuthService,
    private readonly router: Router
  ) {
    this.setupRouteFlush();
    this.setupExitFlush();
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

    this.isFlushing = true;
    const batch = this.queue.splice(0, this.queue.length);
    const payload = this.buildBatchPayload(batch, reason);

    try {
      await firstValueFrom(this.http.post(this.apiUrl, payload));
    } catch (error) {
      this.queue = [...batch, ...this.queue];
      console.warn('[EventTracking] Failed to flush analytics batch', error);
    } finally {
      this.isFlushing = false;
      if (this.queue.length >= this.MAX_BATCH_SIZE) {
        void this.flush('max_batch_size');
      }
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
    if (this.queue.length >= this.MAX_BATCH_SIZE) {
      void this.flush('max_batch_size');
    }
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

  private flushOnExit(reason: string): void {
    if (!this.apiUrl || this.queue.length === 0) {
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
