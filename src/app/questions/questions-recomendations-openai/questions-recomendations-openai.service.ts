import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable } from 'rxjs';

export interface QuestionRecommendation {
  suggestions: string[]; // Update this type based on the API response structure
}

@Injectable({
  providedIn: 'root'
})
export class QuestionsRecomendationsOpenaiService {
  private apiUrl = "https://6p4ojh18mj.execute-api.sa-east-1.amazonaws.com/dev/get_openapi_questions_recommendations";

  constructor(private http: HttpClient) { }

  getRecommendations(): Observable<QuestionRecommendation> {
    const headers = new HttpHeaders({
      'Content-Type': 'application/json',
    });

    return this.http.post<QuestionRecommendation>(this.apiUrl, { headers });
  }
}
