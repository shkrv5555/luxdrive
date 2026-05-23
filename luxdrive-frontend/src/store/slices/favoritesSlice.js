/**
 * ════════════════════════════════════════════════════════════
 * Favorites Slice
 * ════════════════════════════════════════════════════════════
 *
 * Hər avtomobil kartında ürək düyməsi favoriti yoxlamalıdır.
 * Bunun üçün yalnız `ids` saxlayırıq (set ilə O(1) yoxlama).
 * Tam siyahı yalnız "Mənim favoritlərim" səhifəsində alınır.
 */
import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import { favoritesAPI } from '@api/endpoints.js';

export const fetchFavoriteIds = createAsyncThunk(
  'favorites/fetchIds',
  async () => {
    const { data } = await favoritesAPI.ids();
    return data.ids;
  }
);

export const fetchFavorites = createAsyncThunk(
  'favorites/fetchAll',
  async () => {
    const { data } = await favoritesAPI.list();
    return data.favorites;
  }
);

export const toggleFavorite = createAsyncThunk(
  'favorites/toggle',
  async (carId) => {
    const { data } = await favoritesAPI.toggle(carId);
    return { carId, favorited: data.favorited };
  }
);

const favoritesSlice = createSlice({
  name: 'favorites',
  initialState: {
    ids: [],           // Set ilə O(1) yoxlama üçün
    items: [],         // Tam avtomobil obyektləri (yalnız favorites səhifəsində)
    isLoading: false,
  },

  reducers: {},

  extraReducers: (builder) => {
    builder
      .addCase(fetchFavoriteIds.fulfilled, (state, action) => {
        state.ids = action.payload;
      })
      .addCase(fetchFavorites.pending, (state) => { state.isLoading = true; })
      .addCase(fetchFavorites.fulfilled, (state, action) => {
        state.items = action.payload;
        state.ids = action.payload.map((c) => c.id);
        state.isLoading = false;
      })
      .addCase(toggleFavorite.fulfilled, (state, action) => {
        const { carId, favorited } = action.payload;
        if (favorited) {
          if (!state.ids.includes(carId)) state.ids.push(carId);
        } else {
          state.ids = state.ids.filter((id) => id !== carId);
          state.items = state.items.filter((c) => c.id !== carId);
        }
      });
  },
});

export const selectFavoriteIds = (state) => state.favorites.ids;
export const selectFavorites   = (state) => state.favorites.items;
export const selectIsFavorite  = (carId) => (state) => state.favorites.ids.includes(carId);

export default favoritesSlice.reducer;
