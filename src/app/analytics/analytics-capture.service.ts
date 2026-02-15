import { Injectable } from '@angular/core';
import { EventTrackingService } from './event-tracking.service';

type CaptureSource = 'page_load' | 'user_click';

type CaptureParams =
  | {
      type: 'page_access';
    }
  | {
      type: 'button_click';
      buttonLabel?: string;
      element?: HTMLElement | null;
      metadata?: Record<string, unknown>;
    }
  | {
      type: 'api_call';
      apiName: string;
      apiMethod: string;
      apiEndpoint: string;
      statusCode: number;
      outcome: 'success' | 'error';
      source: CaptureSource;
      label?: string;
      metadata?: Record<string, unknown>;
    };

@Injectable({
  providedIn: 'root'
})
export class AnalyticsCaptureService {
  constructor(private readonly eventTrackingService: EventTrackingService) {}

  capture(params: CaptureParams): void {
    switch (params.type) {
      case 'page_access': {
        this.eventTrackingService.trackPageAccess();
        return;
      }

      case 'button_click': {
        const label = (params.buttonLabel || this.getButtonLabel(params.element)).trim() || 'unknown_button';
        const metadata = {
          ...(params.metadata ?? {}),
          ...(this.getButtonMetadata(params.element) ?? {})
        };

        this.eventTrackingService.trackButtonClick(label, Object.keys(metadata).length ? metadata : undefined);
        return;
      }

      case 'api_call': {
        this.eventTrackingService.trackApiResult(
          'api_call',
          params.apiName,
          params.apiMethod,
          params.apiEndpoint,
          params.statusCode,
          params.outcome,
          params.source,
          params.label,
          params.metadata
        );
        return;
      }

      default: {
        const _exhaustive: never = params;
        return _exhaustive;
      }
    }
  }

  private getButtonMetadata(element?: HTMLElement | null): Record<string, unknown> | undefined {
    if (!element) {
      return undefined;
    }

    return {
      buttonId: element.id || null,
      buttonClasses: element.className || null
    };
  }

  private getButtonLabel(element?: HTMLElement | null): string {
    if (!element) {
      return '';
    }

    const ariaLabel = element.getAttribute('aria-label')?.trim();
    if (ariaLabel) {
      return ariaLabel;
    }

    const text = element.textContent?.replace(/\s+/g, ' ').trim();
    return text || '';
  }
}

export type { CaptureParams, CaptureSource };
