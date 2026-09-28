import { Platform } from 'react-native';
import * as SecureStore from 'expo-secure-store';
import type { TokenStore } from '@bhairava/api-client';

const ACCESS = 'bhairava.access';
const REFRESH = 'bhairava.refresh';

/** expo-secure-store's web module is a stub; use localStorage for Expo web. */
const webStore = {
  getItem: async (key: string) => {
    try {
      return globalThis.localStorage?.getItem(key) ?? null;
    } catch {
      return null;
    }
  },
  setItem: async (key: string, value: string) => {
    globalThis.localStorage?.setItem(key, value);
  },
  deleteItem: async (key: string) => {
    globalThis.localStorage?.removeItem(key);
  },
};

const nativeStore = {
  getItem: (key: string) => SecureStore.getItemAsync(key),
  setItem: (key: string, value: string) => SecureStore.setItemAsync(key, value),
  deleteItem: (key: string) => SecureStore.deleteItemAsync(key),
};

const store = Platform.OS === 'web' ? webStore : nativeStore;

export const secureTokenStore: TokenStore = {
  getAccessToken: () => store.getItem(ACCESS),
  getRefreshToken: () => store.getItem(REFRESH),
  setTokens: async (access, refresh) => {
    await store.setItem(ACCESS, access);
    if (refresh) await store.setItem(REFRESH, refresh);
    else await store.deleteItem(REFRESH);
  },
  clear: async () => {
    await store.deleteItem(ACCESS);
    await store.deleteItem(REFRESH);
  },
};
