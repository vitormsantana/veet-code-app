import { Component, OnInit } from '@angular/core';
import { QuestionsRecomendationsOpenaiService } from './questions-recomendations-openai.service';

@Component({
  selector: 'app-questions-recomendations-openai',
  standalone: false,
  templateUrl: './questions-recomendations-openai.component.html',
  styleUrls: ['./questions-recomendations-openai.component.css'],
})
export class QuestionsRecomendationsOpenaiComponent implements OnInit {
  recommendations: string = ''; // Store the full recommendations text
  isLoading = false; // Loading state
  error: string | null = null; // Error state

  constructor(private recommendationsService: QuestionsRecomendationsOpenaiService) {}

  ngOnInit(): void {
    this.fetchRecommendations();
  }

  fetchRecommendations(): void {
    this.isLoading = true; // Start loading
    this.error = null; // Clear previous errors
    this.recommendationsService.getRecommendations().subscribe({
      next: (response) => {
        console.log('[DEBUG] Received response:', response);
        this.recommendations = Array.isArray(response.suggestions)
          ? response.suggestions.join('\n') // Join suggestions array into a single string
          : response.suggestions; // Use suggestions directly if it's a string
        this.isLoading = false; // Stop loading
      },
      error: (error) => {
        console.error('Error fetching recommendations:', error);
        this.error = 'Failed to fetch recommendations. Please try again later.';
        this.isLoading = false; // Stop loading
      },
    });
  }
}

