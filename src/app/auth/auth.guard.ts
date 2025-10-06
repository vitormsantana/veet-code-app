import { Injectable } from '@angular/core';
import {
  ActivatedRouteSnapshot,
  CanActivate,
  Router,
  RouterStateSnapshot,
  UrlTree
} from '@angular/router';
import { AuthService } from './auth.service';

@Injectable({ providedIn: 'root' })
export class AuthGuard implements CanActivate {
  constructor(private readonly authService: AuthService, private readonly router: Router) {}

  canActivate(route: ActivatedRouteSnapshot, state: RouterStateSnapshot): boolean | UrlTree {
    const session = this.authService.getSession();

    if (session && session.accessToken && session.expiresAt > Date.now()) {
      return true;
    }

    return this.router.createUrlTree(['/login'], {
      queryParams: {
        redirectTo: state.url
      }
    });
  }
}
