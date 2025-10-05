import { Injectable } from '@angular/core';
import {
  AuthenticationDetails,
  CognitoUser,
  CognitoUserPool
} from 'amazon-cognito-identity-js';
import { cognitoConfig } from './cognito.config';

@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly userPool = new CognitoUserPool({
    UserPoolId: cognitoConfig.userPoolId,
    ClientId: cognitoConfig.clientId
  });

  signInWithEmail(email: string, password: string): Promise<void> {
    return new Promise((resolve, reject) => {
      const authenticationDetails = new AuthenticationDetails({
        Username: email,
        Password: password
      });

      const user = new CognitoUser({
        Username: email,
        Pool: this.userPool
      });

      user.authenticateUser(authenticationDetails, {
        onSuccess: () => resolve(),
        onFailure: (err) => reject(err)
      });
    });
  }

  signInWithGoogle(): void {
    const authorizeUrl = this.buildAuthorizeUrl('Google');
    window.location.assign(authorizeUrl);
  }

  signOut(): void {
    const logoutUrl = `${cognitoConfig.domain}/logout?client_id=${cognitoConfig.clientId}` +
      `&logout_uri=${encodeURIComponent(cognitoConfig.logoutUri)}`;
    window.location.assign(logoutUrl);
  }

  private buildAuthorizeUrl(identityProvider?: string): string {
    const baseUrl = `${cognitoConfig.domain}/oauth2/authorize`;
    const params = new URLSearchParams({
      client_id: cognitoConfig.clientId,
      response_type: 'code',
      redirect_uri: cognitoConfig.redirectUri,
      scope: cognitoConfig.scope.join(' ')
    });

    if (identityProvider) {
      params.append('identity_provider', identityProvider);
    }

    return `${baseUrl}?${params.toString()}`;
  }
}
