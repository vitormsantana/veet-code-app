import { Component, OnInit } from '@angular/core';
import { StudiesStatsService, StudyStatistics } from './studies-stats.service';
import { Chart } from 'chart.js';

@Component({
  selector: 'app-studies-stats',
  templateUrl: './studies-stats.component.html',
  styleUrls: ['./studies-stats.component.css'],
  standalone: false // Ensures it's part of an Angular module
})
export class StudiesStatsComponent implements OnInit {
  public chart: any;
  public statistics: StudyStatistics | null = null;

  constructor(private studiesStatsService: StudiesStatsService) {}

  ngOnInit(): void {
    this.fetchStatistics();
  }

  fetchStatistics(): void {
    this.studiesStatsService.getStatistics().subscribe(response => {
      this.statistics = response;
      this.createChart();
    });
  }

  createChart(): void {
  if (!this.statistics) return;

  const dates = this.statistics.totalMinutesPerDay.map((day) => day.date);
  const cumulativeHours = this.statistics.totalMinutesPerDay.map((day) => (day.minutes / 60).toFixed(2)); // Convert minutes to hours

  // Validate data integrity
  const lastValueInHours = (this.statistics.totalMinutesStudied / 60).toFixed(2);
  const lastCumulativeHour = cumulativeHours[cumulativeHours.length - 1];
  if (lastCumulativeHour !== lastValueInHours) {
    console.error("Mismatch: Backend data does not match totalMinutesStudied in hours!");
    return;
  }

  // Create chart with cumulative data in hours
  this.chart = new Chart('canvas', {
    type: 'line',
    data: {
      labels: dates,
      datasets: [
        {
          label: 'Total Hours Studied',
          data: cumulativeHours,
          fill: false,
          borderColor: '#4CAF50',
          tension: 0.1,
        },
      ],
    },
    options: {
      responsive: true,
      scales: {
        x: {
          title: {
            display: true,
            text: 'Date',
          },
        },
        y: {
          title: {
            display: true,
            text: 'Cumulative Hours',
          },
          beginAtZero: true,
        },
      },
    },
  });
}
}
