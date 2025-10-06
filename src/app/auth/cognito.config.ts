import { environment } from '../../environments/environment';

export interface CognitoConfig {
  userPoolId: string;
  clientId: string;
  domain: string;
  redirectUri: string;
  logoutUri: string;
  scope: string[];
}

export const cognitoConfig: CognitoConfig = {
  userPoolId: environment.cognito.userPoolId,
  clientId: environment.cognito.clientId,
  domain: environment.cognito.domain,
  redirectUri: environment.cognito.redirectUri,
  logoutUri: environment.cognito.logoutUri,
  scope: ['email', 'openid', 'profile']
};
