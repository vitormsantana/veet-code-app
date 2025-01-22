import { Component, OnInit } from '@angular/core';
import { Chart } from 'chart.js/auto';
import { StudiesStatsService } from '../studies-stats/studies-stats.service'; // Adjust path as needed

@Component({
  selector: 'app-studies-stats-per-theme',
  templateUrl: './studies-stats-per-theme.component.html', // Reference the external HTML file
  standalone: false,
})
export class StudiesStatsPerThemeComponent implements OnInit {
  chart: Chart | null = null;

  constructor(private statisticsService: StudiesStatsService) {}

  ngOnInit(): void {
    this.statisticsService.getStatistics().subscribe((statistics) => {
      this.createChart(statistics.minutesPerThemePerDay);
    });
  }

 createChart(minutesPerThemePerDay: Record<string, Record<string, number>>): void {
  // Extract unique dates and sort them
  const allDates = new Set<string>();
  for (const theme in minutesPerThemePerDay) {
    const themeData = minutesPerThemePerDay[theme];

    // Iterate through the dates and minutes in the object
    for (const date in themeData) {
      allDates.add(date);
    }
  }

  // Sort the dates in increasing order by parsing them correctly
  const sortedDates = Array.from(allDates).sort((a, b) => {
    // Convert DD/MM/YYYY to a Date object
    const parseDate = (date: string) => {
      const [day, month, year] = date.split('/');
      return new Date(`${year}-${month}-${day}`);
    };

    return parseDate(a).getTime() - parseDate(b).getTime(); // Compare dates as Date objects
  });

  // Prepare datasets for the chart
  const datasets = Object.entries(minutesPerThemePerDay).map(([theme, data]) => ({
    label: theme,
    // Convert minutes to hours by dividing by 60
    data: sortedDates.map((date) => (data[date] ? data[date] / 60 : null)), // Convert to hours
    fill: false,
    borderColor: this.getRandomColor(),
    tension: 0.1,
    spanGaps: true, // This ensures that missing data points do not create a line
  }));

  // Create the chart
  this.chart = new Chart('themeChart', {
    type: 'line',
    data: {
      labels: sortedDates,
      datasets: datasets,
    },
    options: {
      responsive: true,
      plugins: {
        legend: {
          display: true,
        },
      },
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
            text: 'Hours',
          },
          beginAtZero: true,
        },
      },
    },
  });
}

  getRandomColor(): string {
    // Generate a random RGB color
    const r = Math.floor(Math.random() * 255);
    const g = Math.floor(Math.random() * 255);
    const b = Math.floor(Math.random() * 255);
    return `rgb(${r}, ${g}, ${b})`;
  }
}
