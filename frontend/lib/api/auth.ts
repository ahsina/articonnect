import apiClient from './client';

export interface RegisterData {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  phone?: string;
  role?: 'CLIENT' | 'ARTISAN';
}

export interface LoginData {
  email: string;
  password: string;
  twoFactorToken?: string;
}

export interface ChangePasswordData {
  currentPassword: string;
  newPassword: string;
}

export interface Enable2FAResponse {
  secret: string;
  qrCode: string;
}

export interface Verify2FAResponse {
  message: string;
  backupCodes?: string[];
}

export const authApi = {
  register: async (data: RegisterData) => {
    const response = await apiClient.post('/auth/register', data);
    return response.data;
  },

  login: async (data: LoginData) => {
    const response = await apiClient.post('/auth/login', data);
    return response.data;
  },

  logout: async () => {
    const response = await apiClient.post('/auth/logout');
    // Backend clears httpOnly cookies automatically
    return response.data;
  },

  getProfile: async () => {
    const response = await apiClient.post('/auth/me');
    return response.data;
  },

  changePassword: async (data: ChangePasswordData) => {
    const response = await apiClient.post('/auth/change-password', data);
    return response.data;
  },

  forgotPassword: async (email: string) => {
    const response = await apiClient.post('/auth/forgot-password', { email });
    return response.data;
  },

  resetPassword: async (token: string, newPassword: string) => {
    const response = await apiClient.post('/auth/reset-password', {
      token,
      newPassword,
    });
    return response.data;
  },

  enable2FA: async (password: string): Promise<Enable2FAResponse> => {
    const response = await apiClient.post('/auth/2fa/enable', { password });
    return response.data;
  },

  verify2FA: async (token: string): Promise<Verify2FAResponse> => {
    const response = await apiClient.post('/auth/2fa/verify', { token });
    return response.data;
  },

  disable2FA: async (password: string, token: string) => {
    const response = await apiClient.post('/auth/2fa/disable', {
      password,
      token,
    });
    return response.data;
  },
};
