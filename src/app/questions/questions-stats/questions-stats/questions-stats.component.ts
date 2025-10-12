import { Component, OnInit, AfterViewInit, ViewChild, ElementRef, OnDestroy } from '@angular/core';
import { KeyValue } from '@angular/common';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import { QuestionsStatsService, Statistics } from '../questions-stats.service';
import { UserMetricsService, UserMetrics } from '../../user-metrics.service';
import { QuestionsRefreshService } from '../../questions-refresh.service';
import { Chart } from 'chart.js'; // Ensure Chart.js is imported

declare global {
  interface Window {
    myChart: Chart | undefined;
  }
}

interface ChartPalette {
  primary: string;
  secondary: string;
  border: string;
  background: string;
  glow: string;
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

  latestMetrics: UserMetrics | null = null;
  isMetricsLoading = true;
  metricsErrorMessage: string | null = null;

  chartData: any = { labels: [], datasets: [] };
  incrementalChartData: any = { labels: [], datasets: [] };
  difficultyChartData: any = { labels: [], datasets: [] };
  tagChartData: any = { labels: [], datasets: [] };

  chartOptions: any = {};
  incrementalChartOptions: any = {};
  difficultyChartOptions: any = {};
  tagChartOptions: any = {};

  private readonly destroy$ = new Subject<void>();
  private chartInstance: Chart | null = null;
  private incrementalChartInstance: Chart | null = null;
  private difficultyChartInstance: Chart | null = null;
  private tagChartInstance: Chart | null = null;
  private palette: ChartPalette = {
    primary: '#0c0c0c',
    secondary: 'rgba(36, 36, 36, 0.72)',
    border: 'rgba(16, 16, 16, 0.18)',
    background: '#ffffff',
    glow: 'rgba(0, 0, 0, 0.18)',
  };
  private isDarkTheme = false;
  readonly tagValueDesc = (a: KeyValue<string, number>, b: KeyValue<string, number>): number => {
    const valA = typeof a.value === 'number' ? a.value : Number(a.value ?? 0);
    const valB = typeof b.value === 'number' ? b.value : Number(b.value ?? 0);
    const safeA = Number.isFinite(valA) ? valA : 0;
    const safeB = Number.isFinite(valB) ? valB : 0;
    return safeB - safeA;
  };

  constructor(
    private questionsStatsService: QuestionsStatsService,
    private questionsRefreshService: QuestionsRefreshService,
    private userMetricsService: UserMetricsService,
    private host: ElementRef<HTMLElement>
  ) {
    this.refreshPalette();
  }

