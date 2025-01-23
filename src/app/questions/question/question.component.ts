import { Component } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { FormGroup, FormControl, Validators } from '@angular/forms';

@Component({
  selector: 'app-question',
  standalone: false,
  templateUrl: './question.component.html',
  styleUrls: ['./question.component.css']
})

export class QuestionComponent {
  questionForm: FormGroup;

  availableTags = ['Arrays', 'String', 'Hash Tables', 'Linked Lists', 'Two Pointers', 'Sliding Window',
    'Stacks', 'Queues', 'Heaps', 'Binary Tree', 'BFS', 'DFS', 'Sets', 'Sort',
    'Dynamic Programming', 'Graph', 'Math'];

  submittedQuestion: any = null;
  responseMessage: string = '';

  constructor(private http: HttpClient) {
    this.questionForm = new FormGroup({
      name: new FormControl('', Validators.required),
      difficulty: new FormControl('Easy', Validators.required),
      date: new FormControl('', Validators.required),
      tags: new FormControl([], Validators.required)
    });
  }

  submitForm() {
    const question = { ...this.questionForm.value }; // Get the form data

    // Format the date in dd/mm/yyyy format
    question.date = this.formatDate(question.date);

    const apiUrl = 'https://6p4ojh18mj.execute-api.sa-east-1.amazonaws.com/dev/send_questions';

    this.http.post(apiUrl, question).subscribe({
      next: (response: any) => {
        this.responseMessage = response.message || 'Question submitted successfully!';
        this.submittedQuestion = { ...question };
      },
      error: (error) => {
        console.error('Error:', error);
        this.responseMessage = 'An error occurred while submitting the question.';
      }
    });
  }

  // Helper function to format the date
  formatDate(date: string): string {
    const [year, month, day] = date.split('-');
    return `${day}/${month}/${year}`;
  }
}
