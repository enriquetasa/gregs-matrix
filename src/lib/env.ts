export type EnvValidationError = {
  variable: string;
  message: string;
};

export function collectEnvValidationErrors(): EnvValidationError[] {
  const errors: EnvValidationError[] = [];

  if (!process.env.DATABASE_URL?.trim()) {
    errors.push({
      variable: "DATABASE_URL",
      message: "DATABASE_URL must be set",
    });
  }

  const sessionSecret = process.env.SESSION_SECRET;
  if (!sessionSecret || sessionSecret.length < 32) {
    errors.push({
      variable: "SESSION_SECRET",
      message: "SESSION_SECRET must be set and at least 32 characters",
    });
  }

  return errors;
}

export function validateRequiredEnv(): void {
  const errors = collectEnvValidationErrors();
  if (errors.length === 0) {
    return;
  }

  const detail = errors
    .map((error) => `${error.variable}: ${error.message}`)
    .join("; ");
  throw new Error(`Invalid environment: ${detail}`);
}
