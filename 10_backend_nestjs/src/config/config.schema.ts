import * as Joi from 'joi';

export const configValidationSchema = Joi.object({
  // --- Core Runtime Settings ---
  NODE_ENV: Joi.string()
    .valid('development', 'production', 'test', 'provision')
    .default('development'),
  PORT: Joi.number().default(3001),
  DATABASE_URL: Joi.string().required(),
  DIRECT_URL: Joi.string().required(),
  FRONTEND_URL: Joi.string().uri().default('http://localhost:3000'),

  // --- Security Secrets ---
  JWT_SECRET: Joi.string().required().min(32),
  JWT_TTL_DEV: Joi.string().default('24h'),
  JWT_TTL_PROD: Joi.string().default('1h'),

  // --- Institutional Policy Toggles ---
  THROTTLE_LIMIT_SHORT: Joi.number().default(100),
  THROTTLE_LIMIT_SCORING: Joi.number().default(20),
  THROTTLE_LIMIT_AUTH: Joi.number().default(10),

  MFA_REQUIRED: Joi.boolean().default(false),
  SSO_FEDERATION_READY: Joi.boolean().default(true),

  // Scoring Service Integration
  SCORING_SERVICE_URL: Joi.string().uri().default('http://localhost:8000'),

  // --- SSO / OIDC Configuration ---
  OIDC_ISSUER_URL: Joi.string().uri().optional(),
  OIDC_CLIENT_ID: Joi.string().optional(),
  OIDC_CLIENT_SECRET: Joi.string().optional(),
  OIDC_ALLOWED_DOMAINS: Joi.string().default('riskengine.com,bank.local'), // Comma-separated list for auto-provisioning
});
