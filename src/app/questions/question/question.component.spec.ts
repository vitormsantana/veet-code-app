import { ComponentFixture, TestBed, fakeAsync, tick } from '@angular/core/testing';
import { ReactiveFormsModule } from '@angular/forms';
import { HttpClientTestingModule, HttpTestingController } from '@angular/common/http/testing';
import { NO_ERRORS_SCHEMA } from '@angular/core';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { AuthService } from '../../auth/auth.service';
import { BehaviorSubject } from 'rxjs';

import { QuestionComponent } from './question.component';
import { QuestionsRefreshService } from '../questions-refresh.service';
import { QuestionsRecomendationsOpenaiService } from '../questions-recomendations-openai/questions-recomendations-openai.service';

class QuestionsRecomendationsOpenaiServiceStub {
  private readonly recommendationsSubject = new BehaviorSubject<Array<{ recommendation_id: string; question?: string; category?: string }>>([]);
  private readonly recommendationIdSubject = new BehaviorSubject<string | null>(null);
  recommendations$ = this.recommendationsSubject.asObservable();
  recommendationId$ = this.recommendationIdSubject.asObservable();

  getLatestRecommendationsSnapshot() {
    return this.recommendationsSubject.getValue();
  }

  getLatestRecommendationId() {
    return this.recommendationIdSubject.getValue();
  }

  emit(recommendations: Array<{ recommendation_id: string; question?: string; category?: string }>) {
    this.recommendationsSubject.next(recommendations);
    this.recommendationIdSubject.next(recommendations[0]?.recommendation_id ?? null);
  }
}

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
      providers: [
        { provide: AuthService, useValue: authServiceSpy },
        { provide: QuestionsRecomendationsOpenaiService, useClass: QuestionsRecomendationsOpenaiServiceStub }
      ],
      schemas: [NO_ERRORS_SCHEMA]
    })
    .compileComponents();

    fixture = TestBed.createComponent(QuestionComponent);
    component = fixture.componentInstance;
    refreshService = TestBed.inject(QuestionsRefreshService);
    httpMock = TestBed.inject(HttpTestingController);
    snackBar = TestBed.inject(MatSnackBar);
    const recommendationsService = TestBed.inject(QuestionsRecomendationsOpenaiService) as unknown as QuestionsRecomendationsOpenaiServiceStub;
    recommendationsService.emit([
      { recommendation_id: 'rec-123', question: 'Longest Common Subsequence', category: 'Dynamic Programming' },
      { recommendation_id: 'rec-456', question: 'Binary Search Variants', category: 'Binary Search' }
    ]);
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
    snackBar.open.calls.reset();
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

  it('should submit recommendation feedback', fakeAsync(() => {
    snackBar.open.calls.reset();
    component.feedbackForm.patchValue({
      feedbackValue: 1,
      comment: 'Loved this tip!'
    });

    component.submitFeedback();
    tick();

    const feedbackReq = httpMock.expectOne(/add_feedback_for_recomendation$/);
    expect(feedbackReq.request.method).toBe('POST');
    expect(feedbackReq.request.body).toEqual({
      recomendation_id: 'rec-123',
      feedback_value: 1,
      feedback_comment: 'Loved this tip!'
    });
    feedbackReq.flush({ message: 'stored' });

    tick();

    expect(snackBar.open).toHaveBeenCalledWith(
      'Thanks for the feedback!',
      'Dismiss',
      jasmine.objectContaining({
        duration: 5000,
        horizontalPosition: 'right',
        verticalPosition: 'top'
      })
    );
    expect(component.feedbackForm.get('feedbackValue')?.value).toBeNull();
    expect(component.feedbackForm.get('comment')?.value).toBeNull();
    expect(component['latestRecommendationId']).toBe('rec-123');
    expect(component.isSubmittingFeedback).toBeFalse();
  }));

  it('should block feedback submission when no recommendation id is available', fakeAsync(() => {
    const recommendationsService = TestBed.inject(QuestionsRecomendationsOpenaiService) as unknown as QuestionsRecomendationsOpenaiServiceStub;
    recommendationsService.emit([]);
    fixture.detectChanges();

    snackBar.open.calls.reset();
    component.feedbackForm.patchValue({ feedbackValue: 1, comment: 'Test' });

    component.submitFeedback();
    tick();

    expect(snackBar.open).toHaveBeenCalledWith(
      'No recommendation available to review yet.',
      'Dismiss',
      jasmine.objectContaining({
        duration: 5000,
        horizontalPosition: 'right',
        verticalPosition: 'top'
      })
    );
    httpMock.expectNone(/add_feedback_for_recomendation$/);
    expect(component.isSubmittingFeedback).toBeFalse();
  }));
});
