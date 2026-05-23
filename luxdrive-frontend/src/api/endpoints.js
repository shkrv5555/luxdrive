/**
 * ════════════════════════════════════════════════════════════
 * API Endpoint-ləri — Hamısı tək yerdə
 * ════════════════════════════════════════════════════════════
 *
 * Komponentlərdən birbaşa axios çağırmaq əvəzinə bu modulları
 * istifadə edirik — backend dəyişəndə yalnız burada yenilənir.
 */
import client from './client.js';

// ── AUTH ───────────────────────────────────────────────────
export const authAPI = {
  register:    (data) => client.post('/auth/register', data),
  login:       (data) => client.post('/auth/login', data),
  adminLogin:  (data) => client.post('/auth/admin-login', data),
  logout:      (refreshToken) => client.post('/auth/logout', { refreshToken }),
  me:          ()     => client.get('/auth/me'),
};

// ── USERS ──────────────────────────────────────────────────
export const usersAPI = {
  getProfile:     ()     => client.get('/users/profile'),
  updateProfile:  (data) => client.put('/users/profile', data),
  changePassword: (data) => client.put('/users/password', data),
  uploadAvatar:   (file) => {
    const fd = new FormData();
    fd.append('avatar', file);
    return client.post('/users/avatar', fd, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
  },
  deleteAccount:  () => client.delete('/users/profile'),
};

// ── CARS ───────────────────────────────────────────────────
export const carsAPI = {
  list:    (params) => client.get('/cars', { params }),
  get:     (id)     => client.get(`/cars/${id}`),
  create:  (data)   => client.post('/cars', data),
  update:  (id, data) => client.put(`/cars/${id}`, data),
  remove:  (id)     => client.delete(`/cars/${id}`),
  setAvailability: (id, isAvailable) =>
    client.patch(`/cars/${id}/availability`, { isAvailable }),
  checkAvailability: (id, startDate, endDate) =>
    client.get(`/cars/${id}/availability`, { params: { startDate, endDate } }),
};

// ── BOOKINGS ───────────────────────────────────────────────
export const bookingsAPI = {
  create:           (data) => client.post('/bookings', data),
  myBookings:       (params) => client.get('/bookings/my', { params }),
  incoming:         (params) => client.get('/bookings/renter/incoming', { params }),
  get:              (id)   => client.get(`/bookings/${id}`),
  cancel:           (id)   => client.patch(`/bookings/${id}/cancel`),
  adminAll:         (params) => client.get('/bookings/admin/all', { params }),
};

// ── REVIEWS ────────────────────────────────────────────────
export const reviewsAPI = {
  byCar:    (carId, params) => client.get(`/reviews/car/${carId}`, { params }),
  myReviews: ()    => client.get('/reviews/my'),
  create:   (data) => client.post('/reviews', data),
  remove:   (id)   => client.delete(`/reviews/${id}`),
};

// ── NOTIFICATIONS ──────────────────────────────────────────
export const notificationsAPI = {
  list:        (params) => client.get('/notifications', { params }),
  unreadCount: ()       => client.get('/notifications/unread-count'),
  markRead:    (id)     => client.patch(`/notifications/${id}/read`),
  markAllRead: ()       => client.patch('/notifications/read-all'),
  remove:      (id)     => client.delete(`/notifications/${id}`),
};

// ── CHAT ───────────────────────────────────────────────────
export const chatAPI = {
  conversations: ()       => client.get('/chat/conversations'),
  messages:      (userId, params) => client.get(`/chat/messages/${userId}`, { params }),
  unreadCount:   ()       => client.get('/chat/unread-count'),
  // Admin/Dəstək məlumatı və onlayn statusu (chat widget üçün)
  getSupport:    ()       => client.get('/chat/support'),
};

// ── FAVORITES ──────────────────────────────────────────────
export const favoritesAPI = {
  list:    ()      => client.get('/favorites'),
  ids:     ()      => client.get('/favorites/ids'),
  toggle:  (carId) => client.post(`/favorites/${carId}/toggle`),
  remove:  (carId) => client.delete(`/favorites/${carId}`),
};

// ── ADMIN ──────────────────────────────────────────────────
export const adminAPI = {
  stats:       ()       => client.get('/admin/stats'),
  listUsers:   (params) => client.get('/admin/users', { params }),
  updateUser:  (id, data) => client.put(`/admin/users/${id}`, data),
  blockUser:   (id, blocked) => client.patch(`/admin/users/${id}/block`, { blocked }),
  deleteUser:  (id)     => client.delete(`/admin/users/${id}`),
  listPromos:  ()       => client.get('/admin/promo-codes'),
  createPromo: (data)   => client.post('/admin/promo-codes', data),
  togglePromo: (id)     => client.patch(`/admin/promo-codes/${id}/toggle`),
  deletePromo: (id)     => client.delete(`/admin/promo-codes/${id}`),
  // Sayt səhifələri (About, Contact, ...)
  listPages:   ()       => client.get('/admin/pages'),
  updatePage:  (slug, data) => client.put(`/admin/pages/${slug}`, data),
};

// ── PAGES (PUBLIC) ─────────────────────────────────────────
export const pagesAPI = {
  get: (slug) => client.get(`/pages/${slug}`),
};
