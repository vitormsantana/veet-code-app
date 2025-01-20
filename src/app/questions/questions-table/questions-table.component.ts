import { Component, OnInit, ViewChild } from '@angular/core';
import { MatTableDataSource } from '@angular/material/table';
import { MatPaginator } from '@angular/material/paginator';
import { MatSort } from '@angular/material/sort';
import { HttpClient } from '@angular/common/http';
import { map } from 'rxjs/operators';

interface Question {
  name: string;
  date: string;
  difficulty: string;
  tags: string;
}

@Component({
  selector: 'app-questions-table',
  templateUrl: './questions-table.component.html',
  styleUrls: ['./questions-table.component.css'],
  standalone: false
})
export class QuestionsTableComponent implements OnInit {
  displayedColumns: string[] = ['name', 'date', 'difficulty', 'tags'];
  questions = new MatTableDataSource<Question>([]);

  @ViewChild(MatPaginator) paginator!: MatPaginator;
  @ViewChild(MatSort) sort!: MatSort;

  constructor(private http: HttpClient) {}

  ngOnInit(): void {
    this.fetchQuestions();
  }

  fetchQuestions(): void {
    const apiUrl = 'https://6p4ojh18mj.execute-api.sa-east-1.amazonaws.com/dev/get_questions';
    this.http.
      get<any[]>(apiUrl).
      pipe(
        map((questions) =>
          questions.map(q => ({
            name: q.Name,
            date: q.Date,
            difficulty: q.Difficulty,
            tags: q.tags.join(', '),
          }))
        )
      ).subscribe((data) => {
        this.questions.data = data;
        this.questions.paginator = this.paginator;
        this.questions.sort = this.sort;
      });
  }
}
