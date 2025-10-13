import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { BehaviorSubject, from, Observable, throwError } from 'rxjs';
import { switchMap, tap } from 'rxjs/operators';
import { AuthService } from '../../auth/auth.service';

export interface QuestionRecommendation {
  metric_id?: string;
  recommendation_id?: string;
  suggestions?: string;
  recommendations?: Array<{
    recommendation_id: string;
    metric_id?: string;
    category?: string;
    question?: string;
    question_title?: string;
    reason?: string;
  }>;
}

@Injectable({
  providedIn: 'root'
})
export class QuestionsRecomendationsOpenaiService {
  private readonly apiUrl = 'https://29nac9o231.execute-api.sa-east-1.amazonaws.com/dev/read_openai_questions_recommendations';
  private readonly recommendationsSubject = new BehaviorSubject<QuestionRecommendation['recommendations']>([]);
  readonly recommendations$ = this.recommendationsSubject.asObservable();
  private readonly recommendationIdSubject = new BehaviorSubject<string | null>(null);
  readonly recommendationId$ = this.recommendationIdSubject.asObservable();

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

        return this.http.post<QuestionRecommendation>(this.apiUrl, payload, { headers }).pipe(
          tap((response) => {
            const recommendations = response?.recommendations ?? [];
            const recommendationId = response?.recommendation_id ?? recommendations[0]?.recommendation_id ?? null;
            this.recommendationsSubject.next(recommendations);
            this.recommendationIdSubject.next(recommendationId);
          })
        );
      })
    );
  }

  getLatestRecommendationsSnapshot(): QuestionRecommendation['recommendations'] {
    return this.recommendationsSubject.getValue();
  }

  getLatestRecommendationId(): string | null {
    return this.recommendationIdSubject.getValue();
  }
}
