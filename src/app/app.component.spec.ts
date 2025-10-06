import { TestBed } from '@angular/core/testing';
import { NavigationEnd, Router } from '@angular/router';
import { RouterTestingModule } from '@angular/router/testing';
import { Subject } from 'rxjs';
import { AuthService } from './auth/auth.service';
import { AppComponent } from './app.component';

describe('AppComponent', () => {
  let routerEvents$: Subject<NavigationEnd>;
  let authService: jasmine.SpyObj<AuthService>;

  beforeEach(async () => {
    routerEvents$ = new Subject<NavigationEnd>();
    authService = jasmine.createSpyObj<AuthService>('AuthService', ['getSession', 'signOut']);
    authService.getSession.and.returnValue(null);

    await TestBed.configureTestingModule({
      imports: [
        RouterTestingModule
      ],
      declarations: [
        AppComponent
      ],
      providers: [
        { provide: AuthService, useValue: authService },
        {
          provide: Router,
          useValue: {
            events: routerEvents$.asObservable()
          }
        }
      ]
    }).compileComponents();
  });

  it('should create the app', () => {
    const fixture = TestBed.createComponent(AppComponent);
    const app = fixture.componentInstance;
    expect(app).toBeTruthy();
  });

  it(`should have as title 'veet-app'`, () => {
    const fixture = TestBed.createComponent(AppComponent);
    const app = fixture.componentInstance;
    expect(app.title).toEqual('veet-app');
  });

  it('should render the router outlet', () => {
    const fixture = TestBed.createComponent(AppComponent);
    fixture.detectChanges();
    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.querySelector('router-outlet')).not.toBeNull();
  });

  it('should trigger logout via auth service', () => {
    const fixture = TestBed.createComponent(AppComponent);
    const component = fixture.componentInstance;

    component.logout();

    expect(authService.signOut).toHaveBeenCalled();
  });
});
