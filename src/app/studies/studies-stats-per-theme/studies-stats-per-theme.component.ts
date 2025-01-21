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
      console.log('Statistics received:', statistics); // Log the received statistics
      this.createChart(statistics.minutesPerThemePerDay);
    });
  }

  createChart(minutesPerThemePerDay: Record<string, Record<string, number>>): void {
    console.log('minutesPerThemePerDay:', minutesPerThemePerDay); // Log minutesPerThemePerDay to check its structure

    // Extract unique dates
    const allDates = new Set<string>();
    for (const theme in minutesPerThemePerDay) {
      console.log(`Processing theme: ${theme}`); // Log the current theme being processed
      const themeData = minutesPerThemePerDay[theme];
      console.log(`Data for theme "${theme}":`, themeData); // Log the data for the current theme

      // Iterate through the dates and minutes in the object
      for (const date in themeData) {
        console.log(`Date: ${date}, Minutes: ${themeData[date]}`); // Log each date and its minutes
        allDates.add(date);
      }
    }

    const sortedDates = Array.from(allDates).sort();
    console.log('Sorted dates:', sortedDates); // Log the sorted dates

    // Prepare datasets for the chart
    const datasets = Object.entries(minutesPerThemePerDay).map(([theme, data]) => ({
      label: theme,
      data: sortedDates.map((date) => data[date] || 0), // Fill missing dates with 0
      fill: false,
      borderColor: this.getRandomColor(),
      tension: 0.1,
    }));

    console.log('Datasets:', datasets); // Log the prepared datasets

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
              text: 'Minutes',
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
