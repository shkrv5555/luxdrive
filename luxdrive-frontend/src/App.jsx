/**
 * ════════════════════════════════════════════════════════════
 * App — Root komponent (FAZA 4b tamamlandı)
 * ════════════════════════════════════════════════════════════
 *
 * Qlobal komponentlər:
 *   • Navbar (üstdə)
 *   • AppRouter (səhifələr)
 *   • Footer (alt)
 *   • NotificationDropdown (zəng paneli)
 *   • ChatPanel (sağ alt FAB)
 *   • CookieBanner (ilk girişdə alt)
 *   • MobileMenu (mobil hamburger)
 *   • Toaster (toast bildirişlər)
 */
import { useEffect } from 'react';
import { BrowserRouter, useLocation, useNavigate } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import { Toaster } from 'react-hot-toast';
import {
  fetchCurrentUser, selectIsAuthenticated, clearAuth,
} from '@store/slices/authSlice.js';
import { fetchFavoriteIds }   from '@store/slices/favoritesSlice.js';
import { fetchNotifications } from '@store/slices/notificationsSlice.js';
import { useSocket } from '@hooks/useSocket.js';

import Navbar from '@components/layout/Navbar.jsx';
import Footer, { CookieBanner, MobileMenu } from '@components/layout/Footer.jsx';
import NotificationDropdown from '@components/notifications/NotificationDropdown.jsx';
import ChatPanel from '@components/chat/ChatPanel.jsx';
import AppRouter from '@routes/AppRouter.jsx';

function AppContent() {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const location = useLocation();
  const isAuth = useSelector(selectIsAuthenticated);

  // Socket.io
  useSocket();

  // İlk yüklənmədə sessiyanı bərpa et
  useEffect(() => { dispatch(fetchCurrentUser()); }, [dispatch]);

  // Auth olduqda favoritləri və bildirişləri yüklə
  useEffect(() => {
    if (isAuth) {
      dispatch(fetchFavoriteIds());
      dispatch(fetchNotifications({ limit: 20 }));
    }
  }, [isAuth, dispatch]);

  // Token expired hadisəsi
  useEffect(() => {
    const handler = () => {
      dispatch(clearAuth());
      navigate('/login');
    };
    window.addEventListener('auth:expired', handler);
    return () => window.removeEventListener('auth:expired', handler);
  }, [dispatch, navigate]);

  // Admin və dashboard səhifələrində Footer və ChatPanel gizlət (öz layout-u var)
  const isAdminPage     = location.pathname.startsWith('/admin') && !location.pathname.startsWith('/admin-login');
  const isDashboardPage = location.pathname.startsWith('/dashboard');
  const hideExtras      = isAdminPage || isDashboardPage;

  return (
    <>
      {/* Navbar admin səhifəsində gizlədilir (admin öz layout-una sahib) */}
      {!isAdminPage && <Navbar />}
      {!isAdminPage && <NotificationDropdown />}
      {!isAdminPage && <MobileMenu />}

      <main>
        <AppRouter />
      </main>

      {/* Adi səhifələrdə footer + chat göstər */}
      {!hideExtras && <Footer />}
      {!isAdminPage && <ChatPanel />}

      {/* Cookie banner yalnız adi səhifələrdə */}
      {!hideExtras && <CookieBanner />}

      {/* Toast provider — luxury palitra */}
      <Toaster
        position="bottom-right"
        toastOptions={{
          duration: 3500,
          style: {
            background: 'var(--bg-2)',
            color: 'var(--tx-1)',
            border: '1px solid var(--border)',
            borderRadius: 'var(--r-md)',
            fontSize: '0.85rem',
            padding: '0.7rem 1rem',
          },
          success: { iconTheme: { primary: 'var(--ok)',  secondary: '#fff' } },
          error:   { iconTheme: { primary: 'var(--err)', secondary: '#fff' } },
        }}
      />
    </>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <AppContent />
    </BrowserRouter>
  );
}
