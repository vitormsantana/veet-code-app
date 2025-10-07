import { Component, OnInit, AfterViewInit, ViewChild, ElementRef, OnDestroy } from '@angular/core';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import { QuestionsStatsService, Statistics } from '../questions-stats.service';
import { QuestionsRefreshService } from '../../questions-refresh.service';
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

export class QuestionsStatsComponent implements OnInit, AfterViewInit, OnDestroy {
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

  private readonly destroy$ = new Subject<void>();
  private chartInstance: Chart | null = null;
  private incrementalChartInstance: Chart | null = null;
  private difficultyChartInstance: Chart | null = null;
  private tagChartInstance: Chart | null = null;

  constructor(
    private questionsStatsService: QuestionsStatsService,
    private questionsRefreshService: QuestionsRefreshService
  ) {}

  ngOnInit(): void {
    this.fetchStatistics();
    this.questionsRefreshService.refresh$
      .pipe(takeUntil(this.destroy$))
      .subscribe(() => {
        this.fetchStatistics();
      });
  }

  ngAfterViewInit(): void {
    if (this.statistics && !this.isLoading) {
      if (!this.chartInstance) {
        this.initializeChart();
      }
      if (!this.incrementalChartInstance) {
        this.initializeIncrementalChart();
      }
      if (!this.difficultyChartInstance) {
        this.initializeDifficultyChart();
      }
      if (!this.tagChartInstance) {
        this.initializeTagChart();
      }
    }
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
    this.destroyCharts();
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
    const stats = this.statistics;
    if (!stats || !stats.questionsCrackedPerDay) {
      return;
    }

    const filteredItems = stats.questionsCrackedPerDay.filter((item) => item.count > 0);
    const labels = filteredItems.map((item) => item.date);
    const data = filteredItems.map((item) => item.count);

    this.chartData = {
      labels,
      datasets: [
        {
          label: 'Cracked Questions Per Day',
          data,
          backgroundColor: 'rgba(255, 255, 255, 0.5)',
          borderColor: 'rgba(255, 255, 255, 1)',
          borderWidth: 2,
          fill: false,
          tension: 0.4,
        },
      ],
    };

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
            color: 'rgba(255, 255, 255, 0.2)',
          },
          ticks: {
            color: 'white',
          },
        },
        y: {
          title: {
            display: true,
            text: 'Questions Cracked',
            color: 'white',
          },
          grid: {
            color: 'rgba(255, 255, 255, 0.2)',
          },
          ticks: {
            color: 'white',
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

    if (this.chartInstance) {
      this.chartInstance.data = this.chartData;
      this.chartInstance.options = this.chartOptions;
      this.chartInstance.update();
    } else if (this.chartCanvas) {
      this.initializeChart();
    }
  }

  updateIncrementalChartData(): void {
    const stats = this.statistics;
    if (!stats || !stats.incrementalQuestionsCrackedPerDay) {
      return;
    }

    const labels = stats.incrementalQuestionsCrackedPerDay.map((item) => item.date);
    const data = stats.incrementalQuestionsCrackedPerDay.map((item) => item.count);

    this.incrementalChartData = {
      labels,
      datasets: [
        {
          label: 'Incremental Cracked Questions Per Day',
          data,
          backgroundColor: '#A17C6B',
          borderColor: '#ffffff',
          borderWidth: 2,
        },
      ],
    };

    if (this.incrementalChartInstance) {
      this.incrementalChartInstance.data = this.incrementalChartData;
      this.incrementalChartInstance.update();
    } else if (this.incrementalChartCanvas) {
      this.initializeIncrementalChart();
    }
  }

  updateDifficultyChartData(): void {
    const stats = this.statistics;
    if (!stats || !stats.questionsCrackedPerDifficulty) {
      return;
    }

    const labels = Object.keys(stats.questionsCrackedPerDifficulty);
    const data = Object.values(stats.questionsCrackedPerDifficulty);

    this.difficultyChartData = {
      labels,
      datasets: [
        {
          data,
          backgroundColor: ['#2B3D41', '#FF3333', '#A17C6B'],
        },
      ],
    };

    if (this.difficultyChartInstance) {
      this.difficultyChartInstance.data = this.difficultyChartData;
      this.difficultyChartInstance.update();
    } else if (this.difficultyChartCanvas) {
      this.initializeDifficultyChart();
    }
  }

  updateTagChartData(): void {
    const stats = this.statistics;
    if (!stats || !stats.questionsCrackedPerTag) {
      return;
    }

    const labels = Object.keys(stats.questionsCrackedPerTag);
    const data = Object.values(stats.questionsCrackedPerTag);

    this.tagChartData = {
      labels,
      datasets: [
        {
          data,
          backgroundColor: [],
        },
      ],
    };

    this.applyTagChartColors();

    if (this.tagChartInstance) {
      this.tagChartInstance.data = this.tagChartData;
      this.tagChartInstance.update();
    } else if (this.tagChartCanvas) {
      this.initializeTagChart();
    }
  }

  initializeChart(): void {
    const ctx = this.chartCanvas.nativeElement;
    if (this.chartData && this.chartOptions) {
      this.chartInstance = new Chart(ctx, {
        type: 'line',
        data: this.chartData,
        options: this.chartOptions,
      });
      window.myChart = this.chartInstance;
    }
  }

  initializeIncrementalChart(): void {
    const ctx = this.incrementalChartCanvas.nativeElement;
    if (this.incrementalChartData) {
      this.incrementalChartInstance = new Chart(ctx, {
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
    }
  }

  initializeDifficultyChart(): void {
    const ctx = this.difficultyChartCanvas.nativeElement;
    if (this.difficultyChartData) {
      this.difficultyChartInstance = new Chart(ctx, {
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
    }
  }

  initializeTagChart(): void {
    const ctx = this.tagChartCanvas.nativeElement;
    if (this.tagChartData) {
      this.applyTagChartColors();
      this.tagChartInstance = new Chart(ctx, {
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
    }
  }

  private applyTagChartColors(): void {
    if (!this.tagChartData?.datasets?.length) {
      return;
    }

    this.tagChartData.datasets[0].backgroundColor = [
      '#2B3D41',  // Darker greyish blue
      '#A17C6B',  // Muted brown
      '#0a0908',  // Strong red
      '#3e4f52',  // Soft green
      '#779fa1',  // Strong blue
    ];
  }

  private destroyCharts(): void {
    if (this.chartInstance) {
      this.chartInstance.destroy();
      this.chartInstance = null;
    }
    if (this.incrementalChartInstance) {
      this.incrementalChartInstance.destroy();
      this.incrementalChartInstance = null;
    }
    if (this.difficultyChartInstance) {
      this.difficultyChartInstance.destroy();
      this.difficultyChartInstance = null;
    }
    if (this.tagChartInstance) {
      this.tagChartInstance.destroy();
      this.tagChartInstance = null;
    }
  }
}
