import { TestBed, fakeAsync, tick } from '@angular/core/testing';
import { HttpClientTestingModule, HttpTestingController } from '@angular/common/http/testing';

import { UserMetricsService } from './user-metrics.service';
import { AuthService } from '../auth/auth.service';
import { environment } from '../../environments/environment';

describe('UserMetricsService', () => {
  let service: UserMetricsService;
  let httpMock: HttpTestingController;
  let authServiceSpy: jasmine.SpyObj<AuthService>;

  beforeEach(() => {
    authServiceSpy = jasmine.createSpyObj<AuthService>('AuthService', ['ensureValidSession']);
    authServiceSpy.ensureValidSession.and.resolveTo({
      accessToken: 'access-token',
      idToken: 'id-token',
      tokenType: 'Bearer',
      expiresAt: Date.now() + 3_600_000
    });

    TestBed.configureTestingModule({
      imports: [HttpClientTestingModule],
      providers: [{ provide: AuthService, useValue: authServiceSpy }]
    });

    service = TestBed.inject(UserMetricsService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  it('should fetch and normalize metrics', fakeAsync(() => {
    let latest: any;

    service.getLatestMetrics().subscribe((metric) => {
      latest = metric;
    });

    tick();

    const req = httpMock.expectOne(`${environment.apiBaseUrl}/read_user_metrics`);
    expect(req.request.method).toBe('GET');
    expect(req.request.headers.get('Authorization')).toBe('Bearer id-token');

    req.flush([
      {
        user_id: 'user-1',
        date: '2024-11-01T10:00:00Z',
        short_window_days: 7,
        long_window_days: 30,
        avg_minutes_per_tag: { Arrays: 15 },
        avg_solved_last_short_window: 2.5,
        exercises_tried_last_short_window: 5,
        exercises_tried_last_long_window: 18,
        consistency_rate: 0.85,
        total_questions_analyzed: 12,
        calculated_at_utc: '2024-11-01T11:00:00Z'
      },
      {
        user_id: 'user-1',
        date: '2024-10-20T09:00:00Z',
        short_window_days: 7,
        long_window_days: 30
      }
    ]);

    tick();

    expect(latest).toEqual(jasmine.objectContaining({
      userId: 'user-1',
      date: '2024-11-01T10:00:00Z',
      shortWindowDays: 7,
      longWindowDays: 30,
      avgMinutesPerTag: { Arrays: 15 },
      exercisesTriedLastShortWindow: 5,
      exercisesTriedLastLongWindow: 18,
      consistencyRate: 0.85,
      totalQuestionsAnalyzed: 12,
      calculatedAtUtc: '2024-11-01T11:00:00Z'
    }));
  }));
});
