import { TestBed } from '@angular/core/testing';

import { StudiesStatsService } from './studies-stats.service';

describe('StudiesStatsService', () => {
  let service: StudiesStatsService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(StudiesStatsService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
