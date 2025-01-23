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
      for (const date in themeData) {
        allDates.add(date);
      }
    }

    const sortedDates = Array.from(allDates).sort((a, b) => {
      const parseDate = (date: string) => {
        const [day, month, year] = date.split('/');
        return new Date(`${year}-${month}-${day}`);
      };
      return parseDate(a).getTime() - parseDate(b).getTime();
    });

    // Prepare datasets for the chart
    const datasets = Object.entries(minutesPerThemePerDay).map(([theme, data]) => ({
      label: theme,
      data: sortedDates.map((date) => (data[date] ? data[date] / 60 : null)),
      fill: false,
      borderColor: this.generateColorFromTheme(theme),
      tension: 0.1,
      spanGaps: true,
    }));

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

  generateColorFromTheme(theme: string): string {
    // Create a hash of the theme name
    let hash = 0;
    for (let i = 0; i < theme.length; i++) {
      hash = theme.charCodeAt(i) + ((hash << 5) - hash);
    }

    // Convert the hash to an RGB color
    const r = (hash >> 16) & 0xff;
    const g = (hash >> 8) & 0xff;
    const b = hash & 0xff;

    return `rgb(${r}, ${g}, ${b})`;
  }
}

