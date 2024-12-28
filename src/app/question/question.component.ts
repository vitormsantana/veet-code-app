import { Component } from '@angular/core';

@Component({
  selector: 'app-question',
  standalone: false,
  templateUrl: './question.component.html',
  styleUrl: './question.component.css'
})

export class QuestionComponent {
  question = {
    name: '',
    date: '',
    difficulty: 'easy',
    tags: []
  };

  submittedQuestion: any = null; 

  submitForm() {
    this.submittedQuestion = {...this.question};
  }
}