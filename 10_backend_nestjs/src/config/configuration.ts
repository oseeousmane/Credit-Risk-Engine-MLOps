export default () => ({
  environment: process.env.NODE_ENV || 'development',
  port: parseInt(process.env.PORT || '3001', 10),
  database: {
    url: process.env.DATABASE_URL!,
    directUrl: process.env.DIRECT_URL!,
  },
  auth: {
    jwtSecret: process.env.JWT_SECRET!,
    sessionSecret: process.env.SESSION_SECRET!,
    refreshSecret: process.env.REFRESH_SECRET!,
    ttl: process.env.NODE_ENV === 'production'
      ? process.env.JWT_TTL_PROD || '15m'
      : process.env.JWT_TTL_DEV || '24h',
    refreshTtl: process.env.REFRESH_TTL || '7d',
    frontendUrl: process.env.FRONTEND_URL || 'http://localhost:3000',
  },
  security: {
    mfaRequired: process.env.MFA_REQUIRED === 'true',
    federationReady: process.env.SSO_FEDERATION_READY === 'true',
    throttling: {
      short: parseInt(process.env.THROTTLE_LIMIT_SHORT || '100', 10),
      scoring: parseInt(process.env.THROTTLE_LIMIT_SCORING || '20', 10),
      auth: parseInt(process.env.THROTTLE_LIMIT_AUTH || '10', 10),
    }
  },
  integrations: {
    scoringServiceUrl: process.env.SCORING_SERVICE_URL || 'http://localhost:8000',
    scoringApiKey: process.env.SCORING_API_KEY || '',
    momoLiveMode: process.env.MOMO_LIVE_MODE === 'true',
  },
  oidc: {
    issuerUrl: process.env.OIDC_ISSUER_URL || 'http://localhost:3002', // fallback to mock provider
    clientId: process.env.OIDC_CLIENT_ID || 'risk-engine-client',
    clientSecret: process.env.OIDC_CLIENT_SECRET || '',
    callbackUrl: process.env.OIDC_CALLBACK_URL || 'http://localhost:3001/api/v1/auth/oidc/callback',
    allowedDomains: 'OIDC_ALLOWED_DOMAINS' in process.env
      ? (process.env.OIDC_ALLOWED_DOMAINS || '').split(',').map(d => d.trim()).filter(Boolean)
      : ['riskengine.com', 'bank.local'],
  }
});
