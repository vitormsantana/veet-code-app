export const environment = {
  production: false,
  apiBaseUrl: 'https://29nac9o231.execute-api.sa-east-1.amazonaws.com/dev',
  cognito: {
    userPoolId: 'sa-east-1_DA5LPqMRP',
    clientId: '1he1mnplnk0vgkjmlr7sq58l50',
    domain: 'https://hammocker-domain.auth.sa-east-1.amazoncognito.com',
    redirectUri: 'http://localhost:4200/login',
    logoutUri: 'http://localhost:4200'
  }
};
