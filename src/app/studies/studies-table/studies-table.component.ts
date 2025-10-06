import { Component, OnInit, ViewChild } from '@angular/core';
import { MatTableDataSource } from '@angular/material/table';
import { MatPaginator } from '@angular/material/paginator';
import { MatSort } from '@angular/material/sort';
import { HttpClient } from '@angular/common/http';
import { map } from 'rxjs/operators';

interface Study {
  studyTheme: string;
  studyDate: string;
  studyMinutes: number;
}

@Component({
  selector: 'app-studies-table',
  templateUrl: './studies-table.component.html',
  styleUrls: ['./studies-table.component.css'],
  standalone: false,
})
export class StudiesTableComponent implements OnInit {
  displayedColumns: string[] = ['studyTheme', 'studyDate', 'studyMinutes'];
  studies = new MatTableDataSource<Study>([]);

  @ViewChild(MatPaginator) paginator!: MatPaginator;
  @ViewChild(MatSort) sort!: MatSort;

  constructor(private http: HttpClient) {}

  ngOnInit(): void {
    this.fetchStudies();
  }

  fetchStudies(): void {
    const apiUrl = 'https://6p4ojh18mj.execute-api.sa-east-1.amazonaws.com/dev/get_studies';
    this.http
      .get<any[]>(apiUrl)
      .pipe(
        map((studies) =>
          studies.map((study) => ({
            studyTheme: study.StudyTheme,
            studyDate: study.StudyDate,
            studyMinutes: Number(study.StudyMinutes),
          }))
        )
      )
      .subscribe((data) => {
        this.studies.data = data;
        this.studies.paginator = this.paginator;
        this.studies.sort = this.sort;
      });
  }
}
