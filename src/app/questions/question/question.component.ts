import { Component } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { FormGroup, FormControl, Validators } from '@angular/forms';
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

  availableTags = ['Arrays', 'Backtracking', 'String', 'Binary Search', 'Hash Tables', 'Linked Lists', 'Two Pointers', 'Sliding Window',
    'Stacks', 'Queues', 'Heaps', 'Recursion' , 'Tree', 'BST', 'Binary Tree', 'BFS', 'DFS', 'Sets', 'Sort',
    'Dynamic Programming', 'Memoization','Graph', 'Math', 'Greedy'];

  constructor(
    private http: HttpClient,
    private authService: AuthService,
    private questionsRefreshService: QuestionsRefreshService,
    private snackBar: MatSnackBar
  ) {
    this.questionForm = new FormGroup({
      name: new FormControl('', Validators.required),
      difficulty: new FormControl('Easy', Validators.required),
      date: new FormControl('', Validators.required),
      tags: new FormControl([], Validators.required),
      minutesTaken: new FormControl<number | null>(null, [Validators.required, Validators.min(1)]),
      neededHelp: new FormControl(false)
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

    const formValue = this.questionForm.value;
    const formattedDate = this.formatDate(formValue.date as string);
    const minutesTaken = Number(formValue.minutesTaken);

    const payload: SubmissionPayload = {
      name: formValue.name,
      difficulty: formValue.difficulty,
      date: formattedDate,
      tags: Array.isArray(formValue.tags) ? formValue.tags : [],
      minutes_taken: minutesTaken,
      needed_help: !!formValue.neededHelp
    };

    const apiUrl = `${this.apiBaseUrl}/create_exercise`;

    const headers = new HttpHeaders({
      Authorization: `${session.tokenType || 'Bearer'} ${session.idToken}`
    });

    this.http.post(apiUrl, payload, { headers }).subscribe({
      next: (response: any) => {
        this.questionsRefreshService.triggerRefresh();
        this.showSubmissionNotification(payload);
      },
      error: (error) => {
        console.error('Error:', error);
        this.showErrorNotification();
      }
    });
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
    const details = [payload.date || 'Date: —', minutes, help].join(' • ');
    const message = `${payload.name} (${payload.difficulty}) • ${details}`;

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
}

interface SubmissionPayload {
  name: string;
  difficulty: string;
  date: string;
  tags: string[];
  minutes_taken: number;
  needed_help: boolean;
}
