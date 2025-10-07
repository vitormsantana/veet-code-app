import { Component, OnDestroy, OnInit, ViewChild } from '@angular/core';
import { MatTableDataSource } from '@angular/material/table';
import { MatPaginator } from '@angular/material/paginator';
import { MatSort } from '@angular/material/sort';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { environment } from '../../../environments/environment';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import { AuthService } from '../../auth/auth.service';
import { QuestionsRefreshService } from '../questions-refresh.service';

interface QuestionResponse {
  name: string;
  date: string;
  difficulty: string;
  tags: string[];
  minutes_taken?: number;
  needed_help?: boolean;
}

interface QuestionRow {
  name: string;
  date: string;
  difficulty: string;
  tags: string;
  minutesTaken: number;
  neededHelp: boolean;
}

@Component({
  selector: 'app-questions-table',
  templateUrl: './questions-table.component.html',
  styleUrls: ['./questions-table.component.css'],
  standalone: false
})
export class QuestionsTableComponent implements OnInit, OnDestroy {
  displayedColumns: string[] = ['name', 'date', 'difficulty', 'tags', 'minutesTaken', 'neededHelp'];
  questions = new MatTableDataSource<QuestionRow>([]);
  isLoading = false;
  errorMessage = '';

  @ViewChild(MatPaginator) paginator!: MatPaginator;
  @ViewChild(MatSort) sort!: MatSort;

  private readonly destroy$ = new Subject<void>();

  constructor(
    private http: HttpClient,
    private authService: AuthService,
    private questionsRefreshService: QuestionsRefreshService
  ) {}

  ngOnInit(): void {
    this.fetchQuestions();
    this.questionsRefreshService.refresh$
      .pipe(takeUntil(this.destroy$))
      .subscribe(() => {
        this.fetchQuestions();
      });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  async fetchQuestions(): Promise<void> {
    this.isLoading = true;
    this.errorMessage = '';

    const session = await this.authService.ensureValidSession();
    if (!session || !session.idToken) {
      this.errorMessage = 'Sign in to load your exercises.';
      this.isLoading = false;
      return;
    }

    const apiUrl = `${environment.apiBaseUrl}/read_exercises`;
    const headers = new HttpHeaders({
      Authorization: `${session.tokenType || 'Bearer'} ${session.idToken}`
    });

    this.http
      .get<QuestionResponse[]>(apiUrl, { headers })
      .subscribe({
        next: (questions) => {
          const mapped = questions.map<QuestionRow>((q) => ({
            name: q.name,
            date: q.date,
            difficulty: q.difficulty,
            tags: Array.isArray(q.tags) ? q.tags.join(', ') : '',
            minutesTaken: q.minutes_taken ?? 0,
            neededHelp: !!q.needed_help,
          }));

          this.questions.data = mapped;
          this.questions.paginator = this.paginator;
          this.questions.sort = this.sort;
        },
        error: (error) => {
          console.error('Failed to load exercises', error);
          this.errorMessage = 'Unable to load exercises.';
        },
        complete: () => {
          this.isLoading = false;
        }
      });
  }
}
