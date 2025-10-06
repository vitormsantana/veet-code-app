import { Injectable } from '@angular/core';
import {
  HttpEvent,
  HttpHandler,
  HttpInterceptor,
  HttpRequest
} from '@angular/common/http';
import { Router } from '@angular/router';
import { from, Observable, throwError } from 'rxjs';
import { catchError, switchMap } from 'rxjs/operators';
import { AuthService } from './auth.service';
import { cognitoConfig } from './cognito.config';

@Injectable()
export class AuthInterceptor implements HttpInterceptor {
  constructor(private readonly authService: AuthService, private readonly router: Router) {}

  intercept(req: HttpRequest<unknown>, next: HttpHandler): Observable<HttpEvent<unknown>> {
    if (req.url.startsWith(cognitoConfig.domain)) {
      return next.handle(req);
    }

    return from(this.authService.ensureValidSession()).pipe(
      switchMap((session) => {
        if (!session || !session.accessToken || session.expiresAt <= Date.now()) {
          this.authService.clearLocalSession();
          return next.handle(req);
        }

        const tokenType = session.tokenType || 'Bearer';
        const authReq = req.clone({
          setHeaders: {
            Authorization: `${tokenType} ${session.accessToken}`
          }
        });

        return next.handle(authReq);
      }),
      catchError((error) => {
        if (error && error.status === 401) {
          this.authService.clearLocalSession();
          const currentUrl = this.router.url;
          const navigationExtras = currentUrl && currentUrl !== '/login'
            ? { queryParams: { redirectTo: currentUrl }, replaceUrl: true }
            : { replaceUrl: true };
          this.router.navigate(['/login'], navigationExtras).catch(() => undefined);
        }
        return throwError(() => error);
      })
    );
  }
}
