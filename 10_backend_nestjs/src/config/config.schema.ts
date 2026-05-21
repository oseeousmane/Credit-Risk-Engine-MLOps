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
  SESSION_SECRET: Joi.string().required().min(32),
  REFRESH_SECRET: Joi.string().required().min(32).invalid(Joi.ref('JWT_SECRET')),
  JWT_TTL_DEV: Joi.string().default('24h'),
  JWT_TTL_PROD: Joi.string().default('15m'),
  REFRESH_TTL: Joi.string().default('7d'),

  // --- Institutional Policy Toggles ---
  THROTTLE_LIMIT_SHORT: Joi.number().default(100),
  THROTTLE_LIMIT_SCORING: Joi.number().default(20),
  THROTTLE_LIMIT_AUTH: Joi.number().default(10),

  MFA_REQUIRED: Joi.boolean().default(false),
  SSO_FEDERATION_READY: Joi.boolean().default(true),

  // Scoring Service Integration
  SCORING_SERVICE_URL: Joi.string().uri().default('http://localhost:8000'),
  // API key sent in X-Api-Key header to authenticate NestJS → Python calls.
  // Required in production. If absent, Python warns and allows (dev mode only).
  SCORING_API_KEY: Joi.string().optional(),

  // --- SSO / OIDC Configuration ---
  OIDC_ISSUER_URL: Joi.string().uri().optional(),
  OIDC_CLIENT_ID: Joi.string().optional(),
  OIDC_CLIENT_SECRET: Joi.string().optional(),
  OIDC_CALLBACK_URL: Joi.string().uri().optional(),
  OIDC_ALLOWED_DOMAINS: Joi.string().allow('').default('riskengine.com,bank.local'), // Comma-separated list for auto-provisioning; empty string = no SSO-gating in dev

  // --- Microfinance Integration ---
  MOMO_LIVE_MODE: Joi.boolean().default(false),
});
