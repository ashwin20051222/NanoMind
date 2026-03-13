import { WSClient } from '../api/wsClient';
import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { GoogleGenAI } from '@google/genai';
import {
  DEFAULT_AUTH_TOKEN,
  DEFAULT_GEMINI_API_KEY,
  DEFAULT_OLLAMA_BASE_URL,
  DEFAULT_WS_URL,
  getEffectiveGeminiApiKey,
  getDefaultBrowserModel,
  hasGeminiKeyConfigured,
  normalizeSelectedModel,
  normalizeOllamaBaseUrl,
  resolveModelProfile,
  sanitizeSavedModelProfiles,
  type SavedModelProfile,
} from '../lib/runtimeConfig';

function sanitizeDevices(input: unknown): Device[] {
  if (!Array.isArray(input)) {
    return [];
  }

  return input
    .map((candidate) => {
      const device = candidate as Partial<Device>;
      if (typeof device.id !== 'string' || typeof device.name !== 'string') {
        return null;
      }

      return {
        id: device.id,
        name: device.name,
        status: device.status === 'connected' ? 'connected' : 'disconnected',
      } satisfies Device;
    })
    .filter((device): device is Device => device !== null);
}

function sanitizeSavedDevices(input: unknown): Device[] {
  return sanitizeDevices(input).map((device) => ({
    ...device,
    status: 'disconnected' as const,
  }));
}

function mergeKnownDevices(existing: Device[], liveDevices: Device[]) {
  const map = new Map<string, Device>();

  for (const device of existing) {
    map.set(device.id, { ...device, status: 'disconnected' });
  }

  for (const device of liveDevices) {
    map.set(device.id, { ...device, status: 'connected' });
  }

  return Array.from(map.values()).sort((left, right) => {
    if (left.status !== right.status) {
      return left.status === 'connected' ? -1 : 1;
    }

    return left.name.localeCompare(right.name);
  });
}

function resolveCurrentDeviceId(
  currentDeviceId: string | null,
  liveDevices: Device[],
  knownDevices: Device[]
) {
  const availableDevices = knownDevices.length > 0 ? knownDevices : liveDevices;

  if (currentDeviceId && availableDevices.some((device) => device.id === currentDeviceId)) {
    return currentDeviceId;
  }

  return (
    liveDevices.find((device) => device.status === 'connected')?.id ||
    availableDevices[0]?.id ||
    null
  );
}

export type Message = {
  request_id: string;
  text: string;
  from: 'user' | 'ai';
  status: 'pending' | 'streaming' | 'done' | 'error';
  source?: 'local' | 'cloud';
  isFinal?: boolean;
  model?: string;
  createdAt?: number;
};

export type Device = {
  id: string;
  name: string;
  status: 'connected' | 'disconnected';
};

interface NanoMindState {
  wsClient: WSClient | null;
  wsClientKey: string | null;
  edgeStatus: 'local_online' | 'local_offline' | 'cloud_fallback' | 'reconnecting' | 'connecting';
  devices: Device[];
  savedDevices: Device[];
  knownDevices: Device[];
  currentDeviceId: string | null;
  messages: Message[];
  isStreaming: boolean;
  savedModelProfiles: SavedModelProfile[];
  selectedModel: string;
  wsUrl: string;
  authToken: string;
  geminiApiKey: string;

  initWsClient: () => void;
  setConnectionConfig: (config: { wsUrl: string; authToken: string }) => void;
  resetConnectionConfig: () => void;
  setSelectedModel: (model: string) => void;
  setGeminiApiKey: (apiKey: string) => void;
  setEdgeStatus: (status: NanoMindState['edgeStatus']) => void;
  setDevices: (devices: Device[]) => void;
  upsertSavedModelProfile: (profile: SavedModelProfile) => void;
  removeSavedModelProfile: (id: string) => void;
  upsertSavedDevice: (device: { id: string; name: string }) => void;
  removeSavedDevice: (id: string) => void;
  setCurrentDevice: (id: string | null) => void;
  addMessage: (msg: Message) => void;
  updateMessage: (id: string, update: Partial<Message>) => void;
  sendMessage: (text: string) => void;
  cancelMessage: (id: string) => void;
  clearMessages: () => void;
}

