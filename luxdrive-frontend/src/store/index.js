/**
 * ════════════════════════════════════════════════════════════
 * Redux Store
 * ════════════════════════════════════════════════════════════
 *
 * Tək giriş nöqtəsi — bütün slice-lar burada birləşir.
 * configureStore() avtomatik Redux DevTools və Thunk middleware verir.
 */
import { configureStore } from '@reduxjs/toolkit';
import authReducer          from './slices/authSlice.js';
import notificationsReducer from './slices/notificationsSlice.js';
import favoritesReducer     from './slices/favoritesSlice.js';
import uiReducer            from './slices/uiSlice.js';

export const store = configureStore({
  reducer: {
    auth:          authReducer,
    notifications: notificationsReducer,
    favorites:     favoritesReducer,
    ui:            uiReducer,
  },

  // Serialization yoxlanışını söndür — bəzi tarixləri/file-ları saxlayırıq
  middleware: (getDefault) =>
    getDefault({
      serializableCheck: {
        ignoredActions: ['ui/openModal', 'ui/setError'],
      },
    }),

  // DevTools yalnız development-də
  devTools: import.meta.env.MODE !== 'production',
});

// TypeScript istifadə edilərsə bu tiplər lazımdır:
// export type RootState = ReturnType<typeof store.getState>;
// export type AppDispatch = typeof store.dispatch;
