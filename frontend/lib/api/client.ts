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
        // Refresh échoué : rediriger vers le login UNIQUEMENT si on n'y est pas déjà,
        // sinon boucle infinie (la page login re-vérifie le profil → 401 → refresh → redirect…).
        if (
          typeof window !== 'undefined' &&
          !window.location.pathname.startsWith('/auth')
        ) {
          window.location.href = '/auth/login';
        }
        return Promise.reject(refreshError);
      }
    }

    return Promise.reject(error);
  }
);

export default apiClient;
