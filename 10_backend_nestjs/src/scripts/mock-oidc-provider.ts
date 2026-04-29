// @ts-ignore
import Provider from 'oidc-provider';

const configuration = {
  clients: [{
    client_id: 'risk-engine-client',
    // Mock-provider credential only; production config must inject OIDC_CLIENT_SECRET.
    client_secret: process.env.MOCK_OIDC_CLIENT_SECRET || 'local-dev-only',
    redirect_uris: ['http://localhost:3001/api/v1/auth/oidc/callback'],
    response_types: ['code'],
    grant_types: ['authorization_code'],
  }],
  pkce: {
    methods: ['S256'],
    required: () => false,
  },
  claims: {
    openid: ['sub', 'email', 'name', 'groups'],
  },
  features: {
    devInteractions: { enabled: true }, // Enables a simple UI to type "account id"
  },
  findAccount: async (ctx: any, id: string) => {
    return {
      accountId: id,
      async claims(use: any, scope: any) {
        return {
          sub: id,
          email: `${id}@riskengine.com`, // Simulating internal enterprise domain
          name: `Enterprise User (${id})`,
          // If 'admin' is typed, assign CRO_Group. Otherwise, default analyst.
          groups: id === 'admin' ? ['Risk_Managers', 'CRO_Group'] : ['Credit_Analysts'],
        };
      },
    };
  },
};

const port = 3002;
const issuer = `http://localhost:${port}`;
const oidc = new Provider(issuer, configuration);

oidc.listen(port, () => {
  console.log(`ðŸ›¡ï¸ Mock OIDC Provider listening on ${issuer}`);
  console.log(`Discovery: ${issuer}/.well-known/openid-configuration`);
  console.log('Usage: Login via the Risk Engine backend, you will be redirected here. Enter any string as Account ID to simulate a user.');
});
