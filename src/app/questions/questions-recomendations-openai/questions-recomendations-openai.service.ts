import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { from, Observable, throwError } from 'rxjs';
import { switchMap } from 'rxjs/operators';
import { AuthService } from '../../auth/auth.service';

export interface QuestionRecommendation {
  suggestions: string;
}

@Injectable({
  providedIn: 'root'
})
export class QuestionsRecomendationsOpenaiService {
  private readonly apiUrl = 'https://29nac9o231.execute-api.sa-east-1.amazonaws.com/dev/read_openai_questions_recommendations';

  constructor(private http: HttpClient, private authService: AuthService) { }

  getRecommendations(goal?: string): Observable<QuestionRecommendation> {
    return from(this.authService.ensureValidSession()).pipe(
      switchMap((session) => {
        if (!session || !session.idToken) {
          return throwError(() => new Error('Authentication is required to load recommendations.'));
        }

        const trimmedGoal = goal?.trim();
        const headers = new HttpHeaders({
          Authorization: `${session.tokenType || 'Bearer'} ${session.idToken}`,
          'Content-Type': 'application/json'
        });

        const payload = trimmedGoal ? { goal: trimmedGoal } : {};

        return this.http.post<QuestionRecommendation>(this.apiUrl, payload, { headers });
      })
    );
  }
}
