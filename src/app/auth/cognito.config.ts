export interface CognitoConfig {
  userPoolId: string;
  clientId: string;
  domain: string;
  redirectUri: string;
  logoutUri: string;
  scope: string[];
}

export const cognitoConfig: CognitoConfig = {
  userPoolId: 'sa-east-1_DA5LPqMRP',
  clientId: '1he1mnplnk0vgkjmlr7sq58l50',
  domain: 'https://hammocker-domain.auth.sa-east-1.amazoncognito.com',
  redirectUri: 'http://localhost:4200/login',
  logoutUri: 'http://localhost:4200',
  scope: ['email', 'openid', 'profile']
};
