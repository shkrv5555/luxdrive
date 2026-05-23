/**
 * ════════════════════════════════════════════════════════════
 * Axios Client + Interceptor-lar
 * ════════════════════════════════════════════════════════════
 *
 * Funksionallıqlar:
 *
 * 1. Request interceptor:
 *    - Hər sorğuya Authorization: Bearer <accessToken> əlavə edir
 *    - LocalStorage-dan token oxuyur
 *
 * 2. Response interceptor:
 *    - 401 (TOKEN_EXPIRED) gəldikdə avtomatik refresh edir
 *    - Refresh uğurlu olarsa orijinal sorğunu təkrar göndərir
 *    - Refresh də uğursuz olarsa istifadəçini login-ə yönəldir
 *
 * 3. Error normalization:
 *    - Server cavabını oxunaqlı `{ code, message, fields }` formatına çevirir
 */
import axios from 'axios';

// Base URL — boş olarsa Vite proxy istifadə olunur
const API_URL = import.meta.env.VITE_API_URL || '';

// ── Axios instance ──────────────────────────────────────────
const client = axios.create({
  baseURL: `${API_URL}/api`,
  timeout: 15_000,
  headers: { 'Content-Type': 'application/json' },
});

// ── Token saxlama yardımçıları ──────────────────────────────
// LocalStorage istifadə edirik — daha mürəkkəb həllər üçün
// httpOnly cookie + CSRF token istifadə etmək olar
const STORAGE_KEYS = {
  access:  'ld_accessToken',
  refresh: 'ld_refreshToken',
  user:    'ld_user',
};

export const tokenStorage = {
  getAccess:    () => localStorage.getItem(STORAGE_KEYS.access),
  getRefresh:   () => localStorage.getItem(STORAGE_KEYS.refresh),
  getUser:      () => {
    const raw = localStorage.getItem(STORAGE_KEYS.user);
    return raw ? JSON.parse(raw) : null;
  },
  set: (tokens, user) => {
    if (tokens?.accessToken)  localStorage.setItem(STORAGE_KEYS.access,  tokens.accessToken);
    if (tokens?.refreshToken) localStorage.setItem(STORAGE_KEYS.refresh, tokens.refreshToken);
    if (user)                 localStorage.setItem(STORAGE_KEYS.user,    JSON.stringify(user));
  },
  clear: () => {
    Object.values(STORAGE_KEYS).forEach((k) => localStorage.removeItem(k));
  },
};

// ── REQUEST INTERCEPTOR ─────────────────────────────────────
// Hər sorğuya token əlavə et
client.interceptors.request.use(
  (config) => {
    const token = tokenStorage.getAccess();
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// ── RESPONSE INTERCEPTOR: avtomatik token refresh ───────────
// 401 cavabında refresh cəhdi edir, sonra orijinal sorğunu təkrarlayır
let isRefreshing = false;
let refreshSubscribers = []; // refresh tamamlanana qədər gözləyənlər

function subscribeTokenRefresh(callback) {
  refreshSubscribers.push(callback);
}

function notifyRefreshed(newToken) {
  refreshSubscribers.forEach((cb) => cb(newToken));
  refreshSubscribers = [];
}

client.interceptors.response.use(
  // Uğurlu cavab — heç bir dəyişiklik
  (response) => response,

  // Xəta cavabı
  async (error) => {
    const originalRequest = error.config;
    const status = error.response?.status;
    const code = error.response?.data?.error;

    // Network/Server xətaları (no response)
    if (!error.response) {
      return Promise.reject({
        code: 'NETWORK_ERROR',
        message: 'Server cavab vermir. İnternet bağlantınızı yoxlayın.',
      });
    }

    // 401 + token müddəti bitib + təkrar deyil → refresh cəhdi
    const isExpired = status === 401 && code === 'TOKEN_EXPIRED';
    if (isExpired && !originalRequest._retry) {
      originalRequest._retry = true;

      // Eyni anda yalnız 1 refresh — digərləri gözləsin
      if (isRefreshing) {
        return new Promise((resolve) => {
          subscribeTokenRefresh((newToken) => {
            originalRequest.headers.Authorization = `Bearer ${newToken}`;
            resolve(client(originalRequest));
          });
        });
      }

      isRefreshing = true;
      try {
        const refreshToken = tokenStorage.getRefresh();
        if (!refreshToken) throw new Error('No refresh token');

        // Refresh sorğusu — interceptor-suz axios.post istifadə edirik
        const { data } = await axios.post(`${API_URL}/api/auth/refresh`, {
          refreshToken,
        });

        // Yeni tokenləri saxla
        tokenStorage.set({
          accessToken:  data.accessToken,
          refreshToken: data.refreshToken,
        });

        // Gözləyənlərə xəbər ver
        notifyRefreshed(data.accessToken);

        // Orijinal sorğunu yeni token ilə təkrarla
        originalRequest.headers.Authorization = `Bearer ${data.accessToken}`;
        return client(originalRequest);
      } catch (refreshErr) {
        // Refresh uğursuz — login-ə yönəlt
        tokenStorage.clear();
        notifyRefreshed(null);
        // App-də auth slice bunu tutub yönləndirməlidir
        window.dispatchEvent(new CustomEvent('auth:expired'));
        return Promise.reject({
          code: 'SESSION_EXPIRED',
          message: 'Sessiya bitmişdir. Yenidən daxil olun.',
        });
      } finally {
        isRefreshing = false;
      }
    }

    // Digər xətaları normalize et
    return Promise.reject({
      code:    error.response.data?.error   || 'UNKNOWN',
      message: error.response.data?.message || 'Naməlum xəta',
      fields:  error.response.data?.fields,
      status,
    });
  }
);

export default client;
