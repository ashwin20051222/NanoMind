export const DEFAULT_WS_URL = process.env.NEXT_PUBLIC_WS_URL || 'ws://localhost:3001/assistant';
export const DEFAULT_AUTH_TOKEN =
  process.env.NEXT_PUBLIC_AUTH_TOKEN || 'super_secret_token_123';
export const DEFAULT_GEMINI_API_KEY = process.env.NEXT_PUBLIC_GEMINI_API_KEY || '';
export const DEFAULT_OLLAMA_BASE_URL =
  process.env.NEXT_PUBLIC_OLLAMA_URL || 'http://localhost:11434';
export const DEFAULT_OLLAMA_MODEL_ID = 'llama3';
export const DEFAULT_GEMINI_MODEL_ID = 'gemini-3.1-flash-preview';

export const MODEL_LABELS = {
  gemini: 'Google Gemini 3.1',
  ollama: 'Local Ollama',
} as const;

export const BUILTIN_MODEL_IDS = {
  gemini: 'gemini-default',
  ollama: 'ollama-default',
} as const;

export type ModelProvider = 'ollama' | 'gemini';

export type SavedModelProfile = {
  id: string;
  name: string;
  provider: ModelProvider;
  modelId: string;
  apiKey?: string;
  baseUrl?: string;
};

export type ModelProfile = SavedModelProfile & {
  builtIn: boolean;
};

export type ModelOption = {
  value: string;
  label: string;
  provider: ModelProvider;
  builtIn: boolean;
  meta: string;
};

export function hasGeminiKeyConfigured(geminiApiKey = DEFAULT_GEMINI_API_KEY) {
  return Boolean(geminiApiKey.trim());
}

export function normalizeOllamaBaseUrl(baseUrl = DEFAULT_OLLAMA_BASE_URL) {
  const normalized = baseUrl.trim().replace(/\/+$/, '');
  return normalized || DEFAULT_OLLAMA_BASE_URL;
}

export function sanitizeSavedModelProfiles(input: unknown): SavedModelProfile[] {
  if (!Array.isArray(input)) {
    return [];
  }

  const sanitized = input.map((candidate) => {
      const profile = candidate as Partial<SavedModelProfile>;
      const id = typeof profile.id === 'string' ? profile.id.trim() : '';
      const name = typeof profile.name === 'string' ? profile.name.trim() : '';
      const modelId = typeof profile.modelId === 'string' ? profile.modelId.trim() : '';
      const provider = profile.provider === 'gemini' ? 'gemini' : profile.provider === 'ollama' ? 'ollama' : null;

      if (!id || !name || !modelId || !provider) {
        return null;
      }

      const normalized: SavedModelProfile = {
        id,
        name,
        provider,
        modelId,
        apiKey: typeof profile.apiKey === 'string' ? profile.apiKey.trim() : '',
        baseUrl:
          provider === 'ollama'
            ? normalizeOllamaBaseUrl(
                typeof profile.baseUrl === 'string' ? profile.baseUrl : DEFAULT_OLLAMA_BASE_URL
              )
            : '',
      };

      return normalized;
    });

  return sanitized.filter((profile): profile is SavedModelProfile => profile !== null);
}

export function getBuiltinModelProfiles(
  geminiApiKey = DEFAULT_GEMINI_API_KEY
): ModelProfile[] {
  return [
    {
      id: BUILTIN_MODEL_IDS.ollama,
      name: MODEL_LABELS.ollama,
      provider: 'ollama',
      modelId: DEFAULT_OLLAMA_MODEL_ID,
      baseUrl: DEFAULT_OLLAMA_BASE_URL,
      builtIn: true,
    },
    {
      id: BUILTIN_MODEL_IDS.gemini,
      name: MODEL_LABELS.gemini,
      provider: 'gemini',
      modelId: DEFAULT_GEMINI_MODEL_ID,
      apiKey: geminiApiKey.trim(),
      builtIn: true,
    },
  ];
}

export function getAllModelProfiles(
  savedModelProfiles: SavedModelProfile[] = [],
  geminiApiKey = DEFAULT_GEMINI_API_KEY
): ModelProfile[] {
  return [
    ...getBuiltinModelProfiles(geminiApiKey),
    ...sanitizeSavedModelProfiles(savedModelProfiles).map((profile) => ({
      ...profile,
      builtIn: false,
    })),
  ];
}

export function getAvailableModelOptions(
  savedModelProfiles: SavedModelProfile[] = [],
  geminiApiKey = DEFAULT_GEMINI_API_KEY
): ModelOption[] {
  return getAllModelProfiles(savedModelProfiles, geminiApiKey).map((profile) => ({
    value: profile.id,
    label: profile.name,
    provider: profile.provider,
    builtIn: profile.builtIn,
    meta: profile.modelId,
  }));
}

export function getDefaultBrowserModel(geminiApiKey = DEFAULT_GEMINI_API_KEY): string {
  return hasGeminiKeyConfigured(geminiApiKey)
    ? BUILTIN_MODEL_IDS.gemini
    : BUILTIN_MODEL_IDS.ollama;
}

export function normalizeSelectedModel(
  model: string | undefined,
  savedModelProfiles: SavedModelProfile[] = [],
  geminiApiKey = DEFAULT_GEMINI_API_KEY
): string {
  if (model === 'gemini') {
    return BUILTIN_MODEL_IDS.gemini;
  }

  if (model === 'ollama') {
    return BUILTIN_MODEL_IDS.ollama;
  }

  if (typeof model === 'string') {
    const profiles = getAllModelProfiles(savedModelProfiles, geminiApiKey);
    if (profiles.some((profile) => profile.id === model)) {
      return model;
    }
  }

  return getDefaultBrowserModel(geminiApiKey);
}

export function resolveModelProfile(
  model: string | undefined,
  savedModelProfiles: SavedModelProfile[] = [],
  geminiApiKey = DEFAULT_GEMINI_API_KEY
): ModelProfile {
  const profiles = getAllModelProfiles(savedModelProfiles, geminiApiKey);
  const normalized = normalizeSelectedModel(model, savedModelProfiles, geminiApiKey);

  return (
    profiles.find((profile) => profile.id === normalized) ||
    profiles.find((profile) => profile.id === BUILTIN_MODEL_IDS.ollama) ||
    profiles[0]
  );
}

export function getEffectiveGeminiApiKey(
  profile: Pick<ModelProfile, 'provider' | 'apiKey'>,
  defaultGeminiApiKey = DEFAULT_GEMINI_API_KEY
) {
  if (profile.provider !== 'gemini') {
    return '';
  }

  return profile.apiKey?.trim() || defaultGeminiApiKey.trim();
}
