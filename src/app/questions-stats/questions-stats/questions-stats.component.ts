import { Component, OnInit, AfterViewInit, ViewChild, ElementRef } from '@angular/core';
import { QuestionsStatsService, Statistics } from '../questions-stats.service';
import { Chart } from 'chart.js'; // Ensure Chart.js is imported

declare global {
  interface Window {
    myChart: Chart | undefined;
  }
}

@Component({
  selector: 'app-questions-stats',
  templateUrl: './questions-stats.component.html',
  styleUrls: ['./questions-stats.component.css'],
  standalone: false
})
export class QuestionsStatsComponent implements OnInit, AfterViewInit {
  @ViewChild('myChart') chartCanvas!: ElementRef<HTMLCanvasElement>;

  statistics: Statistics | null = null;
  isLoading = true;
  errorMessage: string | null = null;

  chartData: any = { labels: [], datasets: [] };
  chartOptions: any = {
    responsive: true,
    maintainAspectRatio: false,
    scales: {
      x: {
        beginAtZero: true,
        grid: { color: 'rgba(63, 81, 181, 0.2)' },
      },
      y: {
        grid: { color: 'rgba(63, 81, 181, 0.2)' },
      },
    },
    plugins: {
      legend: {
        labels: { color: 'rgba(63, 81, 181, 1)', font: { size: 14 } },
      },
    },
  };

  private isChartInitialized = false; // Flag to track chart initialization

  constructor(private questionsStatsService: QuestionsStatsService) {}

  ngOnInit(): void {
    console.log('ngOnInit: Fetching statistics...');
    this.fetchStatistics();
  }

  ngAfterViewInit(): void {
    console.log('ngAfterViewInit: Checking if chart should be initialized...');
    if (this.statistics && !this.isLoading && !this.isChartInitialized) {
      this.initializeChart();
    }
  }

  fetchStatistics(): void {
    console.log('fetchStatistics: Fetching statistics from the service...');
    this.isLoading = true;
    this.errorMessage = null;

    this.questionsStatsService.getStatistics().subscribe(
      (data) => {
        console.log('fetchStatistics: Statistics data fetched successfully');
        this.statistics = data;
        this.isLoading = false;
        this.updateChartData();
      },
      (error) => {
        console.error('fetchStatistics: Error fetching statistics', error);
        this.errorMessage = 'Failed to load statistics. Please try again later.';
        this.isLoading = false;
      }
    );
  }

  updateChartData(): void {
    if (this.statistics && this.statistics.questionsCrackedPerDay) {
      console.log('updateChartData: Updating chart data...');
      const labels = this.statistics.questionsCrackedPerDay.map((item) => item.date);
      const data = this.statistics.questionsCrackedPerDay.map((item) => item.count);

      this.chartData = {
        labels: labels,
        datasets: [
          {
            label: 'Questions Cracked Per Day',
            data: data,
            backgroundColor: 'rgba(63, 81, 181, 0.5)',
            borderColor: 'rgba(63, 81, 181, 1)',
            borderWidth: 2,
            pointBackgroundColor: 'rgba(63, 81, 181, 1)',
            pointBorderColor: '#fff',
            pointBorderWidth: 2,
          },
        ],
      };

      console.log('updateChartData: Chart data updated:', this.chartData);

      if (!this.isChartInitialized) {
        this.initializeChart();
      }
    } else {
      console.error('updateChartData: No statistics available');
    }
  }

  initializeChart(): void {
    console.log('initializeChart: Initializing chart...');
    const ctx = document.getElementById('myChart') as HTMLCanvasElement;

    if (!ctx) {
      console.error('initializeChart: Canvas element not found!');
      return;
    }

    console.log('initializeChart: Canvas element found');

    if (this.chartData && this.chartOptions) {
      window.myChart = new Chart(ctx, {
        type: 'line',
        data: this.chartData,
        options: this.chartOptions,
      });

      console.log('initializeChart: Chart initialized successfully');
      this.isChartInitialized = true; // Set flag after initialization
    } else {
      console.error('initializeChart: Chart data or options missing');
    }
  }
}
