export const awsConfig = {
  Auth: {
    Cognito: {
      userPoolId: 'eu-central-1_wBTAQOGSU',
      userPoolClientId: '37tec225790ph4heo7t7o2500u',
      loginWith: {
        oauth: {
          domain: 'debtsettler-prod-vilkue82.auth.eu-central-1.amazoncognito.com',
          scopes: ['email', 'openid', 'profile'],
          redirectSignIn: [
            'http://localhost:5173/callback',
            'https://debtsettler.mihaibercea.com/callback'
          ],
          redirectSignOut: [
            'http://localhost:5173',
            'https://debtsettler.mihaibercea.com'
          ],
          responseType: 'code' as const,
        },
      },
    },
  },
};

export const apiConfig = {
  endpoint: 'https://eib7e1j2z8.execute-api.eu-central-1.amazonaws.com/api',
};
