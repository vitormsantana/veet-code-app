import { Component } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { FormControl, FormGroup, Validators } from '@angular/forms';
import { MatSnackBar } from '@angular/material/snack-bar';
import { environment } from '../../../environments/environment';
import { AuthService } from '../../auth/auth.service';
import { QuestionsRefreshService } from '../questions-refresh.service';

@Component({
  selector: 'app-question',
  standalone: false,
  templateUrl: './question.component.html',
  styleUrls: ['./question.component.css']
})
export class QuestionComponent {
  questionForm: FormGroup;
  private readonly apiBaseUrl = environment.apiBaseUrl;
  private readonly notificationDurationMs = 5000;

  availableTags = [
    'Arrays',
    'Backtracking',
    'String',
    'Binary Search',
    'Hash Tables',
    'Linked Lists',
    'Two Pointers',
    'Sliding Window',
    'Stacks',
    'Queues',
    'Heaps',
    'Recursion',
    'Tree',
    'BST',
    'Binary Tree',
    'BFS',
    'DFS',
    'Sets',
    'Sort',
    'Dynamic Programming',
    'Memoization',
    'Graph',
    'Math',
    'Greedy'
  ];

  constructor(
    private readonly http: HttpClient,
    private readonly authService: AuthService,
    private readonly questionsRefreshService: QuestionsRefreshService,
    private readonly snackBar: MatSnackBar
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
  }

  async submitForm(): Promise<void> {
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

    const payload: SubmissionPayload = {
      name: formValue.name,
      difficulty: formValue.difficulty,
      date: this.formatDate(formValue.date),
      tags: Array.isArray(formValue.tags) ? formValue.tags : [],
      minutes_taken: Number(formValue.minutesTaken),
      needed_help: !!formValue.neededHelp,
      cracked_exercise: formValue.crackedExercise === 'completed',
      obs: typeof formValue.observation === 'string' ? formValue.observation.trim() : ''
    };

    const headers = new HttpHeaders({
      Authorization: `${session.tokenType || 'Bearer'} ${session.idToken}`
    });

    this.http.post(`${this.apiBaseUrl}/create_exercise`, payload, { headers }).subscribe({
      next: () => {
        this.questionsRefreshService.triggerRefresh();
        this.showSubmissionNotification(payload);
        this.triggerMetricsRecalculation(headers);
        this.questionForm.reset({
          name: '',
          difficulty: 'Easy',
          date: '',
          tags: [],
          minutesTaken: null,
          neededHelp: false,
          crackedExercise: 'completed',
          observation: ''
        });
      },
      error: (error) => {
        console.error('Error creating exercise:', error);
        this.showErrorNotification();
      }
    });
  }

  private formatDate(date: string | null | undefined): string {
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
    const metricsPayload: MetricsRequestPayload = {
      date: new Date().toISOString(),
      short_window_days: 7,
      long_window_days: 30
    };

    this.http.post(`${this.apiBaseUrl}/create_user_metrics`, metricsPayload, { headers }).subscribe({
      error: (error) => {
        console.error('Failed to update user metrics:', error);
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
