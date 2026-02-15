import { ComponentFixture, TestBed, fakeAsync, tick } from '@angular/core/testing';
import { HttpClientTestingModule, HttpTestingController } from '@angular/common/http/testing';
import { ReactiveFormsModule } from '@angular/forms';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatButtonToggleModule } from '@angular/material/button-toggle';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { AuthService } from '../../auth/auth.service';
import { QuestionsRecomendationsOpenaiService } from '../questions-recomendations-openai/questions-recomendations-openai.service';
import { QuestionFeedbackComponent } from './question-feedback.component';
import { BehaviorSubject } from 'rxjs';
import { EventTrackingService } from '../../analytics/event-tracking.service';

class AuthServiceStub {
  ensureValidSession = jasmine.createSpy('ensureValidSession').and.resolveTo({
    accessToken: 'token',
    idToken: 'id',
    tokenType: 'Bearer'
  });
}

class RecommendationsServiceStub {
  private readonly idSubject = new BehaviorSubject<string | null>('rec-123');
  recommendationId$ = this.idSubject.asObservable();

  getLatestRecommendationId(): string | null {
    return this.idSubject.getValue();
  }

  getLatestRecommendationsSnapshot() {
    return [];
  }

  setRecommendationId(id: string | null) {
    this.idSubject.next(id);
  }
}

describe('QuestionFeedbackComponent', () => {
  let component: QuestionFeedbackComponent;
  let fixture: ComponentFixture<QuestionFeedbackComponent>;
  let httpMock: HttpTestingController;
  let snackBar: MatSnackBar;
  let eventTrackingServiceSpy: jasmine.SpyObj<EventTrackingService>;

  beforeEach(async () => {
    eventTrackingServiceSpy = jasmine.createSpyObj<EventTrackingService>('EventTrackingService', ['trackApiResult']);

    await TestBed.configureTestingModule({
      declarations: [QuestionFeedbackComponent],
      imports: [
        HttpClientTestingModule,
        ReactiveFormsModule,
        MatSnackBarModule,
        MatButtonToggleModule,
        MatFormFieldModule,
        MatInputModule,
        NoopAnimationsModule
      ],
      providers: [
        { provide: AuthService, useClass: AuthServiceStub },
        { provide: QuestionsRecomendationsOpenaiService, useClass: RecommendationsServiceStub },
        { provide: EventTrackingService, useValue: eventTrackingServiceSpy }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(QuestionFeedbackComponent);
    component = fixture.componentInstance;
    httpMock = TestBed.inject(HttpTestingController);
    snackBar = TestBed.inject(MatSnackBar);
    spyOn(snackBar, 'open');
    fixture.detectChanges();
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should send feedback with trimmed payload', fakeAsync(() => {
    component.feedbackForm.patchValue({ feedbackValue: 1, comment: 'Great pick ' });

    component.submitFeedback();
    tick();

    const req = httpMock.expectOne(/create_feedback_for_recomendation$/);
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual({
      recomendation_id: 'rec-123',
      feedback_value: 1,
      feedback_comment: 'Great pick'
    });
    req.flush({ message: 'ok' });

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
  }));

  it('should block submission when no recommendation id', fakeAsync(() => {
    const service = TestBed.inject(QuestionsRecomendationsOpenaiService) as unknown as RecommendationsServiceStub;
    service.setRecommendationId(null);
    fixture.detectChanges();

    component.feedbackForm.patchValue({ feedbackValue: -1, comment: 'meh' });

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
    httpMock.expectNone(/create_feedback_for_recomendation$/);
  }));
});
