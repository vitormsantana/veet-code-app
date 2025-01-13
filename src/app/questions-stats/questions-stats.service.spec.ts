import { TestBed } from '@angular/core/testing';

import { QuestionsStatsService } from './questions-stats.service';

describe('QuestionsStatsService', () => {
  let service: QuestionsStatsService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(QuestionsStatsService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
