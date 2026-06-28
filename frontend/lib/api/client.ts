import axios from 'axios';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';

export const apiClient = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
  // Enable sending cookies with requests (httpOnly cookies)
  withCredentials: true,
});

// Response interceptor for token refresh
apiClient.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    const requestUrl: string = originalRequest?.url || '';
    const isAuthEndpoint =
      requestUrl.includes('/auth/refresh') ||
      requestUrl.includes('/auth/login') ||
      requestUrl.includes('/auth/register');

    if (error.response?.status === 401 && !originalRequest._retry && !isAuthEndpoint) {
      originalRequest._retry = true;

      try {
        // Call refresh endpoint - refresh token is automatically sent via httpOnly cookie
        await axios.post(`${API_URL}/auth/refresh`, {}, {
          withCredentials: true,
        });

        // Retry original request - new access token will be sent automatically via cookie
        return apiClient(originalRequest);
      } catch (refreshError) {
        // Refresh échoué : rediriger vers le login UNIQUEMENT depuis une page protégée.
        // On NE redirige PAS depuis les pages publiques (landing, profils publics, signature
        // de devis) ni depuis /auth — sinon la landing publique renvoie au login sur la 401
        // du whoami d'un visiteur non connecté.
        const p =
          typeof window !== 'undefined' ? window.location.pathname : '';
        const isPublicPath =
          p === '/' ||
          p.startsWith('/auth') ||
          p.startsWith('/artisans') ||
          p.startsWith('/quote');
        if (typeof window !== 'undefined' && !isPublicPath) {
          window.location.href = '/auth/login';
        }
        return Promise.reject(refreshError);
      }
    }

    return Promise.reject(error);
  }
);

export default apiClient;
