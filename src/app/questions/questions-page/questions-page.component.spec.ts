import { ComponentFixture, TestBed } from '@angular/core/testing';
import { NO_ERRORS_SCHEMA } from '@angular/core';

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
      providers: [{ provide: AnalyticsCaptureService, useValue: analyticsCaptureSpy }],
      schemas: [NO_ERRORS_SCHEMA]
    }).compileComponents();

    fixture = TestBed.createComponent(QuestionsPageComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
