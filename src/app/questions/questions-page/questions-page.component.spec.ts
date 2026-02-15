import { ComponentFixture, TestBed } from '@angular/core/testing';

import { QuestionsPageComponent } from './questions-page.component';
import { AnalyticsCaptureService } from '../../analytics/analytics-capture.service';

describe('QuestionsPageComponent', () => {
  let component: QuestionsPageComponent;
  let fixture: ComponentFixture<QuestionsPageComponent>;
  let analyticsCaptureSpy: jasmine.SpyObj<AnalyticsCaptureService>;

  beforeEach(async () => {
    analyticsCaptureSpy = jasmine.createSpyObj<AnalyticsCaptureService>('AnalyticsCaptureService', ['capture']);

    await TestBed.configureTestingModule({
      declarations: [QuestionsPageComponent],
      providers: [{ provide: AnalyticsCaptureService, useValue: analyticsCaptureSpy }]
    }).compileComponents();

    fixture = TestBed.createComponent(QuestionsPageComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
