import { Component, OnDestroy } from '@angular/core';
import { FormControl, FormGroup, Validators } from '@angular/forms';
import { HttpClient, HttpErrorResponse, HttpHeaders, HttpResponse } from '@angular/common/http';
import { MatSnackBar } from '@angular/material/snack-bar';
import { environment } from '../../../environments/environment';
import { AuthService } from '../../auth/auth.service';
import { QuestionsRecomendationsOpenaiService } from '../questions-recomendations-openai/questions-recomendations-openai.service';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import { AnalyticsCaptureService } from '../../analytics/analytics-capture.service';

@Component({
  selector: 'app-question-feedback',
  standalone: false,
  templateUrl: './question-feedback.component.html',
  styleUrls: ['./question-feedback.component.css']
})
export class QuestionFeedbackComponent implements OnDestroy {
  feedbackForm: FormGroup;
  isSubmitting = false;
  latestRecommendationId: string | null = null;
  isWaitingForRecommendation = true;
  readonly feedbackOptions = [
    { label: '👍 Yes — the guidance felt on point', value: 1 },
    { label: '👎 Not really — I need something different', value: -1 }
  ];

  private readonly destroy$ = new Subject<void>();
  private readonly apiBaseUrl = environment.apiBaseUrl;

  constructor(
    private readonly http: HttpClient,
    private readonly authService: AuthService,
    private readonly snackBar: MatSnackBar,
    private readonly recommendationsService: QuestionsRecomendationsOpenaiService,
    private readonly analyticsCapture: AnalyticsCaptureService
  ) {
    this.feedbackForm = new FormGroup({
      feedbackValue: new FormControl<number | null>(null, Validators.required),
      comment: new FormControl('', Validators.maxLength(500))
    });

    this.latestRecommendationId = this.recommendationsService.getLatestRecommendationId();
    if (!this.latestRecommendationId) {
      const snapshot = this.recommendationsService.getLatestRecommendationsSnapshot();
      if (Array.isArray(snapshot) && snapshot.length) {
        this.latestRecommendationId = snapshot[0]?.recommendation_id ?? null;
      }
    }

    this.isWaitingForRecommendation = !this.latestRecommendationId;

    this.recommendationsService.recommendationId$
      .pipe(takeUntil(this.destroy$))
      .subscribe((id) => {
        this.latestRecommendationId = id ?? null;
        this.isWaitingForRecommendation = !this.latestRecommendationId;
      });
  }

  async submitFeedback(): Promise<void> {
    if (this.feedbackForm.invalid) {
      this.feedbackForm.markAllAsTouched();
      return;
    }

    if (!this.latestRecommendationId) {
      this.snackBar.open('No recommendation available to review yet.', 'Dismiss', {
        duration: 5000,
        horizontalPosition: 'right',
        verticalPosition: 'top'
      });
      return;
    }

    const session = await this.authService.ensureValidSession();
    if (!session || !session.accessToken) {
      this.snackBar.open('Sign in to share feedback on a recommendation.', 'Dismiss', {
        duration: 5000,
        horizontalPosition: 'right',
        verticalPosition: 'top'
      });
      return;
    }

    const headers = new HttpHeaders({
      Authorization: `${session.tokenType || 'Bearer'} ${session.idToken}`
    });

    const trimmedComment = (this.feedbackForm.value.comment ?? '').trim();
    const payload: FeedbackPayload = {
      recomendation_id: this.latestRecommendationId,
      feedback_value: Number(this.feedbackForm.value.feedbackValue)
    };

    if (trimmedComment) {
      payload.feedback_comment = trimmedComment;
    }

    this.isSubmitting = true;

    this.http.post(`${this.apiBaseUrl}/create_feedback_for_recomendation`, payload, { headers, observe: 'response' }).subscribe({
      next: (response: HttpResponse<unknown>) => {
        this.analyticsCapture.capture({
          type: 'api_call',
          apiName: 'create_feedback_for_recomendation',
          apiMethod: 'POST',
          apiEndpoint: '/create_feedback_for_recomendation',
          statusCode: response.status,
          outcome: 'success',
          source: 'user_click',
          label: 'Submit Feedback'
        });
        this.snackBar.open('Thanks for the feedback!', 'Dismiss', {
          duration: 5000,
          horizontalPosition: 'right',
          verticalPosition: 'top'
        });
        this.feedbackForm.reset();
        this.feedbackForm.markAsPristine();
        this.feedbackForm.markAsUntouched();
      },
      error: (error: HttpErrorResponse) => {
        this.analyticsCapture.capture({
          type: 'api_call',
          apiName: 'create_feedback_for_recomendation',
          apiMethod: 'POST',
          apiEndpoint: '/create_feedback_for_recomendation',
          statusCode: error.status || 0,
          outcome: 'error',
          source: 'user_click',
          label: 'Submit Feedback'
        });
        console.error('Failed to submit feedback:', error);
        this.snackBar.open('Unable to submit feedback. Please try again.', 'Dismiss', {
          duration: 5000,
          horizontalPosition: 'right',
          verticalPosition: 'top'
        });
        this.isSubmitting = false;
      },
      complete: () => {
        this.isSubmitting = false;
      }
    });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }
}

interface FeedbackPayload {
  recomendation_id: string;
  feedback_value: number;
  feedback_comment?: string;
}
