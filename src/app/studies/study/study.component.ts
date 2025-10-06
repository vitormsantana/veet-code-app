import { Component } from '@angular/core';
import { HttpClient } from '@angular/common/http';

@Component({
  selector: 'app-study',
  standalone: false,
  templateUrl: './study.component.html',
  styleUrl: './study.component.css'
})

export class StudyComponent {
  study = {
    theme: '',
    date: '',
    minutes: 0
  };

  submittedStudy: any = null;
  responseMessage: string = '';

  constructor(private http: HttpClient) {}

  submitForm() {
    const apiUrl = 'https://6p4ojh18mj.execute-api.sa-east-1.amazonaws.com/dev/send_studies';
    this.http.post(apiUrl, this.study).subscribe({
      next: (response: any) => {
        this.responseMessage = response.message || 'Study submitted successfully!';
        this.submittedStudy = { ...this.study };
      },
      error: (error) => {
        console.error('Error:', error);
        this.responseMessage = 'An error occurred while submitting the study';
      }
    });
  }

}
