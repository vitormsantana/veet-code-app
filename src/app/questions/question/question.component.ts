import { Component, OnDestroy } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { FormGroup, FormControl, Validators } from '@angular/forms';
import { MatSnackBar } from '@angular/material/snack-bar';
import { environment } from '../../../environments/environment';
import { AuthService } from '../../auth/auth.service';
import { QuestionsRefreshService } from '../questions-refresh.service';
import { QuestionsRecomendationsOpenaiService } from '../questions-recomendations-openai/questions-recomendations-openai.service';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';

@Component({
  selector: 'app-question',
  standalone: false,
  templateUrl: './question.component.html',
  styleUrls: ['./question.component.css']
})

export class QuestionComponent implements OnDestroy {
  questionForm: FormGroup;
  feedbackForm: FormGroup;
  private readonly apiBaseUrl = environment.apiBaseUrl;
  private readonly notificationDurationMs = 5000;
  private readonly destroy$ = new Subject<void>();

  availableTags = ['Arrays', 'Backtracking', 'String', 'Binary Search', 'Hash Tables', 'Linked Lists', 'Two Pointers', 'Sliding Window',
    'Stacks', 'Queues', 'Heaps', 'Recursion' , 'Tree', 'BST', 'Binary Tree', 'BFS', 'DFS', 'Sets', 'Sort',
    'Dynamic Programming', 'Memoization','Graph', 'Math', 'Greedy'];
  feedbackOptions = [
    { label: 'Positive', value: 1 },
    { label: 'Negative', value: -1 }
  ];
  isSubmittingFeedback = false;
  latestRecommendationId: string | null = null;

  constructor(
    private http: HttpClient,
    private authService: AuthService,
    private questionsRefreshService: QuestionsRefreshService,
    private snackBar: MatSnackBar,
    private recommendationsService: QuestionsRecomendationsOpenaiService
  ) {
    this.questionForm = new FormGroup({
      name: new FormControl('', Validators.required),
      difficulty: new FormControl('Easy', Validators.required),
      date: new FormControl('', Validators.required),
      tags: new FormControl([], Validators.required),
      minutesTaken: new FormControl<number | null>(null, [Validators.required, Validators.min(1)]),
      neededHelp: new FormControl(false),
      crackedExercise: new FormControl<'completed' | 'gave_up'>('completed', Validators.required),
      observation: new FormControl('', Validators.maxLength(1000))
    });

    this.feedbackForm = new FormGroup({
      feedbackValue: new FormControl<number | null>(null, Validators.required),
      comment: new FormControl('', Validators.maxLength(500))
    });

    this.latestRecommendationId = this.recommendationsService.getLatestRecommendationId();

    const snapshot = this.recommendationsService.getLatestRecommendationsSnapshot();
    if (!this.latestRecommendationId && Array.isArray(snapshot) && snapshot.length) {
      this.latestRecommendationId = snapshot[0]?.recommendation_id ?? null;
    }

    this.recommendationsService.recommendations$
      .pipe(takeUntil(this.destroy$))
      .subscribe((recommendations) => {
        if (Array.isArray(recommendations) && recommendations.length && !this.latestRecommendationId) {
          this.latestRecommendationId = recommendations[0]?.recommendation_id ?? null;
        }
      });

    this.recommendationsService.recommendationId$
      .pipe(takeUntil(this.destroy$))
      .subscribe((id) => {
        this.latestRecommendationId = id ?? null;
      });
  }

