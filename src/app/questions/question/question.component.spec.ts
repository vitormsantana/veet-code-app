import { ComponentFixture, TestBed, fakeAsync, tick } from '@angular/core/testing';
import { ReactiveFormsModule } from '@angular/forms';
import { HttpClientTestingModule, HttpTestingController } from '@angular/common/http/testing';
import { NO_ERRORS_SCHEMA } from '@angular/core';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { AuthService } from '../../auth/auth.service';

import { QuestionComponent } from './question.component';
import { QuestionsRefreshService } from '../questions-refresh.service';
import { EventTrackingService } from '../../analytics/event-tracking.service';

describe('QuestionComponent', () => {
  let component: QuestionComponent;
  let fixture: ComponentFixture<QuestionComponent>;
  let authServiceSpy: jasmine.SpyObj<AuthService>;
  let refreshService: QuestionsRefreshService;
  let httpMock: HttpTestingController;
  let snackBar: MatSnackBar;
  let eventTrackingServiceSpy: jasmine.SpyObj<EventTrackingService>;

  beforeEach(async () => {
    authServiceSpy = jasmine.createSpyObj<AuthService>('AuthService', ['ensureValidSession']);
    authServiceSpy.ensureValidSession.and.resolveTo({
      accessToken: 'token',
      idToken: 'id',
      tokenType: 'Bearer',
      expiresAt: Date.now() + 100000,
      profile: {}
    } as any);
    eventTrackingServiceSpy = jasmine.createSpyObj<EventTrackingService>('EventTrackingService', ['trackApiResult']);

    await TestBed.configureTestingModule({
      declarations: [QuestionComponent],
      imports: [ReactiveFormsModule, HttpClientTestingModule, MatSnackBarModule, NoopAnimationsModule],
      providers: [
        { provide: AuthService, useValue: authServiceSpy },
        { provide: EventTrackingService, useValue: eventTrackingServiceSpy }
      ],
      schemas: [NO_ERRORS_SCHEMA]
    })
      .compileComponents();

    fixture = TestBed.createComponent(QuestionComponent);
    component = fixture.componentInstance;
    refreshService = TestBed.inject(QuestionsRefreshService);
    httpMock = TestBed.inject(HttpTestingController);
    snackBar = TestBed.inject(MatSnackBar);
    spyOn(refreshService, 'triggerRefresh');
    spyOn(snackBar, 'open');
    fixture.detectChanges();
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

    const createReq = httpMock.expectOne(/create_exercise$/);
    expect(createReq.request.method).toBe('POST');
    createReq.flush({ message: 'ok' });

    const metricsReq = httpMock.expectOne(/create_user_metrics$/);
    expect(metricsReq.request.method).toBe('POST');
    expect(metricsReq.request.body).toEqual(jasmine.objectContaining({
      short_window_days: 7,
      long_window_days: 30
    }));
    metricsReq.flush({ message: 'metrics updated' });

    tick();

    expect(refreshService.triggerRefresh).toHaveBeenCalled();
    expect(snackBar.open).toHaveBeenCalled();
  }));
});
