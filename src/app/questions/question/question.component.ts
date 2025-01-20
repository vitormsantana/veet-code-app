import { Component } from '@angular/core';
import { HttpClient } from '@angular/common/http';

@Component({
  selector: 'app-question',
  standalone: false,
  templateUrl: './question.component.html',
  styleUrls: ['./question.component.css']
})

export class QuestionComponent {
  question = {
    name: '',
    date: '',
    difficulty: 'easy',
    tags: [] as string[]
  };

  availableTags = ['Arrays', 'String', 'Hash Tables', 'Linked Lists', 'Two Pointers', 'Sliding Window',
    'Stacks', 'Queues', 'Heaps', 'Binary Tree', 'BFS', 'DFS', 'Sets', 'Sort',
    'Dynamic Programming', 'Graph', 'Math'];

  submittedQuestion: any = null;
  responseMessage: string = '';

  constructor(private http: HttpClient) {}

  submitForm() {
    const apiUrl = 'https://6p4ojh18mj.execute-api.sa-east-1.amazonaws.com/dev/send_questions';

    this.http.post(apiUrl, this.question).subscribe({
      next: (response: any) => {
        this.responseMessage = response.message || 'Question submitted successfully!';
        this.submittedQuestion = { ...this.question };
      },
      error: (error) => {
        console.error('Error:', error);
        this.responseMessage = 'An error occurred while submitting the question.';
      }
    });
  }
}
