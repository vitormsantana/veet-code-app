import { TestBed } from '@angular/core/testing';

import { QuestionsRecomendationsOpenaiService } from './questions-recomendations-openai.service';

describe('QuestionsRecomendationsOpenaiService', () => {
  let service: QuestionsRecomendationsOpenaiService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(QuestionsRecomendationsOpenaiService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