  ngOnInit(): void {
    this.fetchStatistics();
    this.fetchUserMetrics();
    this.questionsRefreshService.refresh$
      .pipe(takeUntil(this.destroy$))
      .subscribe(() => {
        this.fetchStatistics();
        this.fetchUserMetrics();
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

    this.questionsStatsService.getStatistics()
      .pipe(takeUntil(this.destroy$))
      .subscribe(
        (data) => {
          this.statistics = data;
          this.isLoading = false;
          this.updateChartData();
          this.updateIncrementalChartData();
          this.updateDifficultyChartData();
          this.updateTagChartData();
        },
        () => {
          this.errorMessage = 'Failed to load statistics. Please try again later.';
          this.isLoading = false;
        }
      );
  }

  fetchUserMetrics(): void {
    this.isMetricsLoading = true;
    this.metricsErrorMessage = null;

    this.userMetricsService.getLatestMetrics()
      .pipe(takeUntil(this.destroy$))
      .subscribe(
        (metric) => {
          this.latestMetrics = metric;
          this.isMetricsLoading = false;
        },
        () => {
          this.latestMetrics = null;
          this.metricsErrorMessage = 'Failed to load user metrics.';
          this.isMetricsLoading = false;
        }
      );
  }

  getActiveDays(metrics: UserMetrics | null): number {
    if (!metrics) {
      return 0;
    }
    const rawDays = metrics.consistencyRate * metrics.longWindowDays;
    if (!Number.isFinite(rawDays)) {
      return 0;
    }
    return Math.round(rawDays);
  }

  private refreshPalette(): void {
    const styles = getComputedStyle(this.host.nativeElement);
    const primary = this.getCssVar(styles, '--qp-text-primary', '#0c0c0c');
    const secondary = this.getCssVar(styles, '--qp-text-secondary', 'rgba(36, 36, 36, 0.72)');
    const border = this.getCssVar(styles, '--qp-border', 'rgba(16, 16, 16, 0.18)');
    const background = this.getCssVar(styles, '--qp-body-bg', '#ffffff');
    const glow = this.getCssVar(styles, '--qp-card-glow', 'rgba(0, 0, 0, 0.18)');

    this.palette = {
      primary,
      secondary,
      border,
      background,
      glow,
    };

    this.isDarkTheme = this.getLuminance(background) < 0.5;

    if (this.isDarkTheme) {
      this.palette.primary = '#f5f5f5';
      this.palette.secondary = this.withAlpha('#f5f5f5', 0.75);
      this.palette.border = this.withAlpha('#f5f5f5', 0.28);
      this.palette.glow = this.withAlpha('#f5f5f5', 0.22);
    } else {
      this.palette.primary = '#0c0c0c';
      this.palette.secondary = 'rgba(36, 36, 36, 0.72)';
      this.palette.border = 'rgba(16, 16, 16, 0.18)';
      this.palette.glow = 'rgba(0, 0, 0, 0.18)';
    }
  }

  private getCssVar(styles: CSSStyleDeclaration, name: string, fallback: string): string {
    const value = styles.getPropertyValue(name);
    return value ? value.trim() : fallback;
  }

  private parseColor(color: string): { r: number; g: number; b: number } | null {
    if (!color) {
      return null;
    }

    const trimmed = color.trim();

    if (trimmed.startsWith('#')) {
      let hex = trimmed.slice(1);
      if (hex.length === 3) {
        hex = hex
          .split('')
          .map((char) => char + char)
          .join('');
      }
      if (hex.length !== 6) {
        return null;
      }
      const r = parseInt(hex.slice(0, 2), 16);
      const g = parseInt(hex.slice(2, 4), 16);
      const b = parseInt(hex.slice(4, 6), 16);
      if ([r, g, b].some((v) => Number.isNaN(v))) {
        return null;
      }
      return { r, g, b };
    }

    const rgbMatch = trimmed.match(/rgba?\(([^)]+)\)/i);
    if (rgbMatch) {
      const parts = rgbMatch[1]
        .split(',')
        .map((part) => parseFloat(part.trim()))
        .filter((value, index) => index < 3 && Number.isFinite(value));
      if (parts.length === 3) {
        return { r: parts[0], g: parts[1], b: parts[2] };
      }
    }

    return null;
  }

  private withAlpha(color: string, alpha: number): string {
    const rgb = this.parseColor(color);
    if (!rgb) {
      return `rgba(12, 12, 12, ${alpha})`;
    }
    return `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, ${alpha})`;
  }

  private mixColors(colorA: string, colorB: string, weight: number): string {
    const a = this.parseColor(colorA);
    const b = this.parseColor(colorB);
    if (!a || !b) {
      return colorA;
    }
    const clampWeight = Math.min(Math.max(weight, 0), 1);
    const r = Math.round(a.r * (1 - clampWeight) + b.r * clampWeight);
    const g = Math.round(a.g * (1 - clampWeight) + b.g * clampWeight);
    const bVal = Math.round(a.b * (1 - clampWeight) + b.b * clampWeight);
    return `rgba(${r}, ${g}, ${bVal}, 1)`;
  }

  private lightenColor(color: string, weight: number): string {
    return this.mixColors(color, '#ffffff', Math.min(Math.max(weight, 0), 1));
  }

  private darkenColor(color: string, weight: number): string {
    return this.mixColors(color, '#000000', Math.min(Math.max(weight, 0), 1));
  }

  private getLuminance(color: string): number {
    const rgb = this.parseColor(color);
    if (!rgb) {
      return 1;
    }

    const srgb = [rgb.r, rgb.g, rgb.b].map((value) => {
      const channel = value / 255;
      return channel <= 0.03928 ? channel / 12.92 : Math.pow((channel + 0.055) / 1.055, 2.4);
    });

    return 0.2126 * srgb[0] + 0.7152 * srgb[1] + 0.0722 * srgb[2];
  }

  private generateDifficultyColors(count: number): { background: string[]; border: string[] } {
    const backgrounds: string[] = [];
    const borders: string[] = [];
    for (let i = 0; i < count; i++) {
      const base = i % 2 === 0 ? this.palette.primary : this.palette.secondary;
      const tinted = this.isDarkTheme ? base : this.lightenColor(base, 0.8);
      const alphaBase = this.isDarkTheme ? 0.8 : 0.55;
      const alpha = Math.max(0.2, alphaBase - i * 0.12);
      backgrounds.push(this.withAlpha(tinted, alpha));
      const borderBase = this.isDarkTheme ? this.palette.primary : this.darkenColor(this.palette.primary, 0.35);
      borders.push(this.withAlpha(borderBase, this.isDarkTheme ? 0.9 : 0.6));
    }
    return { background: backgrounds, border: borders };
  }

  private generateTagColors(length: number): { background: string[]; border: string[] } {
    const backgrounds: string[] = [];
    const borders: string[] = [];
    const steps = Math.max(1, Math.min(6, length));
    for (let i = 0; i < length; i++) {
      const weight = (i % steps) / steps;
      const blendTarget = this.isDarkTheme ? '#f5f5f5' : '#ffffff';
      const mixed = this.mixColors(this.palette.primary, blendTarget, this.isDarkTheme ? weight * 0.3 : 0.7 + weight * 0.2);
      const alphaBase = this.isDarkTheme ? 0.85 : 0.45;
      const alpha = Math.max(0.15, alphaBase - (i % steps) * 0.07);
      backgrounds.push(this.withAlpha(mixed, alpha));
      const borderBase = this.isDarkTheme ? this.palette.primary : this.darkenColor(this.palette.primary, 0.3);
      borders.push(this.withAlpha(borderBase, this.isDarkTheme ? 0.85 : 0.5));
    }
    return { background: backgrounds, border: borders };
  }

  private buildCartesianOptions(xTitle: string, yTitle: string): any {
    const gridColor = this.withAlpha(this.palette.border, this.isDarkTheme ? 0.45 : 0.25);
    const tickColor = this.palette.secondary;
    const axisColor = this.palette.primary;

    return {
      responsive: true,
      maintainAspectRatio: false,
      scales: {
        x: {
          title: {
            display: true,
            text: xTitle,
            color: axisColor,
          },
          grid: {
            color: gridColor,
          },
          ticks: {
            color: tickColor,
          },
        },
        y: {
          title: {
            display: true,
            text: yTitle,
            color: axisColor,
          },
          grid: {
            color: gridColor,
          },
          ticks: {
            color: tickColor,
          },
          beginAtZero: true,
        },
      },
      plugins: {
        legend: {
          labels: {
            color: tickColor,
            font: { size: 14 },
          },
        },
      },
    };
  }

  private buildPieOptions(options?: { titleText?: string; titleFontSize?: number; cutout?: string; hideLegend?: boolean }): any {
    const legendColor = this.palette.secondary;
    const config: any = {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          display: options?.hideLegend ? false : true,
          labels: {
            color: legendColor,
          },
        },
      },
    };

