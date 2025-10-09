import { Component, OnInit } from '@angular/core';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';
import { QuestionsRecomendationsOpenaiService } from './questions-recomendations-openai.service';

@Component({
  selector: 'app-questions-recomendations-openai',
  standalone: false,
  templateUrl: './questions-recomendations-openai.component.html',
  styleUrls: ['./questions-recomendations-openai.component.css'],
})
export class QuestionsRecomendationsOpenaiComponent implements OnInit {
  recommendationsHtml: SafeHtml | null = null;
  isLoading = false;
  error: string | null = null;

  constructor(
    private recommendationsService: QuestionsRecomendationsOpenaiService,
    private sanitizer: DomSanitizer
  ) {}

  ngOnInit(): void {
    this.fetchRecommendations();
  }

  fetchRecommendations(): void {
    this.isLoading = true;
    this.error = null;

    this.recommendationsService.getRecommendations().subscribe({
      next: (response) => {
        const raw = response?.suggestions ?? '';
        const formatted = this.convertMarkdownToHtml(raw);
        this.recommendationsHtml = this.sanitizer.bypassSecurityTrustHtml(formatted);
        this.isLoading = false;
      },
      error: (error) => {
        if (error?.status === 401) {
          this.error = 'Session expired. Please sign in again.';
        } else {
          this.error = 'Failed to fetch recommendations. Try again later.';
        }
        this.isLoading = false;
      },
    });
  }

  private convertMarkdownToHtml(text: string): string {
    return text
      .replace(/^### (.*)$/gm, '<h3>$1</h3>')
      .replace(/^\d+\.\s\*\*Category Name\*\*: (.*?)\s*<br>/gm, '<tr><td class="category">$1</td>')
      .replace(/\*\*Question\*\*: (.*?)\s*<br>/gm, '<td class="question">$1</td>')
      .replace(/\*\*Reason\*\*: (.*?)\s*(?=(\d+\.|$))/gs, '<td class="reason">$1</td></tr>')
      .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
      .replace(/\n/g, '<br>');
  }
}
