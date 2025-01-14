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
  standalone: false,
})

export class QuestionsStatsComponent implements OnInit, AfterViewInit {
  @ViewChild('myChart') chartCanvas!: ElementRef<HTMLCanvasElement>;
  @ViewChild('incrementalChart') incrementalChartCanvas!: ElementRef<HTMLCanvasElement>;
  @ViewChild('difficultyChart') difficultyChartCanvas!: ElementRef<HTMLCanvasElement>;
  @ViewChild('tagChart') tagChartCanvas!: ElementRef<HTMLCanvasElement>;

  statistics: Statistics | null = null;
  isLoading = true;
  errorMessage: string | null = null;

  chartData: any = { labels: [], datasets: [] };
  incrementalChartData: any = { labels: [], datasets: [] };
  difficultyChartData: any = { labels: [], datasets: [] };
  tagChartData: any = { labels: [], datasets: [] };

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

  private isChartInitialized = false;
  private isIncrementalChartInitialized = false;
  private isDifficultyChartInitialized = false;
  private isTagChartInitialized = false;

  constructor(private questionsStatsService: QuestionsStatsService) {}

  ngOnInit(): void {
    this.fetchStatistics();
  }

  ngAfterViewInit(): void {
    if (this.statistics && !this.isLoading) {
      if (!this.isChartInitialized) {
        this.initializeChart();
      }
      if (!this.isIncrementalChartInitialized) {
        this.initializeIncrementalChart();
      }
      if (!this.isDifficultyChartInitialized) {
        this.initializeDifficultyChart();
      }
    }
  }

  fetchStatistics(): void {
    this.isLoading = true;
    this.errorMessage = null;

    this.questionsStatsService.getStatistics().subscribe(
      (data) => {
        this.statistics = data;
        this.isLoading = false;
        this.updateChartData();
        this.updateIncrementalChartData();
        this.updateDifficultyChartData();
        this.updateTagChartData();
      },
      (error) => {
        this.errorMessage = 'Failed to load statistics. Please try again later.';
        this.isLoading = false;
      }
    );
  }

  updateChartData(): void {
    if (this.statistics?.questionsCrackedPerDay) {
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
          },
        ],
      };

      if (!this.isChartInitialized) {
        this.initializeChart();
      }
    }
  }

  updateIncrementalChartData(): void {
    if (this.statistics?.incrementalQuestionsCrackedPerDay) {
      const labels = this.statistics.incrementalQuestionsCrackedPerDay.map((item) => item.date);
      const data = this.statistics.incrementalQuestionsCrackedPerDay.map((item) => item.count);

      this.incrementalChartData = {
        labels: labels,
        datasets: [
          {
            label: 'Incremental Questions Cracked Per Day',
            data: data,
            backgroundColor: 'rgba(76, 175, 80, 0.5)',
            borderColor: 'rgba(76, 175, 80, 1)',
            borderWidth: 2,
          },
        ],
      };

      if (!this.isIncrementalChartInitialized) {
        this.initializeIncrementalChart();
      }
    }
  }

  updateDifficultyChartData(): void {
    if (this.statistics?.questionsCrackedPerDifficulty) {
      const labels = Object.keys(this.statistics.questionsCrackedPerDifficulty);
      const data = Object.values(this.statistics.questionsCrackedPerDifficulty);

      this.difficultyChartData = {
        labels: labels,
        datasets: [
          {
            data: data,
            backgroundColor: ['#ff6f61', '#ffcc00', '#66bb6a'],
            hoverBackgroundColor: ['#ff7043', '#ffeb3b', '#81c784'],
          },
        ],
      };

      if (!this.isDifficultyChartInitialized) {
        this.initializeDifficultyChart();
      }
    }
  }

  updateTagChartData(): void {
    if (this.statistics?.questionsCrackedPerTag) {
      const labels = Object.keys(this.statistics.questionsCrackedPerTag);
      const data = Object.values(this.statistics.questionsCrackedPerTag);

      this.tagChartData = {
        labels: labels,
        theme: "dark2",
        datasets: [
          {
            data: data,
            backgroundColor: labels.map(() => `#${Math.floor(Math.random() * 16777215).toString(16)}`),          },
        ],
      };

      if (!this.isTagChartInitialized) {
        this.initializeTagChart();
      }
    }
  }

  initializeChart(): void {
    const ctx = this.chartCanvas.nativeElement;
    if (this.chartData && this.chartOptions) {
      window.myChart = new Chart(ctx, {
        type: 'line',
        data: this.chartData,
        options: this.chartOptions,
      });
      this.isChartInitialized = true;
    }
  }

  initializeIncrementalChart(): void {
    const ctx = this.incrementalChartCanvas.nativeElement;
    if (this.incrementalChartData && this.chartOptions) {
      window.myChart = new Chart(ctx, {
        type: 'line',
        data: this.incrementalChartData,
        options: this.chartOptions,
      });
      this.isIncrementalChartInitialized = true;
    }
  }

  initializeDifficultyChart(): void {
    const ctx = this.difficultyChartCanvas.nativeElement;
    if (this.difficultyChartData) {
      new Chart(ctx, {
        type: 'pie',  // Pie chart type
        data: this.difficultyChartData,
      });
      this.isDifficultyChartInitialized = true;
    }
  }

  initializeTagChart(): void {
    const ctx = this.tagChartCanvas.nativeElement;
    if (this.tagChartData) {
      new Chart(ctx, {
        type: 'doughnut',
        data: this.tagChartData,
        options: {
          responsive: true,
          maintainAspectRatio: false,
          cutout: '75%', // Inner radius as a percentage
          plugins: {
            legend: {
              display: false, // Legends are hidden above the chart
            },
            title: {
              display: true,
              text: 'Questions per Theme', // Title of the chart
              color: '#3f51b5',
              font: {
                size: 16,
                weight: 'bold',
              },
            },
            tooltip: {
              callbacks: {
                label: (tooltipItem) => {
                  const index = tooltipItem.dataIndex;
                  const label = this.tagChartData.labels[index];
                  const value = this.tagChartData.datasets[0].data[index];
                  return `${label}: ${value}`;
                },
              },
            },
          },
        },
      });
      this.isTagChartInitialized = true;
    }
  }
}
