import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable } from 'rxjs';

export interface StudyStatistic {
  date: string;
  minutes: number;
}

export interface StudyStatistics {
  totalMinutesStudied: number;
  totalMinutesPerDay: { date: string, minutes: number }[];
  minutesPerThemePerDay: { [theme: string]: { date: string, minutes: number }[] };
}

@Injectable({
  providedIn: 'root'
})
export class StudiesStatsService {
  private apiUrl = "https://6p4ojh18mj.execute-api.sa-east-1.amazonaws.com/dev/get_studies_statistics";

  constructor(private http: HttpClient) { }

  getStatistics(): Observable<StudyStatistics> {
    const headers = new HttpHeaders({
      'Content-Type': 'application/json',
    });

    return this.http.get<StudyStatistics>(this.apiUrl, { headers });
  }
}
