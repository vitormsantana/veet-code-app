import { Component, OnDestroy, OnInit } from '@angular/core';
import { Subject, takeUntil } from 'rxjs';
import { QuestionsRecomendationsOpenaiService } from './questions-recomendations-openai.service';

interface RecommendationRow {
  index: number;
  category: string;
  question: string;
  reason: string;
}

@Component({
  selector: 'app-questions-recomendations-openai',
  standalone: false,
  templateUrl: './questions-recomendations-openai.component.html',
  styleUrls: ['./questions-recomendations-openai.component.css'],
})
export class QuestionsRecomendationsOpenaiComponent implements OnInit, OnDestroy {
  rawRecommendations = '';
  parsedRecommendations: RecommendationRow[] = [];
  recommendationsIntro: string[] = [];
  isLoading = false;
  error: string | null = null;
  private readonly destroy$ = new Subject<void>();

  constructor(private recommendationsService: QuestionsRecomendationsOpenaiService) {}

  ngOnInit(): void {
    this.fetchRecommendations();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  fetchRecommendations(): void {
    this.isLoading = true;
    this.error = null;

    this.recommendationsService
      .getRecommendations()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (response) => {
          const raw = (response?.suggestions ?? '').replace(/\r\n/g, '\n').trim();
          this.rawRecommendations = raw;
          const parsed = this.parseRecommendations(raw);
          this.recommendationsIntro = parsed.intro;
          this.parsedRecommendations = parsed.rows;
          this.isLoading = false;
        },
        error: (error) => {
          console.error('[Recommendations] Failed to fetch recommendations', error);
          this.parsedRecommendations = [];
          this.recommendationsIntro = [];
          this.rawRecommendations = '';
          if (error?.status === 401) {
            this.error = 'Session expired. Please sign in again to view recommendations.';
          } else {
            this.error = 'Failed to fetch recommendations. Please try again later.';
          }
          this.isLoading = false;
        },
      });
  }

  private parseRecommendations(
    text: string
  ): { intro: string[]; rows: RecommendationRow[] } {
    if (!text) {
      return { intro: [], rows: [] };
    }

    let body = text
      .replace(/^###\s*Personalized\s+Recommendations\s*/i, '')
      .trim();

    const introLines: string[] = [];
    const introRegex =
      /\*\*Intro[^\*]*\*\*:\s*([\s\S]*?)(?=\n\s*\*\*Suggested Questions\*\*|\n\s*1\.)/i;
    const introMatch = body.match(introRegex);
    if (introMatch) {
      introLines.push(
        ...introMatch[1]
          .trim()
          .split(/\n+/)
          .map((line) => this.stripFormatting(line))
          .filter(Boolean)
      );
      body = body.replace(introRegex, '').trim();
    }

    body = body.replace(/\*\*Suggested Questions\*\*/i, '').trim();
    body = body.replace(/^\s*[-–]\s*/gm, '');

    const pattern =
      /(\d+)\.\s*(?:\*\*?Category(?:\s*Name)?\*\*?\s*:|Category(?:\s*Name)?\s*:)?\s*([^\n]+)\n\s*(?:\*\*?Question\*\*?\s*:|Question\s*:)\s*([^\n]+)\n\s*(?:\*\*?Reason\*\*?\s*:|Reason\s*:)\s*([\s\S]*?)(?=\n\d+\.\s|$)/gi;

    const rows: RecommendationRow[] = [];
    let match: RegExpExecArray | null;

    while ((match = pattern.exec(body)) !== null) {
      const [, index, categoryRaw, questionRaw, reasonRaw] = match;
      rows.push({
        index: Number(index),
        category: this.stripFormatting(categoryRaw),
        question: this.stripFormatting(questionRaw),
        reason: this.stripFormatting(reasonRaw),
      });
    }

    return { intro: introLines, rows };
  }

  private stripFormatting(value: string): string {
    return value.replace(/\*\*|__/g, '').replace(/\s+/g, ' ').trim();
  }
}