  async submitForm() {
    if (this.questionForm.invalid) {
      this.questionForm.markAllAsTouched();
      return;
    }

    const session = await this.authService.ensureValidSession();

    if (!session || !session.accessToken) {
      this.showLoginRequiredNotification();
      return;
    }

    const formValue = this.questionForm.value as {
      name: string;
      difficulty: string;
      date: string;
      tags: string[];
      minutesTaken: number;
      neededHelp: boolean;
      crackedExercise: 'completed' | 'gave_up';
      observation: string;
    };
    const formattedDate = this.formatDate(formValue.date as string);
    const minutesTaken = Number(formValue.minutesTaken);
    const observation = typeof formValue.observation === 'string' ? formValue.observation.trim() : '';
    const crackedExercise = formValue.crackedExercise === 'completed';

    const payload: SubmissionPayload = {
      name: formValue.name,
      difficulty: formValue.difficulty,
      date: formattedDate,
      tags: Array.isArray(formValue.tags) ? formValue.tags : [],
      minutes_taken: minutesTaken,
      needed_help: !!formValue.neededHelp,
      cracked_exercise: crackedExercise,
      obs: observation
    };

    const apiUrl = `${this.apiBaseUrl}/create_exercise`;

    const headers = new HttpHeaders({
      Authorization: `${session.tokenType || 'Bearer'} ${session.idToken}`
    });

    this.http.post(apiUrl, payload, { headers }).subscribe({
      next: (response: any) => {
        this.questionsRefreshService.triggerRefresh();
        this.showSubmissionNotification(payload);
        this.triggerMetricsRecalculation(headers);
      },
      error: (error) => {
        console.error('Error:', error);
        this.showErrorNotification();
      }
    });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  // Helper function to format the date
  formatDate(date: string | null | undefined): string {
    if (!date) {
      return '';
    }

    const [year, month, day] = date.split('-');
    return `${day}/${month}/${year}`;
  }

  private showSubmissionNotification(payload: SubmissionPayload): void {
    const minutes = payload.minutes_taken ? `${payload.minutes_taken} min` : '—';
    const help = payload.needed_help ? 'Help: Yes' : 'Help: No';
    const status = payload.cracked_exercise ? 'Completed' : 'Gave up';
    const details = [payload.date || 'Date: —', minutes, help, `Status: ${status}`].join(' • ');
    const observationDetail = payload.obs ? `Observation: ${payload.obs}` : 'Observation: —';
    const message = `${payload.name} (${payload.difficulty}) • ${details} • ${observationDetail}`;

    this.snackBar.open(message, 'Dismiss', {
      duration: this.notificationDurationMs,
      horizontalPosition: 'right',
      verticalPosition: 'top'
    });
  }

  private showErrorNotification(): void {
    this.snackBar.open('Unable to submit the question. Please try again.', 'Dismiss', {
      duration: this.notificationDurationMs,
      horizontalPosition: 'right',
      verticalPosition: 'top'
    });
  }

  private showLoginRequiredNotification(): void {
    this.snackBar.open('Sign in to add a new exercise.', 'Dismiss', {
      duration: this.notificationDurationMs,
      horizontalPosition: 'right',
      verticalPosition: 'top'
    });
  }

  private triggerMetricsRecalculation(headers: HttpHeaders): void {
    const metricsUrl = `${this.apiBaseUrl}/create_user_metrics`;
    const metricsPayload: MetricsRequestPayload = {
      date: new Date().toISOString(),
      short_window_days: 7,
      long_window_days: 30
    };

    this.http.post(metricsUrl, metricsPayload, { headers }).subscribe({
      error: (error) => {
        console.error('Failed to update user metrics:', error);
      }
    });
  }

  async submitFeedback(): Promise<void> {
    if (this.feedbackForm.invalid) {
      this.feedbackForm.markAllAsTouched();
      return;
    }

    const session = await this.authService.ensureValidSession();

    if (!session || !session.accessToken) {
      this.showLoginRequiredNotification();
      return;
    }

    if (!this.latestRecommendationId) {
      this.snackBar.open('No recommendation available to review yet.', 'Dismiss', {
        duration: this.notificationDurationMs,
        horizontalPosition: 'right',
        verticalPosition: 'top'
      });
      return;
    }

    const headers = new HttpHeaders({
      Authorization: `${session.tokenType || 'Bearer'} ${session.idToken}`
    });

    const { feedbackValue, comment } = this.feedbackForm.value;
    const trimmedComment = (comment ?? '').trim();

    const payload: FeedbackPayload = {
      recomendation_id: this.latestRecommendationId,
      feedback_value: Number(feedbackValue)
    };

    if (trimmedComment) {
      payload.feedback_comment = trimmedComment;
    }

    this.isSubmittingFeedback = true;

    const feedbackUrl = `${this.apiBaseUrl}/create_feedback_for_recomendation`;

    this.http.post(feedbackUrl, payload, { headers }).subscribe({
      next: () => {
        this.snackBar.open('Thanks for the feedback!', 'Dismiss', {
          duration: this.notificationDurationMs,
          horizontalPosition: 'right',
          verticalPosition: 'top'
        });
        this.feedbackForm.reset();
        this.feedbackForm.markAsPristine();
        this.feedbackForm.markAsUntouched();
      },
      error: (error) => {
        console.error('Failed to submit feedback:', error);
        this.snackBar.open('Unable to submit feedback. Please try again.', 'Dismiss', {
          duration: this.notificationDurationMs,
          horizontalPosition: 'right',
          verticalPosition: 'top'
        });
        this.isSubmittingFeedback = false;
      },
      complete: () => {
        this.isSubmittingFeedback = false;
      }
    });
  }

}

interface SubmissionPayload {
  name: string;
  difficulty: string;
  date: string;
  tags: string[];
  minutes_taken: number;
  needed_help: boolean;
  cracked_exercise: boolean;
  obs: string;
}

interface MetricsRequestPayload {
  date: string;
  short_window_days: number;
  long_window_days: number;
}

interface FeedbackPayload {
  recomendation_id: string;
  feedback_value: number;
  feedback_comment?: string;
}
