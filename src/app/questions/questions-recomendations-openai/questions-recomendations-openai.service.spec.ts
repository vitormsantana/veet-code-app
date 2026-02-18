import { TestBed } from '@angular/core/testing';
import { HttpClientTestingModule } from '@angular/common/http/testing';

import { QuestionsRecomendationsOpenaiService } from './questions-recomendations-openai.service';
import { AuthService } from '../../auth/auth.service';

describe('QuestionsRecomendationsOpenaiService', () => {
  let service: QuestionsRecomendationsOpenaiService;

  beforeEach(() => {
    const authServiceSpy = jasmine.createSpyObj<AuthService>('AuthService', ['ensureValidSession']);

    TestBed.configureTestingModule({
      imports: [HttpClientTestingModule],
      providers: [{ provide: AuthService, useValue: authServiceSpy }]
    });
    service = TestBed.inject(QuestionsRecomendationsOpenaiService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
