import { createApiClient } from '@bhairava/api-client';
import { secureTokenStore } from './secureTokens';

export const tokens = secureTokenStore;
export const api = createApiClient({
  baseUrl: process.env.EXPO_PUBLIC_API_URL || 'http://localhost:4000',
  tokens: secureTokenStore,
});
