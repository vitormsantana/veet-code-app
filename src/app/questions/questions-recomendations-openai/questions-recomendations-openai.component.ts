import { Component, OnInit } from '@angular/core';
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
export class QuestionsRecomendationsOpenaiComponent implements OnInit {
  rawRecommendations = '';
  parsedRecommendations: RecommendationRow[] = [];
  isLoading = false;
  error: string | null = null;

  constructor(private recommendationsService: QuestionsRecomendationsOpenaiService) {}

  ngOnInit(): void {
    this.fetchRecommendations();
  }

  fetchRecommendations(): void {
    this.isLoading = true;
    this.error = null;

    this.recommendationsService.getRecommendations().subscribe({
      next: (response) => {
        const raw = (response?.suggestions ?? '').replace(/\r\n/g, '\n').trim();
        this.rawRecommendations = raw;
        this.parsedRecommendations = this.parseRecommendations(raw);
        this.isLoading = false;
      },
      error: (error) => {
        console.error('[Recommendations] Failed to fetch recommendations', error);
        this.parsedRecommendations = [];
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

  private parseRecommendations(text: string): RecommendationRow[] {
    if (!text) {
      return [];
    }

    const body = text.replace(/^#+\s*Suggested Questions\s*/i, '').trim();
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

    return rows;
  }

  private stripFormatting(value: string): string {
    return value.replace(/\*\*/g, '').replace(/\s+/g, ' ').trim();
  }
}
