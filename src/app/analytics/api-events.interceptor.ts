import {
  HttpErrorResponse,
  HttpEvent,
  HttpHandler,
  HttpInterceptor,
  HttpRequest,
  HttpResponse
} from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable, throwError } from 'rxjs';
import { catchError, tap } from 'rxjs/operators';
import { cognitoConfig } from '../auth/cognito.config';
import { environment } from '../../environments/environment';
import { EventTrackingService } from './event-tracking.service';

@Injectable()
export class ApiEventsInterceptor implements HttpInterceptor {
  private readonly manuallyTrackedEndpoints = new Set([
    '/create_exercise',
    '/create_user_metrics',
    '/create_feedback_for_recomendation'
  ]);

  constructor(
    private readonly eventTrackingService: EventTrackingService
  ) {}

  intercept(req: HttpRequest<unknown>, next: HttpHandler): Observable<HttpEvent<unknown>> {
    const endpoint = this.extractPathname(req.url);
    if (this.shouldSkip(req.url, endpoint)) {
      return next.handle(req);
    }

    const apiName = this.getApiName(endpoint);
    const method = req.method.toUpperCase();

    return next.handle(req).pipe(
      tap((event) => {
        if (event instanceof HttpResponse) {
          this.eventTrackingService.trackApiResult(
            'api_call',
            apiName,
            method,
            endpoint,
            event.status,
            'success',
            'page_load'
          );
        }
      }),
      catchError((error: HttpErrorResponse) => {
        this.eventTrackingService.trackApiResult(
          'api_call',
          apiName,
          method,
          endpoint,
          error.status || 0,
          'error',
          'page_load'
        );
        return throwError(() => error);
      })
    );
  }

  private shouldSkip(url: string, endpoint: string): boolean {
    if (url.startsWith(cognitoConfig.domain)) {
      return true;
    }

    if (environment.analyticsEventsApiUrl && url.startsWith(environment.analyticsEventsApiUrl)) {
      return true;
    }

    if (endpoint.startsWith('/assets/')) {
      return true;
    }

    return this.manuallyTrackedEndpoints.has(endpoint);
  }

  private extractPathname(url: string): string {
    try {
      const parsed = typeof window !== 'undefined' ? new URL(url, window.location.origin) : new URL(url, 'http://localhost');
      return parsed.pathname || '/';
    } catch {
      return url.startsWith('/') ? url : '/';
    }
  }

  private getApiName(endpoint: string): string {
    const segments = endpoint.split('/').filter(Boolean);
    return segments[segments.length - 1] || 'unknown_api';
  }
}
