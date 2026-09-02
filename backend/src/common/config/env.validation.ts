import * as Joi from 'joi';

// .unknown(true) is required: process.env always contains OS/runtime vars
// (PATH, HOME, NODE_ENV, npm_*, ...) that we don't list here. Joi.object()
// rejects unlisted keys by default - without .unknown(true), ConfigModule's
// validation would fail on every real machine before the app ever starts,
// regardless of whether DATABASE_URL/JWT_SECRET are set correctly.
export const envValidationSchema = Joi.object({
  DATABASE_URL: Joi.string().required(),
  JWT_SECRET: Joi.string().min(32).required(),
  JWT_EXPIRES_IN: Joi.string().default('7d'),

  PORT: Joi.number().default(3001),
  ALLOWED_ORIGINS: Joi.string().optional(),

  REDIS_URL: Joi.string().optional(),
  REDIS_HOST: Joi.string().optional(),

  GOOGLE_OAUTH_CLIENT_ID: Joi.string().required(),
  GOOGLE_SERVICE_ACCOUNT_JSON: Joi.string().optional(),
  DRIVE_ROOT_FOLDER_ID: Joi.string().optional(),

  RAZORPAY_KEY_ID: Joi.string().optional(),
  RAZORPAY_KEY_SECRET: Joi.string().optional(),
  STRIPE_SECRET_KEY: Joi.string().optional(),

  LOG_RETENTION_DAYS: Joi.number().default(180),
  LOG_ARCHIVE_MODE: Joi.boolean().default(false),
  LOG_LEGAL_HOLD: Joi.boolean().default(false),
}).unknown(true);
