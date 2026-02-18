import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { from, Observable, throwError } from 'rxjs';
import { map, switchMap } from 'rxjs/operators';
import { environment } from '../../../environments/environment';
import { AuthService } from '../../auth/auth.service';
import { buildObservabilityHeaders } from '../observability-headers';

export interface DayStatistic {
  date: string;
  count: number;
}

export interface Statistics {
  questionsCrackedPerDay: DayStatistic[];
  questionsCrackedPerDifficulty: Record<string, number>;
  questionsCrackedPerTag: Record<string, number>;
  totalQuestionsCracked: number;
  incrementalQuestionsCrackedPerDay: DayStatistic[];
}

type DayStatisticInput = DayStatistic[] | Record<string, number> | undefined | null;

interface StatisticsResponse {
  questionsCrackedPerDay?: DayStatisticInput;
  questionsCrackedPerDifficulty?: Record<string, number>;
  questionsCrackedPerTag?: Record<string, number>;
  totalQuestionsCracked?: number;
  incrementalQuestionsCrackedPerDay?: DayStatisticInput;
}

@Injectable({
  providedIn: 'root'
})
export class QuestionsStatsService {
  private readonly apiUrl = `${environment.apiBaseUrl}/read_statistics_from_exercises`;

  constructor(private http: HttpClient, private authService: AuthService) { }

  getStatistics(): Observable<Statistics> {
    return from(this.authService.ensureValidSession()).pipe(
      switchMap((session) => {
        if (!session || !session.idToken) {
          return throwError(() => new Error('Authentication is required to load statistics.'));
        }

        const headers = buildObservabilityHeaders({
          Authorization: `${session.tokenType || 'Bearer'} ${session.idToken}`
        });

        return this.http.get<StatisticsResponse>(this.apiUrl, { headers });
      }),
      map((response) => this.normalizeStatistics(response))
    );
  }

  private normalizeStatistics(response: StatisticsResponse): Statistics {
    const asDayStatistics = (input: DayStatisticInput): DayStatistic[] => {
      if (!input) {
        return [];
      }

      if (Array.isArray(input)) {
        return input;
      }

      return Object.entries(input).map(([date, count]) => ({ date, count }));
    };

    return {
      questionsCrackedPerDay: asDayStatistics(response.questionsCrackedPerDay),
      questionsCrackedPerDifficulty: response.questionsCrackedPerDifficulty ?? {},
      questionsCrackedPerTag: response.questionsCrackedPerTag ?? {},
      totalQuestionsCracked: response.totalQuestionsCracked ?? 0,
      incrementalQuestionsCrackedPerDay: asDayStatistics(response.incrementalQuestionsCrackedPerDay),
    };
  }
}
