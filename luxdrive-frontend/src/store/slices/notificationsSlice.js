/**
 * ════════════════════════════════════════════════════════════
 * Notifications Slice
 * ════════════════════════════════════════════════════════════
 *
 * Hibrid məntiq: REST ilk yüklənmə üçün, Socket.io real-time push üçün.
 * useSocket hook yeni bildiriş gəldikdə `addNotification` action göndərir.
 */
import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import { notificationsAPI } from '@api/endpoints.js';

// ── ASYNC THUNKS ───────────────────────────────────────────
export const fetchNotifications = createAsyncThunk(
  'notifications/fetch',
  async (params = {}, { rejectWithValue }) => {
    try {
      const { data } = await notificationsAPI.list(params);
      return data;
    } catch (err) { return rejectWithValue(err); }
  }
);

export const markNotificationRead = createAsyncThunk(
  'notifications/markRead',
  async (id) => {
    await notificationsAPI.markRead(id);
    return id;
  }
);

export const markAllNotificationsRead = createAsyncThunk(
  'notifications/markAllRead',
  async () => { await notificationsAPI.markAllRead(); }
);

// ── SLICE ──────────────────────────────────────────────────
const notificationsSlice = createSlice({
  name: 'notifications',
  initialState: {
    items: [],
    unreadCount: 0,
    isLoading: false,
    isPanelOpen: false,
  },

  reducers: {
    // Socket.io ilə yeni bildiriş gəldikdə (real-time push)
    addNotification: (state, action) => {
      state.items.unshift(action.payload);
      if (state.items.length > 50) state.items.pop();
      state.unreadCount += 1;
    },
    // Socket-dən gələn unreadCount yeniləməsi
    setUnreadCount: (state, action) => {
      state.unreadCount = action.payload;
    },
    // Panel aç/bağla
    togglePanel: (state) => {
      state.isPanelOpen = !state.isPanelOpen;
    },
    closePanel: (state) => {
      state.isPanelOpen = false;
    },
  },

  extraReducers: (builder) => {
    builder
      .addCase(fetchNotifications.pending, (state) => { state.isLoading = true; })
      .addCase(fetchNotifications.fulfilled, (state, action) => {
        state.items = action.payload.items;
        state.unreadCount = action.payload.unreadCount;
        state.isLoading = false;
      })
      .addCase(fetchNotifications.rejected, (state) => { state.isLoading = false; })

      .addCase(markNotificationRead.fulfilled, (state, action) => {
        const id = action.payload;
        const item = state.items.find((n) => n.id === id);
        if (item && !item.is_read) {
          item.is_read = true;
          state.unreadCount = Math.max(0, state.unreadCount - 1);
        }
      })

      .addCase(markAllNotificationsRead.fulfilled, (state) => {
        state.items.forEach((n) => { n.is_read = true; });
        state.unreadCount = 0;
      });
  },
});

export const { addNotification, setUnreadCount, togglePanel, closePanel } = notificationsSlice.actions;

// Selectors
export const selectNotifications = (state) => state.notifications.items;
export const selectUnreadCount   = (state) => state.notifications.unreadCount;
export const selectPanelOpen     = (state) => state.notifications.isPanelOpen;

export default notificationsSlice.reducer;
