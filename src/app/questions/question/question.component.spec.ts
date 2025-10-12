import { ComponentFixture, TestBed, fakeAsync, tick } from '@angular/core/testing';
import { ReactiveFormsModule } from '@angular/forms';
import { HttpClientTestingModule, HttpTestingController } from '@angular/common/http/testing';
import { NO_ERRORS_SCHEMA } from '@angular/core';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { AuthService } from '../../auth/auth.service';

import { QuestionComponent } from './question.component';
import { QuestionsRefreshService } from '../questions-refresh.service';

describe('QuestionComponent', () => {
  let component: QuestionComponent;
  let fixture: ComponentFixture<QuestionComponent>;
  let authServiceSpy: jasmine.SpyObj<AuthService>;
  let refreshService: QuestionsRefreshService;
  let httpMock: HttpTestingController;
  let snackBar: MatSnackBar;

  beforeEach(async () => {
    authServiceSpy = jasmine.createSpyObj<AuthService>('AuthService', ['ensureValidSession']);
    authServiceSpy.ensureValidSession.and.resolveTo({
      accessToken: 'token',
      idToken: 'id',
      tokenType: 'Bearer',
      expiresAt: Date.now() + 100000,
      profile: {}
    } as any);

    await TestBed.configureTestingModule({
      declarations: [QuestionComponent],
      imports: [ReactiveFormsModule, HttpClientTestingModule, MatSnackBarModule, NoopAnimationsModule],
      providers: [{ provide: AuthService, useValue: authServiceSpy }],
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

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('should trigger refresh when a question is successfully submitted', fakeAsync(() => {
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

    const req = httpMock.expectOne(/create_exercise$/);
    expect(req.request.method).toBe('POST');
    req.flush({ message: 'ok' });

    const metricsReq = httpMock.expectOne(/create_user_metrics$/);
    expect(metricsReq.request.method).toBe('POST');
    expect(metricsReq.request.body).toEqual(jasmine.objectContaining({
      short_window_days: 7,
      long_window_days: 30
    }));
    expect(typeof metricsReq.request.body.date).toBe('string');
    expect(Date.parse(metricsReq.request.body.date)).not.toBeNaN();
    metricsReq.flush({ message: 'metrics updated' });

    tick();

    expect(refreshService.triggerRefresh).toHaveBeenCalled();
    expect(snackBar.open).toHaveBeenCalledWith(
      'Two Sum (Easy) • 05/10/2025 • 15 min • Help: No • Status: Completed • Observation: Revisit binary search approach.',
      'Dismiss',
      jasmine.objectContaining({
        duration: 5000,
        horizontalPosition: 'right',
        verticalPosition: 'top'
      })
    );
  }));
});
