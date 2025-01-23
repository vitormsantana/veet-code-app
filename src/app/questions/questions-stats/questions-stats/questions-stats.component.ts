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
      beginAtZero: true, // Ensure y-axis starts at 0
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
    // Extract labels (dates) and data (counts)
    const labels = this.statistics.questionsCrackedPerDay
      .filter((item) => item.count > 0) // Exclude days with count = 0
      .map((item) => item.date);

    const data = this.statistics.questionsCrackedPerDay
      .filter((item) => item.count > 0) // Match labels
      .map((item) => item.count);

    this.chartData = {
      labels: labels,
      datasets: [
        {
          label: 'Cracked Questions Per Day',
          data: data,
          backgroundColor: 'rgba(63, 81, 181, 0.5)',
          borderColor: 'rgba(63, 81, 181, 1)',
          borderWidth: 2,
          fill: false, // Avoid filling under the line
          tension: 0.4, // Add smoothness to the line
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
          label: 'Incremental Cracked Questions Per Day',
          data: data,
          backgroundColor: '#33ffbe', // Bar color
          borderColor: '#3396ff',     // Border color
          borderWidth: 3,            // Border width
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
          backgroundColor: ['#ecff00', '#ffaf33', '#ff3333'], // Updated colors: medium is now orange, and easy is red
          hoverBackgroundColor: ['#ffeb3b', '#ff7043', '#ff3349'], // Updated hover colors to match
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

    // Define a fixed set of colors
    const colors = [
      '#FF5733', '#33FF57', '#3357FF', '#FF33A1', '#A133FF',
      '#33FFF5', '#FF8C33', '#DFFF33', '#8C33FF', '#33FF8C'
    ];

    // Assign colors to tags consistently by their order in the labels array
    const backgroundColors = labels.map((_, index) => colors[index % colors.length]);

    this.tagChartData = {
      labels: labels,
      datasets: [
        {
          data: data,
          backgroundColor: backgroundColors,
        },
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
  if (this.incrementalChartData) {
    window.myChart = new Chart(ctx, {
      type: 'bar', // Bar chart
      data: this.incrementalChartData,
      options: {
        responsive: true,
        maintainAspectRatio: false,
        scales: {
          x: {
            title: {
              display: true,
              text: 'Date', // Label for x-axis
            },
          },
          y: {
            title: {
              display: true,
              text: 'Questions Cracked', // Label for y-axis
            },
            beginAtZero: true,
          },
        },
        plugins: {
          legend: {
            labels: {
              color: '#3f51b5', // Legend text color
              font: { size: 14 },
            },
          },
        },
      },
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
              text: 'Times That Each Tag Appeared', // Title of the chart
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
