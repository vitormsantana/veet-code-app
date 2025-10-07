import { ComponentFixture, TestBed, fakeAsync, tick } from '@angular/core/testing';
import { ReactiveFormsModule } from '@angular/forms';
import { HttpClientTestingModule, HttpTestingController } from '@angular/common/http/testing';
import { NO_ERRORS_SCHEMA } from '@angular/core';
import { AuthService } from '../../auth/auth.service';

import { QuestionComponent } from './question.component';
import { QuestionsRefreshService } from '../questions-refresh.service';

describe('QuestionComponent', () => {
  let component: QuestionComponent;
  let fixture: ComponentFixture<QuestionComponent>;
  let authServiceSpy: jasmine.SpyObj<AuthService>;
  let refreshService: QuestionsRefreshService;
  let httpMock: HttpTestingController;

  beforeEach(async () => {
    authServiceSpy = jasmine.createSpyObj<AuthService>('AuthService', ['ensureValidSession']);
    authServiceSpy.ensureValidSession.and.resolveTo({
      accessToken: 'token',
      idToken: 'id',
      tokenType: 'Bearer',
      expiresAt: Date.now() + 100000,
      profile: {}
    } as any);

    await TestBed.configureTestingModule({
      declarations: [QuestionComponent],
      imports: [ReactiveFormsModule, HttpClientTestingModule],
      providers: [{ provide: AuthService, useValue: authServiceSpy }],
      schemas: [NO_ERRORS_SCHEMA]
    })
    .compileComponents();

    fixture = TestBed.createComponent(QuestionComponent);
    component = fixture.componentInstance;
    refreshService = TestBed.inject(QuestionsRefreshService);
    httpMock = TestBed.inject(HttpTestingController);
    spyOn(refreshService, 'triggerRefresh');
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('should trigger refresh when a question is successfully submitted', fakeAsync(() => {
    component.questionForm.setValue({
      name: 'Two Sum',
      difficulty: 'Easy',
      date: '2025-10-05',
      tags: ['Arrays'],
      minutesTaken: 15,
      neededHelp: false
    });

    component.submitForm();
    tick();

    const req = httpMock.expectOne(/create_exercise$/);
    expect(req.request.method).toBe('POST');
    req.flush({ message: 'ok' });

    tick();

    expect(refreshService.triggerRefresh).toHaveBeenCalled();
  }));
});
