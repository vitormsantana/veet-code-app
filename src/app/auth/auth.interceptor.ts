import { Injectable } from '@angular/core';
import {
  HttpEvent,
  HttpHandler,
  HttpInterceptor,
  HttpRequest
} from '@angular/common/http';
import { Observable } from 'rxjs';
import { AuthService } from './auth.service';
import { cognitoConfig } from './cognito.config';

@Injectable()
export class AuthInterceptor implements HttpInterceptor {
  constructor(private readonly authService: AuthService) {}

  intercept(req: HttpRequest<unknown>, next: HttpHandler): Observable<HttpEvent<unknown>> {
    const session = this.authService.getSession();

    if (!session || !session.accessToken || session.expiresAt <= Date.now()) {
      return next.handle(req);
    }

    if (req.url.startsWith(cognitoConfig.domain)) {
      return next.handle(req);
    }

    const tokenType = session.tokenType || 'Bearer';
    const authReq = req.clone({
      setHeaders: {
        Authorization: `${tokenType} ${session.accessToken}`
      }
    });

    return next.handle(authReq);
  }
}