    if (options?.titleText) {
      config.plugins.title = {
        display: true,
        text: options.titleText,
        color: this.palette.primary,
        font: { size: options.titleFontSize ?? 16, weight: 'bold' },
      };
    }

    if (options?.cutout) {
      config.cutout = options.cutout;
    }

    return config;
  }

  updateChartData(): void {
    const stats = this.statistics;
    if (!stats || !stats.questionsCrackedPerDay) {
      return;
    }

    this.refreshPalette();

    const filteredItems = stats.questionsCrackedPerDay.filter((item) => item.count > 0);
    const labels = filteredItems.map((item) => item.date);
    const data = filteredItems.map((item) => item.count);
    const lineColor = this.palette.primary;
    const areaColor = this.withAlpha(this.palette.primary, this.isDarkTheme ? 0.35 : 0.18);

    this.chartData = {
      labels,
      datasets: [
        {
          label: 'Cracked Questions Per Day',
          data,
          backgroundColor: areaColor,
          borderColor: lineColor,
          borderWidth: 2,
          fill: false,
          tension: 0.4,
        },
      ],
    };

    this.chartOptions = this.buildCartesianOptions('Date', 'Questions Cracked');

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

    this.refreshPalette();

    const labels = stats.incrementalQuestionsCrackedPerDay.map((item) => item.date);
    const data = stats.incrementalQuestionsCrackedPerDay.map((item) => item.count);
    const barColor = this.withAlpha(this.palette.primary, this.isDarkTheme ? 0.55 : 0.3);
    const hoverColor = this.withAlpha(this.palette.primary, this.isDarkTheme ? 0.75 : 0.45);
    const borderColor = this.withAlpha(this.palette.primary, this.isDarkTheme ? 0.9 : 0.6);

    this.incrementalChartData = {
      labels,
      datasets: [
        {
          label: 'Incremental Cracked Questions Per Day',
          data,
          backgroundColor: barColor,
          borderColor,
          borderWidth: 2,
          hoverBackgroundColor: hoverColor,
          hoverBorderColor: borderColor,
        },
      ],
    };

    this.incrementalChartOptions = this.buildCartesianOptions('Date', 'Questions Cracked');

    if (this.incrementalChartInstance) {
      this.incrementalChartInstance.data = this.incrementalChartData;
      this.incrementalChartInstance.options = this.incrementalChartOptions;
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

    this.refreshPalette();

    const labels = Object.keys(stats.questionsCrackedPerDifficulty);
    const data = Object.values(stats.questionsCrackedPerDifficulty);
    const colors = this.generateDifficultyColors(labels.length);

    this.difficultyChartData = {
      labels,
      datasets: [
        {
          data,
          backgroundColor: colors.background,
          borderColor: colors.border,
          borderWidth: 2,
        },
      ],
    };

    this.difficultyChartOptions = this.buildPieOptions();

    if (this.difficultyChartInstance) {
      this.difficultyChartInstance.data = this.difficultyChartData;
      this.difficultyChartInstance.options = this.difficultyChartOptions;
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

    this.refreshPalette();

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

    this.tagChartOptions = this.buildPieOptions({
      titleText: 'Times That Each Tag Appeared',
      titleFontSize: 16,
      cutout: '75%',
      hideLegend: true,
    });
    this.tagChartOptions.plugins = this.tagChartOptions.plugins ?? {};
    this.tagChartOptions.plugins.tooltip = {
      callbacks: {
        label: (tooltipItem: any) => {
          const index = tooltipItem.dataIndex;
          const label = this.tagChartData.labels[index];
          const value = this.tagChartData.datasets[0].data[index];
          return `${label}: ${value}`;
        },
      },
    };

    this.applyTagChartColors();

    if (this.tagChartInstance) {
      this.tagChartInstance.data = this.tagChartData;
      this.tagChartInstance.options = this.tagChartOptions;
      this.tagChartInstance.update();
    } else if (this.tagChartCanvas) {
      this.initializeTagChart();
    }
  }

  initializeChart(): void {
    const ctx = this.chartCanvas.nativeElement;
    if (this.chartData && this.chartOptions) {
      this.refreshPalette();
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
      this.refreshPalette();
      this.incrementalChartInstance = new Chart(ctx, {
        type: 'bar', // Bar chart
        data: this.incrementalChartData,
        options: this.incrementalChartOptions,
      });
    }
  }

  initializeDifficultyChart(): void {
    const ctx = this.difficultyChartCanvas.nativeElement;
    if (this.difficultyChartData) {
      this.refreshPalette();
      this.difficultyChartInstance = new Chart(ctx, {
        type: 'pie',
        data: this.difficultyChartData,
        options: this.difficultyChartOptions,
      });
    }
  }

  initializeTagChart(): void {
    const ctx = this.tagChartCanvas.nativeElement;
    if (this.tagChartData) {
      this.applyTagChartColors();
      this.refreshPalette();
      this.tagChartInstance = new Chart(ctx, {
        type: 'doughnut',
        data: this.tagChartData,
        options: this.tagChartOptions,
      });
    }
  }

  private applyTagChartColors(): void {
    if (!this.tagChartData?.datasets?.length) {
      return;
    }

    this.refreshPalette();

    const colors = this.generateTagColors(this.tagChartData.labels.length);
    this.tagChartData.datasets[0].backgroundColor = colors.background;
    this.tagChartData.datasets[0].borderColor = colors.border;
    this.tagChartData.datasets[0].borderWidth = 2;
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
