export default () => ({
  environment: process.env.NODE_ENV || 'development',
  port: parseInt(process.env.PORT || '3001', 10),
  database: {
    url: process.env.DATABASE_URL!,
    directUrl: process.env.DIRECT_URL!,
  },
  auth: {
    jwtSecret: process.env.JWT_SECRET!,
    // Environment-aware session TTL
    ttl: process.env.NODE_ENV === 'production'
      ? process.env.JWT_TTL_PROD || '1h'
      : process.env.JWT_TTL_DEV || '24h',
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
  },
  oidc: {
    issuerUrl: process.env.OIDC_ISSUER_URL || 'http://localhost:3002', // fallback to mock provider
    clientId: process.env.OIDC_CLIENT_ID || 'risk-engine-client',
    clientSecret: process.env.OIDC_CLIENT_SECRET || '',
    allowedDomains: (process.env.OIDC_ALLOWED_DOMAINS || 'riskengine.com,bank.local').split(',').map(d => d.trim()),
  }
});
