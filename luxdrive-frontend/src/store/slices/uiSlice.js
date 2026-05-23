/**
 * ════════════════════════════════════════════════════════════
 * UI Slice — Qlobal UI vəziyyəti
 * ════════════════════════════════════════════════════════════
 *
 * Modal-lar, mobil menü, çat panel açıq/qapalı, və s.
 */
import { createSlice } from '@reduxjs/toolkit';

const uiSlice = createSlice({
  name: 'ui',
  initialState: {
    activeModal: null,         // 'login' | 'register' | 'adminLogin' | 'booking' | 'review' | null
    modalData: null,           // modala ötürülən məlumat (məs. carId)
    isMobileMenuOpen: false,
    isChatPanelOpen: false,
    activeChatUserId: null,    // hazırda açıq olan söhbət
    isCookieBannerVisible: !localStorage.getItem('ld_cookie'),
  },

  reducers: {
    openModal: (state, action) => {
      state.activeModal = action.payload.name;
      state.modalData   = action.payload.data || null;
    },
    closeModal: (state) => {
      state.activeModal = null;
      state.modalData   = null;
    },
    toggleMobileMenu: (state) => {
      state.isMobileMenuOpen = !state.isMobileMenuOpen;
    },
    closeMobileMenu: (state) => {
      state.isMobileMenuOpen = false;
    },
    openChat: (state, action) => {
      state.isChatPanelOpen = true;
      state.activeChatUserId = action.payload || null;
    },
    closeChat: (state) => {
      state.isChatPanelOpen = false;
      state.activeChatUserId = null;
    },
    acceptCookies: (state) => {
      state.isCookieBannerVisible = false;
      localStorage.setItem('ld_cookie', 'accepted');
    },
  },
});

export const {
  openModal, closeModal,
  toggleMobileMenu, closeMobileMenu,
  openChat, closeChat,
  acceptCookies,
} = uiSlice.actions;

export const selectActiveModal     = (state) => state.ui.activeModal;
export const selectModalData       = (state) => state.ui.modalData;
export const selectMobileMenuOpen  = (state) => state.ui.isMobileMenuOpen;
export const selectChatOpen        = (state) => state.ui.isChatPanelOpen;
export const selectActiveChatUser  = (state) => state.ui.activeChatUserId;
export const selectCookieBanner    = (state) => state.ui.isCookieBannerVisible;

export default uiSlice.reducer;
