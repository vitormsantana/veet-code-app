import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable } from 'rxjs';

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

@Injectable({
  providedIn: 'root'
})
export class QuestionsStatsService {
  private apiUrl = "https://6p4ojh18mj.execute-api.sa-east-1.amazonaws.com/dev/get_statistics";

  constructor(private http: HttpClient) { }

  getStatistics(): Observable<Statistics> {
    const headers = new HttpHeaders({
      'Content-Type': 'application/json',
    });

    return this.http.get<Statistics>(this.apiUrl, { headers});
  }
}
