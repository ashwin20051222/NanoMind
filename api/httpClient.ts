import { DEFAULT_WS_URL } from '../lib/runtimeConfig';

export type IntegrationState = {
  connected: boolean;
  configured: boolean;
  connectable: boolean;
  state: string;
  scopes: string[];
  note: string;
};

export type IntegrationMap = {
  google: IntegrationState;
  meta: IntegrationState;
};

export type PairingStatus = {
  supported: boolean;
  state: string;
  token: string | null;
  qr_text: string | null;
  expires_in: number | null;
  note: string;
};

function resolveApiBaseUrl(wsUrl = DEFAULT_WS_URL) {
  const fallback =
    typeof window !== 'undefined' ? window.location.origin : 'http://127.0.0.1:3000';

  if (!wsUrl) {
    return fallback;
  }

  try {
    const url = new URL(wsUrl);
    const protocol = url.protocol === 'wss:' ? 'https:' : 'http:';
    return `${protocol}//${url.host}`;
  } catch {
    return fallback;
  }
}

async function requestJson<T>(path: string, token: string, wsUrl?: string): Promise<T> {
  const response = await fetch(`${resolveApiBaseUrl(wsUrl)}${path}`, {
    method: 'GET',
    headers: {
      'x-auth-token': token,
      Accept: 'application/json',
    },
  });

  if (!response.ok) {
    throw new Error(`${path} returned ${response.status}`);
  }

  return response.json() as Promise<T>;
}

export const fetchIntegrations = async (token: string, wsUrl?: string): Promise<IntegrationMap> =>
  requestJson<IntegrationMap>('/integrations', token, wsUrl);

export const fetchPairingStatus = async (token: string, wsUrl?: string): Promise<PairingStatus> =>
  requestJson<PairingStatus>('/pairing/status', token, wsUrl);
