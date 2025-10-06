import { Component } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { FormGroup, FormControl, Validators } from '@angular/forms';
import { environment } from '../../../environments/environment';
import { AuthService } from '../../auth/auth.service';

@Component({
  selector: 'app-question',
  standalone: false,
  templateUrl: './question.component.html',
  styleUrls: ['./question.component.css']
})

export class QuestionComponent {
  questionForm: FormGroup;
  private readonly apiBaseUrl = environment.apiBaseUrl;

  availableTags = ['Arrays', 'Backtracking', 'String', 'Binary Search', 'Hash Tables', 'Linked Lists', 'Two Pointers', 'Sliding Window',
    'Stacks', 'Queues', 'Heaps', 'Recursion' , 'Tree', 'BST', 'Binary Tree', 'BFS', 'DFS', 'Sets', 'Sort',
    'Dynamic Programming', 'Memoization','Graph', 'Math', 'Greedy'];

  submittedQuestion: any = null;
  responseMessage: string = '';

  constructor(private http: HttpClient, private authService: AuthService) {
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
      this.responseMessage = 'You need to log in before adding a new exercise.';
      return;
    }

    const formValue = this.questionForm.value;
    const formattedDate = this.formatDate(formValue.date as string);
    const minutesTaken = Number(formValue.minutesTaken);

    const payload = {
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
        this.responseMessage = response.message || 'Question submitted successfully!';
        this.submittedQuestion = { ...payload };
      },
      error: (error) => {
        console.error('Error:', error);
        this.responseMessage = 'An error occurred while submitting the question.';
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
}
