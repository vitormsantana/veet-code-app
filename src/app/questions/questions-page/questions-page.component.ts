import { Component, HostListener, OnInit } from '@angular/core';
import { EventTrackingService } from '../../analytics/event-tracking.service';

@Component({
  selector: 'app-questions-page',
  standalone: false,
  templateUrl: './questions-page.component.html',
  styleUrls: ['./questions-page.component.css']
})
export class QuestionsPageComponent implements OnInit {
  constructor(private readonly eventTrackingService: EventTrackingService) {}

  ngOnInit(): void {
    this.eventTrackingService.trackPageAccess();
  }

  @HostListener('click', ['$event'])
  onClick(event: MouseEvent): void {
    const target = event.target as HTMLElement | null;
    const buttonElement = target?.closest('button, [role="button"]') as HTMLElement | null;

    if (!buttonElement) {
      return;
    }

    const buttonLabel = this.getButtonLabel(buttonElement);
    this.eventTrackingService.trackButtonClick(buttonLabel, {
      buttonId: buttonElement.id || null,
      buttonClasses: buttonElement.className || null
    });
  }

  private getButtonLabel(buttonElement: HTMLElement): string {
    const ariaLabel = buttonElement.getAttribute('aria-label')?.trim();
    if (ariaLabel) {
      return ariaLabel;
    }

    const text = buttonElement.textContent?.replace(/\s+/g, ' ').trim();
    return text || 'unknown_button';
  }
}
