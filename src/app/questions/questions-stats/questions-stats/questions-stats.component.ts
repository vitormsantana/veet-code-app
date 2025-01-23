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
        grid: { color: 'rgba(255, 255, 255, 0.2)' }, // White grid
        title: { color: 'white' },
      },
      y: {
        beginAtZero: true,
        grid: { color: 'rgba(255, 255, 255, 0.2)' }, // White grid
        title: { color: 'white' },
      },
    },
    plugins: {
      legend: {
        labels: { color: 'white', font: { size: 14 } },
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
      if (!this.isTagChartInitialized) {
        this.initializeTagChart();
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
    const labels = this.statistics.questionsCrackedPerDay
      .filter((item) => item.count > 0)
      .map((item) => item.date);

    const data = this.statistics.questionsCrackedPerDay
      .filter((item) => item.count > 0)
      .map((item) => item.count);

    this.chartData = {
      labels: labels,
      datasets: [
        {
          label: 'Cracked Questions Per Day',
          data: data,
          backgroundColor: 'rgba(255, 255, 255, 0.5)', // White line color
          borderColor: 'rgba(255, 255, 255, 1)', // White border
          borderWidth: 2,
          fill: false,
          tension: 0.4,
        },
      ],
    };

    // Apply the updated chart options here
    this.chartOptions = {
      responsive: true,
      maintainAspectRatio: false,
      scales: {
        x: {
          title: {
            display: true,
            text: 'Date',
            color: 'white',
          },
          grid: {
            color: 'rgba(255, 255, 255, 0.2)', // White grid lines
          },
          ticks: {
            color: 'white', // White labels on x-axis
          },
        },
        y: {
          title: {
            display: true,
            text: 'Questions Cracked',
            color: 'white',
          },
          grid: {
            color: 'rgba(255, 255, 255, 0.2)', // White grid lines
          },
          ticks: {
            color: 'white', // White labels on y-axis
          },
          beginAtZero: true,
        },
      },
      plugins: {
        legend: {
          labels: {
            color: 'white',
            font: { size: 14 },
          },
        },
      },
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
            backgroundColor: '#A17C6B', // Brown bars
            borderColor: '#ffffff',     // White border
            borderWidth: 2,             // Border width
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
            backgroundColor: ['#2B3D41', '#A17C6B', '#FF3333'], // Different colors for easy, medium, and hard
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
        datasets: [
          {
            data: data,
            backgroundColor: ['#FF5733', '#33FF57', '#3357FF', '#FF33A1', '#A133FF'],
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
    new Chart(ctx, {
      type: 'bar', // Bar chart
      data: this.incrementalChartData,
      options: {
        responsive: true,
        maintainAspectRatio: false,
        scales: {
          x: {
            title: {
              display: true,
              text: 'Date',
              color: 'white'
            },
            grid: {
              color: 'rgba(255, 255, 255, 0.2)', // White grid lines
            },
            ticks: {
              color: 'white', // White labels on x-axis
            },
          },
          y: {
            title: {
              display: true,
              text: 'Questions Cracked',
              color: 'white'
            },
            grid: {
              color: 'rgba(255, 255, 255, 0.2)', // White grid lines
            },
            ticks: {
              color: 'white', // White labels on y-axis
            },
            beginAtZero: true,
          },
        },
        plugins: {
          legend: {
            labels: {
              color: 'white',
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
        type: 'pie',
        data: this.difficultyChartData,
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: {
            legend: {
              labels: { color: 'white' },
            },
          },
        },
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
        cutout: '75%',
        plugins: {
          title: {
            display: true,
            text: 'Times That Each Tag Appeared',
            color: 'white',
            font: { size: 16, weight: 'bold' },
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
          legend: {
            display: false,
          },
        },
      },
    });
    this.isTagChartInitialized = true;
  }
  // Update the colors to more serious shades
  this.tagChartData.datasets[0].backgroundColor = [
    '#2B3D41',  // Darker greyish blue
    '#A17C6B',  // Muted brown
    '#0a0908',  // Strong red
    '#3e4f52',  // Soft green
    '#779fa1',  // Strong blue
  ];
}
}

