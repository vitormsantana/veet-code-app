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

  async canActivate(route: ActivatedRouteSnapshot, state: RouterStateSnapshot): Promise<boolean | UrlTree> {
    try {
      const session = await this.authService.ensureValidSession();

      if (session && session.accessToken && session.expiresAt > Date.now()) {
        return true;
      }
    } catch (error) {
      console.error('[AuthGuard] Failed to validate session', error);
    }

    const navigationExtras = state.url && state.url !== '/login'
      ? { queryParams: { redirectTo: state.url } }
      : undefined;

    return this.router.createUrlTree(['/login'], navigationExtras);
  }
}
