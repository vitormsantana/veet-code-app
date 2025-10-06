import { ComponentFixture, TestBed } from '@angular/core/testing';
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
      'signInWithGoogle',
      'completeAuthorizationCodeGrant',
      'storeRedirectTarget',
      'getStoredRedirectTarget',
      'clearRedirectTarget'
    ]);

    authService.signInWithGoogle.and.returnValue(Promise.resolve());
    authService.completeAuthorizationCodeGrant.and.returnValue(Promise.resolve());
    authService.getStoredRedirectTarget.and.returnValue(null);

    await TestBed.configureTestingModule({
      declarations: [LoginComponent],
      imports: [RouterTestingModule],
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

  it('should initiate Google sign in flow', async () => {
    await component.connectWithGoogle();

    expect(authService.signInWithGoogle).toHaveBeenCalled();
    expect(component.isRedirectingToProvider).toBeTrue();
  });
});
