import { ComponentFixture, TestBed } from '@angular/core/testing';

import { QuestionsPageComponent } from './questions-page.component';
import { EventTrackingService } from '../../analytics/event-tracking.service';

describe('QuestionsPageComponent', () => {
  let component: QuestionsPageComponent;
  let fixture: ComponentFixture<QuestionsPageComponent>;
  let eventTrackingServiceSpy: jasmine.SpyObj<EventTrackingService>;

  beforeEach(async () => {
    eventTrackingServiceSpy = jasmine.createSpyObj<EventTrackingService>('EventTrackingService', [
      'trackPageAccess',
      'trackButtonClick'
    ]);

    await TestBed.configureTestingModule({
      declarations: [QuestionsPageComponent],
      providers: [{ provide: EventTrackingService, useValue: eventTrackingServiceSpy }]
    })
    .compileComponents();

    fixture = TestBed.createComponent(QuestionsPageComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
