import { TestBed, fakeAsync, tick } from '@angular/core/testing';
import { HttpClientTestingModule } from '@angular/common/http/testing';
import { HttpTestingController } from '@angular/common/http/testing';

import { QuestionsStatsService } from './questions-stats.service';
import { AuthService } from '../../auth/auth.service';
import { environment } from '../../../environments/environment';

describe('QuestionsStatsService', () => {
  let service: QuestionsStatsService;
  let authService: jasmine.SpyObj<AuthService>;
  let httpMock: HttpTestingController;

  beforeEach(() => {
    authService = jasmine.createSpyObj<AuthService>('AuthService', ['ensureValidSession']);
    authService.ensureValidSession.and.resolveTo({
      accessToken: 'access-token',
      idToken: 'id-token',
      tokenType: 'Bearer',
      expiresAt: Date.now() + 3_600_000
    });

    TestBed.configureTestingModule({
      imports: [HttpClientTestingModule],
      providers: [{ provide: AuthService, useValue: authService }]
    });
    service = TestBed.inject(QuestionsStatsService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  it('should normalize statistics from the API response', fakeAsync(() => {
    let result: any;

    service.getStatistics().subscribe((stats) => {
      result = stats;
    });

    tick();

    const req = httpMock.expectOne(`${environment.apiBaseUrl}/read_statistics_from_exercises`);
    expect(req.request.method).toBe('GET');
    expect(req.request.headers.get('Authorization')).toBe('Bearer id-token');

    req.flush({
      questionsCrackedPerDay: {
        '05/10/2025': 1,
        '06/10/2025': 1,
        '15/10/2025': 1
      },
      questionsCrackedPerDifficulty: {
        Easy: 1,
        Hard: 2
      },
      questionsCrackedPerTag: {
        Arrays: 1,
        'Binary Search': 1,
        'Hash Tables': 1,
        Queues: 1,
        String: 1
      },
      totalQuestionsCracked: 3
    });

    tick();

    expect(result).toEqual({
      questionsCrackedPerDay: [
        { date: '05/10/2025', count: 1 },
        { date: '06/10/2025', count: 1 },
        { date: '15/10/2025', count: 1 }
      ],
      questionsCrackedPerDifficulty: {
        Easy: 1,
        Hard: 2
      },
      questionsCrackedPerTag: {
        Arrays: 1,
        'Binary Search': 1,
        'Hash Tables': 1,
        Queues: 1,
        String: 1
      },
      totalQuestionsCracked: 3,
      incrementalQuestionsCrackedPerDay: []
    });
  }));
});
