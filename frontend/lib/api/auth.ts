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

export interface MeResponse {
  userId: string;
  id: string;
  email: string;
  role: 'CLIENT' | 'ARTISAN' | 'ADMIN';
  firstName: string;
  lastName: string;
  phone: string | null;
  emailVerified: boolean;
  phoneVerified: boolean;
}

export interface PhoneStatusResponse {
  hasPhone: boolean;
  phone: string | null;
  verified: boolean;
  maskedPhone: string | null;
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

  // Utilisateur courant (inclut emailVerified, phoneVerified, phone) — utilisé par le mur d'onboarding.
  getMe: async (): Promise<MeResponse> => {
    const response = await apiClient.get('/auth/me');
    return response.data;
  },

  // Vérification email via le token du lien reçu par email (endpoint public).
  verifyEmail: async (token: string) => {
    const response = await apiClient.post('/auth/verify-email', { token });
    return response.data;
  },

  // Renvoi de l'email de vérification (utilisateur connecté).
  resendVerification: async () => {
    const response = await apiClient.post('/auth/resend-verification');
    return response.data;
  },

  // Envoi du code SMS au téléphone de l'utilisateur connecté.
  // NB: le backend attend le champ `phone` (SendPhoneCodeDto).
  sendPhoneCode: async (phone: string) => {
    const response = await apiClient.post('/auth/phone/send-code-authenticated', {
      phone,
    });
    return response.data;
  },

  // Vérification du code SMS. Le backend (VerifyPhoneCodeDto) exige `phone` ET `code`.
  verifyPhoneCode: async (code: string, phone: string) => {
    const response = await apiClient.post('/auth/phone/verify-code-authenticated', {
      phone,
      code,
    });
    return response.data;
  },

  phoneStatus: async (): Promise<PhoneStatusResponse> => {
    const response = await apiClient.get('/auth/phone/status');
    return response.data;
  },
};
