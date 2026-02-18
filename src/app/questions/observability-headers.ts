import { HttpHeaders } from '@angular/common/http';
import { environment } from '../../environments/environment';

type EnvironmentWithOptionalObservability = typeof environment & {
  envName?: string;
  environmentName?: string;
  appVersion?: string;
};

export function buildObservabilityHeaders(baseHeaders: Record<string, string> = {}): HttpHeaders {
  const envConfig = environment as EnvironmentWithOptionalObservability;

  const headers: Record<string, string> = {
    ...baseHeaders,
    'x-correlation-id': normalizeHeaderValue(baseHeaders['x-correlation-id']) || createCorrelationId(),
    'x-env': normalizeHeaderValue(baseHeaders['x-env']) || resolveEnvironment(envConfig),
    'x-app-version': normalizeHeaderValue(baseHeaders['x-app-version']) || resolveAppVersion(envConfig),
  };

  return new HttpHeaders(headers);
}

function resolveEnvironment(envConfig: EnvironmentWithOptionalObservability): string {
  const explicit = normalizeHeaderValue(envConfig.envName || envConfig.environmentName);
  if (explicit) {
    return explicit;
  }

  const apiPath = extractApiPath(environment.apiBaseUrl);
  const stage = apiPath.split('/').filter(Boolean)[0];
  if (stage === 'dev' || stage === 'hml' || stage === 'prod') {
    return stage;
  }

  return 'dev';
}

function resolveAppVersion(envConfig: EnvironmentWithOptionalObservability): string {
  return normalizeHeaderValue(envConfig.appVersion) || 'unknown';
}

function createCorrelationId(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }

  const timestamp = Date.now().toString(16);
  const random = Math.random().toString(16).slice(2, 14);
  return `${timestamp}-${random}`;
}

function extractApiPath(url: string): string {
  try {
    const base = typeof window !== 'undefined' ? window.location.origin : 'http://localhost';
    return new URL(url, base).pathname;
  } catch {
    return '';
  }
}

function normalizeHeaderValue(value: string | undefined): string {
  return (value || '').trim();
}