export const useNanoMind = create<NanoMindState>()(
  persist(
    (set, get) => ({
      wsClient: null,
      wsClientKey: null,
      edgeStatus: 'connecting',
      devices: [],
      savedDevices: [],
      knownDevices: [],
      currentDeviceId: null,
      messages: [],
      isStreaming: false,
      savedModelProfiles: [],
      selectedModel: getDefaultBrowserModel(),
      wsUrl: DEFAULT_WS_URL,
      authToken: DEFAULT_AUTH_TOKEN,
      geminiApiKey: DEFAULT_GEMINI_API_KEY,

      setSelectedModel: (model) =>
        set((state) => ({
          selectedModel: normalizeSelectedModel(model, state.savedModelProfiles, state.geminiApiKey),
        })),
      setGeminiApiKey: (apiKey) => set({ geminiApiKey: apiKey.trim() }),

      initWsClient: () => {
        const { wsClient, wsClientKey, wsUrl, authToken } = get();
        const nextClientKey = `${wsUrl}::${authToken}`;

        if (wsClient && wsClientKey === nextClientKey) {
          return;
        }

        const previousClient = wsClient;
        const client = new WSClient(wsUrl, authToken, {
          onOpen: () => {
            if (get().wsClientKey !== nextClientKey) return;
            set({ edgeStatus: 'local_online' });
          },
          onStatus: (status: string) => {
            if (get().wsClientKey !== nextClientKey) return;
            set({ edgeStatus: status as NanoMindState['edgeStatus'] });
          },
          onMessage: (msg: any) => {
            if (get().wsClientKey !== nextClientKey) return;

            if (msg.type === 'auth_ok') {
              set((state) => {
                const devices = sanitizeDevices(msg.devices).map((device) => ({
                  ...device,
                  status: 'connected' as const,
                }));
                const knownDevices = mergeKnownDevices(state.savedDevices, devices);

                return {
                  edgeStatus: 'local_online',
                  devices,
                  knownDevices,
                  currentDeviceId: resolveCurrentDeviceId(
                    state.currentDeviceId,
                    devices,
                    knownDevices
                  ),
                };
              });
            } else if (msg.type === 'error') {
              const activeModel = resolveModelProfile(
                get().selectedModel,
                get().savedModelProfiles,
                get().geminiApiKey
              );
              const source = activeModel.provider === 'ollama' ? 'local' : 'cloud';
              get().addMessage({
                request_id: msg.request_id || `err-${Math.random().toString(36).substring(2, 9)}`,
                text: `Error: ${msg.error || 'Unknown runtime error'}`,
                from: 'ai',
                status: 'error',
                source,
                isFinal: true,
              });
              set({ isStreaming: false });
            } else if (msg.type === 'response_chunk') {
              set({ isStreaming: true });
              const messages = get().messages;
              const existing = messages.find(
                (message) => message.request_id === msg.request_id && message.from === 'ai'
              );
              
              if (existing) {
                get().updateMessage(msg.request_id, {
                  text: existing.text + msg.chunk,
                  isFinal: msg.is_final,
                  status: msg.is_final ? 'done' : 'streaming',
                  source: msg.edge_source
                });
              } else {
                get().addMessage({
                  request_id: msg.request_id,
                  text: msg.chunk,
                  from: 'ai',
                  status: msg.is_final ? 'done' : 'streaming',
                  source: msg.edge_source,
                  isFinal: msg.is_final
                });
              }
              if (msg.is_final) set({ isStreaming: false });
            } else if (msg.type === 'response_end') {
              const existing = get().messages.find(
                (message) => message.request_id === msg.request_id && message.from === 'ai'
              );
              if (existing) {
                get().updateMessage(msg.request_id, {
                  text: msg.content,
                  isFinal: true,
                  status: 'done',
                  source: msg.source
                });
              } else {
                get().addMessage({
                  request_id: msg.request_id,
                  text: msg.content,
                  from: 'ai',
                  status: 'done',
                  source: msg.source,
                  isFinal: true,
                });
              }
              set({ isStreaming: false });
            } else if (typeof msg.response === 'string') {
              get().addMessage({
                request_id: `legacy-${Math.random().toString(36).substring(2, 9)}`,
                text: msg.response,
                from: 'ai',
                status: 'done',
                source: 'local',
                isFinal: true,
              });
            }
          }
        });

        set({
          wsClient: client,
          wsClientKey: nextClientKey,
          edgeStatus: 'connecting',
          devices: [],
        });

        previousClient?.close();
      },

      setConnectionConfig: ({ wsUrl, authToken }) =>
        set({
          wsUrl: wsUrl.trim() || DEFAULT_WS_URL,
          authToken: authToken.trim() || DEFAULT_AUTH_TOKEN,
        }),

      resetConnectionConfig: () =>
        set({
          wsUrl: DEFAULT_WS_URL,
          authToken: DEFAULT_AUTH_TOKEN,
        }),

      setEdgeStatus: (status) => set({ edgeStatus: status }),
      setDevices: (devices) =>
        set((state) => ({
          devices,
          knownDevices: mergeKnownDevices(state.savedDevices, devices),
          currentDeviceId: resolveCurrentDeviceId(
            state.currentDeviceId,
            devices,
            mergeKnownDevices(state.savedDevices, devices)
          ),
        })),
      upsertSavedModelProfile: (profile) =>
        set((state) => {
          const savedModelProfiles = sanitizeSavedModelProfiles([
            ...state.savedModelProfiles.filter((item) => item.id !== profile.id),
            {
              ...profile,
              apiKey: profile.apiKey?.trim() || '',
              baseUrl:
                profile.provider === 'ollama'
                  ? normalizeOllamaBaseUrl(profile.baseUrl || DEFAULT_OLLAMA_BASE_URL)
                  : '',
            },
          ]);

          return {
            savedModelProfiles,
            selectedModel: normalizeSelectedModel(
              state.selectedModel,
              savedModelProfiles,
              state.geminiApiKey
            ),
          };
        }),
      removeSavedModelProfile: (id) =>
        set((state) => {
          const savedModelProfiles = state.savedModelProfiles.filter((profile) => profile.id !== id);
          return {
            savedModelProfiles,
            selectedModel: normalizeSelectedModel(
              state.selectedModel === id ? undefined : state.selectedModel,
              savedModelProfiles,
              state.geminiApiKey
            ),
          };
        }),
      upsertSavedDevice: ({ id, name }) =>
        set((state) => {
          const nextId = id.trim();
          const nextName = name.trim();

          if (!nextId || !nextName) {
            return state;
          }

          const savedDevices = sanitizeSavedDevices([
            ...state.savedDevices.filter((device) => device.id !== nextId),
            { id: nextId, name: nextName, status: 'disconnected' },
          ]);
          const knownDevices = mergeKnownDevices(savedDevices, state.devices);

          return {
            savedDevices,
            knownDevices,
            currentDeviceId: resolveCurrentDeviceId(
              state.currentDeviceId || nextId,
              state.devices,
              knownDevices
            ),
          };
        }),
      removeSavedDevice: (id) =>
        set((state) => {
          const nextId = id.trim();
          const savedDevices = state.savedDevices.filter((device) => device.id !== nextId);
          const knownDevices = mergeKnownDevices(savedDevices, state.devices);

          return {
            savedDevices,
            knownDevices,
            currentDeviceId: resolveCurrentDeviceId(
              state.currentDeviceId === nextId ? null : state.currentDeviceId,
              state.devices,
              knownDevices
            ),
          };
        }),
      setCurrentDevice: (id) => set({ currentDeviceId: id }),
      addMessage: (msg) =>
        set((state) => ({
          messages: [
            ...state.messages,
            {
              ...msg,
              createdAt: msg.createdAt ?? Date.now(),
            },
          ],
        })),
      updateMessage: (id, update) => set((state) => ({
        messages: state.messages.map(m => m.request_id === id ? { ...m, ...update } : m)
      })),

      sendMessage: async (text) => {
        const {
          wsClient,
          currentDeviceId,
          edgeStatus,
          selectedModel,
          devices,
          geminiApiKey,
          savedModelProfiles,
        } = get();
        const userReqId = `usr-${Math.random().toString(36).substring(2, 9)}`;
        const responseReqId = `res-${Math.random().toString(36).substring(2, 9)}`;
        const activeModelProfile = resolveModelProfile(
          selectedModel,
          savedModelProfiles,
          geminiApiKey
        );

        get().addMessage({
          request_id: userReqId,
          text,
          from: 'user',
          status: 'done'
        });

        const fullPrompt = text;

        if (edgeStatus === 'local_online' && wsClient) {
          const activeLiveDevice = currentDeviceId
            ? devices.find((device) => device.id === currentDeviceId && device.status === 'connected')
            : devices.find((device) => device.status === 'connected') || devices[0];

          if (currentDeviceId && !activeLiveDevice) {
            get().addMessage({
              request_id: responseReqId,
              text: 'Error: The selected device is not currently connected to the gateway.',
              from: 'ai',
              status: 'error',
              source: 'local',
              isFinal: true,
            });
            return;
          }

          const userMsg = {
            type: 'query',
            request_id: responseReqId,
            device_id: activeLiveDevice?.id,
            payload: {
              mode: 'chat',
              text: fullPrompt,
              stream: true,
              meta: { priority: 'normal' }
            }
          };
          wsClient.send(userMsg);
        } else {
          const fallbackSource = activeModelProfile.provider === 'ollama' ? 'local' : 'cloud';
          get().addMessage({
            request_id: responseReqId,
            text: '',
            from: 'ai',
            status: 'streaming',
            source: fallbackSource,
            model: activeModelProfile.name,
          });
          set({ isStreaming: true });

          try {
            if (activeModelProfile.provider === 'gemini') {
              const apiKey = getEffectiveGeminiApiKey(activeModelProfile, geminiApiKey);
              if (!hasGeminiKeyConfigured(apiKey)) {
                throw new Error(
                  `Gemini API key is missing for ${activeModelProfile.name}. Add it in Config before using this model.`
                );
              }
              
              const ai = new GoogleGenAI({ apiKey });
              const responseStream = await ai.models.generateContentStream({
                model: activeModelProfile.modelId,
                contents: fullPrompt,
              });

              let fullText = '';
              for await (const chunk of responseStream) {
                fullText += chunk.text;
                get().updateMessage(responseReqId, { text: fullText });
              }
              get().updateMessage(responseReqId, { status: 'done', isFinal: true });
            } else if (activeModelProfile.provider === 'ollama') {
              const response = await fetch(
                `${normalizeOllamaBaseUrl(activeModelProfile.baseUrl)}/api/generate`,
                {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  model: activeModelProfile.modelId,
                  prompt: fullPrompt,
                  stream: true,
                }),
              }
              );

              if (!response.ok) {
                throw new Error(
                  `Ollama connection failed for ${activeModelProfile.name}: ${response.statusText}.`
                );
              }

              const reader = response.body?.getReader();
              const decoder = new TextDecoder();
              let fullText = '';

              if (reader) {
                while (true) {
                  const { done, value } = await reader.read();
                  if (done) break;
                  
                  const chunk = decoder.decode(value, { stream: true });
                  const lines = chunk.split('\n').filter(line => line.trim() !== '');
                  
                  for (const line of lines) {
                    try {
                      const parsed = JSON.parse(line);
                      if (parsed.response) {
                        fullText += parsed.response;
                        get().updateMessage(responseReqId, { text: fullText });
                      }
                    } catch (e) {
                      console.error('Failed to parse Ollama chunk', e);
                    }
                  }
                }
              }
              get().updateMessage(responseReqId, { status: 'done', isFinal: true, source: 'local' });
            }
          } catch (error: any) {
            get().updateMessage(responseReqId, {
              text: `Error: ${error.message}`,
              status: 'error',
              isFinal: true,
              source: fallbackSource,
            });
          } finally {
            set({ isStreaming: false });
          }
        }
      },

      cancelMessage: (id) => {
        const { wsClient } = get();
        if (!wsClient) return;
        
        wsClient.send({
          type: 'cancel',
          request_id: id
        });
        
        get().updateMessage(id, { status: 'error', isFinal: true });
        set({ isStreaming: false });
      },

      clearMessages: () => set({ messages: [], isStreaming: false }),
    }),
    {
      name: 'nanomind-runtime-v2',
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({
        wsUrl: state.wsUrl,
        authToken: state.authToken,
        geminiApiKey: state.geminiApiKey,
        savedModelProfiles: state.savedModelProfiles,
        selectedModel: state.selectedModel,
        savedDevices: state.savedDevices,
        currentDeviceId: state.currentDeviceId,
      }),
      merge: (persistedState, currentState) => {
        const persisted = (persistedState as Partial<NanoMindState> | undefined) ?? {};
        const savedDevices = sanitizeSavedDevices(
          persisted.savedDevices || persisted.knownDevices
        );
        const savedModelProfiles = sanitizeSavedModelProfiles(persisted.savedModelProfiles);
        const knownDevices = mergeKnownDevices(savedDevices, []);
        const geminiApiKey = persisted.geminiApiKey?.trim() || DEFAULT_GEMINI_API_KEY;

        return {
          ...currentState,
          ...persisted,
          wsUrl: persisted.wsUrl?.trim() || DEFAULT_WS_URL,
          authToken: persisted.authToken?.trim() || DEFAULT_AUTH_TOKEN,
          geminiApiKey,
          savedModelProfiles,
          savedDevices,
          knownDevices,
          currentDeviceId: resolveCurrentDeviceId(
            persisted.currentDeviceId || null,
            [],
            knownDevices
          ),
          selectedModel: persisted.selectedModel
            ? normalizeSelectedModel(
                persisted.selectedModel,
                savedModelProfiles,
                geminiApiKey
              )
            : getDefaultBrowserModel(geminiApiKey),
        };
      },
    }
  )
);
