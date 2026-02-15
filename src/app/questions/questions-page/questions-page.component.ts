import { Component, HostListener, OnInit } from '@angular/core';
import { AnalyticsCaptureService } from '../../analytics/analytics-capture.service';

@Component({
  selector: 'app-questions-page',
  standalone: false,
  templateUrl: './questions-page.component.html',
  styleUrls: ['./questions-page.component.css']
})
export class QuestionsPageComponent implements OnInit {
  constructor(private readonly analyticsCapture: AnalyticsCaptureService) {}

  ngOnInit(): void {
    this.analyticsCapture.capture({ type: 'page_access' });
  }

  @HostListener('click', ['$event'])
  onClick(event: MouseEvent): void {
    const target = event.target as HTMLElement | null;
    const buttonElement = target?.closest('button, [role="button"]') as HTMLElement | null;

    if (!event.isTrusted) {
      return;
    }

    if (!buttonElement) {
      return;
    }

    this.analyticsCapture.capture({ type: 'button_click', element: buttonElement });
  }

}
