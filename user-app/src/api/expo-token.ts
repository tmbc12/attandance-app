import apiClient from './client';

export interface SaveTokenPayload {
    userId: string;
    token: string;
}

export const ExpoTokenAPI = {
  // Save Created Token
  saveToken: async (data: SaveTokenPayload) => {
    const response = await apiClient.post('/api/expo-token', data);
    return response.data;
  },
};
