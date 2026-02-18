import { ComponentFixture, TestBed, fakeAsync, tick } from '@angular/core/testing';
import { HttpClientTestingModule, HttpTestingController } from '@angular/common/http/testing';
import { NO_ERRORS_SCHEMA } from '@angular/core';
import { MatTableModule } from '@angular/material/table';
import { MatPaginatorModule } from '@angular/material/paginator';
import { MatSortModule } from '@angular/material/sort';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';
import { AuthService } from '../../auth/auth.service';
import { QuestionsTableComponent } from './questions-table.component';
import { QuestionsRefreshService } from '../questions-refresh.service';

describe('QuestionsTableComponent', () => {
  let component: QuestionsTableComponent;
  let fixture: ComponentFixture<QuestionsTableComponent>;
  let authService: jasmine.SpyObj<AuthService>;
  let httpMock: HttpTestingController;
  let refreshService: QuestionsRefreshService;

  beforeEach(async () => {
    authService = jasmine.createSpyObj<AuthService>('AuthService', ['ensureValidSession']);
    authService.ensureValidSession.and.resolveTo({
      accessToken: 'token',
      idToken: 'token',
      refreshToken: 'refresh',
      tokenType: 'Bearer',
      expiresAt: Date.now() + 100000,
      profile: {}
    } as any);

    await TestBed.configureTestingModule({
      declarations: [QuestionsTableComponent],
      imports: [
        HttpClientTestingModule,
        MatTableModule,
        MatPaginatorModule,
        MatSortModule,
        BrowserAnimationsModule
      ],
      providers: [{ provide: AuthService, useValue: authService }],
      schemas: [NO_ERRORS_SCHEMA]
    })
    .compileComponents();

    fixture = TestBed.createComponent(QuestionsTableComponent);
    component = fixture.componentInstance;
    httpMock = TestBed.inject(HttpTestingController);
    refreshService = TestBed.inject(QuestionsRefreshService);
  });

  it('should create', fakeAsync(() => {
    fixture.detectChanges();
    tick();
    httpMock.expectOne((req) => req.url.endsWith('/read_exercises')).flush([]);
    tick();
    expect(component).toBeTruthy();
  }));

  afterEach(() => {
    httpMock.verify();
  });

  it('should refetch questions when a refresh event is emitted', fakeAsync(() => {
    const fetchSpy = spyOn(component, 'fetchQuestions').and.callThrough();

    fixture.detectChanges();
    tick();

    const firstResponse = [
      {
        name: 'Two Sum',
        date: '05/10/2025',
        difficulty: 'Easy',
        tags: ['Arrays'],
        minutes_taken: 10,
        needed_help: false,
        obs: 'Warm up question.'
      }
    ];

    let req = httpMock.expectOne((request) => request.url.endsWith('/read_exercises'));
    expect(req.request.method).toBe('GET');
    req.flush(firstResponse);
    tick();

    expect(component.questions.data[0]?.observation).toBe('Warm up question.');

    refreshService.triggerRefresh();
    tick();

    const secondResponse = [
      {
        name: 'Binary Search',
        date: '06/10/2025',
        difficulty: 'Medium',
        tags: ['Binary Search'],
        minutes_taken: 20,
        needed_help: true,
        obs: 'Struggled with edge cases.'
      }
    ];

    req = httpMock.expectOne((request) => request.url.endsWith('/read_exercises'));
    expect(req.request.method).toBe('GET');
    req.flush(secondResponse);
    tick();

    expect(component.questions.data[0]?.observation).toBe('Struggled with edge cases.');
    expect(fetchSpy).toHaveBeenCalledTimes(2);
  }));
});
