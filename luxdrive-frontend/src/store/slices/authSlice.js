/**
 * ════════════════════════════════════════════════════════════
 * Auth Slice — İstifadəçi sessiyası
 * ════════════════════════════════════════════════════════════
 *
 * State:
 *   • user: { id, name, email, role, avatar_url, ... } | null
 *   • status: 'idle' | 'loading' | 'authenticated' | 'error'
 *   • error: string | null
 *
 * Async thunks:
 *   • loginUser, registerUser, adminLoginUser
 *   • fetchCurrentUser (səhifə yenilənərkən sessiyanı bərpa et)
 *   • logoutUser
 *   • updateUserProfile, changeUserPassword
 */
import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import { authAPI, usersAPI } from '@api/endpoints.js';
import { tokenStorage } from '@api/client.js';

// ── ASYNC THUNKS ───────────────────────────────────────────

export const loginUser = createAsyncThunk(
  'auth/login',
  async (credentials, { rejectWithValue }) => {
    try {
      const { data } = await authAPI.login(credentials);
      tokenStorage.set(
        { accessToken: data.accessToken, refreshToken: data.refreshToken },
        data.user
      );
      return data.user;
    } catch (err) {
      return rejectWithValue(err);
    }
  }
);

export const registerUser = createAsyncThunk(
  'auth/register',
  async (formData, { rejectWithValue }) => {
    try {
      const { data } = await authAPI.register(formData);
      tokenStorage.set(
        { accessToken: data.accessToken, refreshToken: data.refreshToken },
        data.user
      );
      return data.user;
    } catch (err) {
      return rejectWithValue(err);
    }
  }
);

export const adminLoginUser = createAsyncThunk(
  'auth/adminLogin',
  async (credentials, { rejectWithValue }) => {
    try {
      const { data } = await authAPI.adminLogin(credentials);
      tokenStorage.set(
        { accessToken: data.accessToken, refreshToken: data.refreshToken },
        data.user
      );
      return data.user;
    } catch (err) {
      return rejectWithValue(err);
    }
  }
);

/**
 * Səhifə yenilənərkən sessiyanı bərpa et
 * App.jsx-in mount zamanı çağırılır
 */
export const fetchCurrentUser = createAsyncThunk(
  'auth/me',
  async (_, { rejectWithValue }) => {
    try {
      // Token yoxdursa, dərhal çıx
      if (!tokenStorage.getAccess()) return null;
      const { data } = await authAPI.me();
      return data.user;
    } catch (err) {
      tokenStorage.clear();
      return rejectWithValue(err);
    }
  }
);

export const logoutUser = createAsyncThunk(
  'auth/logout',
  async () => {
    try {
      const refreshToken = tokenStorage.getRefresh();
      if (refreshToken) await authAPI.logout(refreshToken);
    } catch {
      // Server xətası belə olsa lokal token-ləri sil
    } finally {
      tokenStorage.clear();
    }
  }
);

export const updateUserProfile = createAsyncThunk(
  'auth/updateProfile',
  async (formData, { rejectWithValue }) => {
    try {
      const { data } = await usersAPI.updateProfile(formData);
      tokenStorage.set(null, data.user);
      return data.user;
    } catch (err) {
      return rejectWithValue(err);
    }
  }
);

export const uploadAvatar = createAsyncThunk(
  'auth/uploadAvatar',
  async (file, { rejectWithValue }) => {
    try {
      const { data } = await usersAPI.uploadAvatar(file);
      tokenStorage.set(null, data.user);
      return data.user;
    } catch (err) {
      return rejectWithValue(err);
    }
  }
);

// ── SLICE ──────────────────────────────────────────────────
const authSlice = createSlice({
  name: 'auth',

  // İlk dəfə yüklənmədə localStorage-dan oxu
  initialState: {
    user:   tokenStorage.getUser(),
    status: tokenStorage.getUser() ? 'authenticated' : 'idle',
    error:  null,
  },

  reducers: {
    // Manual logout (xəta olmayan)
    clearAuth: (state) => {
      state.user = null;
      state.status = 'idle';
      state.error = null;
      tokenStorage.clear();
    },
    // Xəta təmizləmə (form yenidən təqdim edildikdə)
    clearError: (state) => {
      state.error = null;
    },
  },

  extraReducers: (builder) => {
    builder
      // Login / Register / Admin login — eyni axın
      .addCase(loginUser.pending, (state) => {
        state.status = 'loading';
        state.error  = null;
      })
      .addCase(loginUser.fulfilled, (state, action) => {
        state.user   = action.payload;
        state.status = 'authenticated';
      })
      .addCase(loginUser.rejected, (state, action) => {
        state.status = 'error';
        state.error  = action.payload;
      })

      .addCase(registerUser.pending, (state) => {
        state.status = 'loading'; state.error = null;
      })
      .addCase(registerUser.fulfilled, (state, action) => {
        state.user = action.payload; state.status = 'authenticated';
      })
      .addCase(registerUser.rejected, (state, action) => {
        state.status = 'error'; state.error = action.payload;
      })

      .addCase(adminLoginUser.pending, (state) => {
        state.status = 'loading'; state.error = null;
      })
      .addCase(adminLoginUser.fulfilled, (state, action) => {
        state.user = action.payload; state.status = 'authenticated';
      })
      .addCase(adminLoginUser.rejected, (state, action) => {
        state.status = 'error'; state.error = action.payload;
      })

      // Cari istifadəçi (səhifə yenilənmədən sonra)
      .addCase(fetchCurrentUser.fulfilled, (state, action) => {
        if (action.payload) {
          state.user   = action.payload;
          state.status = 'authenticated';
        } else {
          state.status = 'idle';
        }
      })
      .addCase(fetchCurrentUser.rejected, (state) => {
        state.user = null;
        state.status = 'idle';
      })

      // Çıxış
      .addCase(logoutUser.fulfilled, (state) => {
        state.user = null;
        state.status = 'idle';
        state.error = null;
      })

      // Profil yenilənməsi
      .addCase(updateUserProfile.fulfilled, (state, action) => {
        state.user = { ...state.user, ...action.payload };
      })
      .addCase(uploadAvatar.fulfilled, (state, action) => {
        state.user = { ...state.user, ...action.payload };
      });
  },
});

export const { clearAuth, clearError } = authSlice.actions;

// ── SELECTORS ──────────────────────────────────────────────
export const selectUser = (state) => state.auth.user;
export const selectIsAuthenticated = (state) => state.auth.status === 'authenticated';
export const selectAuthStatus = (state) => state.auth.status;
export const selectAuthError  = (state) => state.auth.error;
export const selectIsAdmin    = (state) => state.auth.user?.role === 'admin';
export const selectIsRenter   = (state) => state.auth.user?.role === 'renter';

export default authSlice.reducer;
