import { ComponentFixture, TestBed, fakeAsync, tick } from '@angular/core/testing';
import { ReactiveFormsModule } from '@angular/forms';
import { HttpClientTestingModule, HttpTestingController } from '@angular/common/http/testing';
import { NO_ERRORS_SCHEMA } from '@angular/core';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { AuthService } from '../../auth/auth.service';

import { QuestionComponent } from './question.component';
import { QuestionsRefreshService } from '../questions-refresh.service';
import { AnalyticsCaptureService } from '../../analytics/analytics-capture.service';

describe('QuestionComponent', () => {
  let component: QuestionComponent;
  let fixture: ComponentFixture<QuestionComponent>;
  let authServiceSpy: jasmine.SpyObj<AuthService>;
  let refreshService: QuestionsRefreshService;
  let httpMock: HttpTestingController;
  let snackBar: MatSnackBar;
  let analyticsCaptureSpy: jasmine.SpyObj<AnalyticsCaptureService>;

  beforeEach(async () => {
    authServiceSpy = jasmine.createSpyObj<AuthService>('AuthService', ['ensureValidSession']);
    authServiceSpy.ensureValidSession.and.resolveTo({
      accessToken: 'token',
      idToken: 'id',
      tokenType: 'Bearer',
      expiresAt: Date.now() + 100000,
      profile: {}
    } as any);

    analyticsCaptureSpy = jasmine.createSpyObj<AnalyticsCaptureService>('AnalyticsCaptureService', ['capture']);

    await TestBed.configureTestingModule({
      declarations: [QuestionComponent],
      imports: [ReactiveFormsModule, HttpClientTestingModule, MatSnackBarModule, NoopAnimationsModule],
      providers: [
        { provide: AuthService, useValue: authServiceSpy },
        { provide: AnalyticsCaptureService, useValue: analyticsCaptureSpy }
      ],
      schemas: [NO_ERRORS_SCHEMA]
    }).compileComponents();

    fixture = TestBed.createComponent(QuestionComponent);
    component = fixture.componentInstance;
    refreshService = TestBed.inject(QuestionsRefreshService);
    httpMock = TestBed.inject(HttpTestingController);
    snackBar = TestBed.inject(MatSnackBar);
    spyOn(refreshService, 'triggerRefresh');
    spyOn(snackBar, 'open');
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should submit a question and trigger metrics recalculation', fakeAsync(() => {
    component.questionForm.setValue({
      name: 'Two Sum',
      difficulty: 'Easy',
      date: '2025-10-05',
      tags: ['Arrays'],
      minutesTaken: 15,
      neededHelp: false,
      crackedExercise: 'completed',
      observation: 'Revisit binary search approach.'
    });

    component.submitForm();
    tick();

    const createReq = httpMock.expectOne((req) => req.url.endsWith('/create_exercise'));
    expect(createReq.request.method).toBe('POST');
    expect(createReq.request.headers.get('x-env')).toBe('dev');
    expect(createReq.request.headers.get('x-app-version')).toBe('unknown');
    expect(createReq.request.headers.has('x-correlation-id')).toBeTrue();
    const correlationId = createReq.request.headers.get('x-correlation-id');
    createReq.flush({ message: 'ok' });

    const metricsReq = httpMock.expectOne((req) => req.url.endsWith('/create_user_metrics'));
    expect(metricsReq.request.method).toBe('POST');
    expect(metricsReq.request.headers.get('x-correlation-id')).toBe(correlationId);
    expect(metricsReq.request.body).toEqual(
      jasmine.objectContaining({
        short_window_days: 7,
        long_window_days: 30
      })
    );
    metricsReq.flush({ message: 'metrics updated' });

    tick();

    expect(refreshService.triggerRefresh).toHaveBeenCalled();
    expect(snackBar.open).toHaveBeenCalled();
  }));
});
