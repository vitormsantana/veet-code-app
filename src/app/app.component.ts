import { Component, OnInit } from '@angular/core';
import { NavigationEnd, Router } from '@angular/router';
import { filter } from 'rxjs';
import { AuthService } from './auth/auth.service';

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  standalone: false,
  styleUrls: ['./app.component.css']
})
export class AppComponent implements OnInit {
  title = 'veet-app';
  isAuthenticated = false;

  constructor(private readonly authService: AuthService, private readonly router: Router) {
    this.router.events
      .pipe(filter((event): event is NavigationEnd => event instanceof NavigationEnd))
      .subscribe(() => {
        this.syncAuthState();
      });
  }

  ngOnInit(): void {
    this.syncAuthState();
  }

  logout(): void {
    this.authService.signOut();
  }

  private syncAuthState(): void {
    const session = this.authService.getSession();
    this.isAuthenticated = !!(session && session.accessToken && session.expiresAt > Date.now());
  }
}
