import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { from, Observable, throwError } from 'rxjs';
import { map, switchMap } from 'rxjs/operators';
import { environment } from '../../environments/environment';
import { AuthService } from '../auth/auth.service';
import { buildObservabilityHeaders } from './observability-headers';

interface ApiUserMetrics {
  user_id: string;
  date: string;
  short_window_days: number;
  long_window_days: number;
  avg_minutes_per_tag?: Record<string, number>;
  help_rate_per_tag?: Record<string, number>;
  solved_per_tag?: Record<string, number>;
  failed_per_tag?: Record<string, number>;
  avg_solved_last_short_window?: number;
  avg_solved_last_long_window?: number;
  avg_failed_last_short_window?: number;
  avg_failed_last_long_window?: number;
  exercises_tried_last_short_window?: number;
  exercises_tried_last_long_window?: number;
  consistency_rate?: number;
  last_activity_days_ago?: number;
  total_questions_analyzed?: number;
  calculated_at_utc?: string;
}

export interface UserMetrics {
  userId: string;
  date: string;
  shortWindowDays: number;
  longWindowDays: number;
  avgMinutesPerTag: Record<string, number>;
  helpRatePerTag: Record<string, number>;
  solvedPerTag: Record<string, number>;
  failedPerTag: Record<string, number>;
  avgSolvedLastShortDays: number;
  avgSolvedLastLongDays: number;
  avgFailedLastShortDays: number;
  avgFailedLastLongDays: number;
  exercisesTriedLastShortWindow: number;
  exercisesTriedLastLongWindow: number;
  consistencyRate: number;
  lastActivityDaysAgo: number;
  totalQuestionsAnalyzed: number;
  calculatedAtUtc: string;
}

@Injectable({
  providedIn: 'root'
})
export class UserMetricsService {
  private readonly apiUrl = `${environment.apiBaseUrl}/read_user_metrics`;

  constructor(
    private http: HttpClient,
    private authService: AuthService
  ) {}

  getUserMetrics(): Observable<UserMetrics[]> {
    return from(this.authService.ensureValidSession()).pipe(
      switchMap((session) => {
        if (!session || !session.idToken) {
          return throwError(() => new Error('Authentication is required to load user metrics.'));
        }

        const headers = buildObservabilityHeaders({
          Authorization: `${session.tokenType || 'Bearer'} ${session.idToken}`
        });

        return this.http.get<ApiUserMetrics[]>(this.apiUrl, { headers });
      }),
      map((response) => this.normalizeMetrics(response))
    );
  }

  getLatestMetrics(): Observable<UserMetrics | null> {
    return this.getUserMetrics().pipe(
      map((metrics) => (metrics.length > 0 ? metrics[0] : null))
    );
  }

  private normalizeMetrics(response: ApiUserMetrics[] | null | undefined): UserMetrics[] {
    if (!response || response.length === 0) {
      return [];
    }

    return response
      .map<UserMetrics>((metric) => ({
        userId: metric.user_id,
        date: metric.date,
        shortWindowDays: metric.short_window_days,
        longWindowDays: metric.long_window_days,
        avgMinutesPerTag: metric.avg_minutes_per_tag ?? {},
        helpRatePerTag: metric.help_rate_per_tag ?? {},
        solvedPerTag: metric.solved_per_tag ?? {},
        failedPerTag: metric.failed_per_tag ?? {},
        avgSolvedLastShortDays: metric.avg_solved_last_short_window ?? 0,
        avgSolvedLastLongDays: metric.avg_solved_last_long_window ?? 0,
        avgFailedLastShortDays: metric.avg_failed_last_short_window ?? 0,
        avgFailedLastLongDays: metric.avg_failed_last_long_window ?? 0,
        exercisesTriedLastShortWindow: metric.exercises_tried_last_short_window ?? 0,
        exercisesTriedLastLongWindow: metric.exercises_tried_last_long_window ?? 0,
        consistencyRate: metric.consistency_rate ?? 0,
        lastActivityDaysAgo: metric.last_activity_days_ago ?? 0,
        totalQuestionsAnalyzed: metric.total_questions_analyzed ?? 0,
        calculatedAtUtc: metric.calculated_at_utc ?? metric.date
      }))
      .sort((a, b) => this.sortByDateDesc(a.date, b.date));
  }

  private sortByDateDesc(a: string, b: string): number {
    const dateA = Date.parse(a);
    const dateB = Date.parse(b);

    if (isNaN(dateA) && isNaN(dateB)) {
      return 0;
    }

    if (isNaN(dateA)) {
      return 1;
    }

    if (isNaN(dateB)) {
      return -1;
    }

    return dateB - dateA;
  }
}
