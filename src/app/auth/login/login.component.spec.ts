import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ReactiveFormsModule } from '@angular/forms';
import { ActivatedRoute, convertToParamMap } from '@angular/router';
import { RouterTestingModule } from '@angular/router/testing';
import { AuthService } from '../auth.service';
import { LoginComponent } from './login.component';

describe('LoginComponent', () => {
  let component: LoginComponent;
  let fixture: ComponentFixture<LoginComponent>;
  let authService: jasmine.SpyObj<AuthService>;
  const activatedRouteStub = {
    snapshot: {
      queryParamMap: convertToParamMap({})
    }
  } as unknown as ActivatedRoute;

  beforeEach(async () => {
    authService = jasmine.createSpyObj<AuthService>('AuthService', [
      'signInWithEmail',
      'signInWithGoogle',
      'completeAuthorizationCodeGrant'
    ]);

    authService.signInWithEmail.and.returnValue(Promise.resolve());
    authService.signInWithGoogle.and.returnValue(Promise.resolve());
    authService.completeAuthorizationCodeGrant.and.returnValue(Promise.resolve());

    await TestBed.configureTestingModule({
      declarations: [LoginComponent],
      imports: [ReactiveFormsModule, RouterTestingModule],
      providers: [
        { provide: AuthService, useValue: authService },
        { provide: ActivatedRoute, useValue: activatedRouteStub }
      ]
    })
    .compileComponents();

    fixture = TestBed.createComponent(LoginComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should trigger email sign in when form is valid', async () => {
    component.loginForm.setValue({ email: 'test@example.com', password: 'password' });

    await component.onSubmit();

    expect(authService.signInWithEmail).toHaveBeenCalledWith('test@example.com', 'password');
  });

  it('should initiate Google sign in flow', async () => {
    await component.connectWithGoogle();

    expect(authService.signInWithGoogle).toHaveBeenCalled();
    expect(component.isRedirectingToProvider).toBeTrue();
  });
});
