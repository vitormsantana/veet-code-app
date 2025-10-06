import { Component, OnInit, inject } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { AuthService } from '../auth.service';

@Component({
  selector: 'app-login',
  standalone: false,
  templateUrl: './login.component.html',
  styleUrls: ['./login.component.css']
})
export class LoginComponent implements OnInit {
  private readonly authService = inject(AuthService);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);
  isProcessingRedirect = false;
  isRedirectingToProvider = false;
  errorMessage = '';

  ngOnInit(): void {
    void this.handleAuthRedirect();
  }

  async connectWithGoogle(): Promise<void> {
    console.info('[LoginComponent] Google sign-in button clicked');
    this.errorMessage = '';
    this.isRedirectingToProvider = true;
    try {
      await this.authService.signInWithGoogle();
    } catch (error) {
      this.errorMessage = this.extractErrorMessage(error);
      this.isRedirectingToProvider = false;
    }
  }

  get googleButtonLabel(): string {
    if (this.isRedirectingToProvider) {
      return 'Signing in with Google…';
    }
    return 'Continue with Google';
  }

  private extractErrorMessage(error: unknown): string {
    if (typeof error === 'string') {
      return error;
    }

    if (error && typeof error === 'object' && 'message' in error && typeof (error as { message?: unknown }).message === 'string') {
      return (error as { message: string }).message;
    }

    return 'Unable to sign in. Please try again.';
  }

  private async handleAuthRedirect(): Promise<void> {
    const queryParams = this.route.snapshot.queryParamMap;
    const authError = queryParams.get('error');
    const authErrorDescription = queryParams.get('error_description');

    if (authError) {
      this.errorMessage = decodeURIComponent((authErrorDescription ?? authError).replace(/\+/g, ' '));
      await this.clearAuthQueryParams();
      return;
    }

    const code = queryParams.get('code');
    const state = queryParams.get('state');
    const redirectToParam = queryParams.get('redirectTo');
    const redirectTarget = this.validateRedirectTarget(redirectToParam);

    if (!code) {
      return;
    }

    this.isProcessingRedirect = true;
    let shouldClearParams = true;
    try {
      await this.authService.completeAuthorizationCodeGrant(code, state);
      await this.router.navigateByUrl(redirectTarget, { replaceUrl: true });
      shouldClearParams = false;
      return;
    } catch (error) {
      this.errorMessage = this.extractErrorMessage(error);
    } finally {
      this.isProcessingRedirect = false;
      if (shouldClearParams) {
        await this.clearAuthQueryParams();
      }
    }
  }

  private async clearAuthQueryParams(): Promise<void> {
    const currentUrl = this.router.url.split('?')[0];
    await this.router.navigateByUrl(currentUrl, { replaceUrl: true });
  }

  private validateRedirectTarget(target: string | null): string {
    if (!target) {
      return '/';
    }

    if (!target.startsWith('/')) {
      console.warn('[LoginComponent] Ignoring unsafe redirect target', target);
      return '/';
    }

    return target;
  }
}
